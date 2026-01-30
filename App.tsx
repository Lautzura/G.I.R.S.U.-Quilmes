
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit, AbsenceReason } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
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
    History
} from 'lucide-react';

const syncChannel = new BroadcastChannel('girsu_sync_v36');
const DB_PREFIX = 'girsu_v36_'; 
const STAFF_KEY = `${DB_PREFIX}staff`;
const ADN_HISTORY_KEY = `${DB_PREFIX}adn_timeline`; 
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

  const [dailyOverrides, setDailyOverrides] = useState<string[]>([]);
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerState, setPickerState] = useState<{ type: string, targetId: string, field: string, role: string, currentValueId?: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  const findAndSnap = useCallback((stored: any, list: StaffMember[]) => {
    if (!stored) return null;
    const id = typeof stored === 'string' ? stored : (stored.id || null);
    if (!id) return null;
    const baseInPadron = list.find(s => s.id === id);
    if (typeof stored === 'object' && stored.status !== undefined) {
        return {
            ...(baseInPadron || { id, name: stored.name || 'DESC.' }),
            name: stored.name || baseInPadron?.name || 'DESC.',
            status: stored.status,
            address: stored.address || ''
        } as StaffMember;
    }
    return baseInPadron || null;
  }, []);

  const hydrateRecords = useCallback((data: any[], list: StaffMember[]) => data.map(r => ({
    ...r,
    driver: findAndSnap(r.driver, list),
    aux1: findAndSnap(r.aux1, list),
    aux2: findAndSnap(r.aux2, list),
    aux3: findAndSnap(r.aux3, list),
    aux4: findAndSnap(r.aux4, list),
    replacementDriver: findAndSnap(r.replacementDriver, list),
    replacementAux1: findAndSnap(r.replacementAux1, list),
    replacementAux2: findAndSnap(r.replacementAux2, list)
  })), [findAndSnap]);

  const dehydrateStaff = (s: StaffMember | null) => {
      if (!s) return null;
      return { id: s.id, name: s.name, status: s.status, address: s.address };
  };

  const dehydrateRecords = (data: RouteRecord[]) => data.map(r => ({
    ...r,
    driver: dehydrateStaff(r.driver),
    aux1: dehydrateStaff(r.aux1),
    aux2: dehydrateStaff(r.aux2),
    aux3: dehydrateStaff(r.aux3),
    aux4: dehydrateStaff(r.aux4),
    replacementDriver: dehydrateStaff(r.replacementDriver),
    replacementAux1: dehydrateStaff(r.replacementAux1),
    replacementAux2: dehydrateStaff(r.replacementAux2)
  }));

  const hydrateTransfers = useCallback((data: any[], list: StaffMember[]) => data.map(tr => ({
    ...tr,
    maquinista: findAndSnap(tr.maquinista, list),
    encargado: findAndSnap(tr.encargado, list),
    balancero1: findAndSnap(tr.balancero1, list),
    auxTolva1: findAndSnap(tr.auxTolva1, list),
    auxTolva2: findAndSnap(tr.auxTolva2, list),
    units: tr.units.map((u: any) => ({ ...u, driver: findAndSnap(u.driver, list) }))
  })), [findAndSnap]);

  const dehydrateTransfers = (data: TransferRecord[]) => data.map(tr => ({
    ...tr,
    maquinista: dehydrateStaff(tr.maquinista),
    encargado: dehydrateStaff(tr.encargado),
    balancero1: dehydrateStaff(tr.balancero1),
    auxTolva1: dehydrateStaff(tr.auxTolva1),
    auxTolva2: dehydrateStaff(tr.auxTolva2),
    units: tr.units.map(u => ({ ...u, driver: dehydrateStaff(u.driver) }))
  }));

  useEffect(() => {
    if (isLoaded && lastLoadedKey.current === selectedDate) return;
    setIsLoaded(false);
    const savedStaff = localStorage.getItem(STAFF_KEY);
    const initialStaff = deduplicateStaff(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setStaffList(initialStaff);
    const savedOverrides = localStorage.getItem(`${OVERRIDES_KEY}${selectedDate}`);
    setDailyOverrides(savedOverrides ? JSON.parse(savedOverrides) : []);
    const dayRoutesRaw = localStorage.getItem(`${DAILY_DATA_KEY}${selectedDate}`);
    if (dayRoutesRaw) {
        setRecords(hydrateRecords(JSON.parse(dayRoutesRaw), initialStaff));
    } else {
        const adnHistoryRaw = localStorage.getItem(ADN_HISTORY_KEY);
        const adnHistory = adnHistoryRaw ? JSON.parse(adnHistoryRaw) : [];
        const applicableTemplate = adnHistory
            .filter((entry: any) => entry.date <= selectedDate)
            .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
        const adnMap = applicableTemplate ? applicableTemplate.mappings : {};
        const buildFromMaster = (master: any[], s: string, c: string) => master.map((m, idx) => {
            const zoneKey = `${s}-${m.zone}`;
            const adnOverride = adnMap[zoneKey] || {};
            return { id: `${selectedDate}-${m.zone}-${s}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: c as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findAndSnap(adnOverride.driver || m.driver, initialStaff), aux1: findAndSnap(adnOverride.aux1 || m.aux1, initialStaff), aux2: findAndSnap(adnOverride.aux2 || m.aux2, initialStaff), aux3: findAndSnap(adnOverride.aux3 || m.aux3, initialStaff), aux4: findAndSnap(adnOverride.aux4 || m.aux4, initialStaff), replacementDriver: findAndSnap(adnOverride.replacementDriver, initialStaff), replacementAux1: findAndSnap(adnOverride.replacementAux1, initialStaff), replacementAux2: findAndSnap(adnOverride.replacementAux2, initialStaff), supervisionReport: '' };
        });
        setRecords([...buildFromMaster(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...buildFromMaster(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...buildFromMaster(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...buildFromMaster(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...buildFromMaster(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...buildFromMaster(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')]);
    }
    const dayTrans = localStorage.getItem(`${DAILY_TRANS_KEY}${selectedDate}`);
    if (dayTrans) setTransferRecords(hydrateTransfers(JSON.parse(dayTrans), initialStaff));
    else {
        const cEmpty = (s: string): TransferRecord => ({ 
          id: `TR-${selectedDate}-${s}`, 
          shift: s as any, 
          units: [
            { id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, 
            { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, 
            { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }
          ], 
          maquinista: null, 
          maquinistaDomain: '', 
          auxTolva1: null, 
          auxTolva2: null, 
          auxTolva3: null, 
          auxTransferencia1: null, 
          auxTransferencia2: null, 
          encargado: null, 
          balancero1: null, 
          balancero2: null, 
          lonero: null, 
          suplenciaLona: null, 
          observaciones: '' 
        });
        setTransferRecords([cEmpty('MAÑANA'), cEmpty('TARDE'), cEmpty('NOCHE')]);
    }
    const dayMgrs = localStorage.getItem(`${DAILY_MGRS_KEY}${selectedDate}`);
    if (dayMgrs) setShiftManagers(JSON.parse(dayMgrs));
    lastLoadedKey.current = selectedDate;
    setIsLoaded(true);
  }, [selectedDate, findAndSnap, hydrateRecords, hydrateTransfers]);

  useEffect(() => {
    if (!isLoaded) return;
    setIsSaving(true);
    const timeout = setTimeout(() => {
        try {
            const pStaff = staffList;
            const pRecs = dehydrateRecords(records);
            const pTrans = dehydrateTransfers(transferRecords);
            localStorage.setItem(STAFF_KEY, JSON.stringify(pStaff));
            localStorage.setItem(`${OVERRIDES_KEY}${selectedDate}`, JSON.stringify(dailyOverrides));
            localStorage.setItem(`${DAILY_DATA_KEY}${selectedDate}`, JSON.stringify(pRecs)); 
            localStorage.setItem(`${DAILY_TRANS_KEY}${selectedDate}`, JSON.stringify(pTrans)); 
            localStorage.setItem(`${DAILY_MGRS_KEY}${selectedDate}`, JSON.stringify(shiftManagers));
            syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: pStaff });
            setIsSaving(false);
        } catch (e) {}
    }, 800);
    return () => clearTimeout(timeout);
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, isLoaded, dailyOverrides]);

  const handleUpdateStaff = useCallback((updated: StaffMember, originalId?: string) => {
    setStaffList(prev => {
      const idToFind = originalId || updated.id;
      return prev.map(s => s.id === idToFind ? updated : s);
    });
  }, []);

  // Función simplificada para alternar entre PRESENTE y FALTA directamente
  const handleToggleAbsence = (staff: StaffMember) => {
    const isCurrentlyAbsent = staff.status === StaffStatus.ABSENT;
    let updatedStaff: StaffMember;

    if (isCurrentlyAbsent) {
        // Estaba ausente, lo pasamos a PRESENTE (Quitamos falta)
        updatedStaff = { 
          ...staff, 
          status: StaffStatus.PRESENT, 
          address: '', 
          absenceStartDate: undefined, 
          absenceReturnDate: undefined, 
          isIndefiniteAbsence: false 
        };
    } else {
        // Estaba presente, le ponemos FALTA
        updatedStaff = { 
          ...staff, 
          status: StaffStatus.ABSENT, 
          address: 'FALTA' 
        };
    }

    // Actualizar padrón
    handleUpdateStaff(updatedStaff);
    
    // Si quitamos falta, nos aseguramos de que no esté en overrides del día
    if (isCurrentlyAbsent) {
        setDailyOverrides(prev => prev.filter(id => id !== updatedStaff.id));
    }

    // Actualizar todos los registros abiertos del día para que el cambio sea instantáneo y visual
    setRecords(prev => prev.map(r => {
        const up = (p: StaffMember | null) => (p && p.id === updatedStaff.id) ? updatedStaff : p;
        return { 
          ...r, 
          driver: up(r.driver), aux1: up(r.aux1), aux2: up(r.aux2), aux3: up(r.aux3), aux4: up(r.aux4), 
          replacementDriver: up(r.replacementDriver), replacementAux1: up(r.replacementAux1), replacementAux2: up(r.replacementAux2) 
        };
    }));
    
    setTransferRecords(prev => prev.map(tr => ({ 
      ...tr, 
      maquinista: (tr.maquinista?.id === updatedStaff.id) ? updatedStaff : tr.maquinista, 
      units: tr.units.map(u => u.driver?.id === updatedStaff.id ? { ...u, driver: updatedStaff } : u) as any 
    })));
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    const { type, targetId, field, unitIdx } = pickerState;
    if (type.includes('route')) setRecords(prev => prev.map(r => r.id === targetId ? { ...r, [field]: selectedStaff } : r));
    else if (type.includes('transfer')) setTransferRecords(prev => prev.map(tr => { if (tr.id !== targetId) return tr; if (field === 'units' && unitIdx !== undefined) { const u = [...tr.units] as any; u[unitIdx] = { ...u[unitIdx], driver: selectedStaff }; return { ...tr, units: u }; } return { ...tr, [field]: selectedStaff }; }));
    else if (type.includes('managers')) setShiftManagers(prev => ({ ...prev, [targetId]: { ...prev[targetId], [field]: selectedStaff ? selectedStaff.name : '' } }));
    setPickerState(null);
  };

  const handleSaveAsADN = () => {
    const mappings: Record<string, any> = {};
    records.forEach(r => {
      const zoneKey = `${r.shift}-${r.zone}`;
      mappings[zoneKey] = {
        driver: r.driver?.id || null,
        aux1: r.aux1?.id || null,
        aux2: r.aux2?.id || null,
        aux3: r.aux3?.id || null,
        aux4: r.aux4?.id || null,
        replacementDriver: r.replacementDriver?.id || null,
        replacementAux1: r.replacementAux1?.id || null,
        replacementAux2: r.replacementAux2?.id || null,
      };
    });
    const newEntry = { date: selectedDate, mappings };
    const adnHistoryRaw = localStorage.getItem(ADN_HISTORY_KEY);
    const adnHistory = adnHistoryRaw ? JSON.parse(adnHistoryRaw) : [];
    const existingIdx = adnHistory.findIndex((h: any) => h.date === selectedDate);
    if (existingIdx !== -1) adnHistory[existingIdx] = newEntry;
    else adnHistory.push(newEntry);
    localStorage.setItem(ADN_HISTORY_KEY, JSON.stringify(adnHistory));
    alert("Plantilla guardada correctamente.");
  };

  const sortedPickerList = useMemo(() => {
    if (!pickerState) return [];
    const search = pickerSearch.toLowerCase().trim();
    return staffList
      .filter(s => s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [staffList, pickerSearch, pickerState]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800 font-sans">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 z-[100] shadow-xl">
        <div className="p-6 border-b border-white/10 flex flex-col items-center">
            <div className="bg-white p-2 rounded-xl mb-3">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Logo" />
            </div>
            <h2 className="text-sm font-black italic tracking-tighter uppercase text-center leading-tight">G.I.R.S.U.<br/>QUILMES</h2>
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
              {isSaving && <div className="text-indigo-600 animate-pulse text-[8px] font-black uppercase tracking-widest">Guardando...</div>}
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center border rounded-full px-3 py-1.5 bg-slate-50 border-slate-200">
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronLeft size={16} /></button>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase px-1 w-28 text-center" />
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronRight size={16} /></button>
             </div>
             {activeTab === 'parte' && (
                <div className="flex items-center gap-2 border-l pl-3 ml-1">
                  <button onClick={handleSaveAsADN} className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition-all"><History size={18} /></button>
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
                        <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} staffList={staffList} onOpenPicker={(f, r, cid) => setPickerState({ type: 'managers', targetId: shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter, field: f, role: r, currentValueId: cid })} onUpdateStaff={handleToggleAbsence} />
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                       <div className="bg-white h-full border rounded-xl shadow-sm overflow-hidden flex flex-col">
                          {subTab === 'TRANSFERENCIA' ? (
                            <TransferTable data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(p => p.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, cid, uidx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: cid, unitIdx: uidx })} onUpdateStaff={handleToggleAbsence} presenceOverrides={dailyOverrides} />
                          ) : (
                            <ReportTable data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} onUpdateRecord={(id, f, v) => setRecords(p => p.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(p => p.filter(r => r.id !== id))} onOpenPicker={(id, field, role, cid) => setPickerState({ type: 'route', targetId: id, field, role, currentValueId: cid })} onUpdateStaff={handleToggleAbsence} selectedDate={selectedDate} activeShiftLabel={shiftFilter} presenceOverrides={dailyOverrides} />
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
                    <h3 className="text-xs font-black uppercase italic">Asignar {pickerState.role}</h3>
                    <button onClick={() => setPickerState(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={18} /></button>
                </div>
                <div className="p-4 border-b">
                    <input autoFocus type="text" placeholder="BUSCAR LEGAJO O NOMBRE..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full px-4 py-2 bg-slate-50 border rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sortedPickerList.length > 0 ? sortedPickerList.map(s => {
                        const isPadronAbsent = s.status === StaffStatus.ABSENT;
                        const isOverridden = dailyOverrides.includes(s.id);
                        return (
                            <div key={s.id} onClick={() => handlePickerSelection(s)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-all ${s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100'} ${isPadronAbsent && !isOverridden ? 'opacity-40 grayscale' : ''}`}>
                                <div>
                                    <p className="text-[10px] font-black uppercase leading-none">{s.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">LEG: {s.id} {isPadronAbsent && <span className="text-red-500 ml-2">[{s.address}]</span>} {isOverridden && <span className="text-indigo-500 ml-2">[EXCEPCIÓN HOY]</span>}</p>
                                </div>
                                <CheckCircle2 className={s.id === pickerState.currentValueId ? 'text-indigo-600' : 'text-slate-200'} size={16} />
                            </div>
                        );
                    }) : (<div className="text-center py-20 text-slate-300 font-black uppercase text-[10px]">Sin resultados</div>)}
                    <button onClick={() => handlePickerSelection(null)} className="w-full p-3 border-2 border-dashed border-slate-200 rounded-xl text-[9px] font-black text-red-500 uppercase hover:bg-red-50">Borrar Asignación</button>
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => { const newRec: RouteRecord = { id: `NEW-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'EXTRA', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }; setRecords(prev => [...prev, newRec]); }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
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
