
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { AbsenceChoiceModal } from './components/AbsenceChoiceModal';
import { 
    MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA,
    MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA,
    EXTRA_STAFF
} from './constants';
import { 
    ClipboardList,
    Users,
    Plus,
    ChevronLeft,
    ChevronRight,
    RefreshCcw,
    CheckCircle2,
    X,
    LogOut,
    CassetteTape
} from 'lucide-react';

const syncChannel = new BroadcastChannel('girsu_sync_v28');
const DB_PREFIX = 'girsu_v28_'; 
const STAFF_KEY = `${DB_PREFIX}staff`;
const ADN_ROUTES_KEY = `${DB_PREFIX}adn_routes`;
const DAILY_DATA_KEY = `${DB_PREFIX}day_`;
const DAILY_TRANS_KEY = `${DB_PREFIX}trans_`;
const DAILY_MGRS_KEY = `${DB_PREFIX}mgrs_`;
const OVERRIDES_KEY = `${DB_PREFIX}overrides_`;

const deduplicateStaff = (list: StaffMember[]): StaffMember[] => {
  const seen = new Set();
  return list.filter(s => {
    if (!s || !s.id) return false;
    const id = String(s.id).trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const App: React.FC = () => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const lastLoadedKey = useRef<string | null>(null);

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [shiftManagers, setShiftManagers] = useState<Record<string, ShiftMetadata>>({
    MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
    TARDE: { supervisor: '', subSupervisor: '', absences: [] },
    NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
  });

  // Excepciones: Personas que faltan en el padrón pero vinieron HOY
  const [dailyOverrides, setDailyOverrides] = useState<string[]>([]);

  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerState, setPickerState] = useState<{ type: string, targetId: string, field: string, role: string, currentValueId?: string, unitIdx?: number } | null>(null);
  const [absenceChoice, setAbsenceChoice] = useState<StaffMember | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  const findStaffSecure = useCallback((searchId: any, currentStaff: StaffMember[]) => {
    if (!searchId) return null;
    const query = String(searchId).trim().toUpperCase();
    return currentStaff.find(s => String(s.id).trim().toUpperCase() === query) || null;
  }, []);

  const mapStaffToIds = useCallback((data: any[], currentStaff: StaffMember[]) => data.map((r: any) => ({
    ...r,
    driver: findStaffSecure(r.driver, currentStaff),
    aux1: findStaffSecure(r.aux1, currentStaff),
    aux2: findStaffSecure(r.aux2, currentStaff),
    aux3: findStaffSecure(r.aux3, currentStaff),
    aux4: findStaffSecure(r.aux4, currentStaff),
    replacementDriver: findStaffSecure(r.replacementDriver, currentStaff),
    replacementAux1: findStaffSecure(r.replacementAux1, currentStaff),
    replacementAux2: findStaffSecure(r.replacementAux2, currentStaff)
  })), [findStaffSecure]);

  const refreshRecordsWithNewStaff = useCallback((currentStaff: StaffMember[]) => {
    setRecords(prev => mapStaffToIds(prev.map(r => ({
        ...r,
        driver: r.driver?.id || r.driver || null,
        aux1: r.aux1?.id || r.aux1 || null,
        aux2: r.aux2?.id || r.aux2 || null,
        aux3: r.aux3?.id || r.aux3 || null,
        aux4: r.aux4?.id || r.aux4 || null,
        replacementDriver: r.replacementDriver?.id || r.replacementDriver || null,
        replacementAux1: r.replacementAux1?.id || r.replacementAux1 || null,
        replacementAux2: r.replacementAux2?.id || r.replacementAux2 || null
    })), currentStaff));

    setTransferRecords(prev => prev.map(tr => ({
        ...tr,
        maquinista: findStaffSecure(tr.maquinista?.id || tr.maquinista, currentStaff),
        encargado: findStaffSecure(tr.encargado?.id || tr.encargado, currentStaff),
        balancero1: findStaffSecure(tr.balancero1?.id || tr.balancero1, currentStaff),
        auxTolva1: findStaffSecure(tr.auxTolva1?.id || tr.auxTolva1, currentStaff),
        auxTolva2: findStaffSecure(tr.auxTolva2?.id || tr.auxTolva2, currentStaff),
        units: tr.units.map(u => ({ ...u, driver: findStaffSecure(u.driver?.id || u.driver, currentStaff) })) as unknown as [TransferUnit, TransferUnit, TransferUnit]
    })));
  }, [findStaffSecure, mapStaffToIds]);

  const handleUpdateStaff = useCallback((updated: StaffMember, originalId?: string) => {
    setStaffList(prev => {
      const idToFind = originalId || updated.id;
      const newList = prev.map(s => s.id === idToFind ? updated : s);
      setTimeout(() => refreshRecordsWithNewStaff(newList), 0);
      return newList;
    });
  }, [refreshRecordsWithNewStaff]);

  const handleAbsenceDecision = (decision: 'ONLY_TODAY' | 'DEFINITIVE') => {
    if (!absenceChoice) return;
    
    if (decision === 'DEFINITIVE') {
        handleUpdateStaff({ 
            ...absenceChoice, 
            status: StaffStatus.PRESENT, 
            address: '', 
            absenceStartDate: undefined, 
            absenceReturnDate: undefined, 
            isIndefiniteAbsence: false 
        });
    } else {
        setDailyOverrides(prev => [...new Set([...prev, absenceChoice.id])]);
    }
    setAbsenceChoice(null);
  };

  useEffect(() => {
    const handleSyncMessage = (event: MessageEvent) => {
      const { type, payload, date } = event.data;
      if (date === selectedDate || type === 'STAFF_UPDATE') {
          switch(type) {
            case 'RECORDS_UPDATE': setRecords(mapStaffToIds(payload, staffList)); break;
            case 'TRANS_UPDATE': setTransferRecords(payload); break;
            case 'MGRS_UPDATE': setShiftManagers(payload); break;
            case 'STAFF_UPDATE': 
                setStaffList(payload);
                refreshRecordsWithNewStaff(payload);
                break;
          }
      }
    };
    syncChannel.addEventListener('message', handleSyncMessage);
    return () => syncChannel.removeEventListener('message', handleSyncMessage);
  }, [selectedDate, staffList, mapStaffToIds, refreshRecordsWithNewStaff]);

  const createEmptyTrans = useCallback((s: string): TransferRecord => ({ 
    id: `TR-${s}`, shift: s as any, 
    units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, 
    maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' 
  }), []);

  const getInitialRecordsFromConstants = useCallback((list: StaffMember[]) => {
    const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ 
        id: `${m.zone}-${shift}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findStaffSecure(m.driver, list), aux1: findStaffSecure(m.aux1, list), aux2: findStaffSecure(m.aux2, list), aux3: findStaffSecure(m.aux3, list), aux4: findStaffSecure(m.aux4, list), replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' 
    }));
    return [...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')];
  }, [findStaffSecure]);

  useEffect(() => {
    if (isLoaded && lastLoadedKey.current === selectedDate) return;
    setIsLoaded(false);
    
    const savedStaff = localStorage.getItem(STAFF_KEY);
    const initialStaff = deduplicateStaff(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setStaffList(initialStaff);
    
    const savedOverrides = localStorage.getItem(`${OVERRIDES_KEY}${selectedDate}`);
    setDailyOverrides(savedOverrides ? JSON.parse(savedOverrides) : []);

    const dayRoutes = localStorage.getItem(`${DAILY_DATA_KEY}${selectedDate}`);
    const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);

    if (dayRoutes) {
        setRecords(mapStaffToIds(JSON.parse(dayRoutes), initialStaff));
    } else if (adnRoutes) {
        setRecords(mapStaffToIds(JSON.parse(adnRoutes), initialStaff));
    } else {
        setRecords(getInitialRecordsFromConstants(initialStaff));
    }

    const dayTrans = localStorage.getItem(`${DAILY_TRANS_KEY}${selectedDate}`);
    if (dayTrans) {
        setTransferRecords(JSON.parse(dayTrans).map((tr: any) => ({ 
            ...tr, 
            maquinista: findStaffSecure(tr.maquinista, initialStaff), 
            encargado: findStaffSecure(tr.encargado, initialStaff), 
            balancero1: findStaffSecure(tr.balancero1, initialStaff), 
            auxTolva1: findStaffSecure(tr.auxTolva1, initialStaff), 
            auxTolva2: findStaffSecure(tr.auxTolva2, initialStaff), 
            units: tr.units.map((u:any) => ({ ...u, driver: findStaffSecure(u.driver, initialStaff) })) as unknown as [TransferUnit, TransferUnit, TransferUnit]
        })));
    } else {
        setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
    }

    const dayMgrs = localStorage.getItem(`${DAILY_MGRS_KEY}${selectedDate}`);
    if (dayMgrs) setShiftManagers(JSON.parse(dayMgrs));
    
    lastLoadedKey.current = selectedDate;
    setIsLoaded(true);
  }, [selectedDate, findStaffSecure, getInitialRecordsFromConstants, createEmptyTrans, mapStaffToIds]);

  const handleSaveAsADN = () => {
    if (!confirm("¿Deseas guardar el personal actual como 'ADN Maestro'? Esto limpiará tonelajes y horarios para futuros días.")) return;
    const pRecs = records.map(r => ({ 
        id: r.id, 
        zone: r.zone, 
        internalId: r.internalId, 
        domain: r.domain, 
        reinforcement: r.reinforcement, 
        shift: r.shift, 
        category: r.category,
        order: r.order,
        driver: r.driver?.id || null, 
        aux1: r.aux1?.id || null, 
        aux2: r.aux2?.id || null, 
        aux3: r.aux3?.id || null, 
        aux4: r.aux4?.id || null, 
        replacementDriver: r.replacementDriver?.id || null, 
        replacementAux1: r.replacementAux1?.id || null, 
        replacementAux2: r.replacementAux2?.id || null, 
        tonnage: '', 
        departureTime: '', 
        supervisionReport: '', 
        zoneStatus: ZoneStatus.PENDING 
    }));
    localStorage.setItem(ADN_ROUTES_KEY, JSON.stringify(pRecs));
    alert("ADN Maestro guardado correctamente.");
  };

  useEffect(() => {
    if (!isLoaded) return;
    setIsSaving(true);
    const timeout = setTimeout(() => {
        try {
            localStorage.setItem(STAFF_KEY, JSON.stringify(staffList));
            localStorage.setItem(`${OVERRIDES_KEY}${selectedDate}`, JSON.stringify(dailyOverrides));

            const pRecs = records.map(r => ({ ...r, driver: r.driver?.id || null, aux1: r.aux1?.id || null, aux2: r.aux2?.id || null, aux3: r.aux3?.id || null, aux4: r.aux4?.id || null, replacementDriver: r.replacementDriver?.id || null, replacementAux1: r.replacementAux1?.id || null, replacementAux2: r.replacementAux2?.id || null }));
            const pTrans = transferRecords.map(tr => ({ 
                ...tr, 
                maquinista: tr.maquinista?.id || null, 
                encargado: tr.encargado?.id || null, 
                balancero1: tr.balancero1?.id || null, 
                auxTolva1: tr.auxTolva1?.id || null, 
                auxTolva2: tr.auxTolva2?.id || null, 
                units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null })) as unknown as [TransferUnit, TransferUnit, TransferUnit]
            }));
            
            localStorage.setItem(`${DAILY_DATA_KEY}${selectedDate}`, JSON.stringify(pRecs)); 
            localStorage.setItem(`${DAILY_TRANS_KEY}${selectedDate}`, JSON.stringify(pTrans)); 
            localStorage.setItem(`${DAILY_MGRS_KEY}${selectedDate}`, JSON.stringify(shiftManagers));
            
            syncChannel.postMessage({ type: 'RECORDS_UPDATE', payload: pRecs, date: selectedDate });
            syncChannel.postMessage({ type: 'TRANS_UPDATE', payload: pTrans, date: selectedDate });
            syncChannel.postMessage({ type: 'MGRS_UPDATE', payload: shiftManagers, date: selectedDate });
            syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: staffList });
            setIsSaving(false);
        } catch (e) {}
    }, 500);
    return () => clearTimeout(timeout);
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, isLoaded, dailyOverrides]);

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    const { type, targetId, field, unitIdx } = pickerState;
    if (type.includes('route')) setRecords(prev => prev.map(r => r.id === targetId ? { ...r, [field]: selectedStaff } : r));
    else if (type.includes('transfer')) setTransferRecords(prev => prev.map(tr => { 
        if (tr.id !== targetId) return tr; 
        if (field === 'units' && unitIdx !== undefined) { 
            const u = [...tr.units] as unknown as [TransferUnit, TransferUnit, TransferUnit]; 
            u[unitIdx] = { ...u[unitIdx], driver: selectedStaff }; 
            return { ...tr, units: u }; 
        } 
        return { ...tr, [field]: selectedStaff }; 
    }));
    else if (type.includes('managers')) setShiftManagers(prev => ({ ...prev, [targetId]: { ...prev[targetId], [field]: selectedStaff ? selectedStaff.name : '' } }));
    setPickerState(null);
  };

  const sortedPickerList = useMemo(() => {
      const query = pickerSearch.trim().toLowerCase();
      let filtered = staffList.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
      return filtered.sort((a, b) => { 
          const isASelected = a.id === pickerState?.currentValueId; 
          const isBSelected = b.id === pickerState?.currentValueId; 
          if (isASelected && !isBSelected) return -1; 
          if (!isASelected && isBSelected) return 1; 
          return a.name.localeCompare(b.name); 
      }).slice(0, 40);
  }, [staffList, pickerSearch, pickerState?.currentValueId]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 z-[100] shadow-xl">
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
            <div className="bg-white p-2 rounded-xl mb-3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Logo" />
            </div>
            <h2 className="text-sm font-black italic tracking-tighter uppercase text-center">G.I.R.S.U. QUILMES</h2>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
            <NavButton active={activeTab === 'parte'} onClick={() => setActiveTab('parte')} icon={<ClipboardList size={18}/>} label="Parte Diario" />
            <NavButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={<Users size={18}/>} label="Personal" />
        </nav>
        <div className="p-4 border-t border-white/10 bg-black/20">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all text-[10px] font-black uppercase">
                <LogOut size={16} /> Salir
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0 shadow-sm z-[90]">
          <div className="flex items-center gap-4">
              <h1 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Operativa</h1>
              {isSaving && <div className="text-indigo-600 animate-pulse text-[8px] font-black uppercase tracking-widest">Sincronizando...</div>}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center border rounded-full px-3 py-1.5 bg-slate-50 border-slate-200">
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronLeft size={16} /></button>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase px-1 w-28 text-center" />
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronRight size={16} /></button>
             </div>
             {activeTab === 'parte' && (
                <div className="flex items-center gap-2 border-l pl-3 ml-1">
                  <button onClick={handleSaveAsADN} title="Grabar como ADN Maestro" className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
                    <CassetteTape size={18} />
                    <span className="text-[9px] font-black uppercase">Grabar ADN</span>
                  </button>
                  <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-indigo-600 transition-all"><Plus size={18} /></button>
                  <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white p-2 rounded-xl hover:bg-emerald-700 transition-all"><CheckCircle2 size={18} /></button>
                </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
            {isLoaded ? (
                activeTab === 'personal' ? (
                  <div className="h-full p-6 overflow-y-auto bg-slate-50">
                    <StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => setStaffList(prev => deduplicateStaff([...prev, s]))} onRemoveStaff={id => setStaffList(prev => prev.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col overflow-hidden bg-slate-50">
                    <div className="px-6 py-2 bg-white border-b flex items-center gap-4">
                        <div className="flex p-0.5 bg-slate-100 rounded-lg">
                            {['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'].map(f => <button key={f} onClick={() => setShiftFilter(f as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${shiftFilter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{f}</button>)}
                        </div>
                        <div className="flex p-0.5 bg-slate-100 rounded-lg">
                            {['GENERAL', 'REPASO', 'TRANSFERENCIA'].map(t => <button key={t} onClick={() => setSubTab(t as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${subTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>)}
                        </div>
                        <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} staffList={staffList} onOpenPicker={(f, r, cid) => setPickerState({ type: 'managers', targetId: shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter, field: f, role: r, currentValueId: cid })} onUpdateStaff={handleUpdateStaff} />
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                       <div className="bg-white h-full border rounded-xl shadow-sm overflow-hidden flex flex-col">
                          {subTab === 'TRANSFERENCIA' ? (
                            <TransferTable data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(p => p.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, cid, uidx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: cid, unitIdx: uidx })} onUpdateStaff={handleUpdateStaff} presenceOverrides={dailyOverrides} />
                          ) : (
                            <ReportTable data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} onUpdateRecord={(id, f, v) => setRecords(p => p.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(p => p.filter(r => r.id !== id))} onOpenPicker={(id, field, role, cid) => setPickerState({ type: 'route', targetId: id, field, role, currentValueId: cid })} onUpdateStaff={setAbsenceChoice} selectedDate={selectedDate} activeShiftLabel={shiftFilter} presenceOverrides={dailyOverrides} />
                          )}
                       </div>
                    </div>
                  </div>
                )
            ) : (
              <div className="flex h-full items-center justify-center"><RefreshCcw className="animate-spin text-indigo-600" /></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="text-xs font-black uppercase">Asignar {pickerState.role}</h3>
                    <button onClick={() => setPickerState(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={18} /></button>
                </div>
                <div className="p-4 border-b">
                    <input autoFocus type="text" placeholder="BUSCAR LEGAJO O NOMBRE..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sortedPickerList.length > 0 ? sortedPickerList.map(s => {
                        const isAbsentInPadron = s.status === StaffStatus.ABSENT;
                        const isOverridden = dailyOverrides.includes(s.id);
                        
                        return (
                            <div key={s.id} onClick={() => handlePickerSelection(s)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-all ${s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'} ${isAbsentInPadron && !isOverridden ? 'opacity-50 grayscale' : ''}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase">{s.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase">LEG: {s.id} {isAbsentInPadron && <span className="text-red-500 ml-2">[{s.address}]</span>} {isOverridden && <span className="text-indigo-500 ml-2">[EXCEPCIÓN HOY]</span>}</p>
                                </div>
                                <CheckCircle2 className={s.id === pickerState.currentValueId ? 'text-indigo-600' : 'text-slate-200'} size={16} />
                            </div>
                        );
                    }) : (<div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200"><p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin resultados</p></div>)}
                    <button onClick={() => handlePickerSelection(null)} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-red-500 uppercase hover:bg-red-50">Quitar Asignación</button>
                </div>
            </div>
        </div>
      )}

      <AbsenceChoiceModal 
        staff={absenceChoice} 
        onClose={() => setAbsenceChoice(null)} 
        onDecision={handleAbsenceDecision} 
      />

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => { const newRec: RouteRecord = { id: `NEW-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'EXTRA', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: subTab === 'REPASO' ? 'REPASO_LATERAL' : 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }; setRecords(prev => [...prev, newRec]); }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
     {icon}
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;
