
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
    History,
    Save,
    RotateCcw,
    Plus,
    CheckCircle2
} from 'lucide-react';

const App: React.FC = () => {
  // Estados principales
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Estados de datos
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftMetadata, setShiftMetadata] = useState<ShiftMetadata>({ supervisor: '', subSupervisor: '', absences: [] });
  
  // Estados de UI
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  // Sincronización Padrón -> Parte
  const handleUpdateStaff = (updatedMember: StaffMember) => {
    // 1. Actualizar la lista maestra de personal
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));

    // 2. Sincronizar con todas las rutas del Parte Operativo
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

    // 3. Sincronizar con el Sistema de Transferencia
    setTransferRecords(prev => prev.map(tr => ({
      ...tr,
      maquinista: tr.maquinista?.id === updatedMember.id ? updatedMember : tr.maquinista,
      encargado: tr.encargado?.id === updatedMember.id ? updatedMember : tr.encargado,
      balancero1: tr.balancero1?.id === updatedMember.id ? updatedMember : tr.balancero1,
      balancero2: tr.balancero2?.id === updatedMember.id ? updatedMember : tr.balancero2,
      auxTolva1: tr.auxTolva1?.id === updatedMember.id ? updatedMember : tr.auxTolva1,
      auxTolva2: tr.auxTolva2?.id === updatedMember.id ? updatedMember : tr.auxTolva2,
      auxTolva3: tr.auxTolva3?.id === updatedMember.id ? updatedMember : tr.auxTolva3,
      auxTransferencia1: tr.auxTransferencia1?.id === updatedMember.id ? updatedMember : tr.auxTransferencia1,
      auxTransferencia2: tr.auxTransferencia2?.id === updatedMember.id ? updatedMember : tr.auxTransferencia2,
      lonero: tr.lonero?.id === updatedMember.id ? updatedMember : tr.lonero,
      suplenciaLona: tr.suplenciaLona?.id === updatedMember.id ? updatedMember : tr.suplenciaLona,
      units: tr.units.map(u => ({
        ...u,
        driver: u.driver?.id === updatedMember.id ? updatedMember : u.driver
      })) as [TransferUnit, TransferUnit, TransferUnit]
    })));
  };

  // Generador de datos iniciales
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

  // Persistencia
  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `girsu_v4_${selectedDate}`;
    const savedData = localStorage.getItem(dateKey);
    const savedStaff = localStorage.getItem(`staff_v4_${selectedDate}`);
    const savedMeta = localStorage.getItem(`meta_v4_${selectedDate}`);
    const savedTrans = localStorage.getItem(`trans_v4_${selectedDate}`);

    setRecords(savedData ? JSON.parse(savedData) : generateInitialDayData(selectedDate));
    setStaffList(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setShiftMetadata(savedMeta ? JSON.parse(savedMeta) : { supervisor: '', subSupervisor: '', absences: [] });
    setTransferRecords(savedTrans ? JSON.parse(savedTrans) : generateInitialTransferData(selectedDate));
    setIsLoaded(true);
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    const dateKey = `girsu_v4_${selectedDate}`;
    localStorage.setItem(dateKey, JSON.stringify(records));
    localStorage.setItem(`staff_v4_${selectedDate}`, JSON.stringify(staffList));
    localStorage.setItem(`meta_v4_${selectedDate}`, JSON.stringify(shiftMetadata));
    localStorage.setItem(`trans_v4_${selectedDate}`, JSON.stringify(transferRecords));
  }, [records, staffList, shiftMetadata, transferRecords, selectedDate, isLoaded]);

  const filteredRecords = useMemo(() => {
    let res = records.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter);
    if (subTab === 'GENERAL') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'REPASO') res = res.filter(r => r.category === 'REPASO_LATERAL' || r.category === 'CARGA LATERAL');
    if (searchTerm) res = res.filter(r => r.zone.toLowerCase().includes(searchTerm.toLowerCase()) || r.internalId.includes(searchTerm));
    return res;
  }, [records, shiftFilter, searchTerm, subTab]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8">
            <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20"><Truck size={20} /></div>
                <div>
                    <h2 className="text-lg font-black tracking-tighter leading-none">EcoParque</h2>
                    <p className="text-[7px] font-bold text-emerald-500/70 uppercase tracking-[0.3em] mt-1 text-center">Gestión GIRSU</p>
                </div>
            </div>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
            <SidebarItem active={activeTab === 'parte'} icon={<ClipboardList size={18} />} label="Parte Operativo" onClick={() => setActiveTab('parte')} />
            <SidebarItem active={activeTab === 'personal'} icon={<Users size={18} />} label="Padrón Personal" onClick={() => setActiveTab('personal')} />
        </nav>
        <div className="p-6 border-t border-white/5">
            <button className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                <LogOut size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Salir</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 z-30 shadow-md">
          <div className="flex items-center gap-8">
              <div>
                  <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase leading-none">
                      {activeTab === 'parte' ? 'Operaciones Diarias' : 'Administración Personal'}
                  </h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500 animate-pulse' : 'bg-orange-50'}`}></div>
                    {isToday ? 'Turno en Vivo' : `Archivo: ${selectedDate.split('-').reverse().join('/')}`}
                  </p>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                  <button onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm border border-transparent hover:border-slate-100"><ChevronLeft size={16} /></button>
                  <div className="flex items-center gap-2 px-3">
                      <CalendarIcon size={14} className="text-indigo-500" />
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-600 outline-none uppercase cursor-pointer" />
                  </div>
                  <button disabled={isToday} onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className={`p-2 rounded-xl transition-all ${isToday ? 'opacity-20' : 'hover:bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-transparent hover:border-slate-100'}`}><ChevronRight size={16} /></button>
                  {!isToday && <button onClick={() => setSelectedDate(todayStr)} className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"><RotateCcw size={12} /> HOY</button>}
              </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <CheckCircle2 size={18} /> Cerrar Turno
             </button>
             <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-[#6366f1] text-white px-5 py-3 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <Plus size={18} /> Añadir Ruta
             </button>
             <button className="bg-slate-800 text-white px-5 py-3 rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <Save size={18} /> Guardar
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-[#f8fafc] p-8">
            <div className="max-w-[1600px] mx-auto space-y-6">
                {activeTab === 'parte' && (
                    <div className="flex flex-col gap-6">
                        <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm space-y-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-100 pb-6">
                                <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-inner">
                                    {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                                        <button key={s} onClick={() => setShiftFilter(s)} className={`px-8 py-2.5 text-[10px] font-black rounded-2xl transition-all ${shiftFilter === s ? 'bg-white shadow-xl text-indigo-600 scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
                                    ))}
                                </div>
                                <div className="relative flex-1 max-w-xl">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                    <input type="text" placeholder="BUSCAR RUTA, INTERNO O PERSONAL..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all uppercase placeholder:text-slate-300" />
                                </div>
                            </div>
                            <div className="flex flex-col xl:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-3">
                                    <SubTabButton active={subTab === 'GENERAL'} label="GENERAL" onClick={() => setSubTab('GENERAL')} />
                                    <SubTabButton active={subTab === 'REPASO'} label="REPASO / LATERAL" onClick={() => setSubTab('REPASO')} />
                                    <SubTabButton active={subTab === 'TRANSFERENCIA'} label="TRANSFERENCIA" onClick={() => setSubTab('TRANSFERENCIA')} />
                                </div>
                                <div className="flex-1 flex items-center gap-6">
                                    <ShiftManagersTop shift={shiftFilter} data={shiftMetadata} onChange={(f, v) => setShiftMetadata(prev => ({...prev, [f]: v}))} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px] animate-in fade-in duration-500">
                            {subTab === 'TRANSFERENCIA' ? (
                                <TransferTable data={transferRecords.filter(t => shiftFilter === 'TODOS' || t.shift === shiftFilter)} staffList={staffList} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} />
                            ) : (
                                <ReportTable data={filteredRecords} staffList={staffList} onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} activeShiftLabel={isToday ? `Operación ${subTab} (${shiftFilter})` : `Historial ${subTab} ${selectedDate} (${shiftFilter})`} />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'personal' && (
                    <StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(m) => setStaffList([...staffList, m])} onRemoveStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} />
                )}
            </div>
        </div>
      </main>

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => {
            const newRoute: RouteRecord = { id: `${z}-${s}-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'Manual', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: subTab === 'REPASO' ? 'REPASO_LATERAL' : 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' };
            setRecords([...records, newRoute]);
        }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-200 ${active ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
        <span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span>
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

const SubTabButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`px-8 py-3.5 text-[10px] font-black rounded-2xl transition-all border-2 ${active ? 'bg-[#111827] text-white border-[#111827] shadow-xl scale-105' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

export default App;
