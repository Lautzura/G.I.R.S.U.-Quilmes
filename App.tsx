
import React, { useState, useMemo, useEffect } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, TransferUnit, AbsenceReason } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { getAbsenceStyles, REASON_COLORS } from './styles';
import { 
    MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA,
    MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA,
    EXTRA_STAFF 
} from './constants';
import { 
    ClipboardList,
    Users,
    Calendar as CalendarIcon,
    Search,
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
    CheckCircle,
    CheckCircle2,
    Layout,
    ChevronDown,
    Wand2,
    Plus,
    FileText,
    Settings,
    ShieldAlert,
    Database
} from 'lucide-react';

const DATA_KEY_PREFIX = 'girsu_v17_data_';
const TRANS_KEY_PREFIX = 'girsu_v17_trans_';
const MANAGERS_KEY_PREFIX = 'girsu_v17_mgrs_';
const STAFF_STORAGE_KEY = 'girsu_v17_staff';
const MASTER_TEMPLATE_KEY = 'girsu_v17_master_template_v2';

const safeParse = (key: string, fallback: any) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
};

const resolveStaffStatus = (member: StaffMember, dateStr: string): StaffMember => {
    if (!member) return member;
    if (!member.absenceStartDate) return { ...member, status: StaffStatus.PRESENT, address: '' };
    try {
        const current = new Date(dateStr + 'T12:00:00').getTime();
        const start = new Date(member.absenceStartDate + 'T12:00:00').getTime();
        let shouldBeAbsent = false;
        if (member.isIndefiniteAbsence) {
            shouldBeAbsent = current >= start;
        } else if (member.absenceReturnDate) {
            const end = new Date(member.absenceReturnDate + 'T12:00:00').getTime();
            shouldBeAbsent = current >= start && current <= end;
        } else {
            shouldBeAbsent = dateStr === member.absenceStartDate;
        }
        if (shouldBeAbsent) return { ...member, status: StaffStatus.ABSENT };
        return { ...member, status: StaffStatus.PRESENT, address: '' };
    } catch (e) {
        return { ...member, status: StaffStatus.PRESENT, address: '' };
    }
};

const syncStaffInObject = (obj: any, idToFind: string, updatedStaff: StaffMember | null) => {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj = { ...obj };
    const fields = ['driver', 'aux1', 'aux2', 'aux3', 'aux4', 'replacementDriver', 'replacementAux1', 'replacementAux2', 'maquinista', 'encargado', 'balancero1', 'auxTolva1', 'auxTolva2'];
    fields.forEach(field => {
        if (newObj[field] && typeof newObj[field] === 'object' && String(newObj[field].id).trim() === String(idToFind).trim()) {
            newObj[field] = updatedStaff;
        }
    });
    return newObj;
};

const App: React.FC = () => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  
  // Estados de datos
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [shiftManagers, setShiftManagers] = useState<Record<string, ShiftMetadata>>({
    MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
    TARDE: { supervisor: '', subSupervisor: '', absences: [] },
    NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
  });

  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);
  const [pickerState, setPickerState] = useState<{ type: 'route' | 'transfer' | 'managers', targetId: string, field: string, role: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [absencePickerId, setAbsencePickerId] = useState<string | null>(null);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  const isToday = selectedDate === today;

  // EFECTO DE CARGA (SISTEMA V17)
  useEffect(() => {
    setIsLoaded(false);
    try {
        // 1. Cargar Staff
        const rawStaff = safeParse(STAFF_STORAGE_KEY, EXTRA_STAFF);
        const resolvedStaff = rawStaff.map((s: any) => resolveStaffStatus(s, selectedDate));
        setStaffList(resolvedStaff);

        const findS = (id: any) => resolvedStaff.find((s: StaffMember) => String(s.id).trim() === String(id || '').trim()) || null;

        if (isTemplateMode) {
            // CARGAR MODO PLANTILLA
            const template = safeParse(MASTER_TEMPLATE_KEY, null);
            if (template) {
                setRecords(template.routes.map((r: any) => ({ ...r, driver: findS(r.driver), aux1: findS(r.aux1), aux2: findS(r.aux2), aux3: findS(r.aux3), aux4: findS(r.aux4) })));
                setTransferRecords(template.transfer.map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista), encargado: findS(tr.encargado), balancero1: findS(tr.balancero1), auxTolva1: findS(tr.auxTolva1), auxTolva2: findS(tr.auxTolva2), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver) })) })));
                setShiftManagers(template.managers);
            } else {
                // Fallback a constantes si no hay plantilla
                initializeFromConstants(findS);
            }
        } else {
            // CARGAR DÍA ESPECÍFICO
            const dateKey = `${DATA_KEY_PREFIX}${selectedDate}`;
            const transKey = `${TRANS_KEY_PREFIX}${selectedDate}`;
            const managersKey = `${MANAGERS_KEY_PREFIX}${selectedDate}`;
            
            const savedRoutes = localStorage.getItem(dateKey);
            
            if (savedRoutes) {
                // El día ya tiene datos propios
                const routes = JSON.parse(savedRoutes);
                const trans = safeParse(transKey, []);
                const mgrs = safeParse(managersKey, {});
                
                setRecords(routes.map((r: any) => ({ ...r, driver: findS(r.driver), aux1: findS(r.aux1), aux2: findS(r.aux2), aux3: findS(r.aux3), aux4: findS(r.aux4) })));
                setTransferRecords(trans.map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista), encargado: findS(tr.encargado), balancero1: findS(tr.balancero1), auxTolva1: findS(tr.auxTolva1), auxTolva2: findS(tr.auxTolva2), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver) })) })));
                if (Object.keys(mgrs).length > 0) setShiftManagers(mgrs);
            } else {
                // El día está vacío -> Clonar Plantilla Maestra
                const template = safeParse(MASTER_TEMPLATE_KEY, null);
                if (template) {
                    setRecords(template.routes.map((r: any) => ({ ...r, id: `${r.zone}-${Date.now()}-${Math.random()}`, driver: findS(r.driver), aux1: findS(r.aux1), aux2: findS(r.aux2), aux3: findS(r.aux3), aux4: findS(r.aux4) })));
                    setTransferRecords(template.transfer.map((tr: any) => ({ ...tr, id: `TR-${tr.shift}-${Date.now()}`, maquinista: findS(tr.maquinista), encargado: findS(tr.encargado), balancero1: findS(tr.balancero1), auxTolva1: findS(tr.auxTolva1), auxTolva2: findS(tr.auxTolva2), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver) })) })));
                    setShiftManagers(template.managers);
                } else {
                    initializeFromConstants(findS);
                }
            }
        }
    } catch (e) {
        console.error("BOOT ERROR:", e);
    } finally {
        setIsLoaded(true);
    }
  }, [selectedDate, isTemplateMode]);

  const initializeFromConstants = (findS: any) => {
    const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ id: `${m.zone}-${shift}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findS(m.driver), aux1: findS(m.aux1), aux2: findS(m.aux2), aux3: findS(m.aux3), aux4: findS(m.aux4), replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }));
    setRecords([...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')]);
    
    const createInitTr = (s: any): TransferRecord => ({ id: `TR-${s}-${Date.now()}`, shift: s, units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' });
    setTransferRecords([createInitTr('MAÑANA'), createInitTr('TARDE'), createInitTr('NOCHE')]);
    
    setShiftManagers({
        MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
        TARDE: { supervisor: '', subSupervisor: '', absences: [] },
        NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
    });
  };

  // PERSISTENCIA
  useEffect(() => {
    if (!isLoaded) return;
    try {
        const staffToSave = JSON.stringify(staffList);
        localStorage.setItem(STAFF_STORAGE_KEY, staffToSave);

        if (isTemplateMode) {
            // Guardar en llave de PLANTILLA
            const template = {
                routes: records.map(r => ({ ...r, driver: r.driver?.id || null, aux1: r.aux1?.id || null, aux2: r.aux2?.id || null, aux3: r.aux3?.id || null, aux4: r.aux4?.id || null, replacementDriver: null, replacementAux1: null, replacementAux2: null, departureTime: '', tonnage: '', zoneStatus: ZoneStatus.PENDING, supervisionReport: '' })),
                transfer: transferRecords.map(tr => ({ ...tr, maquinista: tr.maquinista?.id || null, encargado: tr.encargado?.id || null, balancero1: tr.balancero1?.id || null, auxTolva1: tr.auxTolva1?.id || null, auxTolva2: tr.auxTolva2?.id || null, units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null, trips: u.trips.map(() => ({ hora: '', ton: '' })) })), observaciones: '' })),
                managers: shiftManagers
            };
            localStorage.setItem(MASTER_TEMPLATE_KEY, JSON.stringify(template));
        } else {
            // Guardar en llave de DÍA
            const dateKey = `${DATA_KEY_PREFIX}${selectedDate}`;
            const transKey = `${TRANS_KEY_PREFIX}${selectedDate}`;
            const managersKey = `${MANAGERS_KEY_PREFIX}${selectedDate}`;
            
            localStorage.setItem(dateKey, JSON.stringify(records.map(r => ({ ...r, driver: r.driver?.id || null, aux1: r.aux1?.id || null, aux2: r.aux2?.id || null, aux3: r.aux3?.id || null, aux4: r.aux4?.id || null, replacementDriver: r.replacementDriver?.id || null, replacementAux1: r.replacementAux1?.id || null, replacementAux2: r.replacementAux2?.id || null }))));
            localStorage.setItem(transKey, JSON.stringify(transferRecords.map(tr => ({ ...tr, maquinista: tr.maquinista?.id || null, encargado: tr.encargado?.id || null, balancero1: tr.balancero1?.id || null, auxTolva1: tr.auxTolva1?.id || null, auxTolva2: tr.auxTolva2?.id || null, units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null })) }))));
            localStorage.setItem(managersKey, JSON.stringify(shiftManagers));
        }
    } catch (e) { }
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, isLoaded, isTemplateMode]);

  const currentlyAssignedId = useMemo(() => {
    if (!pickerState || !isLoaded) return null;
    try {
        if (pickerState.type === 'route') {
            const record = records.find(r => r.id === pickerState.targetId);
            const staff = record ? (record as any)[pickerState.field] : null;
            return staff?.id ? String(staff.id).trim() : null;
        } else if (pickerState.type === 'transfer') {
            const tr = transferRecords.find(t => t.id === pickerState.targetId);
            if (!tr) return null;
            if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
                const staff = tr.units[pickerState.unitIdx]?.driver;
                return staff?.id ? String(staff.id).trim() : null;
            }
            const staff = (tr as any)[pickerState.field];
            return staff?.id ? String(staff.id).trim() : null;
        } else if (pickerState.type === 'managers') {
            const mgrObj = shiftManagers[pickerState.targetId];
            if (!mgrObj) return null;
            const mgrName = (mgrObj as any)[pickerState.field];
            const staff = staffList.find(s => s.name === mgrName);
            return staff?.id ? String(staff.id).trim() : null;
        }
    } catch { return null; }
    return null;
  }, [pickerState, records, transferRecords, shiftManagers, staffList, isLoaded]);

  const filteredPickerStaff = useMemo(() => {
    if (!pickerState || !isLoaded) return [];
    const term = pickerSearch.toLowerCase().trim();
    const list = staffList.filter(s => s && s.name && (s.name.toLowerCase().includes(term) || String(s.id).includes(term)));
    return list.sort((a, b) => {
        const currentId = String(currentlyAssignedId || '').trim();
        if (String(a.id).trim() === currentId) return -1;
        if (String(b.id).trim() === currentId) return 1;
        return a.name.localeCompare(b.name);
    });
  }, [staffList, pickerSearch, pickerState, currentlyAssignedId, isLoaded]);

  const handleUpdateStaff = (updatedMember: StaffMember, originalId?: string) => {
    const idToFind = String(originalId || updatedMember.id).trim();
    const resolved = resolveStaffStatus(updatedMember, selectedDate);
    setStaffList(prev => prev.map(s => String(s.id).trim() === idToFind ? resolved : s));
    setRecords(prev => prev.map(r => syncStaffInObject(r, idToFind, resolved)));
    setTransferRecords(prev => prev.map(tr => {
        let newTr = syncStaffInObject(tr, idToFind, resolved);
        if (newTr && Array.isArray(newTr.units)) {
            newTr.units = newTr.units.map((u:any) => (u.driver && String(u.driver.id).trim() === idToFind) ? { ...u, driver: resolved } : u);
        }
        return newTr;
    }));
  };

  const handleRemoveStaff = (id: string) => {
    const cleanId = String(id).trim();
    if (!window.confirm(`¿ELIMINAR PERSONAL?`)) return;
    setStaffList(prev => prev.filter(s => String(s.id).trim() !== cleanId));
    setRecords(prev => prev.map(r => syncStaffInObject(r, cleanId, null)));
    setTransferRecords(prev => prev.map(tr => {
        let newTr = syncStaffInObject(tr, cleanId, null);
        if (newTr && Array.isArray(newTr.units)) {
            newTr.units = newTr.units.map((u:any) => (u.driver && String(u.driver.id).trim() === cleanId) ? { ...u, driver: null } : u);
        }
        return newTr;
    }));
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    if (pickerState.type === 'route') {
      setRecords(prev => prev.map(r => r.id === pickerState.targetId ? { ...r, [pickerState.field]: selectedStaff } : r));
    } else if (pickerState.type === 'transfer') {
      setTransferRecords(prev => prev.map(tr => {
        if (tr.id !== pickerState.targetId) return tr;
        if (pickerState.field === 'units' && pickerState.unitIdx !== undefined) {
            const u = [...tr.units];
            u[pickerState.unitIdx] = { ...u[pickerState.unitIdx], driver: selectedStaff };
            return { ...tr, units: u as any };
        }
        return { ...tr, [pickerState.field]: selectedStaff };
      }));
    } else if (pickerState.type === 'managers') {
      setShiftManagers(prev => ({
          ...prev,
          [pickerState.targetId]: { ...prev[pickerState.targetId], [pickerState.field]: selectedStaff ? selectedStaff.name : '' }
      }));
    }
    setPickerState(null);
    setPickerSearch('');
    setAbsencePickerId(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800">
      <aside className={`w-64 text-white flex flex-col shrink-0 z-[100] shadow-2xl transition-colors duration-500 ${isTemplateMode ? 'bg-amber-900' : 'bg-[#111827]'}`}>
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black italic text-white uppercase leading-none">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <button onClick={() => { setIsTemplateMode(false); setActiveTab('parte'); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'parte' && !isTemplateMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><ClipboardList size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Parte Diario</span></button>
            <button onClick={() => { setIsTemplateMode(false); setActiveTab('personal'); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Personal</span></button>
            
            <div className="mt-8 pt-8 border-t border-white/5 space-y-2">
                <p className="px-6 text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2">Configuración Base</p>
                <button onClick={() => { setIsTemplateMode(!isTemplateMode); setActiveTab('parte'); }} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${isTemplateMode ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                    <Database size={20} />
                    <span className="text-[11px] font-black uppercase tracking-widest">ADN Plantilla</span>
                </button>
            </div>

            <div className="pt-8 px-4 mt-auto mb-8">
                <button onClick={() => { if(window.confirm('BORRAR TODO Y REINICIAR?')) { localStorage.clear(); window.location.reload(); } }} className="w-full flex items-center gap-2 px-4 py-3 bg-red-950/40 text-red-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-900/50 transition-all border border-red-900/50"><RefreshCcw size={14} /> Reset Total</button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className={`h-20 border-b px-6 flex items-center justify-between shrink-0 z-[90] shadow-sm transition-colors duration-500 ${isTemplateMode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-6">
              {isTemplateMode ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white rounded-2xl shadow-lg animate-pulse">
                      <ShieldAlert size={20} />
                      <h1 className="text-sm font-black tracking-tight uppercase">Editando Plantilla Maestra</h1>
                  </div>
              ) : (
                  <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">GIRSU OPERATIVO</h1>
              )}
              
              {!isTemplateMode && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                        <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                    ))}
                </div>
              )}
          </div>
          
          <div className="flex items-center gap-3 relative z-[100]">
             {!isTemplateMode && (
                <div className="flex items-center border rounded-full px-2 py-1.5 bg-white border-slate-200 shadow-sm">
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><ChevronLeft size={18} /></button>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-sm font-black text-slate-700 outline-none uppercase cursor-pointer px-2" />
                    <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><ChevronRight size={18} /></button>
                </div>
             )}

             {isTemplateMode ? (
                 <button onClick={() => setIsTemplateMode(false)} className="bg-amber-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl h-12 transition-all hover:scale-105">
                     <CheckCircle size={18} /> Guardar Cambios Base
                 </button>
             ) : (
                <>
                    {!isToday && <button onClick={() => setSelectedDate(today)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg hover:rotate-[-45deg] transition-all"><RotateCcw size={18} /></button>}
                    <button onClick={() => { if(window.confirm("¿RESETEAR DÍA? Se borrarán los cambios de hoy y se cargará la plantilla base.")) { localStorage.removeItem(`${DATA_KEY_PREFIX}${selectedDate}`); window.location.reload(); } }} className="bg-slate-800 text-slate-400 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:text-white transition-all">
                        <Wand2 size={16} /> Resetear Hoy
                    </button>
                    <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg h-12 shrink-0"><CheckCircle2 size={16} /> Cierre</button>
                </>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-[#f8fafc]">
            {isLoaded ? (
                activeTab === 'parte' ? (
                <div className="h-full flex flex-col">
                    <div className={`px-6 py-2 border-b flex items-center justify-between shrink-0 shadow-sm z-40 transition-colors duration-500 ${isTemplateMode ? 'bg-amber-100/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setSubTab('GENERAL')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'GENERAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>RECOLECCIÓN</button>
                            <button onClick={() => setSubTab('REPASO')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'REPASO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>REPASO</button>
                            <button onClick={() => setSubTab('TRANSFERENCIA')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'TRANSFERENCIA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>TOLVA</button>
                        </div>
                        {shiftFilter !== 'TODOS' && shiftManagers[shiftFilter] && (
                            <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter]} staffList={staffList} onOpenPicker={(f, r) => setPickerState({ type: 'managers', targetId: shiftFilter, field: f as string, role: r })} onUpdateStaff={handleUpdateStaff} />
                        )}
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className={`h-full bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col transition-colors duration-500 ${isTemplateMode ? 'border-amber-300' : 'border-slate-200'}`}>
                            {subTab === 'TRANSFERENCIA' ? (
                                <TransferTable 
                                    isMasterMode={isTemplateMode}
                                    data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} 
                                    onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} 
                                    onOpenPicker={(id, field, role, uIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, unitIdx: uIdx })} 
                                    onUpdateStaff={handleUpdateStaff} 
                                />
                            ) : (
                                <ReportTable 
                                    isMasterMode={isTemplateMode}
                                    data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} 
                                    onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                                    onDeleteRecord={id => setRecords(prev => prev.filter(r => r.id !== id))} 
                                    onOpenPicker={(id, field, role) => setPickerState({ type: 'route', targetId: id, field, role })} 
                                    onUpdateStaff={handleUpdateStaff} 
                                    activeShiftLabel={isTemplateMode ? `CONFIGURANDO ADN ${shiftFilter}` : `TURNO ${shiftFilter}`} 
                                    selectedDate={selectedDate} 
                                />
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
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase italic">Asignar {pickerState.role}</h3>
                    <button onClick={() => { setPickerState(null); setPickerSearch(''); setAbsencePickerId(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-[#FFF5F5] text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"><UserMinus size={18} /> Quitar</button>
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input autoFocus type="text" placeholder="BUSCAR..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-14 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-bold outline-none focus:bg-white transition-all uppercase" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc]">
                    {filteredPickerStaff.map(s => {
                        const isCurrent = String(s.id).trim() === String(currentlyAssignedId || '').trim();
                        const isAbsent = s.status === StaffStatus.ABSENT;
                        const isShowingReasons = absencePickerId === String(s.id);
                        return (
                        <div key={s.id} className={`p-6 rounded-[2rem] border-2 transition-all flex flex-col ${isCurrent ? 'border-indigo-600 bg-white shadow-xl' : 'border-white bg-white shadow-sm'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5 flex-1">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${isAbsent ? getAbsenceStyles(s.address || 'FALTA') : isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{s.name.charAt(0)}</div>
                                    <div onClick={() => !isAbsent && handlePickerSelection(s)} className="cursor-pointer flex-1">
                                        <h4 className="text-[13px] font-black uppercase text-slate-800">{s.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-2">LEGAJO: {s.id} {isAbsent && `(${s.address || 'FALTA'})`}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={(e) => { e.stopPropagation(); if (isAbsent) { handleUpdateStaff({ ...s, status: StaffStatus.PRESENT, address: '', absenceStartDate: undefined, absenceReturnDate: undefined, isIndefiniteAbsence: false }); } else { setAbsencePickerId(isShowingReasons ? null : String(s.id)); } }} className={`p-4 rounded-2xl text-white shadow-lg transition-all ${isAbsent || isShowingReasons ? 'bg-red-500 scale-105' : 'bg-red-400'}`}>{isAbsent ? <UserCheck size={24} /> : <UserX size={24} />}</button>
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
