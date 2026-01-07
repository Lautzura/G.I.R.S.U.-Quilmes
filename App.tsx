
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
    Calendar as CalendarIcon,
    Search,
    Plus,
    CheckCircle2,
    X,
    UserX,
    Check,
    UserCheck,
    ChevronLeft,
    ChevronRight,
    UserMinus,
    RefreshCcw,
    RotateCcw,
    Save,
    CheckCircle
} from 'lucide-react';

const DATA_KEY_PREFIX = 'girsu_diario_v15_';
const TRANS_KEY_PREFIX = 'girsu_transfer_v15_';
const STAFF_STORAGE_KEY = 'master_staff_v15';
const TEMPLATE_ROUTES_KEY = 'girsu_template_routes_v15';
const TEMPLATE_TRANS_KEY = 'girsu_template_trans_v15';

export const getAbsenceStyles = (reason: string) => {
    const r = reason?.toUpperCase() || '';
    if (r.includes('INJUSTIFICADA') || r.includes('95') || r.includes('ART')) return 'bg-red-600 text-white border-red-700 shadow-inner';
    if (r.includes('VACACIONES')) return 'bg-emerald-600 text-white border-emerald-700';
    if (r.includes('MEDICA')) return 'bg-orange-500 text-white border-orange-600';
    return 'bg-red-50 text-red-600 border-red-200';
};

const REASON_COLORS: Record<string, string> = {
    [AbsenceReason.ART]: 'bg-[#D1FAE5] text-[#065F46]',
    [AbsenceReason.VACACIONES]: 'bg-[#FEF3C7] text-[#92400E]',
    [AbsenceReason.LICENCIA_MEDICA]: 'bg-[#D1FAE5] text-[#065F46]',
    [AbsenceReason.SUSPENSION]: 'bg-[#FEE2E2] text-[#991B1B]',
    [AbsenceReason.RESERVA]: 'bg-[#FEF3C7] text-[#92400E]',
    [AbsenceReason.ARTICULO_95]: 'bg-[#D1FAE5] text-[#065F46]',
    [AbsenceReason.DIA_EXAMEN]: 'bg-[#DBEAFE] text-[#1E40AF]',
    [AbsenceReason.DIA_PREEXAMEN]: 'bg-[#DBEAFE] text-[#1E40AF]',
    [AbsenceReason.NACIMIENTO]: 'bg-[#FCE7F3] text-[#9D174D]',
    [AbsenceReason.CASAMIENTO]: 'bg-[#FCE7F3] text-[#9D174D]',
    [AbsenceReason.DUELO]: 'bg-[#E0E7FF] text-[#3730A3]',
    [AbsenceReason.DONACION_SANGRE]: 'bg-[#DBEAFE] text-[#1E40AF]',
    [AbsenceReason.LICENCIA_GREMIAL]: 'bg-[#E0E7FF] text-[#3730A3]',
    [AbsenceReason.ASISTENCIA_FAMILIAR]: 'bg-[#E0E7FF] text-[#3730A3]',
};

const resolveStaffStatus = (member: StaffMember, dateStr: string): StaffMember => {
    if (!member.absenceStartDate) return { ...member, status: StaffStatus.PRESENT, address: '' };
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
    return { ...member, status: StaffStatus.PRESENT, address: '' };
};

const syncStaffInObject = (obj: any, idToFind: string, updatedStaff: StaffMember | null) => {
    const newObj = { ...obj };
    const fields = ['driver', 'aux1', 'aux2', 'aux3', 'aux4', 'replacementDriver', 'replacementAux1', 'replacementAux2', 'maquinista', 'encargado', 'balancero1', 'auxTolva1', 'auxTolva2'];
    fields.forEach(field => {
        if (newObj[field] && String(newObj[field].id).trim() === String(idToFind).trim()) {
            newObj[field] = updatedStaff;
        }
    });
    return newObj;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [pickerState, setPickerState] = useState<{ type: 'route' | 'transfer', targetId: string, field: string, role: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [absencePickerId, setAbsencePickerId] = useState<string | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  const isToday = selectedDate === today;

  useEffect(() => {
    setIsLoaded(false);
    const dateKey = `${DATA_KEY_PREFIX}${selectedDate}`;
    const transKey = `${TRANS_KEY_PREFIX}${selectedDate}`;
    
    let currentStaff: StaffMember[] = [];
    const masterStaffRaw = localStorage.getItem(STAFF_STORAGE_KEY);
    
    if (masterStaffRaw) {
        currentStaff = JSON.parse(masterStaffRaw);
    } else {
        currentStaff = EXTRA_STAFF;
    }

    const uniqueStaff = Array.from(new Map(currentStaff.map(s => [String(s.id).trim(), s])).values());
    const resolvedStaff = uniqueStaff.map(s => resolveStaffStatus(s, selectedDate));
    setStaffList(resolvedStaff);

    const savedDayData = localStorage.getItem(dateKey);
    let rawRoutes: any[] = [];
    
    if (savedDayData) {
        rawRoutes = JSON.parse(savedDayData);
    } else {
        const savedTemplate = localStorage.getItem(TEMPLATE_ROUTES_KEY);
        if (savedTemplate) {
            rawRoutes = JSON.parse(savedTemplate).map((r: any) => ({
                ...r,
                id: `${r.zone}-${r.shift}-${Date.now()}-${Math.random()}`,
                departureTime: '', dumpTime: '', tonnage: '', zoneStatus: ZoneStatus.PENDING, supervisionReport: ''
            }));
        } else {
            const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ id: `${m.zone}-${shift}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }));
            rawRoutes = [...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')];
        }
    }

    const findS = (m: any) => {
        if (!m) return null;
        const id = typeof m === 'string' ? m : m.id;
        return resolvedStaff.find(s => String(s.id).trim() === String(id).trim()) || null;
    };

    setRecords(rawRoutes.map(r => ({ 
        ...r, 
        driver: findS(r.driver), aux1: findS(r.aux1), aux2: findS(r.aux2), aux3: findS(r.aux3), aux4: findS(r.aux4), 
        replacementDriver: findS(r.replacementDriver), replacementAux1: findS(r.replacementAux1), replacementAux2: findS(r.replacementAux2) 
    })));

    const savedTrans = localStorage.getItem(transKey);
    let rawTrans: any[] = [];
    
    if (savedTrans) {
        rawTrans = JSON.parse(savedTrans);
    } else {
        const savedTransTemplate = localStorage.getItem(TEMPLATE_TRANS_KEY);
        if (savedTransTemplate) {
            rawTrans = JSON.parse(savedTransTemplate).map((tr: any) => ({
                ...tr,
                id: `TR-${tr.shift}-${Date.now()}`,
                observaciones: ''
            }));
        } else {
            const createInitTr = (s: any): TransferRecord => ({ id: `TR-${s}-${Date.now()}`, shift: s, units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' });
            rawTrans = [createInitTr('MAÑANA'), createInitTr('TARDE'), createInitTr('NOCHE')];
        }
    }
    
    setTransferRecords(rawTrans.map(tr => ({
        ...tr, maquinista: findS(tr.maquinista), encargado: findS(tr.encargado), balancero1: findS(tr.balancero1),
        auxTolva1: findS(tr.auxTolva1), auxTolva2: findS(tr.auxTolva2),
        units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver) })) as any
    })));
    
    setIsLoaded(true);
  }, [selectedDate]);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(`${DATA_KEY_PREFIX}${selectedDate}`, JSON.stringify(records));
    localStorage.setItem(`${TRANS_KEY_PREFIX}${selectedDate}`, JSON.stringify(transferRecords));
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staffList));
  }, [records, transferRecords, staffList, selectedDate, isLoaded]);

  const currentlyAssignedId = useMemo(() => {
    if (!pickerState) return null;
    if (pickerState.type === 'route') {
      const record = records.find(r => r.id === pickerState.targetId);
      const staff = record ? (record as any)[pickerState.field] : null;
      return staff ? String(staff.id).trim() : null;
    } else {
      const tr = transferRecords.find(t => t.id === pickerState.targetId);
      if (!tr) return null;
      if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
        const staff = tr.units[pickerState.unitIdx]?.driver;
        return staff ? String(staff.id).trim() : null;
      }
      const staff = (tr as any)[pickerState.field];
      return staff ? String(staff.id).trim() : null;
    }
  }, [pickerState, records, transferRecords]);

  const filteredPickerStaff = useMemo(() => {
    if (!pickerState) return [];
    const term = pickerSearch.toLowerCase().trim();
    if (!term) {
        return [...staffList].sort((a, b) => {
            const currentId = String(currentlyAssignedId || '').trim();
            if (String(a.id).trim() === currentId) return -1;
            if (String(b.id).trim() === currentId) return 1;
            return a.name.localeCompare(b.name);
        });
    }
    return staffList.filter(s => {
        const nameMatch = s.name.toLowerCase().includes(term);
        const legajoMatch = String(s.id).toLowerCase().includes(term);
        return nameMatch || legajoMatch;
    }).sort((a, b) => {
        const currentId = String(currentlyAssignedId || '').trim();
        if (String(a.id).trim() === currentId) return -1;
        if (String(b.id).trim() === currentId) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [staffList, pickerSearch, pickerState, currentlyAssignedId]);

  const handleUpdateStaff = (updatedMember: StaffMember, originalId?: string) => {
    const idToFind = String(originalId || updatedMember.id).trim();
    const resolved = resolveStaffStatus(updatedMember, selectedDate);
    setStaffList(prev => prev.map(s => String(s.id).trim() === idToFind ? resolved : s));
    setRecords(prev => prev.map(r => syncStaffInObject(r, idToFind, resolved)));
    setTransferRecords(prev => prev.map(tr => {
        let newTr = syncStaffInObject(tr, idToFind, resolved);
        newTr.units = newTr.units.map((u:any) => (u.driver && String(u.driver.id).trim() === idToFind) ? { ...u, driver: resolved } : u);
        return newTr;
    }));
  };

  const handleRemoveStaff = (id: string) => {
    const cleanId = String(id).trim();
    if (!window.confirm(`¿Estás seguro de eliminar?`)) return;
    setStaffList(prev => prev.filter(s => String(s.id).trim() !== cleanId));
    setRecords(prev => prev.map(r => syncStaffInObject(r, cleanId, null)));
    setTransferRecords(prev => prev.map(tr => {
        let newTr = syncStaffInObject(tr, cleanId, null);
        newTr.units = newTr.units.map((u:any) => (u.driver && String(u.driver.id).trim() === cleanId) ? { ...u, driver: null } : u);
        return newTr;
    }));
  };

  const saveCurrentAsTemplate = () => {
    if (!window.confirm("¿GUARDAR ESTE PERSONAL COMO PLANTILLA MAESTRA?")) return;
    
    const routesToSave = records.map(r => ({
        ...r,
        driver: r.driver?.id || null,
        aux1: r.aux1?.id || null,
        aux2: r.aux2?.id || null,
        aux3: r.aux3?.id || null,
        aux4: r.aux4?.id || null,
        replacementDriver: r.replacementDriver?.id || null,
        replacementAux1: r.replacementAux1?.id || null,
        replacementAux2: r.replacementAux2?.id || null,
        departureTime: '', tonnage: '', zoneStatus: ZoneStatus.PENDING, supervisionReport: ''
    }));

    const transToSave = transferRecords.map(tr => ({
        ...tr,
        maquinista: tr.maquinista?.id || null,
        encargado: tr.encargado?.id || null,
        balancero1: tr.balancero1?.id || null,
        auxTolva1: tr.auxTolva1?.id || null,
        auxTolva2: tr.auxTolva2?.id || null,
        units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null, trips: u.trips.map(() => ({ hora: '', ton: '' })) })),
        observaciones: ''
    }));

    localStorage.setItem(TEMPLATE_ROUTES_KEY, JSON.stringify(routesToSave));
    localStorage.setItem(TEMPLATE_TRANS_KEY, JSON.stringify(transToSave));   

    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const applyTemplate = () => {
    const savedTemplate = localStorage.getItem(TEMPLATE_ROUTES_KEY);
    const savedTransTemplate = localStorage.getItem(TEMPLATE_TRANS_KEY);

    if (!savedTemplate) {
        alert("No hay ninguna plantilla guardada");
        return;
    }

    if (!window.confirm("¿APLICAR LA PLANTILLA MAESTRA AL DÍA ACTUAL?")) return;

    const routesTemplate = JSON.parse(savedTemplate);
    const transTemplate = savedTransTemplate ? JSON.parse(savedTransTemplate) : [];

    const updatedRoutes = routesTemplate.map((r: any) => ({
      ...r,
      id: `${r.zone}-${r.shift}-${Date.now()}-${Math.random()}`,
      driver: staffList.find(s => String(s.id).trim() === String(r.driver || '').trim()) || null,
      aux1: staffList.find(s => String(s.id).trim() === String(r.aux1 || '').trim()) || null,
      aux2: staffList.find(s => String(s.id).trim() === String(r.aux2 || '').trim()) || null,
      aux3: staffList.find(s => String(s.id).trim() === String(r.aux3 || '').trim()) || null,
      aux4: staffList.find(s => String(s.id).trim() === String(r.aux4 || '').trim()) || null,
      replacementDriver: null,
      replacementAux1: null,
      replacementAux2: null,
      departureTime: '',
      dumpTime: '',
      tonnage: '',
      supervisionReport: '',
      zoneStatus: ZoneStatus.PENDING
    }));

    const updatedTrans = transTemplate.map((tr: any) => ({
      ...tr,
      id: `TR-${tr.shift}-${Date.now()}`,
      maquinista: staffList.find(s => String(s.id).trim() === String(tr.maquinista || '').trim()) || null,
      encargado: staffList.find(s => String(s.id).trim() === String(tr.encargado || '').trim()) || null,
      balancero1: staffList.find(s => String(s.id).trim() === String(tr.balancero1 || '').trim()) || null,
      auxTolva1: staffList.find(s => String(s.id).trim() === String(tr.auxTolva1 || '').trim()) || null,
      auxTolva2: staffList.find(s => String(s.id).trim() === String(tr.auxTolva2 || '').trim()) || null,
      units: tr.units.map((u: any) => ({
        ...u,
        driver: staffList.find(s => String(s.id).trim() === String(u.driver || '').trim()) || null
      })),
      observaciones: ''
    }));

    setRecords(updatedRoutes);
    setTransferRecords(updatedTrans);
    alert("Plantilla aplicada con éxito.");
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    if (pickerState.type === 'route') {
      setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: selectedStaff } : r));
    } else if (pickerState.type === 'transfer') {
      setTransferRecords(prev => prev.map(tr => {
        if (tr.id !== pickerState.targetId) return tr;
        if (pickerState.field === 'units') {
            const u = [...tr.units];
            u[pickerState.unitIdx!] = { ...u[pickerState.unitIdx!], driver: selectedStaff };
            return { ...tr, units: u as any };
        }
        return { ...tr, [pickerState.field]: selectedStaff };
      }));
    }
    setPickerState(null);
    setPickerSearch('');
    setAbsencePickerId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden">
      <aside className="w-64 bg-[#111827] text-white flex flex-col shrink-0 z-[100] shadow-2xl">
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black tracking-tighter italic text-white uppercase">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <button onClick={() => setActiveTab('parte')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'parte' ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><ClipboardList size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Parte Diario</span></button>
            <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Personal</span></button>
            <div className="pt-8 px-4">
                <button onClick={() => { if(window.confirm('¿Reiniciar?')) localStorage.removeItem(STAFF_STORAGE_KEY); location.reload(); }} className="w-full flex items-center gap-2 px-4 py-3 bg-red-900/30 text-red-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-900/50 transition-all border border-red-900/50"><RefreshCcw size={14} /> Reiniciar Demos</button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-[90] shadow-sm">
          <div className="flex items-center gap-6">
              <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic text-nowrap">GIRSU OPERATIVO</h1>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                    <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                ))}
              </div>
          </div>
          
          <div className="flex items-center gap-3 relative z-[100]">
             <div className={`flex items-center border rounded-full px-2 py-1.5 transition-all duration-300 ${!isToday ? 'bg-amber-50 border-amber-200 shadow-sm' : 'bg-slate-50 border-slate-200'}`}>
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className={`p-2 rounded-full transition-colors ${!isToday ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-white text-slate-400'}`}><ChevronLeft size={18} /></button>
                <div className="flex items-center gap-3 px-3 relative">
                    <div className={`p-2 rounded-xl transition-colors ${!isToday ? 'bg-amber-100 text-amber-600' : 'bg-white text-indigo-500 shadow-sm'}`}><CalendarIcon size={16} /></div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                             <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-black text-slate-700 outline-none uppercase cursor-pointer" />
                             {!isToday && <CalendarIcon size={12} className="text-amber-500" />}
                        </div>
                        {!isToday && <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest leading-none mt-0.5">Modo Consulta</span>}
                    </div>
                </div>
                {!isToday && (
                    <button onClick={() => setSelectedDate(today)} className="ml-2 bg-amber-500 text-white p-2 rounded-full shadow-md hover:bg-amber-600 transition-all hover:rotate-[-45deg] active:scale-90" title="Volver a hoy"><RotateCcw size={16} /></button>
                )}
                <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className={`p-2 rounded-full transition-colors ${!isToday ? 'hover:bg-amber-100 text-amber-600' : 'hover:bg-white text-slate-400'}`}><ChevronRight size={18} /></button>
             </div>

             <div className="h-10 w-px bg-slate-200 mx-2"></div>

             <div className="flex items-center gap-2">           
                <button
                    onClick={applyTemplate}
                    title="Aplicar plantilla maestra"
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 bg-amber-500 text-white hover:bg-amber-600"
                >
                    <RotateCcw size={26} strokeWidth={3} />
                </button>
                <button 
                    onClick={saveCurrentAsTemplate} 
                    title="Guardar como Plantilla"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${saveFeedback ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-indigo-400 hover:bg-black'}`}
                >
                    {saveFeedback ? <CheckCircle size={28} strokeWidth={3} className="animate-in zoom-in" /> : <Save size={26} strokeWidth={3} />}
                </button>
                <button 
                    onClick={() => setIsNewRouteModalOpen(true)} 
                    title="Añadir Nueva Ruta"
                    className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 shadow-md active:scale-90 transition-all"
                >
                    <Plus size={34} strokeWidth={4} />
                </button>
                <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:brightness-110 transition-all h-12 shrink-0"><CheckCircle2 size={16} /> Cierre</button>
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-[#f8fafc]">
            {isLoaded ? (
                activeTab === 'parte' ? (
                <div className="h-full flex flex-col">
                    <div className="bg-white px-6 py-2 border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-40">
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setSubTab('GENERAL')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'GENERAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>RECOLECCIÓN</button>
                            <button onClick={() => setSubTab('REPASO')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'REPASO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>REPASO</button>
                            <button onClick={() => setSubTab('TRANSFERENCIA')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'TRANSFERENCIA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>TOLVA</button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className="h-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                            {subTab === 'TRANSFERENCIA' ? (
                                <TransferTable data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, uIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx: uIdx })} onUpdateStaff={handleUpdateStaff} />
                            ) : (
                                <ReportTable data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(prev => prev.filter(r => r.id !== id))} onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })} onUpdateStaff={handleUpdateStaff} activeShiftLabel={`TURNO ${shiftFilter}`} />
                            )}
                        </div>
                    </div>
                </div>
                ) : (
                <div className="h-full p-8 overflow-y-auto"><StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => { setStaffList(prev => [...prev, resolveStaffStatus(s, selectedDate)]); }} onBulkAddStaff={newS => { setStaffList(prev => [...prev, ...newS.map(s => resolveStaffStatus(s, selectedDate))]); }} onRemoveStaff={handleRemoveStaff} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} /></div>
                )
            ) : (
                <div className="flex h-full items-center justify-center bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-black uppercase tracking-tight italic">Asignar {pickerState.role}</h3>
                    <button onClick={() => { setPickerState(null); setPickerSearch(''); setAbsencePickerId(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center shrink-0">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-[#FFF5F5] text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"><UserMinus size={18} /> Quitar</button>
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input autoFocus type="text" placeholder="BUSCAR..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-bold outline-none focus:bg-white transition-all uppercase" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc] custom-scrollbar">
                    {filteredPickerStaff.map(s => {
                        const isCurrent = String(s.id).trim() === String(currentlyAssignedId || '').trim();
                        const isAbsent = s.status === StaffStatus.ABSENT;
                        const isShowingReasons = absencePickerId === String(s.id);
                        return (
                        <div key={s.id} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col ${isCurrent ? 'border-indigo-600 bg-white shadow-xl ring-4 ring-indigo-50' : 'border-white bg-white shadow-sm'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5 flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${isAbsent ? 'bg-red-50 text-red-600' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.name.charAt(0)}</div>
                                    <div onClick={() => !isAbsent && handlePickerSelection(s)} className="cursor-pointer">
                                        <h4 className="text-[13px] font-black uppercase text-slate-800 leading-none">{s.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase">LEGAJO: {s.id} {isAbsent && `(${s.address || 'FALTA'})`}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); if (isAbsent) { handleUpdateStaff({ ...s, status: StaffStatus.PRESENT, address: '' }); } else { setAbsencePickerId(isShowingReasons ? null : String(s.id)); } }} className={`p-4 rounded-2xl text-white shadow-lg transition-all ${isAbsent || isShowingReasons ? 'bg-red-500 scale-105' : 'bg-red-400 hover:scale-105'}`}>{isAbsent ? <UserCheck size={24} /> : <UserX size={24} />}</button>
                                    <button disabled={isAbsent} onClick={() => handlePickerSelection(s)} className={`p-4 rounded-2xl text-white shadow-lg transition-all ${isAbsent ? 'bg-slate-200 cursor-not-allowed opacity-50' : 'bg-[#5850ec] hover:scale-105'}`}><Check size={24} /></button>
                                </div>
                            </div>
                            {isShowingReasons && (
                                <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-3 gap-3 animate-in slide-in-from-top duration-300">
                                    {Object.values(AbsenceReason).map(r => (
                                        <button key={r} onClick={() => { handleUpdateStaff({ ...s, status: StaffStatus.ABSENT, address: r, absenceStartDate: selectedDate }); setAbsencePickerId(null); }} className={`px-3 py-4 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm border border-black/5 ${REASON_COLORS[r] || 'bg-slate-100 text-slate-600'}`}>{r}</button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )})}
                </div>
            </div>
        </div>
      )}

      <ShiftCloseModal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} shift={shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={(z, s) => {
          const newRec: RouteRecord = { id: `NEW-${Date.now()}`, zone: z, internalId: '', domain: '', reinforcement: 'EXTRA', shift: s as any, departureTime: '', dumpTime: '', tonnage: '', category: subTab === 'REPASO' ? 'REPASO_LATERAL' : 'RECOLECCIÓN', zoneStatus: ZoneStatus.PENDING, order: records.length, driver: null, aux1: null, aux2: null, aux3: null, aux4: null, replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' };
          setRecords(prev => [...prev, newRec]);
      }} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

export default App;
