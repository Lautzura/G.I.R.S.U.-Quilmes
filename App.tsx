
import React, { useState, useMemo, useEffect } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { 
    STAFF_DB, 
    MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA,
    MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA,
    EXTRA_STAFF 
} from './constants';
import { 
    Truck,
    ClipboardList,
    Users,
    LogOut,
    Calendar as CalendarIcon,
    Search,
    ChevronLeft,
    ChevronRight,
    Save,
    RotateCcw,
    Plus,
    CheckCircle2,
    X
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftMetadata, setShiftMetadata] = useState<ShiftMetadata>({ supervisor: '', subSupervisor: '', absences: [] });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  // Estado para el buscador global de personal
  const [pickerState, setPickerState] = useState<{ 
    type: 'route' | 'meta' | 'transfer',
    targetId: string, 
    field: string, 
    role: string,
    unitIdx?: number 
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Sincronización Padrón -> Parte Operativo y Tolva
  const handleUpdateStaff = (updatedMember: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
    setRecords(prev => prev.map(r => ({
      ...r,
      driver: r.driver?.id === updatedMember.id ? updatedMember : r.driver,
      aux1: r.aux1?.id === updatedMember.id ? updatedMember : r.aux1,
      aux2: r.aux2?.id === updatedMember.id ? updatedMember : r.aux2,
      aux3: r.aux3?.id === updatedMember.id ? updatedMember : r.aux3,
      aux4: r.aux4?.id === updatedMember.id ? updatedMember : r.aux4,
      replacementDriver: r.replacementDriver?.id === updatedMember.id ? updatedMember : r.replacementDriver,
      replacementAux1: r.replacementAux1?.id === updatedMember.id ? updatedMember : r.replacementAux1,
      replacementAux2: r.replacementAux2?.id === updatedMember.id ? updatedMember : r.replacementAux2,
    })));
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta zona del parte?')) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const generateInitialDayData = (date: string) => {
    const createRecord = (m: any, shift: string, category: any): RouteRecord => ({
        id: `${m.zone}-${shift}-${date}-${Math.random()}`, 
        zone: m.zone, internalId: m.interno || '', domain: m.domain || '',
        reinforcement: m.ref || 'Vacio', departureTime: m.time || '', dumpTime: '', tonnage: m.ton || '',
        shift: shift as any, zoneStatus: ZoneStatus.PENDING, order: 0, category: category,
        driver: m.driver ? (STAFF_DB[m.driver] || null) : null,
        aux1: m.aux1 ? (STAFF_DB[m.aux1] || null) : null,
        aux2: m.aux2 ? (STAFF_DB[m.aux2] || null) : null,
        aux3: m.aux3 ? (STAFF_DB[m.aux3] || null) : null,
        aux4: m.aux4 ? (STAFF_DB[m.aux4] || null) : null,
        replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: m.report || ''
    });

    return [
        ...MANANA_MASTER_DATA.map(m => createRecord(m, 'MAÑANA', 'RECOLECCIÓN')),
        ...MANANA_REPASO_DATA.map(m => createRecord(m, 'MAÑANA', 'REPASO_LATERAL')),
        ...TARDE_MASTER_DATA.map(m => createRecord(m, 'TARDE', 'RECOLECCIÓN')),
        ...TARDE_REPASO_DATA.map(m => createRecord(m, 'TARDE', 'REPASO_LATERAL')),
        ...NOCHE_MASTER_DATA.map(m => createRecord(m, 'NOCHE', 'RECOLECCIÓN')),
        ...NOCHE_REPASO_DATA.map(m => createRecord(m, 'NOCHE', 'REPASO_LATERAL'))
    ];
  };

  const generateInitialTransferData = (date: string): TransferRecord[] => {
    return (['MAÑANA', 'TARDE', 'NOCHE'] as const).map(shift => ({
        id: `trans-${shift}-${date}`, shift: shift,
        units: [
            { id: '1', driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] },
            { id: '2', driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] },
            { id: '3', driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] }
        ],
        maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null,
        auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null,
        lonero: null, suplenciaLona: null, observaciones: ''
    }));
  };

  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `girsu_v6_${selectedDate}`;
    const savedData = localStorage.getItem(dateKey);
    const savedStaff = localStorage.getItem(`staff_v6_${selectedDate}`);
    const savedMeta = localStorage.getItem(`meta_v6_${selectedDate}`);
    const savedTrans = localStorage.getItem(`trans_v6_${selectedDate}`);

    setRecords(savedData ? JSON.parse(savedData) : generateInitialDayData(selectedDate));
    setStaffList(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setShiftMetadata(savedMeta ? JSON.parse(savedMeta) : { supervisor: '', subSupervisor: '', absences: [] });
    setTransferRecords(savedTrans ? JSON.parse(savedTrans) : generateInitialTransferData(selectedDate));
    setIsLoaded(true);
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    const dateKey = `girsu_v6_${selectedDate}`;
    localStorage.setItem(dateKey, JSON.stringify(records));
    localStorage.setItem(`staff_v6_${selectedDate}`, JSON.stringify(staffList));
    localStorage.setItem(`meta_v6_${selectedDate}`, JSON.stringify(shiftMetadata));
    localStorage.setItem(`trans_v6_${selectedDate}`, JSON.stringify(transferRecords));
  }, [records, staffList, shiftMetadata, transferRecords, selectedDate, isLoaded]);

  const filteredRecords = useMemo(() => {
    let res = records.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter);
    if (subTab === 'GENERAL') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'REPASO') res = res.filter(r => r.category === 'REPASO_LATERAL' || r.category === 'CARGA LATERAL');
    if (searchTerm) res = res.filter(r => r.zone.toLowerCase().includes(searchTerm.toLowerCase()) || r.internalId.includes(searchTerm));
    return res;
  }, [records, shiftFilter, searchTerm, subTab]);

  const handleSelectFromPicker = (staff: StaffMember | null) => {
    if (!pickerState) return;

    if (pickerState.type === 'route') {
      setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: staff } : r));
    } else if (pickerState.type === 'meta') {
      setShiftMetadata(prev => ({ ...prev, [pickerState.field]: staff ? staff.name : '' }));
    } else if (pickerState.type === 'transfer') {
      setTransferRecords(prev => prev.map(tr => {
        if (tr.id === pickerState.targetId) {
          if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
            const newUnits = [...tr.units] as [TransferUnit, TransferUnit, TransferUnit];
            newUnits[pickerState.unitIdx] = { ...newUnits[pickerState.unitIdx], driver: staff };
            return { ...tr, units: newUnits };
          }
          return { ...tr, [pickerState.field]: staff };
        }
        return tr;
      }));
    }

    setPickerState(null);
    setPickerSearch('');
  };

  const filteredStaffForPicker = useMemo(() => {
    return staffList.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(pickerSearch.toLowerCase()) || s.id.includes(pickerSearch);
      return matchesSearch;
    }).sort((a, b) => {
      if (a.status === StaffStatus.ABSENT && b.status !== StaffStatus.ABSENT) return 1;
      if (a.status !== StaffStatus.ABSENT && b.status === StaffStatus.ABSENT) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [staffList, pickerSearch]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8 text-center border-b border-white/5">
            <div className="flex flex-col items-center gap-2">
                <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20"><Truck size={24} /></div>
                <div>
                    <h2 className="text-xl font-black tracking-tighter">EcoParque</h2>
                    <p className="text-[8px] font-bold text-emerald-500 uppercase tracking-[0.3em]">Gestión GIRSU</p>
                </div>
            </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <SidebarItem active={activeTab === 'parte'} icon={<ClipboardList size={20} />} label="Parte Operativo" onClick={() => setActiveTab('parte')} />
            <SidebarItem active={activeTab === 'personal'} icon={<Users size={20} />} label="Padrón Personal" onClick={() => setActiveTab('personal')} />
        </nav>
        <div className="p-6">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-4 text-red-400 hover:bg-red-500/10 rounded-2xl transition-all border border-transparent hover:border-red-500/20 group">
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="text-[10px] font-black uppercase tracking-widest">Cerrar Sesión</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-40 shadow-sm">
          <div className="flex items-center gap-6">
              <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
                      {activeTab === 'parte' ? 'Parte Operativo' : 'Padrón de Personal'}
                  </h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-orange-400'}`}></div>
                    {isToday ? 'EN VIVO' : `${selectedDate.split('-').reverse().join('/')}`}
                  </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft size={16} /></button>
                  <div className="flex items-center gap-2 px-2">
                      <CalendarIcon size={14} className="text-indigo-500" />
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-600 outline-none uppercase cursor-pointer" />
                  </div>
                  <button disabled={isToday} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className={`p-1.5 rounded-lg transition-all ${isToday ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white text-slate-400 hover:text-indigo-600'}`}><ChevronRight size={16} /></button>
              </div>
          </div>

          <div className="flex items-center gap-2">
             <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <CheckCircle2 size={16} /> Cierre Turno
             </button>
             <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-[#6366f1] text-white px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <Plus size={16} /> Añadir Ruta
             </button>
             <button className="bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest">
                <Save size={16} /> Guardar
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-4 bg-[#f8fafc] flex flex-col gap-4">
            <div className="max-w-[1800px] w-full mx-auto flex flex-col h-full space-y-4">
                {activeTab === 'parte' && (
                    <>
                        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm space-y-4 shrink-0">
                            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
                                    {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                                        <button key={s} onClick={() => setShiftFilter(s)} className={`px-6 py-2 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                                    ))}
                                </div>
                                <div className="relative flex-1 max-w-xl">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input type="text" placeholder="BUSCAR RUTA, INTERNO O PERSONAL..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all uppercase placeholder:text-slate-300" />
                                </div>
                            </div>
                            <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <SubTabButton active={subTab === 'GENERAL'} label="RECOLECCIÓN" onClick={() => setSubTab('GENERAL')} />
                                    <SubTabButton active={subTab === 'REPASO'} label="REPASO / LATERAL" onClick={() => setSubTab('REPASO')} />
                                    <SubTabButton active={subTab === 'TRANSFERENCIA'} label="TOLVA" onClick={() => setSubTab('TRANSFERENCIA')} />
                                </div>
                                <div className="flex-1 flex items-center gap-4">
                                    <ShiftManagersTop 
                                        shift={shiftFilter} 
                                        data={shiftMetadata} 
                                        onOpenPicker={(field, role) => setPickerState({ type: 'meta', targetId: 'meta', field, role })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-[2rem] shadow-2xl border border-slate-200 overflow-hidden min-h-0">
                            {subTab === 'TRANSFERENCIA' ? (
                                <div className="h-full overflow-auto">
                                  <TransferTable 
                                      data={transferRecords.filter(t => shiftFilter === 'TODOS' || t.shift === shiftFilter)} 
                                      staffList={staffList} 
                                      onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                                      onOpenPicker={(id, field, role, unitIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx })}
                                  />
                                </div>
                            ) : (
                                <ReportTable 
                                    data={filteredRecords} 
                                    staffList={staffList} 
                                    onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                                    onDeleteRecord={handleDeleteRecord}
                                    onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })}
                                    activeShiftLabel={isToday ? `Operación ${subTab}` : `Archivo ${subTab}`}
                                />
                            )}
                        </div>
                    </>
                )}

                {activeTab === 'personal' && (
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                      <StaffManagement 
                          staffList={staffList} 
                          onUpdateStaff={handleUpdateStaff} 
                          onAddStaff={(m) => setStaffList([...staffList, m])} 
                          onRemoveStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} 
                          records={records} 
                          selectedShift={shiftFilter} 
                      />
                    </div>
                )}
            </div>
        </div>
      </main>

      {/* MODAL GLOBAL DE SELECCIÓN DE PERSONAL */}
      {pickerState && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Users className="text-indigo-400" />
                        <h3 className="text-lg font-black uppercase tracking-widest leading-none">ASIGNAR {pickerState.role}</h3>
                    </div>
                    <button onClick={() => setPickerState(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={24} /></button>
                </div>
                <div className="p-8">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input autoFocus type="text" placeholder="BUSCAR POR NOMBRE O LEGAJO..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all" />
                    </div>
                    <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        <button onClick={() => handleSelectFromPicker(null)} className="w-full p-4 text-center text-red-500 font-black text-[11px] uppercase border-2 border-red-50 rounded-2xl hover:bg-red-50 transition-all mb-4">Quitar Selección Actual</button>
                        {filteredStaffForPicker.map(s => (
                            <button key={s.id} onClick={() => handleSelectFromPicker(s)} className="w-full flex items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                                <div className="text-left">
                                    <p className="text-[12px] font-black text-slate-800 uppercase leading-none group-hover:text-indigo-700 transition-colors">{s.name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">LEGAJO: {s.id} • {s.role}</p>
                                </div>
                                <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl ${s.status === StaffStatus.ABSENT ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-500 border border-emerald-100'}`}>{s.status}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => {
            const newRoute: RouteRecord = { id: `${z}-${s}-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'Manual', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: subTab === 'REPASO' ? 'REPASO_LATERAL' : 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' };
            setRecords([...records, newRoute]);
        }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-5 px-6 py-4 rounded-[1.2rem] transition-all duration-300 ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40 translate-x-1' : 'text-slate-500 hover:text-white hover:bg-white/5 hover:translate-x-1'}`}>
        <span className={active ? 'text-white' : 'text-slate-600'}>{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

const SubTabButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`px-5 py-2 text-[9px] font-black rounded-xl transition-all border-2 ${active ? 'bg-[#111827] text-white border-[#111827] shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

export default App;
