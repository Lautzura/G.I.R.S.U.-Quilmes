
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
    UserX,
    Check,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    History,
    AlertTriangle,
    Infinity as InfinityIcon,
    User as UserIcon,
    ArrowLeft
} from 'lucide-react';

// HELPER PARA COLORES DINÁMICOS
export const getAbsenceStyles = (reason: string) => {
    const r = reason?.toUpperCase() || '';
    if (r.includes('SUSPENSION')) return 'bg-red-100 text-red-700 border-red-200';
    if (r.includes('VACACIONES') || r.includes('RESERVA')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (r.includes('ART') || r.includes('MEDICA') || r.includes('95')) return 'bg-teal-100 text-teal-700 border-teal-200';
    if (r.includes('MATERNIDAD') || r.includes('FEMENINO') || r.includes('NACIMIENTO') || r.includes('CASAMIENTO')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (r.includes('GREMIAL') || r.includes('DUELO') || r.includes('FAMILIAR')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (r.includes('EXAMEN') || r.includes('SANGRE')) return 'bg-sky-100 text-sky-700 border-sky-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

// --- HELPERS ESTABLES FUERA DEL COMPONENTE ---

const resolveStaffStatus = (member: StaffMember, dateStr: string): StaffMember => {
    if (!member.absenceStartDate) return { ...member, status: member.status === StaffStatus.ABSENT ? StaffStatus.PRESENT : member.status, address: '' };

    const current = new Date(dateStr + 'T12:00:00');
    const start = new Date(member.absenceStartDate + 'T12:00:00');
    
    let shouldBeAbsent = false;
    if (member.isIndefiniteAbsence) {
        shouldBeAbsent = current >= start;
    } else if (member.absenceReturnDate) {
        const end = new Date(member.absenceReturnDate + 'T12:00:00');
        shouldBeAbsent = current >= start && current <= end;
    } else {
        shouldBeAbsent = dateStr === member.absenceStartDate;
    }

    if (shouldBeAbsent) {
        return { ...member, status: StaffStatus.ABSENT };
    } else {
        return { 
          ...member, 
          status: (member.status === StaffStatus.ABSENT) ? StaffStatus.PRESENT : member.status, 
          address: (member.status === StaffStatus.ABSENT) ? '' : member.address,
          absenceStartDate: undefined, 
          absenceReturnDate: undefined, 
          isIndefiniteAbsence: false 
        };
    }
};

const syncRecordsWithStaff = (rawRecords: RouteRecord[], currentStaff: StaffMember[]) => {
    return rawRecords.map(r => {
        const findS = (m: any) => {
            if (!m) return null;
            const id = typeof m === 'string' ? m : m.id;
            if (!id) return null;
            return currentStaff.find(s => s.id === id) || (typeof m === 'object' ? m : null);
        };
        return {
            ...r,
            driver: findS(r.driver),
            aux1: findS(r.aux1),
            aux2: findS(r.aux2),
            aux3: findS(r.aux3),
            aux4: findS(r.aux4),
            replacementDriver: findS(r.replacementDriver),
            replacementAux1: findS(r.replacementAux1),
            replacementAux2: findS(r.replacementAux2),
        };
    });
};

const generateInitialDayData = (date: string, currentStaff: StaffMember[]) => {
    const findStaff = (id: string) => currentStaff.find(s => s.id === STAFF_DB[id]?.id);
    const createRecord = (m: any, shift: string, category: any): RouteRecord => ({
        id: `${m.zone}-${shift}-${date}-${Math.random()}`, 
        zone: m.zone, internalId: m.interno || '', domain: m.domain || '',
        reinforcement: m.ref || 'Vacio', departureTime: m.time || '', dumpTime: '', tonnage: m.ton || '',
        shift: shift as any, zoneStatus: ZoneStatus.PENDING, order: 0, category: category,
        driver: m.driver ? findStaff(m.driver) || null : null,
        aux1: m.aux1 ? findStaff(m.aux1) || null : null,
        aux2: m.aux2 ? findStaff(m.aux2) || null : null,
        aux3: m.aux3 ? findStaff(m.aux3) || null : null,
        aux4: m.aux4 ? findStaff(m.aux4) || null : null,
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

const generateInitialTransferData = (date: string, currentStaff: StaffMember[]): TransferRecord[] => {
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

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  
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
    unitIdx?: number,
    expandedStaffId?: string | null
  } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const isNotToday = selectedDate !== today;

  const navigateDate = (direction: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
    setSearchTerm('');
  };

  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `girsu_v7_${selectedDate}`;
    const savedData = localStorage.getItem(dateKey);
    const savedMeta = localStorage.getItem(`meta_v7_${selectedDate}`);
    const savedTrans = localStorage.getItem(`trans_v7_${selectedDate}`);
    const masterStaff = localStorage.getItem('master_staff_v7');

    let currentStaffList: StaffMember[] = [];
    if (masterStaff) {
        currentStaffList = JSON.parse(masterStaff);
    } else {
        currentStaffList = EXTRA_STAFF.map(s => ({ ...s, gender: s.gender || 'MASCULINO' }));
        localStorage.setItem('master_staff_v7', JSON.stringify(currentStaffList));
    }

    const updatedStaffList = currentStaffList.map(s => resolveStaffStatus(s, selectedDate));
    setStaffList(updatedStaffList);

    const rawRecords = savedData ? JSON.parse(savedData) : generateInitialDayData(selectedDate, updatedStaffList);
    setRecords(syncRecordsWithStaff(rawRecords, updatedStaffList));

    setShiftMetadataMap(savedMeta ? JSON.parse(savedMeta) : {
        'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] },
        'TARDE': { supervisor: '', subSupervisor: '', absences: [] },
        'NOCHE': { supervisor: '', subSupervisor: '', absences: [] },
        'TODOS': { supervisor: '', subSupervisor: '', absences: [] }
    });

    const rawTrans = savedTrans ? JSON.parse(savedTrans) : generateInitialTransferData(selectedDate, updatedStaffList);
    setTransferRecords(rawTrans.map((tr: TransferRecord) => ({
        ...tr,
        units: tr.units.map(u => {
            const driverId = u.driver ? (typeof u.driver === 'string' ? u.driver : u.driver.id) : null;
            return {
                ...u, 
                driver: driverId ? updatedStaffList.find(s => s.id === driverId) || u.driver : null
            };
        }) as any,
        maquinista: tr.maquinista ? updatedStaffList.find(s => s.id === (typeof tr.maquinista === 'string' ? tr.maquinista : tr.maquinista.id)) || tr.maquinista : null,
        auxTolva1: tr.auxTolva1 ? updatedStaffList.find(s => s.id === (typeof tr.auxTolva1 === 'string' ? tr.auxTolva1 : tr.auxTolva1.id)) || tr.auxTolva1 : null,
        auxTolva2: tr.auxTolva2 ? updatedStaffList.find(s => s.id === (typeof tr.auxTolva2 === 'string' ? tr.auxTolva2 : tr.auxTolva2.id)) || tr.auxTolva2 : null,
        encargado: tr.encargado ? updatedStaffList.find(s => s.id === (typeof tr.encargado === 'string' ? tr.encargado : tr.encargado.id)) || tr.encargado : null,
        balancero1: tr.balancero1 ? updatedStaffList.find(s => s.id === (typeof tr.balancero1 === 'string' ? tr.balancero1 : tr.balancero1.id)) || tr.balancero1 : null,
    })));

    setIsLoaded(true);
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(`girsu_v7_${selectedDate}`, JSON.stringify(records));
    localStorage.setItem(`staff_v7_${selectedDate}`, JSON.stringify(staffList));
    localStorage.setItem(`meta_v7_${selectedDate}`, JSON.stringify(shiftMetadataMap));
    localStorage.setItem(`trans_v7_${selectedDate}`, JSON.stringify(transferRecords));
  }, [records, staffList, shiftMetadataMap, transferRecords, selectedDate, isLoaded]);

  const handleUpdateStaff = (updatedMember: StaffMember) => {
    const resolved = resolveStaffStatus(updatedMember, selectedDate);
    const masterStaff = JSON.parse(localStorage.getItem('master_staff_v7') || '[]');
    const updatedMaster = masterStaff.map((s: StaffMember) => s.id === updatedMember.id ? updatedMember : s);
    localStorage.setItem('master_staff_v7', JSON.stringify(updatedMaster));

    const newStaffList = staffList.map(s => s.id === resolved.id ? resolved : s);
    setStaffList(newStaffList);
    setRecords(prev => syncRecordsWithStaff(prev, newStaffList));
  };

  const handleAddStaff = (newMember: StaffMember) => {
    const masterStaff = JSON.parse(localStorage.getItem('master_staff_v7') || '[]');
    const updatedMaster = [...masterStaff, newMember];
    localStorage.setItem('master_staff_v7', JSON.stringify(updatedMaster));
    
    const resolved = resolveStaffStatus(newMember, selectedDate);
    setStaffList(prev => [...prev, resolved]);
  };

  const handleDeleteRecord = (id: string) => {
    if(window.confirm('¿ESTÁ SEGURO QUE DESEA ELIMINAR ESTA ZONA?')) {
        setRecords(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleRemoveStaff = (id: string) => {
    if(window.confirm('¿ELIMINAR ESTE COLABORADOR DEL PADRÓN PERMANENTE?')) {
        const masterStaff = JSON.parse(localStorage.getItem('master_staff_v7') || '[]');
        const updatedMaster = masterStaff.filter((s: StaffMember) => s.id !== id);
        localStorage.setItem('master_staff_v7', JSON.stringify(updatedMaster));
        setStaffList(prev => prev.filter(s => s.id !== id));
    }
  };

  const filteredRecords = useMemo(() => {
    let res = records.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter);
    if (subTab === 'GENERAL') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'REPASO') res = res.filter(r => r.category === 'REPASO_LATERAL' || r.category === 'CARGA LATERAL');
    if (searchTerm && activeTab === 'parte') res = res.filter(r => r.zone.toLowerCase().includes(searchTerm.toLowerCase()));
    return res;
  }, [records, shiftFilter, searchTerm, subTab, activeTab]);

  const filteredPickerStaff = useMemo(() => {
    if (!pickerState) return [];
    const search = pickerSearch.toLowerCase().trim();
    const field = pickerState.field.toLowerCase();
    
    let currentId = '';
    const record = records.find(r => r.id === pickerState.targetId);
    if (pickerState.type === 'route' && record) {
      currentId = (record as any)?.[pickerState.field]?.id || '';
    }

    const filtered = staffList.filter(s => {
      const matchesSearch = search === '' || s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search);
      if (!matchesSearch) return false;
      if (field.includes('driver')) return s.role === 'CHOFER';
      if (field.includes('aux')) return s.role === 'AUXILIAR';
      return true;
    });

    return filtered.sort((a, b) => {
        if (a.id === currentId) return -1;
        if (b.id === currentId) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [staffList, pickerSearch, pickerState, records]);

  const handlePickerSelection = (staff: StaffMember | null) => {
    if (!pickerState) return;
    if (pickerState.type === 'route') setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: staff } : r));
    else if (pickerState.type === 'meta') setShiftMetadataMap(prev => ({ ...prev, [shiftFilter]: { ...prev[shiftFilter], [pickerState.field]: staff ? staff.name : '' } }));
    setPickerState(null);
    setPickerSearch('');
  };

  const toggleStaffFalta = (e: React.MouseEvent, staff: StaffMember, reason: AbsenceReason) => {
    e.stopPropagation();
    handleUpdateStaff({
        ...staff,
        status: StaffStatus.ABSENT,
        address: reason,
        absenceStartDate: selectedDate,
        isIndefiniteAbsence: false
    });
  };

  const toggleStaffPresente = (e: React.MouseEvent, staff: StaffMember) => {
    e.stopPropagation();
    handleUpdateStaff({
        ...staff,
        status: StaffStatus.PRESENT,
        address: '',
        absenceStartDate: undefined,
        absenceReturnDate: undefined,
        isIndefiniteAbsence: false
    });
  };

  const absenceOptions = [
    { label: 'ART', val: AbsenceReason.ART, color: 'bg-[#ccfbf1] text-[#0f766e]' },
    { label: 'VACACIONES', val: AbsenceReason.VACACIONES, color: 'bg-[#fef3c7] text-[#92400e]' },
    { label: 'LICENCIA MEDICA', val: AbsenceReason.LICENCIA_MEDICA, color: 'bg-[#ccfbf1] text-[#0f766e]' },
    { label: 'SUSPENSION', val: AbsenceReason.SUSPENSION, color: 'bg-[#fee2e2] text-[#b91c1c]' },
    { label: 'RESERVA', val: AbsenceReason.RESERVA, color: 'bg-[#fef3c7] text-[#92400e]' },
    { label: 'ARTICULO 95', val: AbsenceReason.ARTICULO_95, color: 'bg-[#ccfbf1] text-[#0f766e]' },
    { label: 'DIA DE EXAMEN', val: AbsenceReason.DIA_EXAMEN, color: 'bg-[#e0f2fe] text-[#0369a1]' },
    { label: 'DIA PREEXAMEN', val: AbsenceReason.DIA_PREEXAMEN, color: 'bg-[#e0f2fe] text-[#0369a1]' },
    { label: 'NACIMIENTO', val: AbsenceReason.NACIMIENTO, color: 'bg-[#fce7f3] text-[#be185d]' },
    { label: 'CASAMIENTO', val: AbsenceReason.CASAMIENTO, color: 'bg-[#fce7f3] text-[#be185d]' },
    { label: 'DUELO', val: AbsenceReason.DUELO, color: 'bg-[#e0e7ff] text-[#4338ca]' },
    { label: 'DONACION DE SANGRE', val: AbsenceReason.DONACION_SANGRE, color: 'bg-[#e0f2fe] text-[#0369a1]' },
    { label: 'LICENCIA GREMIAL', val: AbsenceReason.LICENCIA_GREMIAL, color: 'bg-[#e0e7ff] text-[#4338ca]' },
    { label: 'ASISTENCIA FAMILIAR', val: AbsenceReason.ASISTENCIA_FAMILIAR, color: 'bg-[#e0e7ff] text-[#4338ca]' },
  ];

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2">
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" />
            </div>
            <h2 className="text-xl font-black tracking-tighter">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <SidebarItem active={activeTab === 'parte'} icon={<ClipboardList size={20} />} label="Parte Diario" onClick={() => { setActiveTab('parte'); setSearchTerm(''); }} />
            <SidebarItem active={activeTab === 'personal'} icon={<Users size={20} />} label="Padrón Personal" onClick={() => { setActiveTab('personal'); setSearchTerm(''); }} />
        </nav>
        <div className="p-6">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-2xl transition-all"><LogOut size={18} /><span className="text-[10px] font-black uppercase">Salir</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-40 relative">
          <div className="flex items-center gap-4">
              <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">GIRSU OPERATIVO</h1>
              <div className="flex bg-slate-100 p-1 rounded-xl border">
                {(['MAÑANA', 'TARDE', 'NOCHE'] as const).map(s => (
                    <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center bg-slate-50 border rounded-2xl p-1 shadow-sm">
                <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-2 px-3">
                  <CalendarIcon size={14} className="text-indigo-500" />
                  <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-700 outline-none uppercase" />
                </div>
                <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all"><ChevronRight size={18} /></button>
             </div>
             {isNotToday && <button onClick={() => setSelectedDate(today)} className="bg-slate-800 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-700 transition-all"><History size={14} /> Hoy</button>}
             <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"><CheckCircle2 size={16} /> Cierre</button>
             <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 shadow-lg"><Plus size={16} /> Nuevo</button>
          </div>
        </header>

        <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center gap-4 shrink-0 z-30 shadow-sm overflow-x-auto custom-scrollbar">
            {activeTab === 'parte' ? (
              <>
                <div className="flex gap-1.5 shrink-0">
                    <SubTabButton active={subTab === 'GENERAL'} label="RECOLECCIÓN" onClick={() => setSubTab('GENERAL')} />
                    <SubTabButton active={subTab === 'REPASO'} label="REPASO" onClick={() => setSubTab('REPASO')} />
                    <SubTabButton active={subTab === 'TRANSFERENCIA'} label="TOLVA" onClick={() => setSubTab('TRANSFERENCIA')} />
                </div>
                <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>
                <ShiftManagersTop shift={shiftFilter} data={shiftMetadataMap[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} staffList={staffList} onOpenPicker={(field, role) => setPickerState({ type: 'meta', targetId: 'meta', field, role })} onUpdateStaff={handleUpdateStaff} />
              </>
            ) : (
              <div className="flex flex-col gap-0.5 shrink-0">
                  <h2 className="text-[12px] font-black text-slate-800 uppercase italic">Padrón de Personal</h2>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Gestión y control de asistencia</p>
              </div>
            )}
            
            <div className="relative w-64 ml-auto shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="text" 
                  placeholder={activeTab === 'parte' ? "FILTRAR RUTAS..." : "BUSCAR NOMBRE O LEGAJO..."} 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all uppercase" 
                />
            </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 bg-[#f8fafc]">
            {activeTab === 'parte' ? (
                <div className="flex-1 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col h-full">
                    {subTab === 'TRANSFERENCIA' ? (
                        <div className="flex-1 overflow-auto">
                          <TransferTable 
                            data={transferRecords.filter(t => t.shift === shiftFilter)} 
                            onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                            onOpenPicker={(id, field, role, unitIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx })} 
                            onUpdateStaff={handleUpdateStaff}
                          />
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden">
                          <ReportTable 
                            data={filteredRecords} 
                            onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                            onDeleteRecord={handleDeleteRecord}
                            onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })} 
                            onUpdateStaff={handleUpdateStaff}
                            activeShiftLabel={`PARTE DIARIO - TURNO ${shiftFilter}`} 
                          />
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full overflow-y-auto pr-4 custom-scrollbar">
                  <StaffManagement 
                    staffList={staffList} 
                    onUpdateStaff={handleUpdateStaff} 
                    onAddStaff={handleAddStaff} 
                    onRemoveStaff={handleRemoveStaff} 
                    records={records} 
                    selectedShift={shiftFilter}
                    searchTerm={searchTerm}
                  />
                </div>
            )}
        </div>
      </main>

      {/* PICKER MEJORADO */}
      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-[#1e1b2e]/60 backdrop-blur-md flex items-center justify-center p-0 md:p-4">
            <div className="bg-[#f8fafc] rounded-none md:rounded-[3.5rem] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-screen md:max-h-[92vh] border border-white/20">
                
                <div className="bg-[#1e1b2e] p-8 text-white flex justify-between items-center shrink-0 border-b border-white/5 shadow-lg">
                    <h3 className="text-xl font-black uppercase tracking-[0.05em] italic">ASIGNAR {pickerState.role}</h3>
                    <button onClick={() => { setPickerState(null); setPickerSearch(''); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="px-8 py-6 space-y-6 shrink-0 bg-white shadow-sm">
                        <button 
                            onClick={() => handlePickerSelection(null)} 
                            className="w-full flex items-center justify-center gap-3 py-5 bg-[#fff1f2] text-[#e11d48] border-2 border-[#fecdd3] rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-[#e11d48] hover:text-white transition-all shadow-sm"
                        >
                            <UserX size={20} /> Quitar Asignación
                        </button>
                        
                        <div className="relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                autoFocus 
                                type="text" 
                                placeholder="ESCRIBIR NOMBRE O LEGAJO..." 
                                value={pickerSearch} 
                                onChange={e => setPickerSearch(e.target.value)} 
                                className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all shadow-sm" 
                            />
                        </div>
                    </div>

                    <div className="p-8 space-y-4">
                        {filteredPickerStaff.map((s) => {
                            let isCurrent = false;
                            const rec = records.find(r => r.id === pickerState.targetId);
                            if (pickerState.type === 'route') isCurrent = (rec as any)?.[pickerState.field]?.id === s.id;
                            
                            const isExpanded = pickerState.expandedStaffId === s.id;
                            const isAbsent = s.status === StaffStatus.ABSENT;

                            return (
                            <div key={s.id} className={`rounded-[2.5rem] transition-all overflow-hidden border-2 shadow-sm mb-4 ${
                                isCurrent 
                                ? 'bg-[#eff6ff] border-[#6366f1] ring-4 ring-indigo-500/5' 
                                : 'bg-white border-slate-50 hover:border-indigo-100'
                            }`}>
                                <div className="p-6 flex items-center justify-between">
                                    <div 
                                        onClick={() => isAbsent ? null : handlePickerSelection(s)} 
                                        className={`flex items-center gap-5 cursor-pointer flex-1 ${isAbsent ? 'opacity-50' : ''}`}
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner ${
                                            isCurrent ? 'bg-[#6366f1] text-white' : s.gender === 'FEMENINO' ? 'bg-pink-50 text-pink-500' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-[13px] font-black text-slate-800 uppercase leading-none">{s.name}</h4>
                                                {isCurrent && <span className="text-[#6366f1] font-black text-[10px] uppercase italic">(ACTUAL)</span>}
                                                {isAbsent && <span className="text-red-500 font-black text-[9px] uppercase italic">(FALTA)</span>}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-2">LEGAJO: {s.id} | {s.gender}</p>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (isAbsent) toggleStaffPresente(e, s);
                                            else setPickerState(prev => prev ? {...prev, expandedStaffId: isExpanded ? null : s.id} : null);
                                        }}
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${
                                            isAbsent ? 'bg-emerald-500 text-white' : isExpanded ? 'bg-slate-800 text-white' : 'bg-[#ef4444] text-white'
                                        }`}
                                    >
                                        {isAbsent ? <UserCheck size={26} /> : <UserX size={26} />}
                                    </button>
                                </div>

                                {isExpanded && !isAbsent && (
                                    <div className="px-6 pb-6 pt-2 animate-in slide-in-from-top-4 duration-300">
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            {absenceOptions.map((opt) => (
                                                <button
                                                    key={opt.val}
                                                    onClick={(e) => {
                                                        toggleStaffFalta(e, s, opt.val);
                                                        setPickerState(prev => prev ? {...prev, expandedStaffId: null} : null);
                                                    }}
                                                    className={`py-4 px-2 rounded-2xl text-[9px] font-black uppercase text-center flex items-center justify-center h-14 border border-black/5 hover:brightness-95 transition-all shadow-sm ${opt.color}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setPickerState(prev => prev ? {...prev, expandedStaffId: null} : null)}
                                            className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2"
                                        >
                                            <ArrowLeft size={14} /> Volver a lista
                                        </button>
                                    </div>
                                )}
                            </div>
                        )})}
                    </div>
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
