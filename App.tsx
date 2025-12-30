
import React, { useState, useMemo, useEffect } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit, AbsenceReason } from './types';
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
    ClipboardList,
    Users,
    LogOut,
    Calendar as CalendarIcon,
    Search,
    Plus,
    CheckCircle2,
    X,
    UserMinus,
    RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftMetadataMap, setShiftMetadataMap] = useState<Record<string, ShiftMetadata>>({
    'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] },
    'TARDE': { supervisor: '', subSupervisor: '', absences: [] },
    'NOCHE': { supervisor: '', subSupervisor: '', absences: [] },
    'TODOS': { supervisor: '', subSupervisor: '', absences: [] }
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [pickerState, setPickerState] = useState<{ 
    type: 'route' | 'meta' | 'transfer',
    targetId: string, 
    field: string, 
    role: string,
    unitIdx?: number 
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [expandingAbsenceId, setExpandingAbsenceId] = useState<string | null>(null);

  // LOGICA DE PERSISTENCIA
  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `girsu_v7_${selectedDate}`;
    const savedData = localStorage.getItem(dateKey);
    const savedStaff = localStorage.getItem(`staff_v7_${selectedDate}`);
    const savedMeta = localStorage.getItem(`meta_v7_${selectedDate}`);
    const savedTrans = localStorage.getItem(`trans_v7_${selectedDate}`);

    setRecords(savedData ? JSON.parse(savedData) : generateInitialDayData(selectedDate));
    setStaffList(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setShiftMetadataMap(savedMeta ? JSON.parse(savedMeta) : {
        'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] },
        'TARDE': { supervisor: '', subSupervisor: '', absences: [] },
        'NOCHE': { supervisor: '', subSupervisor: '', absences: [] },
        'TODOS': { supervisor: '', subSupervisor: '', absences: [] }
    });
    setTransferRecords(savedTrans ? JSON.parse(savedTrans) : generateInitialTransferData(selectedDate));
    setIsLoaded(true);
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    const dateKey = `girsu_v7_${selectedDate}`;
    localStorage.setItem(dateKey, JSON.stringify(records));
    localStorage.setItem(`staff_v7_${selectedDate}`, JSON.stringify(staffList));
    localStorage.setItem(`meta_v7_${selectedDate}`, JSON.stringify(shiftMetadataMap));
    localStorage.setItem(`trans_v7_${selectedDate}`, JSON.stringify(transferRecords));
  }, [records, staffList, shiftMetadataMap, transferRecords, selectedDate, isLoaded]);

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

  const handleUpdateStaff = (updatedMember: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
  };

  const toggleStaffStatusFromPicker = (e: React.MouseEvent, staff: StaffMember, reason?: string) => {
    e.stopPropagation();
    const newStatus = staff.status === StaffStatus.ABSENT ? StaffStatus.PRESENT : StaffStatus.ABSENT;
    const updated = { ...staff, status: newStatus, address: newStatus === StaffStatus.ABSENT ? (reason || AbsenceReason.ARTICULO_95) : '' };
    handleUpdateStaff(updated);
    if (newStatus === StaffStatus.ABSENT) setExpandingAbsenceId(null);
  };

  const filteredRecords = useMemo(() => {
    let res = records.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter);
    if (subTab === 'GENERAL') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'REPASO') res = res.filter(r => r.category === 'REPASO_LATERAL' || r.category === 'CARGA LATERAL');
    if (searchTerm) res = res.filter(r => r.zone.toLowerCase().includes(searchTerm.toLowerCase()));
    return res;
  }, [records, shiftFilter, searchTerm, subTab]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden font-['Plus_Jakarta_Sans']">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" />
            </div>
            <h2 className="text-xl font-black tracking-tighter">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <SidebarItem active={activeTab === 'parte'} icon={<ClipboardList size={20} />} label="Parte Diario" onClick={() => setActiveTab('parte')} />
            <SidebarItem active={activeTab === 'personal'} icon={<Users size={20} />} label="Padrón Personal" onClick={() => setActiveTab('personal')} />
        </nav>
        <div className="p-6">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={18} /><span className="text-[10px] font-black uppercase">Salir</span></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
              <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">GIRSU OPERATIVO</h1>
              <div className="flex bg-slate-100 p-1 rounded-xl border">
                {(['MAÑANA', 'TARDE', 'NOCHE'] as const).map(s => (
                    <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border rounded-xl mr-2">
                <CalendarIcon size={14} className="text-indigo-500" />
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-600 outline-none uppercase" />
             </div>
             <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2"><CheckCircle2 size={16} /> Cierre</button>
             <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2"><Plus size={16} /> Nuevo</button>
          </div>
        </header>

        {/* BARRA DE CONTROL COMPACTA (UNA SOLA FILA) */}
        {activeTab === 'parte' && (
          <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center gap-4 shrink-0 z-30 shadow-sm overflow-x-auto custom-scrollbar">
              <div className="flex gap-1.5 shrink-0">
                  <SubTabButton active={subTab === 'GENERAL'} label="RECOLECCIÓN" onClick={() => setSubTab('GENERAL')} />
                  <SubTabButton active={subTab === 'REPASO'} label="REPASO" onClick={() => setSubTab('REPASO')} />
                  <SubTabButton active={subTab === 'TRANSFERENCIA'} label="TOLVA" onClick={() => setSubTab('TRANSFERENCIA')} />
              </div>

              <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>

              <ShiftManagersTop 
                  shift={shiftFilter} 
                  data={shiftMetadataMap[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} 
                  staffList={staffList}
                  onOpenPicker={(field, role) => setPickerState({ type: 'meta', targetId: 'meta', field, role })}
              />

              <div className="relative w-48 ml-auto shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input type="text" placeholder="FILTRAR..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black outline-none focus:bg-white transition-all uppercase" />
              </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden p-4 bg-[#f8fafc]">
            {activeTab === 'parte' ? (
                <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full">
                    {subTab === 'TRANSFERENCIA' ? (
                        <div className="flex-1 overflow-auto"><TransferTable data={transferRecords.filter(t => t.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} onOpenPicker={(id, field, role, unitIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx })} /></div>
                    ) : (
                        <div className="flex-1 overflow-hidden"><ReportTable data={filteredRecords} onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })} activeShiftLabel={`PARTE DIARIO - TURNO ${shiftFilter}`} /></div>
                    )}
                </div>
            ) : (
                <div className="h-full overflow-y-auto pr-4 custom-scrollbar"><StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(m) => setStaffList([...staffList, m])} onRemoveStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} /></div>
            )}
        </div>
      </main>

      {/* PICKER GLOBAL */}
      {pickerState && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
                <div className="bg-[#1e1b2e] p-8 text-white flex justify-between items-center shrink-0">
                    <div><h3 className="text-xl font-black uppercase tracking-widest italic">ASIGNAR {pickerState.role}</h3></div>
                    <button onClick={() => setPickerState(null)} className="p-3 hover:bg-white/10 rounded-2xl transition-all"><X size={28} /></button>
                </div>
                <div className="p-6 shrink-0 bg-slate-50 border-b">
                    <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} /><input autoFocus type="text" placeholder="BUSCAR POR NOMBRE O LEGAJO..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-12 pr-6 py-5 bg-white border-2 border-slate-100 rounded-2xl text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                    {staffList.filter(s => s.name.toLowerCase().includes(pickerSearch.toLowerCase()) || s.id.includes(pickerSearch)).map(s => (
                        <div key={s.id} className="relative group">
                            <button 
                                onClick={() => {
                                    if (pickerState.type === 'route') {
                                        setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: s } : r));
                                    } else if (pickerState.type === 'meta') {
                                        setShiftMetadataMap(prev => ({ ...prev, [shiftFilter]: { ...prev[shiftFilter], [pickerState.field]: s.name } }));
                                    } else if (pickerState.type === 'transfer') {
                                        setTransferRecords(prev => prev.map(tr => {
                                            if (tr.id === pickerState.targetId) {
                                                if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
                                                    const newUnits = [...tr.units] as [TransferUnit, TransferUnit, TransferUnit];
                                                    newUnits[pickerState.unitIdx] = { ...newUnits[pickerState.unitIdx], driver: s };
                                                    return { ...tr, units: newUnits };
                                                }
                                                return { ...tr, [pickerState.field]: s };
                                            }
                                            return tr;
                                        }));
                                    }
                                    setPickerState(null);
                                    setPickerSearch('');
                                }}
                                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-left bg-white border-slate-50 hover:border-indigo-200 shadow-sm`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${s.id.startsWith('F') ? 'bg-pink-50 text-pink-500' : 'bg-indigo-50 text-indigo-500'}`}>{s.name.charAt(0)}</div>
                                    <div><p className="text-[13px] font-black uppercase text-slate-800 leading-none">{s.name}</p><p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest leading-none">LEGAJO: {s.id}</p></div>
                                </div>
                                {s.status === StaffStatus.ABSENT ? (
                                    <span className="text-[9px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-lg border border-red-100 uppercase">{s.address || 'FALTA'}</span>
                                ) : (
                                    <div onClick={(e) => { e.stopPropagation(); setExpandingAbsenceId(expandingAbsenceId === s.id ? null : s.id); }} className="p-3 rounded-xl transition-all shadow-sm bg-red-500 text-white hover:bg-red-600"><UserMinus size={16} /></div>
                                )}
                            </button>
                            {expandingAbsenceId === s.id && (
                                <div className="mt-2 p-4 bg-white border-2 border-red-100 rounded-[2rem] shadow-xl grid grid-cols-2 gap-2">
                                    {Object.values(AbsenceReason).map(reason => (
                                        <button key={reason} onClick={(e) => toggleStaffStatusFromPicker(e, s, reason)} className="px-4 py-3 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl text-[9px] font-black uppercase text-red-600 transition-all border border-red-100">{reason}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => {
            const newRoute: RouteRecord = { id: `${z}-${s}-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'MANUAL', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' };
            setRecords([...records, newRoute]);
      }} currentShift={shiftFilter} />
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-[#7c3aed] text-white shadow-xl' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
        <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest italic">{label}</span>
    </button>
);

const SubTabButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-[9px] font-black rounded-xl transition-all border-2 shrink-0 ${active ? 'bg-[#1a1625] text-white border-[#1a1625] shadow-lg italic' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

export default App;
