
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { IDataService } from './services/DataService';
import { DayDataDTO } from './dtos/RouteDTO';
import { createEmptyTransfer } from './domain/transferFactory';
import { createInitialRouteRecords, createRouteRecord } from './domain/routeFactory';
import { dayDataDTOToState, stateToDayDataDTO } from './services/dayMapper';
import { EXTRA_STAFF } from './constants';
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
    WifiOff,
    Save
} from 'lucide-react';

// Canal de sincronización universal
const syncChannel = new BroadcastChannel('sync_channel');

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

/**
 * Función CRÍTICA: Calcula el estado de un colaborador para una fecha específica.
 * Si tiene una falta cargada pero la fecha de consulta está fuera del rango, 
 * devuelve el estado PRESENTE, pero mantiene el registro en el padrón.
 */
export const getEffectiveStaffStatus = (staff: StaffMember, targetDate: string): StaffStatus => {
    if (staff.status !== StaffStatus.ABSENT) return staff.status;
    
    const startDate = staff.absenceStartDate;
    const returnDate = staff.absenceReturnDate;

    // Si no hay fechas definidas, es una falta puntual "eterna" hasta cambio manual
    if (!startDate) return StaffStatus.ABSENT;

    // 1. Antes de empezar la falta -> PRESENTE (Falta futura programada)
    if (targetDate < startDate) return StaffStatus.PRESENT;

    // 2. Si es indefinida y ya empezó -> AUSENTE
    if (staff.isIndefiniteAbsence) return StaffStatus.ABSENT;

    // 3. Si hay fecha de regreso y ya se cumplió -> PRESENTE (Falta finalizada)
    if (returnDate && targetDate >= returnDate) return StaffStatus.PRESENT;

    // 4. En cualquier otro caso dentro del rango -> AUSENTE
    return StaffStatus.ABSENT;
};

interface AppProps {
  dataService: IDataService;
}

const App: React.FC<AppProps> = ({ dataService }) => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA' | 'MAESTRO'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(dataService.isOnline);
  
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

  // Mapeamos el staff list para que el Parte Diario refleje el estado dinámico
  const effectiveStaffList = useMemo(() => {
    return staffList.map(s => ({
        ...s,
        status: getEffectiveStaffStatus(s, selectedDate)
    }));
  }, [staffList, selectedDate]);

  useEffect(() => {
    const handleSync = (event: MessageEvent) => {
      if (event.data.type === 'STAFF_UPDATE') {
        setStaffList(deduplicateStaff(event.data.payload));
      }
    };
    syncChannel.addEventListener('message', handleSync);
    return () => syncChannel.removeEventListener('message', handleSync);
  }, []);

  const hydrateDayData = useCallback((dto: DayDataDTO, staff: StaffMember[]) => {
    const state = dayDataDTOToState(dto, staff);
    setRecords(state.records);
    setTransferRecords(state.transfers);
    setShiftManagers(state.managers);
  }, []);

  const initDefaultDay = useCallback((staff: StaffMember[]) => {
    setRecords(createInitialRouteRecords(staff));
    setTransferRecords([
      createEmptyTransfer('MAÑANA'), 
      createEmptyTransfer('TARDE'), 
      createEmptyTransfer('NOCHE')
    ]);
    setShiftManagers({
      MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
      TARDE: { supervisor: '', subSupervisor: '', absences: [] },
      NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
    });
  }, []);

  const loadDayData = async (date: string, staff: StaffMember[]) => {
    const dto = await dataService.loadDay(date);
    setIsOnline(dataService.isOnline);
    if (dto) {
      hydrateDayData(dto, staff);
      return;
    }
    const masterDto = await dataService.loadMaster();
    if (masterDto) {
      hydrateDayData(masterDto, staff);
      return;
    }
    initDefaultDay(staff);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoaded(false);
      const staffRaw = await dataService.loadStaff();
      setIsOnline(dataService.isOnline);
      const initialStaff = deduplicateStaff(staffRaw.length ? staffRaw : EXTRA_STAFF);
      setStaffList(initialStaff);

      if (subTab === 'MAESTRO') {
        const dto = await dataService.loadMaster();
        if (dto) hydrateDayData(dto, initialStaff);
        else initDefaultDay(initialStaff);
      } else {
        await loadDayData(selectedDate, initialStaff);
      }
      setIsLoaded(true);
    };
    loadData();
  }, [selectedDate, subTab, dataService]);

  // Autoguardado
  useEffect(() => {
    if (!isLoaded) return;
    setIsSaving(true);
    const timeout = setTimeout(async () => {
      try {
        await dataService.saveStaff(staffList);
        const dto = stateToDayDataDTO(records, transferRecords, shiftManagers);
        if (subTab === 'MAESTRO') {
          await dataService.saveMaster(dto);
        } else {
          await dataService.saveDay(selectedDate, dto);
        }
        setIsOnline(dataService.isOnline);
      } catch (e) {
        setIsOnline(false);
      } finally {
        setIsSaving(false);
      }
    }, 1500); 
    return () => clearTimeout(timeout);
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, subTab, isLoaded, dataService]);

  const onAddStaff = useCallback(async (newMember: StaffMember) => {
    const updatedList = deduplicateStaff([...staffList, newMember]);
    setStaffList(updatedList);
    try {
      await dataService.saveStaff(updatedList);
      setIsOnline(dataService.isOnline);
      syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: updatedList });
    } catch (e) {
      setIsOnline(false);
    }
  }, [staffList, dataService]);

  const onBulkAddStaff = useCallback(async (newStaff: StaffMember[]) => {
    const updatedList = deduplicateStaff([...staffList, ...newStaff]);
    setStaffList(updatedList);
    try {
      await dataService.saveStaff(updatedList);
      setIsOnline(dataService.isOnline);
      syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: updatedList });
      alert(`Importación exitosa.`);
    } catch (e) {
      setIsOnline(false);
    }
  }, [staffList, dataService]);

  const handleUpdateStaff = useCallback((updatedMember: StaffMember, originalId?: string) => {
    const idToFind = String(originalId || updatedMember.id).trim();
    const updatedList = deduplicateStaff(staffList.map(s => String(s.id).trim() === idToFind ? updatedMember : s));
    setStaffList(updatedList);
    
    syncChannel.postMessage({ type: 'STAFF_UPDATE', payload: updatedList });
  }, [staffList]);

  const handleApplyMasterData = async () => {
    if (window.confirm("¿Cargar ADN Maestro?")) {
        const dto = await dataService.loadMaster();
        if (dto) hydrateDayData(dto, staffList);
        else alert("Sin ADN Maestro.");
    }
  };

  const handleSaveAsMaster = async () => {
    if (window.confirm("¿Guardar como ADN Maestro?")) {
      const dto = stateToDayDataDTO(records, transferRecords, shiftManagers);
      await dataService.saveMaster(dto);
      alert("ADN Maestro guardado.");
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
      // Usamos effectiveStaffList para que el selector sepa quién está realmente de falta HOY
      let filtered = effectiveStaffList.filter(s => s.name.toLowerCase().includes(query) || s.id.toLowerCase().includes(query));
      return filtered.sort((a, b) => { const isASelected = a.id === pickerState?.currentValueId; const isBSelected = b.id === pickerState?.currentValueId; if (isASelected && !isBSelected) return -1; if (!isASelected && isBSelected) return 1; return a.name.localeCompare(b.name); }).slice(0, 40);
  }, [effectiveStaffList, pickerSearch, pickerState?.currentValueId]);

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
                    <span className="text-[8px] font-black text-emerald-400 uppercase leading-none">Servidor Activo</span>
                </div>
            ) : (
                <div className="px-4 py-2 bg-amber-500/10 rounded-lg border border-emerald-500/20 flex items-center gap-3 animate-pulse">
                    <WifiOff size={14} className="text-amber-400" />
                    <span className="text-[8px] font-black text-amber-400 uppercase leading-none">Modo Local</span>
                </div>
            )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b px-8 flex items-center justify-between shrink-0 shadow-sm z-[90]">
          <div className="flex items-center gap-4">
              <h1 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{activeTab === 'parte' ? 'Parte Diario' : 'Personal'}</h1>
              {isSaving && <div className="text-indigo-600 animate-pulse text-[8px] font-black uppercase tracking-widest">Sincronizando...</div>}
          </div>
          <div className="flex items-center gap-4 relative z-[100]">
             {activeTab === 'parte' && (
               <div className="flex items-center gap-4">
                 <div className="flex items-center border rounded-full px-5 py-2.5 bg-white border-slate-200 shadow-sm transition-all hover:border-slate-300">
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronLeft size={18} /></button>
                    <div className="flex items-center gap-2 px-4 border-x mx-2">
                        <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight w-24 text-center">{selectedDate.split('-').reverse().join('/')}</span>
                        <Calendar size={14} className="text-slate-400" />
                    </div>
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1 text-slate-400 hover:text-indigo-600"><ChevronRight size={18} /></button>
                    <button onClick={() => setSelectedDate(today)} title="Hoy" className="ml-4 p-2 bg-slate-50 text-slate-400 rounded-full hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><RotateCcw size={14} /></button>
                 </div>
                 <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button onClick={handleApplyMasterData} className="p-3 text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" title="Cargar ADN Maestro"><Wand2 size={20} /></button>
                        <button onClick={handleSaveAsMaster} className="p-3 text-emerald-600 hover:bg-white hover:shadow-sm rounded-xl transition-all" title="Guardar como ADN Maestro"><Save size={20} /></button>
                    </div>
                    <button onClick={() => setSubTab(subTab === 'MAESTRO' ? 'GENERAL' : 'MAESTRO')} className={`p-4 rounded-2xl shadow-md transition-all ${subTab === 'MAESTRO' ? 'bg-indigo-900 text-white' : 'bg-amber-500 text-white shadow-amber-200'}`} title="Plantilla ADN"><Database size={22} /></button>
                    <button onClick={() => setIsNewRouteModalOpen(true)} className="p-4 bg-[#1e293b] text-white rounded-2xl shadow-md hover:bg-indigo-600 transition-all" title="Nueva Ruta"><Plus size={22} /></button>
                    <button onClick={() => setIsCloseModalOpen(true)} className="p-4 bg-emerald-600 text-white rounded-2xl shadow-md hover:bg-emerald-700 transition-all" title="Zonas Incompletas"><CheckCircle2 size={22} /></button>
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
                            {['GENERAL', 'REPASO', 'TRANSFERENCIA'].map(t => (<button key={t} onClick={() => setSubTab(t as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-md transition-all ${subTab === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{t}</button>))}
                        </div>
                      )}
                      {activeTab === 'parte' && shiftFilter !== 'TODOS' && subTab !== 'MAESTRO' && (
                         <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter]} staffList={effectiveStaffList} onOpenPicker={(f, r, cid) => setPickerState({ type: 'managers', targetId: shiftFilter, field: f, role: r, currentValueId: cid })} onUpdateStaff={handleUpdateStaff} />
                      )}
                  </div>
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'personal' ? (
                      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 custom-scrollbar">
                        {/* Pasamos staffList original para NO perder datos en el EditModal, pero incluimos selectedDate para lógica visual */}
                        <StaffManagement 
                            staffList={staffList} 
                            onUpdateStaff={handleUpdateStaff} 
                            onAddStaff={onAddStaff} 
                            onBulkAddStaff={onBulkAddStaff} 
                            onRemoveStaff={id => setStaffList(prev => prev.filter(s => s.id !== id))} 
                            records={records} 
                            selectedShift={shiftFilter} 
                            searchTerm={searchTerm} 
                            onSearchChange={setSearchTerm} 
                            selectedDate={selectedDate}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 overflow-hidden flex flex-col p-4 relative">
                         <div className={`flex-1 bg-white border rounded-[2rem] shadow-sm overflow-hidden flex flex-col ${subTab === 'MAESTRO' ? 'border-amber-300 ring-4 ring-amber-50' : ''}`}>
                            <div className="flex-1 overflow-hidden flex flex-col">
                              {(subTab as any) === 'TRANSFERENCIA' ? (
                                <div className="flex-1 overflow-auto custom-scrollbar">
                                  <TransferTable isMasterMode={subTab === 'MAESTRO'} data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(p => p.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, cid, uidx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: cid, unitIdx: uidx })} onUpdateStaff={handleUpdateStaff} />
                                </div>
                              ) : (
                                <ReportTable isMasterMode={subTab === 'MAESTRO'} data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'MAESTRO' ? true : subTab === 'GENERAL' ? (r.category === 'RECOLECCIÓN' || !r.category) : r.category === 'REPASO_LATERAL'))} onUpdateRecord={(id, f, v) => setRecords(p => p.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(p => p.filter(r => r.id !== id))} onOpenPicker={(id, field, role, cid) => setPickerState({ type: 'route', targetId: id, field, role, currentValueId: cid })} onUpdateStaff={handleUpdateStaff} selectedDate={selectedDate} activeShiftLabel={shiftFilter} />
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
                    <button onClick={() => setPickerState(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><RefreshCcw size={24} className="rotate-45" /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all shadow-sm"> Quitar</button>
                    <div className="relative flex-1 group"><input autoFocus type="text" placeholder="LEGAJO O APELLIDO..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-6 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-100 transition-all uppercase" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc]">
                    {sortedPickerList.length > 0 ? sortedPickerList.map(s => {
                        // Aquí verificamos si está AUSENTE para la fecha seleccionada
                        const isAbsentToday = s.status === StaffStatus.ABSENT;
                        
                        return (
                            <div 
                                key={s.id} 
                                onClick={() => !isAbsentToday && handlePickerSelection(s)} 
                                className={`p-5 rounded-2xl border-2 bg-white shadow-sm flex items-center justify-between transition-all ${
                                    isAbsentToday ? 'opacity-50 grayscale cursor-not-allowed bg-slate-50 border-slate-100' :
                                    s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50 shadow-md cursor-pointer' : 
                                    'border-transparent hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${isAbsentToday ? 'bg-red-900 text-white' : 'bg-slate-100'}`}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="text-[12px] font-black uppercase text-slate-800 tracking-tight leading-none">{s.name}</h4>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2">LEGAJO: {s.id}</p>
                                    </div>
                                </div>
                                {isAbsentToday && (
                                    <div className="bg-red-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
                                        AUSENTE: {s.address}
                                    </div>
                                )}
                            </div>
                        );
                    }) : (<div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200"><p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin resultados</p></div>)}
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => { setRecords(prev => [...prev, createRouteRecord({ zone: z, shift: s as any, order: records.length, category: 'RECOLECCIÓN' })]); }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
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
