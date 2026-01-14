
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
// Fix: Match the file name 'hybriddataservice.ts' exactly to resolve casing conflict in the compilation environment
import { HybridDataService } from './services/hybriddataservice';
import { DayData } from './services/DataService';
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
    Database,
    Wand2,
    Calendar,
    RotateCcw,
    Globe,
    WifiOff
} from 'lucide-react';

const syncChannel = new BroadcastChannel('girsu_sync_v27');

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
  const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.1.0.250:8080';
  
  const dataService = useMemo(() => new HybridDataService(API_URL), [API_URL]);
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA' | 'MAESTRO'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [shiftManagers, setShiftManagers] = useState<Record<string, ShiftMetadata>>({
    MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
    TARDE: { supervisor: '', subSupervisor: '', absences: [] },
    NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
  });

  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerState, setPickerState] = useState<{ type: string, targetId: string, field: string, role: string, currentValueId?: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  const findStaffSecure = useCallback((searchId: any, currentStaff: StaffMember[]) => {
    if (!searchId) return null;
    const query = String(searchId).trim().toUpperCase();
    return currentStaff.find(s => String(s.id).trim().toUpperCase() === query) || currentStaff.find(s => s.name.toUpperCase().includes(query)) || null;
  }, []);

  const mapStaffToIds = useCallback((recs: any[], currentStaff: StaffMember[]) => recs.map((r: any) => ({
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

  const createEmptyTrans = useCallback((s: string): TransferRecord => ({ 
    id: `TR-${s}`, shift: s as any, 
    units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, 
    maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' 
  }), []);

  const getInitialRecordsFromConstants = useCallback((list: StaffMember[]) => {
    const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ 
        id: `${m.zone}-${shift}-${idx}-${Date.now()}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findStaffSecure(m.driver, list), aux1: findStaffSecure(m.aux1, list), aux2: findStaffSecure(m.aux2, list), aux3: findStaffSecure(m.aux3, list), aux4: findStaffSecure(m.aux4, list), replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' 
    }));
    return [...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')];
  }, [findStaffSecure]);

  const loadDayData = async (date: string, staff: StaffMember[]) => {
    const dayData = await dataService.loadDay(date);
    setIsOnline(dataService.isOnline);
    if (!dayData) {
      setRecords(getInitialRecordsFromConstants(staff));
      setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
      setShiftManagers({
        MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
        TARDE: { supervisor: '', subSupervisor: '', absences: [] },
        NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
      });
      return;
    }
    setRecords(mapStaffToIds(dayData.records, staff));
    setTransferRecords(dayData.transfers.map(tr => ({
        ...tr,
        maquinista: findStaffSecure(tr.maquinista, staff),
        encargado: findStaffSecure(tr.encargado, staff),
        balancero1: findStaffSecure(tr.balancero1, staff),
        auxTolva1: findStaffSecure(tr.auxTolva1, staff),
        auxTolva2: findStaffSecure(tr.auxTolva2, staff),
        units: tr.units.map((u: any) => ({
          ...u,
          driver: findStaffSecure(u.driver, staff),
          trips: u.trips || [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }]
        })) as [TransferUnit, TransferUnit, TransferUnit]
    })));
    setShiftManagers(dayData.managers);
  };

  const loadMasterData = async (staff: StaffMember[]) => {
    const masterData = await dataService.loadMaster();
    setIsOnline(dataService.isOnline);
    if (!masterData) {
      setRecords(getInitialRecordsFromConstants(staff));
      setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
      setShiftManagers({
        MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
        TARDE: { supervisor: '', subSupervisor: '', absences: [] },
        NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
      });
      return;
    }
    setRecords(mapStaffToIds(masterData.records, staff));
    setTransferRecords(masterData.transfers.map(tr => ({
        ...tr,
        maquinista: findStaffSecure(tr.maquinista, staff),
        encargado: findStaffSecure(tr.encargado, staff),
        balancero1: findStaffSecure(tr.balancero1, staff),
        auxTolva1: findStaffSecure(tr.auxTolva1, staff),
        auxTolva2: findStaffSecure(tr.auxTolva2, staff),
        units: tr.units.map((u: any) => ({
          ...u,
          driver: findStaffSecure(u.driver, staff),
          trips: u.trips || [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }]
        })) as [TransferUnit, TransferUnit, TransferUnit]
    })));
    setShiftManagers(masterData.managers);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      const staffRaw = await dataService.loadStaff();
      setIsOnline(dataService.isOnline);
      const initialStaff = deduplicateStaff(staffRaw.length ? staffRaw : EXTRA_STAFF);
      setStaffList(initialStaff);
      if (subTab === 'MAESTRO') await loadMasterData(initialStaff);
      else await loadDayData(selectedDate, initialStaff);
      setIsLoaded(true);
    };
    loadData();
  }, [selectedDate, subTab]);

  const serializeDayData = useCallback((): DayData => ({
    records: records.map(r => ({
      ...r,
      driver: (r.driver?.id as any) || null,
      aux1: (r.aux1?.id as any) || null,
      aux2: (r.aux2?.id as any) || null,
      aux3: (r.aux3?.id as any) || null,
      aux4: (r.aux4?.id as any) || null,
      replacementDriver: (r.replacementDriver?.id as any) || null,
      replacementAux1: (r.replacementAux1?.id as any) || null,
      replacementAux2: (r.replacementAux2?.id as any) || null,
    })),
    transfers: transferRecords.map(tr => ({
      ...tr,
      maquinista: (tr.maquinista?.id as any) || null,
      encargado: (tr.encargado?.id as any) || null,
      balancero1: (tr.balancero1?.id as any) || null,
      auxTolva1: (tr.auxTolva1?.id as any) || null,
      auxTolva2: (tr.auxTolva2?.id as any) || null,
      units: tr.units.map(u => ({
        ...u,
        driver: (u.driver?.id as any) || null
      }))
    })) as any,
    managers: shiftManagers
  }), [records, transferRecords, shiftManagers]);

  useEffect(() => {
    if (!isLoaded) return;
    setIsSaving(true);
    const timeout = setTimeout(async () => {
      try {
        await dataService.saveStaff(staffList);
        const data = serializeDayData();
        if (subTab === 'MAESTRO') await dataService.saveMaster(data);
        else await dataService.saveDay(selectedDate, data);
        setIsOnline(dataService.isOnline);
        syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: staffList });
      } catch (e) {
        setIsOnline(false);
      } finally {
        setIsSaving(false);
      }
    }, 1500); 
    return () => clearTimeout(timeout);
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, subTab, isLoaded, dataService, serializeDayData]);

  const handleUpdateStaff = useCallback((updatedMember: StaffMember, originalId?: string) => {
    const idToFind = String(originalId || updatedMember.id).trim();
    setStaffList(prev => deduplicateStaff(prev.map(s => String(s.id).trim() === idToFind ? updatedMember : s)));

    setRecords(prev => prev.map(r => {
      const match = (s: StaffMember | null) => s?.id === idToFind;
      if (!match(r.driver) && !match(r.aux1) && !match(r.aux2) && !match(r.aux3) && !match(r.aux4) && 
          !match(r.replacementDriver) && !match(r.replacementAux1) && !match(r.replacementAux2)) return r;
      return {
        ...r,
        driver: match(r.driver) ? updatedMember : r.driver,
        aux1: match(r.aux1) ? updatedMember : r.aux1,
        aux2: match(r.aux2) ? updatedMember : r.aux2,
        aux3: match(r.aux3) ? updatedMember : r.aux3,
        aux4: match(r.aux4) ? updatedMember : r.aux4,
        replacementDriver: match(r.replacementDriver) ? updatedMember : r.replacementDriver,
        replacementAux1: match(r.replacementAux1) ? updatedMember : r.replacementAux1,
        replacementAux2: match(r.replacementAux2) ? updatedMember : r.replacementAux2,
      };
    }));

    setTransferRecords(prev => prev.map(tr => {
      const match = (s: StaffMember | null) => s?.id === idToFind;
      const unitsMatch = tr.units.some(u => match(u.driver));
      if (!match(tr.maquinista) && !match(tr.encargado) && !match(tr.balancero1) && 
          !match(tr.auxTolva1) && !match(tr.auxTolva2) && !unitsMatch) return tr;
      return {
        ...tr,
        maquinista: match(tr.maquinista) ? updatedMember : tr.maquinista,
        encargado: match(tr.encargado) ? updatedMember : tr.encargado,
        balancero1: match(tr.balancero1) ? updatedMember : tr.balancero1,
        auxTolva1: match(tr.auxTolva1) ? updatedMember : tr.auxTolva1,
        auxTolva2: match(tr.auxTolva2) ? updatedMember : tr.auxTolva2,
        units: tr.units.map(u => match(u.driver) ? { ...u, driver: updatedMember } : u) as any
      };
    }));
  }, []);

  const handleApplyMasterData = async () => {
    if (window.confirm("¿Cargar ADN Maestro? Sobrescribirá el día actual.")) {
        const adnData = await dataService.loadMaster();
        if (adnData) {
            setRecords(mapStaffToIds(adnData.records, staffList));
            setTransferRecords(adnData.transfers.map((tr: any) => ({ 
                ...tr, 
                maquinista: findStaffSecure(tr.maquinista, staffList), 
                encargado: findStaffSecure(tr.encargado, staffList), 
                balancero1: findStaffSecure(tr.balancero1, staffList), 
                auxTolva1: findStaffSecure(tr.auxTolva1, staffList), 
                auxTolva2: findStaffSecure(tr.auxTolva2, staffList), 
                units: tr.units.map((u:any) => ({ ...u, driver: findStaffSecure(u.driver, staffList), trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] })) 
            })));
            setShiftManagers(adnData.managers);
        }
    }
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    const { type, targetId, field, unitIdx } = pickerState;
    if (type.includes('route')) setRecords(prev => prev.map(r => r.id === targetId ? { ...r, [field]: selectedStaff } : r));
    else if (type.includes('transfer')) setTransferRecords(prev => prev.map(tr => { if (tr.id !== targetId) return tr; if (field === 'units' && unitIdx !== undefined) { const u = [...tr.units]; u[unitIdx] = { ...u[unitIdx], driver: selectedStaff }; return { ...tr, units: u as any }; } return { ...tr, [field]: selectedStaff }; }));
    else if (type.includes('managers')) setShiftManagers(prev => ({ ...prev, [targetId]: { ...prev[targetId], [field]: selectedStaff ? selectedStaff.name : '' } }));
    setPickerState(null);
  };

  const sortedPickerList = useMemo(() => {
      const query = pickerSearch.trim().toLowerCase();
      let filtered = staffList.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
      return filtered.sort((a, b) => { const isASelected = a.id === pickerState?.currentValueId; const isBSelected = b.id === pickerState?.currentValueId; if (isASelected && !isBSelected) return -1; if (!isASelected && isBSelected) return 1; return a.name.localeCompare(b.name); }).slice(0, 40);
  }, [staffList, pickerSearch, pickerState?.currentValueId]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800 font-sans">
      <aside className={`w-64 bg-[#0f172a] text-white flex flex-col shrink-0 z-[100] shadow-2xl`}>
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-3"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black italic text-white uppercase leading-none tracking-tight">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">G.I.R.S.U.</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <NavButton active={activeTab === 'parte'} onClick={() => setActiveTab('parte')} icon={<ClipboardList size={18}/>} label="Parte Diario" />
            <NavButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={<Users size={18}/>} label="Personal" />
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
            <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Conectividad</p>
            {isOnline ? (
                <div className="px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-3">
                    <Globe size={14} className="text-emerald-400" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase leading-none">Servidor Activo (Red)</span>
                </div>
            ) : (
                <div className="px-4 py-2 bg-amber-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-3 animate-pulse">
                    <WifiOff size={14} className="text-amber-400" />
                    <span className="text-[8px] font-black text-amber-400 uppercase leading-none">Modo Local (Sin Red)</span>
                </div>
            )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shrink-0 shadow-sm z-[90]">
          <div className="flex items-center gap-4">
              <h1 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{activeTab === 'parte' ? 'Parte Diario' : 'Personal'}</h1>
              {isSaving && <div className="text-indigo-600 animate-pulse text-[8px] font-black uppercase tracking-widest">Sincronizando...</div>}
              {!isOnline && <div className="text-amber-600 text-[8px] font-black uppercase tracking-widest border border-amber-200 px-2 py-1 rounded bg-amber-50">Guardado Local Activado</div>}
          </div>
          
          <div className="flex items-center gap-4 relative z-[100]">
             {activeTab === 'parte' && (
               <div className="flex items-center gap-4">
                 <div className="flex items-center border rounded-full px-5 py-2.5 bg-white border-slate-200 shadow-sm transition-all hover:border-slate-300">
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronLeft size={18} /></button>
                    <div className="flex items-center gap-2 px-4 border-x mx-2">
                        <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight w-24 text-center">
                            {selectedDate.split('-').reverse().join('/')}
                        </span>
                        <Calendar size={14} className="text-slate-400" />
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronRight size={18} /></button>
                    
                    <button 
                        onClick={() => setSelectedDate(today)}
                        title="Ir a Hoy"
                        className="ml-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                    >
                        <RotateCcw size={14} />
                    </button>
                 </div>

                 <div className="flex items-center gap-3">
                    <button onClick={handleApplyMasterData} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm hover:bg-indigo-100 transition-all border border-indigo-100" title="Cargar ADN Maestro">
                        <Wand2 size={22} />
                    </button>

                    <button 
                        onClick={() => setSubTab(subTab === 'MAESTRO' ? 'GENERAL' : 'MAESTRO')}
                        className={`p-4 rounded-2xl shadow-md transition-all ${subTab === 'MAESTRO' ? 'bg-indigo-900 text-white' : 'bg-amber-500 text-white shadow-amber-200'}`}
                        title="Editar Plantilla ADN Maestro"
                    >
                        <Database size={22} />
                    </button>

                    <button onClick={() => setIsNewRouteModalOpen(true)} className="p-4 bg-[#1e293b] text-white rounded-2xl shadow-md hover:bg-indigo-600 transition-all" title="Añadir Nueva Ruta">
                        <Plus size={22} />
                    </button>

                    <button onClick={() => setIsCloseModalOpen(true)} className="p-4 bg-emerald-600 text-white rounded-2xl shadow-md hover:bg-emerald-700 transition-all" title="Ver Zonas Incompletas">
                        <CheckCircle2 size={22} />
                    </button>
                 </div>
               </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
            {isLoaded ? (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                  <div className="px-6 py-2 bg-white border-b flex items-center gap-4 shrink-0">
                      <div className="flex p-0.5 bg-slate-100 rounded-lg">
                          {['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'].map(f => <button key={f} onClick={() => setShiftFilter(f as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${shiftFilter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{f}</button>)}
                      </div>
                      {activeTab === 'parte' && (
                        <div className="flex p-0.5 bg-slate-100 rounded-lg">
                            {['GENERAL', 'REPASO', 'TRANSFERENCIA'].map(t => (
                                <button key={t} onClick={() => setSubTab(t as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${subTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>
                            ))}
                        </div>
                      )}
                      {activeTab === 'parte' && shiftFilter !== 'TODOS' && subTab !== 'MAESTRO' && (
                         <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter]} staffList={staffList} onOpenPicker={(f, r, cid) => setPickerState({ type: 'managers', targetId: shiftFilter, field: f, role: r, currentValueId: cid })} onUpdateStaff={handleUpdateStaff} />
                      )}
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'personal' ? (
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        <StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => setStaffList(prev => deduplicateStaff([...prev, s]))} onRemoveStaff={id => setStaffList(prev => prev.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-hidden flex flex-col p-4 relative">
                         <div className={`flex-1 bg-white border rounded-[2rem] shadow-sm overflow-hidden flex flex-col ${subTab === 'MAESTRO' ? 'border-amber-300 ring-4 ring-amber-50' : ''}`}>
                            {subTab === 'MAESTRO' && (
                                <div className="bg-amber-500 text-white px-6 py-3 flex items-center justify-between shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
                                        <Database size={14} /> Editando Plantilla ADN Maestro (Cambios guardados local y remoto)
                                    </span>
                                    <button onClick={() => setSubTab('GENERAL')} className="text-[9px] font-black bg-white/20 px-3 py-1 rounded-lg uppercase">Salir de edición</button>
                                </div>
                            )}
                            <div className="flex-1 overflow-hidden flex flex-col">
                              {(subTab as any) === 'TRANSFERENCIA' ? (
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                  <TransferTable isMasterMode={subTab === 'MAESTRO'} data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(p => p.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, cid, uidx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: cid, unitIdx: uidx })} onUpdateStaff={handleUpdateStaff} />
                                </div>
                              ) : (
                                <ReportTable 
                                  isMasterMode={subTab === 'MAESTRO'} 
                                  data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' || subTab === 'MAESTRO' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} 
                                  onUpdateRecord={(id, f, v) => setRecords(p => p.map(r => r.id === id ? {...r, [f]: v} : r))} 
                                  onDeleteRecord={id => setRecords(p => p.filter(r => r.id !== id))} 
                                  onOpenPicker={(id, field, role, cid) => setPickerState({ type: 'route', targetId: id, field, role, currentValueId: cid })} 
                                  onUpdateStaff={handleUpdateStaff} 
                                  selectedDate={selectedDate} 
                                  activeShiftLabel={shiftFilter} 
                                />
                              )}
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center"><RefreshCcw className="animate-spin text-indigo-600" /></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3"><Users className="text-indigo-400" size={24} /><h3 className="text-xl font-black uppercase italic tracking-tight">Seleccionar {pickerState.role}</h3></div>
                    <button onClick={() => setPickerState(null)} className="p-2 hover:bg-white/10 rounded-xl"><RefreshCcw size={24} className="rotate-45" /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"> Quitar</button>
                    <div className="relative flex-1 group"><input autoFocus type="text" placeholder="LEGAJO O APELLIDO..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-6 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-100 transition-all uppercase" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc]">
                    {sortedPickerList.length > 0 ? sortedPickerList.map(s => (
                        <div key={s.id} onClick={() => s.status !== StaffStatus.ABSENT && handlePickerSelection(s)} className={`p-5 rounded-2xl border-2 bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-transparent hover:border-indigo-400 hover:bg-indigo-50/20'} ${s.status === StaffStatus.ABSENT ? getAbsenceStyles(s.address || 'FALTA') : (s.id === pickerState.currentValueId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${s.status === StaffStatus.ABSENT ? getAbsenceStyles(s.address || 'FALTA') : (s.id === pickerState.currentValueId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}`}>{s.name.charAt(0)}</div>
                                <div><h4 className="text-[12px] font-black uppercase text-slate-800 tracking-tight leading-none">{s.name}</h4><p className="text-[9px] font-bold text-slate-400 mt-2">LEGAJO: {s.id} {s.status === StaffStatus.ABSENT && <span className="text-red-500 ml-2">[{s.address}]</span>}</p></div>
                            </div>
                        </div>
                    )) : (<div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200"><p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin resultados</p></div>)}
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => { setRecords(prev => [...prev, { id: `NEW-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'EXTRA', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }]); }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
     {icon}
     <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const getAbsenceStyles = (reason: string) => {
    const r = (reason || '').toUpperCase();
    if (r.includes('INJUSTIFICADA') || r.includes('95') || r.includes('SUSPENSION')) return 'bg-red-900 text-white border-red-950 font-black shadow-inner';
    if (r.includes('VACACIONES')) return 'bg-amber-600 text-white border-amber-700 font-black shadow-inner';
    if (r.includes('MEDICA') || r.includes('ART')) return 'bg-blue-800 text-white border-blue-900 font-black shadow-inner';
    return 'bg-slate-700 text-white border-slate-800 font-black shadow-inner';
};

export default App;
