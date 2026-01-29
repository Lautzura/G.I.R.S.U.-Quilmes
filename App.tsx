
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { AbsenceChoiceModal } from './components/AbsenceChoiceModal';
import { DashboardStats } from './components/DashboardStats';
import { GeminiInsight } from './components/GeminiInsight';
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
    CassetteTape,
    History
} from 'lucide-react';

const syncChannel = new BroadcastChannel('girsu_sync_v33');
const DB_PREFIX = 'girsu_v33_'; 
const STAFF_KEY = `${DB_PREFIX}staff`;
const ADN_HISTORY_KEY = `${DB_PREFIX}adn_timeline`; // Nuevo historial de plantillas
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
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA' | 'RESUMEN'>('GENERAL');
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
  const [absenceChoice, setAbsenceChoice] = useState<StaffMember | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  // --- LÓGICA DE SNAPSHOTS Y ADN CRONOLÓGICO ---
  const findAndSnap = useCallback((stored: any, list: StaffMember[]) => {
    if (!stored) return null;
    const id = typeof stored === 'string' ? stored : (stored.id || null);
    if (!id) return null;
    
    const baseInPadron = list.find(s => s.id === id);
    
    // SNAPSHOT: Si tiene status, es una "foto" guardada del día.
    if (typeof stored === 'object' && stored.status !== undefined) {
        return {
            ...(baseInPadron || { id, name: stored.name || 'DESC.' }),
            name: stored.name || baseInPadron?.name || 'DESC.',
            status: stored.status,
            address: stored.address || ''
        } as StaffMember;
    }
    
    // ADN/REFRESH: Si no es snapshot, usamos el estado actual del Padrón.
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

  // --- CARGA DE DATOS ---
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
        // PRIORIDAD 1: Si el día ya tiene datos grabados (Snapshot), los cargamos tal cual
        setRecords(hydrateRecords(JSON.parse(dayRoutesRaw), initialStaff));
    } else {
        // PRIORIDAD 2: Si es un día virgen, buscamos en la línea de tiempo del ADN
        const adnHistoryRaw = localStorage.getItem(ADN_HISTORY_KEY);
        const adnHistory = adnHistoryRaw ? JSON.parse(adnHistoryRaw) : [];
        
        // Encontrar la plantilla más reciente que sea IGUAL o ANTERIOR a la fecha seleccionada
        const applicableTemplate = adnHistory
            .filter((entry: any) => entry.date <= selectedDate)
            .sort((a: any, b: any) => b.date.localeCompare(a.date))[0];
        
        const adnMap = applicableTemplate ? applicableTemplate.mappings : {};

        const buildFromMaster = (master: any[], s: string, c: string) => master.map((m, idx) => {
            const zoneKey = `${s}-${m.zone}`;
            const adnOverride = adnMap[zoneKey] || {};
            
            return { 
                id: `${selectedDate}-${m.zone}-${s}-${idx}`, 
                zone: m.zone, 
                internalId: m.interno || '', 
                domain: m.domain || '', 
                reinforcement: 'MASTER', 
                shift: s as any, 
                departureTime: '', dumpTime: '', tonnage: '', 
                category: c as any, 
                zoneStatus: ZoneStatus.PENDING, 
                order: idx, 
                // Si el ADN tiene a alguien, lo usamos. Si no, usamos el MASTER_DATA original.
                driver: findAndSnap(adnOverride.driver || m.driver, initialStaff), 
                aux1: findAndSnap(adnOverride.aux1 || m.aux1, initialStaff), 
                aux2: findAndSnap(adnOverride.aux2 || m.aux2, initialStaff), 
                aux3: findAndSnap(adnOverride.aux3 || m.aux3, initialStaff), 
                aux4: findAndSnap(adnOverride.aux4 || m.aux4, initialStaff), 
                replacementDriver: findAndSnap(adnOverride.replacementDriver, initialStaff), 
                replacementAux1: findAndSnap(adnOverride.replacementAux1, initialStaff), 
                replacementAux2: findAndSnap(adnOverride.replacementAux2, initialStaff), 
                supervisionReport: '' 
            };
        });

        setRecords([
            ...buildFromMaster(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), 
            ...buildFromMaster(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), 
            ...buildFromMaster(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), 
            ...buildFromMaster(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), 
            ...buildFromMaster(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), 
            ...buildFromMaster(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')
        ]);
    }

    // Transferencias
    const dayTrans = localStorage.getItem(`${DAILY_TRANS_KEY}${selectedDate}`);
    if (dayTrans) {
        setTransferRecords(hydrateTransfers(JSON.parse(dayTrans), initialStaff));
    } else {
        const cEmpty = (s: string): TransferRecord => ({ id: `TR-${selectedDate}-${s}`, shift: s as any, units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' });
        setTransferRecords([cEmpty('MAÑANA'), cEmpty('TARDE'), cEmpty('NOCHE')]);
    }

    const dayMgrs = localStorage.getItem(`${DAILY_MGRS_KEY}${selectedDate}`);
    if (dayMgrs) setShiftManagers(JSON.parse(dayMgrs));
    
    lastLoadedKey.current = selectedDate;
    setIsLoaded(true);
  }, [selectedDate, findAndSnap, hydrateRecords, hydrateTransfers]);

  // --- AUTO-GUARDADO (SNAPSHOTS) ---
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

  // --- GUARDADO DE ADN CRONOLÓGICO ---
  const handleSaveAsADN = () => {
    if (!confirm(`¿Deseas grabar este personal como ADN Maestro A PARTIR del ${selectedDate}? Esto afectará a todos los días futuros que aún no hayas editado.`)) return;
    
    const adnHistoryRaw = localStorage.getItem(ADN_HISTORY_KEY);
    let adnHistory = adnHistoryRaw ? JSON.parse(adnHistoryRaw) : [];
    
    const newMappings: Record<string, any> = {};
    records.forEach(r => {
        const zoneKey = `${r.shift}-${r.zone}`;
        newMappings[zoneKey] = {
            driver: r.driver?.id || null,
            aux1: r.aux1?.id || null,
            aux2: r.aux2?.id || null,
            aux3: r.aux3?.id || null,
            aux4: r.aux4?.id || null,
            replacementDriver: r.replacementDriver?.id || null,
            replacementAux1: r.replacementAux1?.id || null,
            replacementAux2: r.replacementAux2?.id || null
        };
    });

    // Filtramos si ya existía una entrada para el mismo día para no duplicar
    adnHistory = adnHistory.filter((entry: any) => entry.date !== selectedDate);
    
    // Agregamos la nueva versión del ADN
    adnHistory.push({
        date: selectedDate,
        mappings: newMappings
    });

    // Guardamos la línea de tiempo ordenada
    adnHistory.sort((a: any, b: any) => a.date.localeCompare(b.date));
    localStorage.setItem(ADN_HISTORY_KEY, JSON.stringify(adnHistory));
    
    alert(`Plantilla grabada exitosamente. A partir del ${selectedDate}, el sistema sugerirá este personal.`);
  };

  const handleUpdateStaff = useCallback((updated: StaffMember, originalId?: string) => {
    setStaffList(prev => {
      const idToFind = originalId || updated.id;
      return prev.map(s => s.id === idToFind ? updated : s);
    });
  }, []);

  const handleAbsenceDecision = (decision: 'ONLY_TODAY' | 'DEFINITIVE') => {
    if (!absenceChoice) return;
    if (decision === 'DEFINITIVE') {
        handleUpdateStaff({ ...absenceChoice, status: StaffStatus.PRESENT, address: '', absenceStartDate: undefined, absenceReturnDate: undefined, isIndefiniteAbsence: false });
    } else {
        setRecords(prev => prev.map(r => {
            const up = (p: StaffMember | null) => (p && p.id === absenceChoice.id) ? { ...p, status: StaffStatus.PRESENT, address: 'EXCEPCIÓN' } : p;
            return { ...r, driver: up(r.driver), aux1: up(r.aux1), aux2: up(r.aux2), aux3: up(r.aux3), aux4: up(r.aux4), replacementDriver: up(r.replacementDriver), replacementAux1: up(r.replacementAux1), replacementAux2: up(r.replacementAux2) };
        }));
        setTransferRecords(prev => prev.map(tr => ({ ...tr, maquinista: (tr.maquinista?.id === absenceChoice.id) ? { ...tr.maquinista, status: StaffStatus.PRESENT, address: 'EXCEPCIÓN' } : tr.maquinista, units: tr.units.map(u => u.driver?.id === absenceChoice.id ? { ...u, driver: { ...u.driver, status: StaffStatus.PRESENT, address: 'EXCEPCIÓN' } } : u) as any })));
        setDailyOverrides(prev => [...new Set([...prev, absenceChoice.id])]);
    }
    setAbsenceChoice(null);
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    const { type, targetId, field, unitIdx } = pickerState;
    if (type.includes('route')) setRecords(prev => prev.map(r => r.id === targetId ? { ...r, [field]: selectedStaff } : r));
    else if (type.includes('transfer')) setTransferRecords(prev => prev.map(tr => { if (tr.id !== targetId) return tr; if (field === 'units' && unitIdx !== undefined) { const u = [...tr.units] as any; u[unitIdx] = { ...u[unitIdx], driver: selectedStaff }; return { ...tr, units: u }; } return { ...tr, [field]: selectedStaff }; }));
    else if (type.includes('managers')) setShiftManagers(prev => ({ ...prev, [targetId]: { ...prev[targetId], [field]: selectedStaff ? selectedStaff.name : '' } }));
    setPickerState(null);
  };

  const sortedPickerList = useMemo(() => {
      const query = pickerSearch.trim().toLowerCase();
      let filtered = staffList.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
      return filtered.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 40);
  }, [staffList, pickerSearch]);

  const dashboardData = useMemo(() => {
    if (shiftFilter === 'TODOS') return records;
    return records.filter(r => r.shift === shiftFilter);
  }, [records, shiftFilter]);

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
                  <button onClick={handleSaveAsADN} title="Grabar Plantilla ADN Cronológico" className="bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200">
                    <History size={18} />
                    <span className="text-[9px] font-black uppercase">Fijar ADN</span>
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
                            {['GENERAL', 'REPASO', 'TRANSFERENCIA', 'RESUMEN'].map(t => <button key={t} onClick={() => setSubTab(t as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${subTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>)}
                        </div>
                        {subTab !== 'RESUMEN' && <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} staffList={staffList} onOpenPicker={(f, r, cid) => setPickerState({ type: 'managers', targetId: shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter, field: f, role: r, currentValueId: cid })} onUpdateStaff={handleUpdateStaff} />}
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                       <div className="bg-white h-full border rounded-xl shadow-sm overflow-hidden flex flex-col">
                          {subTab === 'TRANSFERENCIA' ? (
                            <TransferTable data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(p => p.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, cid, uidx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: cid, unitIdx: uidx })} onUpdateStaff={setAbsenceChoice} presenceOverrides={dailyOverrides} />
                          ) : subTab === 'RESUMEN' ? (
                            <div className="h-full overflow-y-auto p-8 space-y-8 bg-slate-50/30 custom-scrollbar">
                                <DashboardStats data={dashboardData} />
                                <GeminiInsight data={dashboardData} />
                            </div>
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
                                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-1 tracking-widest">LEG: {s.id} {isPadronAbsent && <span className="text-red-500 ml-2">[{s.address}]</span>} {isOverridden && <span className="text-indigo-500 ml-2">[EXCEPCIÓN HOY]</span>}</p>
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

      <AbsenceChoiceModal staff={absenceChoice} onClose={() => setAbsenceChoice(null)} onDecision={handleAbsenceDecision} />
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
