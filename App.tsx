
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
    AlertTriangle,
    UserRound,
    PlusCircle,
    CalendarDays,
    ArrowRight,
    History,
    RotateCcw
} from 'lucide-react';

export const getAbsenceStyles = (reason: string) => {
    const r = reason?.toUpperCase() || '';
    if (r.includes('INJUSTIFICADA')) return 'bg-[#ef4444] text-white border-[#b91c1c] shadow-lg';
    if (r.includes('SUSPENSION')) return 'bg-red-100 text-red-700 border-red-200';
    if (r.includes('VACACIONES') || r.includes('RESERVA')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (r.includes('ART') || r.includes('MEDICA') || r.includes('95')) return 'bg-teal-100 text-teal-700 border-teal-200';
    if (r.includes('MATERNIDAD') || r.includes('FEMENINO') || r.includes('NACIMIENTO') || r.includes('CASAMIENTO')) return 'bg-pink-100 text-pink-700 border-pink-200';
    if (r.includes('GREMIAL') || r.includes('DUELO') || r.includes('FAMILIAR')) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    if (r.includes('EXAMEN') || r.includes('SANGRE')) return 'bg-sky-100 text-sky-700 border-sky-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
};

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
    if (shouldBeAbsent) return { ...member, status: StaffStatus.ABSENT };
    return { ...member, status: (member.status === StaffStatus.ABSENT) ? StaffStatus.PRESENT : member.status, address: '', absenceStartDate: undefined, absenceReturnDate: undefined, isIndefiniteAbsence: false };
};

const syncRecordsWithStaff = (rawRecords: RouteRecord[], currentStaff: StaffMember[]) => {
    return rawRecords.map(r => {
        const findS = (m: any) => {
            if (!m) return null;
            const id = typeof m === 'string' ? m : m.id;
            const cleanId = String(id).trim();
            return currentStaff.find(s => String(s.id).trim() === cleanId) || null;
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
          replacementAux2: findS(r.replacementAux2) 
        };
    });
};

const syncTransferWithStaff = (rawTransfer: TransferRecord[], currentStaff: StaffMember[]) => {
    return rawTransfer.map(tr => {
        const findS = (m: any) => {
            if (!m) return null;
            const id = typeof m === 'string' ? m : m.id;
            const cleanId = String(id).trim();
            return currentStaff.find(s => String(s.id).trim() === cleanId) || null;
        };
        return {
            ...tr,
            maquinista: findS(tr.maquinista),
            auxTolva1: findS(tr.auxTolva1),
            auxTolva2: findS(tr.auxTolva2),
            auxTolva3: findS(tr.auxTolva3),
            auxTransferencia1: findS(tr.auxTransferencia1),
            auxTransferencia2: findS(tr.auxTransferencia2),
            encargado: findS(tr.encargado),
            balancero1: findS(tr.balancero1),
            balancero2: findS(tr.balancero2),
            lonero: findS(tr.lonero),
            suplenciaLona: findS(tr.suplenciaLona),
            units: tr.units.map(u => ({
                ...u,
                driver: findS(u.driver)
            })) as any
        };
    });
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftMetadataMap, setShiftMetadataMap] = useState<Record<string, ShiftMetadata>>({ 'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] }, 'TARDE': { supervisor: '', subSupervisor: '', absences: [] }, 'NOCHE': { supervisor: '', subSupervisor: '', absences: [] }, 'TODOS': { supervisor: '', subSupervisor: '', absences: [] } });
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [pickerState, setPickerState] = useState<{ type: 'route' | 'meta' | 'transfer', targetId: string, field: string, role: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [absencePickerId, setAbsencePickerId] = useState<string | null>(null);

  const isToday = selectedDate === today;
  const isPast = selectedDate < today;

  // 1. CARGA DE DATOS (REFORZADA v3)
  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `girsu_v7_${selectedDate}`;
    const transferKey = `transfer_v7_${selectedDate}`;
    
    // Cargar Staff
    const masterStaffRaw = localStorage.getItem('master_staff_v7');
    let currentStaff: StaffMember[] = [];
    if (masterStaffRaw) {
        currentStaff = JSON.parse(masterStaffRaw);
    } else {
        currentStaff = EXTRA_STAFF.map(s => ({ ...s, gender: s.gender || 'MASCULINO' }));
        localStorage.setItem('master_staff_v7', JSON.stringify(currentStaff));
    }
    const resolvedStaff = currentStaff.map(s => resolveStaffStatus(s, selectedDate));
    setStaffList(resolvedStaff);

    // Cargar Rutas
    const savedData = localStorage.getItem(dateKey);
    const masterTemplate = localStorage.getItem('girsu_master_config_v3');
    
    let finalRecords: RouteRecord[] = [];
    if (savedData) {
        finalRecords = JSON.parse(savedData);
    } else if (masterTemplate) {
        const templateData = JSON.parse(masterTemplate);
        finalRecords = templateData.map((r: any) => ({
            ...r,
            id: `R-${r.zone}-${Date.now()}-${Math.random()}`,
            departureTime: '', dumpTime: '', tonnage: '', supervisionReport: '', zoneStatus: ZoneStatus.PENDING
        }));
    } else {
        const createInitial = (master: any[], shift: string, category: string): RouteRecord[] => {
            return master.map((m, idx) => ({
                id: `${m.zone}-${shift}-${Date.now()}-${idx}`,
                zone: m.zone, internalId: m.interno || '', domain: m.domain || '',
                reinforcement: 'MASTER', shift: shift as any, departureTime: '',
                dumpTime: '', tonnage: '', category: category as any,
                zoneStatus: ZoneStatus.PENDING, order: idx,
                driver: resolvedStaff.find(s => s.id === STAFF_DB[m.driver]?.id) || null,
                aux1: resolvedStaff.find(s => s.id === STAFF_DB[m.aux1]?.id) || null,
                aux2: resolvedStaff.find(s => s.id === STAFF_DB[m.aux2]?.id) || null,
                aux3: resolvedStaff.find(s => s.id === STAFF_DB[m.aux3]?.id) || null,
                aux4: resolvedStaff.find(s => s.id === STAFF_DB[m.aux4]?.id) || null,
                replacementDriver: null, replacementAux1: null, replacementAux2: null,
                supervisionReport: ''
            }));
        };
        finalRecords = [
            ...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'),
            ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'),
            ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'),
            ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'),
            ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'),
            ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')
        ];
    }
    setRecords(syncRecordsWithStaff(finalRecords, resolvedStaff));

    // Cargar Transferencia
    const savedTr = localStorage.getItem(transferKey);
    const masterTrTemplate = localStorage.getItem('transfer_master_config_v3');
    let finalTransfer: TransferRecord[] = [];
    if (savedTr) {
        finalTransfer = JSON.parse(savedTr);
    } else if (masterTrTemplate) {
        const templateTr = JSON.parse(masterTrTemplate);
        finalTransfer = templateTr.map((tr: any) => ({
            ...tr,
            id: `TR-${tr.shift}-${Date.now()}`,
            observaciones: '',
            units: tr.units.map((u: any) => ({ ...u, trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }))
        }));
    } else {
        const createInitTr = (shift: 'MAÑANA' | 'TARDE' | 'NOCHE'): TransferRecord => ({
            id: `TR-${shift}-${Date.now()}`, shift,
            units: [
                { id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] },
                { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] },
                { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }
            ] as any,
            maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null,
            auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null,
            lonero: null, suplenciaLona: null, observaciones: ''
        });
        finalTransfer = [createInitTr('MAÑANA'), createInitTr('TARDE'), createInitTr('NOCHE')];
    }
    setTransferRecords(syncTransferWithStaff(finalTransfer, resolvedStaff));

    const savedMeta = localStorage.getItem(`meta_v7_${selectedDate}`);
    setShiftMetadataMap(savedMeta ? JSON.parse(savedMeta) : { 'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] }, 'TARDE': { supervisor: '', subSupervisor: '', absences: [] }, 'NOCHE': { supervisor: '', subSupervisor: '', absences: [] }, 'TODOS': { supervisor: '', subSupervisor: '', absences: [] } });
    
    setIsLoaded(true);
  }, [selectedDate]);

  // 2. GUARDADO Y MASTER CONFIG (SINCRONIZACIÓN v3)
  useEffect(() => {
    if (!isLoaded) return;
    
    localStorage.setItem(`girsu_v7_${selectedDate}`, JSON.stringify(records));
    localStorage.setItem(`transfer_v7_${selectedDate}`, JSON.stringify(transferRecords));
    localStorage.setItem(`meta_v7_${selectedDate}`, JSON.stringify(shiftMetadataMap));

    // Solo actualizamos la plantilla si NO estamos en el pasado
    if (!isPast) {
        const structure = records.map(r => ({
            zone: r.zone, shift: r.shift, category: r.category, internalId: r.internalId,
            domain: r.domain, driver: r.driver?.id, aux1: r.aux1?.id, aux2: r.aux2?.id,
            aux3: r.aux3?.id, aux4: r.aux4?.id, reinforcement: r.reinforcement
        }));
        localStorage.setItem('girsu_master_config_v3', JSON.stringify(structure));
        
        const trStructure = transferRecords.map(tr => ({
            shift: tr.shift,
            maquinista: tr.maquinista?.id, maquinistaDomain: tr.maquinistaDomain,
            encargado: tr.encargado?.id, balancero1: tr.balancero1?.id,
            units: tr.units.map(u => ({ id: u.id, driver: u.driver?.id, domain1: u.domain1, domain2: u.domain2 }))
        }));
        localStorage.setItem('transfer_master_config_v3', JSON.stringify(trStructure));
    }
  }, [records, transferRecords, shiftMetadataMap, selectedDate, isLoaded, isPast]);

  // Fix: Extracted currentlyAssignedId calculation to its own useMemo to avoid repeated lookups in JSX and fix TypeScript property 'id' access error.
  const currentlyAssignedId = useMemo(() => {
    if (!pickerState) return null;
    if (pickerState.type === 'route') {
        const rec = records.find(r => r.id === pickerState.targetId);
        if (rec) {
            const staff = (rec as any)[pickerState.field] as StaffMember | null;
            return staff?.id ? String(staff.id).trim() : null;
        }
    } else if (pickerState.type === 'transfer') {
        const tr = transferRecords.find(t => t.id === pickerState.targetId);
        if (tr) {
            if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
                const staff = tr.units[pickerState.unitIdx]?.driver;
                return staff?.id ? String(staff.id).trim() : null;
            } else {
                const staff = (tr as any)[pickerState.field] as StaffMember | null;
                return staff?.id ? String(staff.id).trim() : null;
            }
        }
    }
    return null;
  }, [pickerState, records, transferRecords]);

  // 3. BUSCADOR CON PRIORIDAD (RESTORED & IMPROVED)
  const filteredPickerStaff = useMemo(() => {
    if (!pickerState) return [];
    
    const search = pickerSearch.toLowerCase().trim();
    const field = pickerState.field.toLowerCase();
    
    return staffList.filter(s => {
        const sName = (s.name || '').toLowerCase();
        const sId = (s.id || '').toLowerCase();
        if (search !== '') return sName.includes(search) || sId.includes(search);
        
        // Filtros por Rol
        if (field.includes('driver')) return s.role === 'CHOFER';
        if (field.includes('aux')) return s.role === 'AUXILIAR' || s.role === 'CARGA LATERAL';
        if (field.includes('maquinista')) return s.role === 'MAQUINISTA';
        if (field.includes('balancero')) return s.role === 'BALANCERO';
        if (field.includes('encargado')) return s.role === 'ENCARGADO' || s.role === 'SUPERVISOR';
        return true;
    }).sort((a, b) => {
        const idA = String(a.id).trim();
        const idB = String(b.id).trim();

        // 1. Prioridad: Asignado Actual
        if (idA === currentlyAssignedId) return -1;
        if (idB === currentlyAssignedId) return 1;

        // 2. Prioridad: Presentes sobre Ausentes
        if (a.status === StaffStatus.PRESENT && b.status === StaffStatus.ABSENT) return -1;
        if (a.status === StaffStatus.ABSENT && b.status === StaffStatus.PRESENT) return 1;

        // 3. Alfabético
        return a.name.localeCompare(b.name);
    });
  }, [staffList, pickerSearch, pickerState, currentlyAssignedId]);

  const handleUpdateStaff = (updatedMember: StaffMember, originalId?: string) => {
    const idToFind = (originalId || updatedMember.id).trim();
    const masterStaff = JSON.parse(localStorage.getItem('master_staff_v7') || '[]');
    const updatedMaster = masterStaff.map((s: StaffMember) => String(s.id).trim() === idToFind ? updatedMember : s);
    localStorage.setItem('master_staff_v7', JSON.stringify(updatedMaster));
    
    const resolved = resolveStaffStatus(updatedMember, selectedDate);
    const newStaffList = staffList.map(s => String(s.id).trim() === idToFind ? resolved : s);
    setStaffList(newStaffList);
    setRecords(prev => syncRecordsWithStaff(prev, newStaffList));
    setTransferRecords(prev => syncTransferWithStaff(prev, newStaffList));
  };

  const handleRemoveStaff = (id: string) => {
    const cleanId = String(id).trim();
    if (!cleanId) return;
    if (!window.confirm(`¿Eliminar a este colaborador de todo el sistema?`)) return;

    const masterStaff = JSON.parse(localStorage.getItem('master_staff_v7') || '[]');
    const updatedMaster = masterStaff.filter((s: any) => String(s.id).trim() !== cleanId);
    localStorage.setItem('master_staff_v7', JSON.stringify(updatedMaster));
    
    const nextList = staffList.filter(s => String(s.id).trim() !== cleanId);
    setStaffList(nextList);
    setRecords(prev => syncRecordsWithStaff(prev, nextList));
    setTransferRecords(prev => syncTransferWithStaff(prev, nextList));
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    if (pickerState.type === 'route') {
      setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: selectedStaff } : r));
    } else if (pickerState.type === 'transfer') {
      setTransferRecords(prev => prev.map(tr => {
        if (tr.id !== pickerState.targetId) return tr;
        if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
            const newUnits = [...tr.units];
            newUnits[pickerState.unitIdx] = { ...newUnits[pickerState.unitIdx], driver: selectedStaff };
            return { ...tr, units: newUnits as any };
        }
        return { ...tr, [pickerState.field]: selectedStaff };
      }));
    } else if (pickerState.type === 'meta') {
      setShiftMetadataMap(prev => {
        const currentShift = shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter;
        return { ...prev, [currentShift]: { ...prev[currentShift], [pickerState.field]: selectedStaff ? selectedStaff.name : '' } };
      });
    }
    setPickerState(null);
    setPickerSearch('');
    setAbsencePickerId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden font-['Plus_Jakarta_Sans']">
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black tracking-tighter">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <SidebarItem active={activeTab === 'parte'} icon={<ClipboardList size={20} />} label="Parte Diario" onClick={() => setActiveTab('parte')} />
            <SidebarItem active={activeTab === 'personal'} icon={<Users size={20} />} label="Padrón Personal" onClick={() => setActiveTab('personal')} />
        </nav>
        <div className="p-6">
            <button className="w-full flex items-center justify-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-red-500/10 rounded-2xl transition-all">
                <LogOut size={18} /><span className="text-[10px] font-black uppercase">Salir</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-[100] relative shadow-sm">
          <div className="flex items-center gap-4">
              <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic text-shadow-sm">GIRSU OPERATIVO</h1>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                    <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
          </div>
          <div className="flex items-center gap-3">
             <div className={`flex items-center border rounded-2xl p-1 transition-all duration-500 ${!isToday ? 'bg-amber-50 border-amber-200/60 shadow-inner shadow-amber-100/50' : 'bg-slate-50 border-slate-200 shadow-sm'}`}>
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-2 px-3">
                    <CalendarIcon size={14} className={!isToday ? "text-amber-500" : "text-indigo-500"} />
                    <div className="flex flex-col -space-y-0.5">
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[11px] font-black text-slate-700 outline-none uppercase cursor-pointer" />
                        {!isToday && <span className="text-[6.5px] font-black text-amber-600 uppercase tracking-tighter opacity-80">Modo Consulta</span>}
                    </div>
                </div>
                {!isToday && (
                    <button onClick={() => setSelectedDate(today)} className="ml-1 p-1.5 bg-amber-500 text-white rounded-xl shadow-md shadow-amber-200 hover:brightness-105 active:scale-95 transition-all animate-in zoom-in-50" title="Hoy">
                        <RotateCcw size={12} />
                    </button>
                )}
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"><ChevronRight size={18} /></button>
             </div>
             <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest italic flex items-center gap-2 shadow-lg shadow-emerald-200 hover:brightness-110 transition-all"><CheckCircle2 size={16} /> Cierre</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
            {activeTab === 'parte' ? (
                <div className="h-full flex flex-col">
                    <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center gap-4 shrink-0 shadow-sm overflow-x-auto z-[90]">
                        <div className="flex gap-1.5 shrink-0">
                            <SubTabButton active={subTab === 'GENERAL'} label="RECOLECCIÓN" onClick={() => setSubTab('GENERAL')} />
                            <SubTabButton active={subTab === 'REPASO'} label="REPASO" onClick={() => setSubTab('REPASO')} />
                            <SubTabButton active={subTab === 'TRANSFERENCIA'} label="TOLVA" onClick={() => setSubTab('TRANSFERENCIA')} />
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1 shrink-0"></div>
                        <ShiftManagersTop shift={shiftFilter} data={shiftMetadataMap[shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter]} staffList={staffList} onOpenPicker={(f, r) => setPickerState({ type: 'meta', targetId: 'meta', field: f, role: r })} onUpdateStaff={handleUpdateStaff} />
                        <div className="flex items-center gap-3 ml-auto">
                            <button onClick={() => setIsNewRouteModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"><PlusCircle size={16} /> Nueva Ruta</button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            {subTab === 'TRANSFERENCIA' ? (
                                <div className="flex-1 overflow-auto"><TransferTable data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, uIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx: uIdx })} onUpdateStaff={handleUpdateStaff} /></div>
                            ) : (
                                <div className="flex-1 overflow-hidden"><ReportTable data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(prev => prev.filter(r => r.id !== id))} onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })} onUpdateStaff={handleUpdateStaff} activeShiftLabel={`TURNO ${shiftFilter}`} /></div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-full p-8 overflow-y-auto"><StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => { const master = JSON.parse(localStorage.getItem('master_staff_v7') || '[]'); localStorage.setItem('master_staff_v7', JSON.stringify([...master, s])); setStaffList(prev => [...prev, resolveStaffStatus(s, selectedDate)]); }} onBulkAddStaff={newS => { const master = JSON.parse(localStorage.getItem('master_staff_v7') || '[]'); const updated = [...master, ...newS]; localStorage.setItem('master_staff_v7', JSON.stringify(updated)); setStaffList(prev => [...prev, ...newS.map(s => resolveStaffStatus(s, selectedDate))]); }} onRemoveStaff={handleRemoveStaff} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} /></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-[#1e1b2e]/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#f8fafc] rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20 animate-in zoom-in-95">
                <div className="bg-[#1e1b2e] p-8 text-white flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl"><UserRound size={28} className="text-indigo-400" /></div>
                        <h3 className="text-xl font-black uppercase tracking-[0.05em] italic leading-none">ASIGNAR {pickerState.role}</h3>
                    </div>
                    <button onClick={() => { setPickerState(null); setPickerSearch(''); setAbsencePickerId(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={28} /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="px-8 py-6 space-y-6 shrink-0 bg-white shadow-sm flex items-center gap-4">
                        <button onClick={() => handlePickerSelection(null)} className="flex-1 flex items-center justify-center gap-3 py-5 bg-[#fff1f2] text-[#e11d48] border-2 border-[#fecdd3] rounded-[1.8rem] text-[11px] font-black uppercase hover:bg-[#e11d48] hover:text-white transition-all shadow-sm"><UserX size={20} /> Quitar</button>
                        <div className="relative group flex-[2]"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} /><input autoFocus type="text" placeholder="BUSCAR..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-14 pr-6 py-5 bg-white border-2 border-slate-100 rounded-[1.8rem] text-[12px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all shadow-sm" /></div>
                    </div>
                    <div className="p-8 space-y-4">
                        {filteredPickerStaff.map((s) => {
                            const isAbsent = s.status === StaffStatus.ABSENT;
                            // Fix: Rely on pre-calculated currentlyAssignedId to fix TypeScript property 'id' error and optimize UI performance.
                            const isCurrentlySelected = s.id === currentlyAssignedId;
                            
                            const absenceStyle = isAbsent ? getAbsenceStyles(s.address || 'FALTA') : '';
                            const isPickingAbsence = absencePickerId === String(s.id);
                            
                            return (
                                <div key={s.id} className={`rounded-[2.5rem] transition-all overflow-hidden border-2 shadow-sm mb-4 bg-white ${isCurrentlySelected ? 'border-indigo-500 ring-4 ring-indigo-500/10' : isAbsent ? `${absenceStyle} border-transparent` : 'border-slate-50 hover:border-indigo-100'}`}>
                                    <div className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div onClick={() => !isPickingAbsence && handlePickerSelection(s)} className="flex items-center gap-5 cursor-pointer flex-1">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${isCurrentlySelected ? 'bg-indigo-600 text-white' : isAbsent ? 'bg-white/40' : 'bg-slate-100 text-slate-500'}`}>{s.name.charAt(0)}</div>
                                                <div>
                                                    <h4 className={`text-[13px] font-black uppercase leading-none ${isAbsent && s.address?.includes('INJUSTIFICADA') ? 'text-white' : 'text-slate-800'}`}>
                                                        {s.name} {isCurrentlySelected && '(ASIGNADO)'}
                                                    </h4>
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.1em] mt-2 ${isAbsent && s.address?.includes('INJUSTIFICADA') ? 'text-white/60' : 'text-slate-400'}`}>LEGAJO: {s.id}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={(e) => { e.stopPropagation(); isAbsent ? handleUpdateStaff({ ...s, status: StaffStatus.PRESENT, address: '', absenceStartDate: undefined }) : setAbsencePickerId(String(s.id)); }} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${isAbsent ? 'bg-emerald-500 text-white' : 'bg-[#ef4444] text-white'}`}>
                                                    {isAbsent ? <UserCheck size={26} /> : <UserX size={26} />}
                                                </button>
                                                {!isPickingAbsence && (
                                                    <button onClick={() => handlePickerSelection(s)} className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${isCurrentlySelected ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                                        <Check size={26} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {isPickingAbsence && (
                                            <div className="mt-6 pt-6 border-t border-black/5 animate-in slide-in-from-top duration-300">
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {Object.values(AbsenceReason).filter(reason => s.gender === 'FEMENINO' || (reason !== AbsenceReason.MATERNIDAD && reason !== AbsenceReason.DIA_FEMENINO)).map(reason => (
                                                        <button key={reason} onClick={(e) => { e.stopPropagation(); handleUpdateStaff({ ...s, status: StaffStatus.ABSENT, address: reason, absenceStartDate: selectedDate }); setAbsencePickerId(null); }} className={`p-3 rounded-xl text-[8px] font-black uppercase text-left transition-all border-2 border-transparent hover:border-indigo-500 ${getAbsenceStyles(reason)}`}>{reason}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
      )}
      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => { const newR: RouteRecord = { id: `NEW-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'EXTRA', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: subTab === 'REPASO' ? 'REPASO_LATERAL' : 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }; setRecords(prev => [...prev, newR]); }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

const SidebarItem: React.FC<{ active: boolean, icon: React.ReactNode, label: string, onClick: () => void }> = ({ active, icon, label, onClick }) => (
    <button onClick={onClick} className={`w-full flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-300 ${active ? 'bg-[#7c3aed] text-white shadow-xl shadow-indigo-200' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}><span className={active ? 'text-white' : 'text-slate-500'}>{icon}</span><span className="text-[11px] font-black uppercase tracking-widest italic">{label}</span></button>
);

const SubTabButton: React.FC<{ active: boolean, label: string, onClick: () => void }> = ({ active, label, onClick }) => (
    <button onClick={onClick} className={`px-4 py-2 text-[9px] font-black rounded-xl transition-all border-2 shrink-0 ${active ? 'bg-[#1a1625] text-white border-[#1a1625] shadow-md italic' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}>{label}</button>
);

export default App;
