
import React, { useState, useMemo, useEffect } from 'react';
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferRecord, AbsenceReason } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { ShiftManagersTop } from './components/ShiftManagers';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { getAbsenceStyles } from './styles';
import { 
    MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA,
    MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA,
    EXTRA_STAFF 
} from './constants';
import { 
    ClipboardList,
    Users,
    Search,
    X,
    Plus,
    Check,
    ChevronLeft,
    ChevronRight,
    UserMinus,
    RefreshCcw,
    RotateCcw,
    CheckCircle,
    CheckCircle2,
    Database,
    ShieldAlert,
    Wand2
} from 'lucide-react';

const DB_PREFIX = 'girsu_v20_';
const STAFF_KEY = `${DB_PREFIX}staff`;
const ADN_ROUTES_KEY = `${DB_PREFIX}adn_routes`;
const ADN_TRANS_KEY = `${DB_PREFIX}adn_trans`;
const ADN_MGRS_KEY = `${DB_PREFIX}adn_mgrs`;
const DAILY_DATA_KEY = `${DB_PREFIX}day_`;
const DAILY_TRANS_KEY = `${DB_PREFIX}trans_`;
const DAILY_MGRS_KEY = `${DB_PREFIX}mgrs_`;

const App: React.FC = () => {
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [activeTab, setActiveTab] = useState<'parte' | 'personal' | 'adn'>('parte');
  const [subTab, setSubTab] = useState<'GENERAL' | 'REPASO' | 'TRANSFERENCIA'>('GENERAL');
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [shiftManagers, setShiftManagers] = useState<Record<string, ShiftMetadata>>({
    MAÑANA: { supervisor: '', subSupervisor: '', absences: [] },
    TARDE: { supervisor: '', subSupervisor: '', absences: [] },
    NOCHE: { supervisor: '', subSupervisor: '', absences: [] }
  });

  const isToday = selectedDate === today;
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerState, setPickerState] = useState<{ type: string, targetId: string, field: string, role: string, currentValueId?: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    const savedStaff = localStorage.getItem(STAFF_KEY);
    const initialStaff = savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF;
    setStaffList(initialStaff);
    const findS = (id: any, list: StaffMember[]) => list.find(s => String(s.id).trim() === String(id || '').trim()) || null;

    if (activeTab === 'adn') {
        const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);
        const adnTrans = localStorage.getItem(ADN_TRANS_KEY);
        const adnMgrs = localStorage.getItem(ADN_MGRS_KEY);
        if (adnRoutes) setRecords(JSON.parse(adnRoutes).map((r: any) => ({ ...r, driver: findS(r.driver, initialStaff), aux1: findS(r.aux1, initialStaff), aux2: findS(r.aux2, initialStaff), aux3: findS(r.aux3, initialStaff), aux4: findS(r.aux4, initialStaff) })));
        else initializeFromConstants(initialStaff);
        if (adnTrans) setTransferRecords(JSON.parse(adnTrans).map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista, initialStaff), encargado: findS(tr.encargado, initialStaff), balancero1: findS(tr.balancero1, initialStaff), auxTolva1: findS(tr.auxTolva1, initialStaff), auxTolva2: findS(tr.auxTolva2, initialStaff), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver, initialStaff) })) })));
        else setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
        if (adnMgrs) setShiftManagers(JSON.parse(adnMgrs));
    } else {
        const dayRoutes = localStorage.getItem(`${DAILY_DATA_KEY}${selectedDate}`);
        if (dayRoutes) {
            setRecords(JSON.parse(dayRoutes).map((r: any) => ({ ...r, driver: findS(r.driver, initialStaff), aux1: findS(r.aux1, initialStaff), aux2: findS(r.aux2, initialStaff), aux3: findS(r.aux3, initialStaff), aux4: findS(r.aux4, initialStaff), replacementDriver: findS(r.replacementDriver, initialStaff), replacementAux1: findS(r.replacementAux1, initialStaff), replacementAux2: findS(r.replacementAux2, initialStaff) })));
            const dayTrans = localStorage.getItem(`${DAILY_TRANS_KEY}${selectedDate}`);
            if (dayTrans) setTransferRecords(JSON.parse(dayTrans).map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista, initialStaff), encargado: findS(tr.encargado, initialStaff), balancero1: findS(tr.balancero1, initialStaff), auxTolva1: findS(tr.auxTolva1, initialStaff), auxTolva2: findS(tr.auxTolva2, initialStaff), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver, initialStaff) })) })));
            const dayMgrs = localStorage.getItem(`${DAILY_MGRS_KEY}${selectedDate}`);
            if (dayMgrs) setShiftManagers(JSON.parse(dayMgrs));
        } else {
            const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);
            if (adnRoutes) {
                setRecords(JSON.parse(adnRoutes).map((r: any) => ({ ...r, id: `${r.zone}-${selectedDate}-${Math.random()}`, driver: findS(r.driver, initialStaff), aux1: findS(r.aux1, initialStaff), aux2: findS(r.aux2, initialStaff), aux3: findS(r.aux3, initialStaff), aux4: findS(r.aux4, initialStaff), zoneStatus: ZoneStatus.PENDING, tonnage: '', departureTime: '' })));
                const adnTrans = localStorage.getItem(ADN_TRANS_KEY);
                if (adnTrans) setTransferRecords(JSON.parse(adnTrans).map((tr: any) => ({ ...tr, id: `TR-${tr.shift}-${selectedDate}`, maquinista: findS(tr.maquinista, initialStaff), encargado: findS(tr.encargado, initialStaff), balancero1: findS(tr.balancero1, initialStaff), auxTolva1: findS(tr.auxTolva1, initialStaff), auxTolva2: findS(tr.auxTolva2, initialStaff), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver, initialStaff), trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] })) })));
                const adnMgrs = localStorage.getItem(ADN_MGRS_KEY);
                if (adnMgrs) setShiftManagers(JSON.parse(adnMgrs));
            } else {
                initializeFromConstants(initialStaff);
            }
        }
    }
    setIsLoaded(true);
  }, [selectedDate, activeTab]);

  const createEmptyTrans = (s: string): TransferRecord => ({ id: `TR-${s}`, shift: s as any, units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' });

  const initializeFromConstants = (list: StaffMember[]) => {
    const findS = (id: any) => list.find(s => String(s.id).trim() === String(id || '').trim()) || null;
    const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ id: `${m.zone}-${shift}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findS(m.driver), aux1: findS(m.aux1), aux2: findS(m.aux2), aux3: findS(m.aux3), aux4: findS(m.aux4), replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }));
    setRecords([...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')]);
  };

  useEffect(() => {
    if (!isLoaded) return;
    try {
        localStorage.setItem(STAFF_KEY, JSON.stringify(staffList));
        if (activeTab === 'adn') {
            localStorage.setItem(ADN_ROUTES_KEY, JSON.stringify(records.map(r => ({ ...r, driver: r.driver?.id || null, aux1: r.aux1?.id || null, aux2: r.aux2?.id || null, aux3: r.aux3?.id || null, aux4: r.aux4?.id || null }))));
            localStorage.setItem(ADN_TRANS_KEY, JSON.stringify(transferRecords.map(tr => ({ ...tr, maquinista: tr.maquinista?.id || null, encargado: tr.encargado?.id || null, balancero1: tr.balancero1?.id || null, auxTolva1: tr.auxTolva1?.id || null, auxTolva2: tr.auxTolva2?.id || null, units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null })) }))));
            localStorage.setItem(ADN_MGRS_KEY, JSON.stringify(shiftManagers));
        } else {
            localStorage.setItem(`${DAILY_DATA_KEY}${selectedDate}`, JSON.stringify(records.map(r => ({ ...r, driver: r.driver?.id || null, aux1: r.aux1?.id || null, aux2: r.aux2?.id || null, aux3: r.aux3?.id || null, aux4: r.aux4?.id || null, replacementDriver: r.replacementDriver?.id || null, replacementAux1: r.replacementAux1?.id || null, replacementAux2: r.replacementAux2?.id || null }))));
            localStorage.setItem(`${DAILY_TRANS_KEY}${selectedDate}`, JSON.stringify(transferRecords.map(tr => ({ ...tr, maquinista: tr.maquinista?.id || null, encargado: tr.encargado?.id || null, balancero1: tr.balancero1?.id || null, auxTolva1: tr.auxTolva1?.id || null, auxTolva2: tr.auxTolva2?.id || null, units: tr.units.map(u => ({ ...u, driver: u.driver?.id || null })) }))));
            localStorage.setItem(`${DAILY_MGRS_KEY}${selectedDate}`, JSON.stringify(shiftManagers));
        }
    } catch (e) {}
  }, [records, transferRecords, shiftManagers, staffList, selectedDate, isLoaded, activeTab]);

  const handleUpdateStaff = (updatedMember: StaffMember, originalId?: string) => {
    const idToFind = String(originalId || updatedMember.id).trim();
    setStaffList(prev => prev.map(s => String(s.id).trim() === idToFind ? updatedMember : s));
    
    setRecords(prev => prev.map(r => ({
        ...r,
        driver: r.driver?.id === idToFind ? updatedMember : r.driver,
        aux1: r.aux1?.id === idToFind ? updatedMember : r.aux1,
        aux2: r.aux2?.id === idToFind ? updatedMember : r.aux2,
        aux3: r.aux3?.id === idToFind ? updatedMember : r.aux3,
        aux4: r.aux4?.id === idToFind ? updatedMember : r.aux4,
        replacementDriver: r.replacementDriver?.id === idToFind ? updatedMember : r.replacementDriver,
        replacementAux1: r.replacementAux1?.id === idToFind ? updatedMember : r.replacementAux1,
        replacementAux2: r.replacementAux2?.id === idToFind ? updatedMember : r.replacementAux2,
    })));

    setTransferRecords(prev => prev.map(tr => ({
        ...tr,
        maquinista: tr.maquinista?.id === idToFind ? updatedMember : tr.maquinista,
        encargado: tr.encargado?.id === idToFind ? updatedMember : tr.encargado,
        balancero1: tr.balancero1?.id === idToFind ? updatedMember : tr.balancero1,
        auxTolva1: tr.auxTolva1?.id === idToFind ? updatedMember : tr.auxTolva1,
        auxTolva2: tr.auxTolva2?.id === idToFind ? updatedMember : tr.auxTolva2,
        units: tr.units.map(u => u.driver?.id === idToFind ? { ...u, driver: updatedMember } : u) as any
    })));
  };

  const handlePickerSelection = (selectedStaff: StaffMember | null) => {
    if (!pickerState) return;
    const { type, targetId, field, unitIdx } = pickerState;
    if (type.includes('route')) {
      setRecords(prev => prev.map(r => r.id === targetId ? { ...r, [field]: selectedStaff } : r));
    } else if (type.includes('transfer')) {
      setTransferRecords(prev => prev.map(tr => {
        if (tr.id !== targetId) return tr;
        if (field === 'units' && unitIdx !== undefined) {
            const u = [...tr.units];
            u[unitIdx] = { ...u[unitIdx], driver: selectedStaff };
            return { ...tr, units: u as any };
        }
        return { ...tr, [field]: selectedStaff };
      }));
    } else if (type.includes('managers')) {
      setShiftManagers(prev => ({ ...prev, [targetId]: { ...prev[targetId], [field]: selectedStaff ? selectedStaff.name : '' } }));
    }
    setPickerState(null);
  };

  const sortedPickerList = useMemo(() => {
      const filtered = staffList.filter(s => 
          s.name.toLowerCase().includes(pickerSearch.toLowerCase()) || 
          s.id.includes(pickerSearch)
      );
      
      return filtered.sort((a, b) => {
          const isASelected = a.id === pickerState?.currentValueId;
          const isBSelected = b.id === pickerState?.currentValueId;
          if (isASelected && !isBSelected) return -1;
          if (!isASelected && isBSelected) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [staffList, pickerSearch, pickerState?.currentValueId]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800">
      <aside className={`w-64 text-white flex flex-col shrink-0 z-[100] shadow-2xl transition-colors duration-500 ${activeTab === 'adn' ? 'bg-amber-900' : 'bg-[#111827]'}`}>
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-2"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black italic text-white uppercase leading-none">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <button onClick={() => setActiveTab('parte')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'parte' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><ClipboardList size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Parte Diario</span></button>
            <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Personal</span></button>
            <div className="pt-8 px-4 mt-auto mb-8">
                <button onClick={() => { if(window.confirm('¿ELIMINAR HISTORIAL?')) { localStorage.clear(); window.location.reload(); } }} className="w-full flex items-center gap-2 px-4 py-3 bg-red-950/40 text-red-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-900/50 transition-all border border-red-900/50"><RefreshCcw size={14} /> Limpiar Todo</button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className={`h-20 border-b px-6 flex items-center justify-between shrink-0 z-[90] shadow-sm transition-colors duration-500 ${activeTab === 'adn' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-6">
              {activeTab === 'adn' ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white rounded-2xl shadow-lg animate-pulse">
                      <ShieldAlert size={20} />
                      <h1 className="text-sm font-black uppercase tracking-tight">Editando ADN Maestro</h1>
                  </div>
              ) : (
                  <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">GIRSU OPERATIVO</h1>
              )}
              {activeTab !== 'adn' && (
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                        <button key={s} onClick={() => setShiftFilter(s)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{s}</button>
                    ))}
                </div>
              )}
          </div>
          
          <div className="flex items-center gap-3 relative z-[100]">
             {activeTab !== 'adn' && (
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-full px-2 py-1 bg-white border-slate-200 shadow-sm">
                        <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400"><ChevronLeft size={14} /></button>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase cursor-pointer px-1 w-24 text-center" />
                        <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400"><ChevronRight size={14} /></button>
                        {!isToday && <button onClick={() => setSelectedDate(today)} className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:text-indigo-600 transition-all ml-1 shadow-sm" title="Ir a Hoy"><RotateCcw size={14} /></button>}
                    </div>
                    <button onClick={() => setActiveTab('adn')} className="bg-amber-500 text-white p-3 rounded-2xl shadow-md hover:bg-amber-600 transition-all active:scale-95" title="Configurar ADN Maestro"><Database size={18} /></button>
                </div>
             )}
             
             {activeTab === 'adn' ? (
                 <button onClick={() => setActiveTab('parte')} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl h-11 transition-all hover:scale-105 hover:bg-emerald-700"><CheckCircle size={18} /> Guardar ADN</button>
             ) : (
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-indigo-600 text-white p-3 rounded-2xl shadow-md hover:bg-indigo-700 transition-all active:scale-95" title="Añadir Nueva Ruta"><Plus size={18} /></button>
                    <button onClick={() => { if(window.confirm("¿RESETEAR DÍA? Se cargarán los datos del ADN Maestro.")) { localStorage.removeItem(`${DAILY_DATA_KEY}${selectedDate}`); window.location.reload(); } }} className="bg-slate-800 text-white p-3 rounded-2xl shadow-md hover:bg-slate-900 transition-all active:scale-95" title="Cargar Datos ADN"><Wand2 size={18} /></button>
                    <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md hover:bg-emerald-700 transition-all active:scale-95" title="Cerrar Turno / Reporte"><CheckCircle2 size={18} /></button>
                </div>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-[#f8fafc]">
            {isLoaded ? (
                activeTab !== 'personal' ? (
                <div className="h-full flex flex-col">
                    <div className={`px-6 py-2 border-b flex items-center justify-between shrink-0 shadow-sm z-40 transition-colors duration-500 ${activeTab === 'adn' ? 'bg-amber-100/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button onClick={() => setSubTab('GENERAL')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'GENERAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>RECOLECCIÓN</button>
                            <button onClick={() => setSubTab('REPASO')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'REPASO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>REPASO</button>
                            <button onClick={() => setSubTab('TRANSFERENCIA')} className={`px-5 py-2 text-[9px] font-black rounded-lg transition-all ${subTab === 'TRANSFERENCIA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>TOLVA</button>
                        </div>
                        {shiftFilter !== 'TODOS' && shiftManagers[shiftFilter] && (
                            <ShiftManagersTop shift={shiftFilter} data={shiftManagers[shiftFilter]} staffList={staffList} onOpenPicker={(f, r, curr) => setPickerState({ type: (activeTab === 'adn' ? 'adn-managers' : 'managers'), targetId: shiftFilter, field: f as string, role: r, currentValueId: curr })} onUpdateStaff={handleUpdateStaff} />
                        )}
                    </div>
                    <div className="flex-1 p-4 overflow-hidden">
                        <div className={`h-full bg-white rounded-2xl shadow-xl border overflow-hidden flex flex-col transition-colors duration-500 ${activeTab === 'adn' ? 'border-amber-400 ring-4 ring-amber-500/10' : 'border-slate-200'}`}>
                            {subTab === 'TRANSFERENCIA' ? (
                                <TransferTable isMasterMode={activeTab === 'adn'} data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} onOpenPicker={(id, field, role, curr, uIdx) => setPickerState({ type: (activeTab === 'adn' ? 'adn-transfer' : 'transfer'), targetId: id, field, role, currentValueId: curr, unitIdx: uIdx })} onUpdateStaff={handleUpdateStaff} />
                            ) : (
                                <ReportTable isMasterMode={activeTab === 'adn'} data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} onDeleteRecord={id => setRecords(prev => prev.filter(r => r.id !== id))} onOpenPicker={(id, field, role, curr) => setPickerState({ type: (activeTab === 'adn' ? 'adn-route' : 'route'), targetId: id, field, role, currentValueId: curr })} onUpdateStaff={handleUpdateStaff} activeShiftLabel={activeTab === 'adn' ? `TURNO ${shiftFilter} (ADN)` : `TURNO ${shiftFilter}`} selectedDate={selectedDate} />
                            )}
                        </div>
                    </div>
                </div>
                ) : (
                <div className="h-full p-8 overflow-y-auto"><StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => setStaffList(prev => [...prev, s])} onBulkAddStaff={newS => setStaffList(prev => [...prev, ...newS])} onRemoveStaff={id => setStaffList(prev => prev.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} /></div>
                )
            ) : (
                <div className="flex h-full items-center justify-center bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <h3 className="text-xl font-black uppercase italic">Asignar {pickerState.role}</h3>
                    <button onClick={() => setPickerState(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-[#FFF5F5] text-red-500 rounded-[1.5rem] text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"><UserMinus size={18} /> Quitar</button>
                    <div className="relative flex-1 group">
                        <input autoFocus type="text" placeholder="BUSCAR..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-6 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-bold outline-none focus:bg-white transition-all uppercase" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc]">
                    {sortedPickerList.map(s => (
                        <div 
                          key={s.id} 
                          onClick={() => s.status !== StaffStatus.ABSENT && handlePickerSelection(s)} 
                          className={`p-6 rounded-[2rem] border-2 bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${
                              s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50/50 scale-[1.02]' : 'border-transparent hover:border-indigo-400'
                          } ${s.status === StaffStatus.ABSENT ? 'opacity-50 grayscale' : ''}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${s.status === StaffStatus.ABSENT ? getAbsenceStyles(s.address || 'FALTA') : 'bg-slate-100 text-slate-500'}`}>{s.name.charAt(0)}</div>
                                <div>
                                    <h4 className="text-[13px] font-black uppercase text-slate-800">{s.name} {s.id === pickerState.currentValueId && <span className="text-indigo-600 text-[8px] italic ml-2">(ACTUAL)</span>}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-2">LEGAJO: {s.id} {s.status === StaffStatus.ABSENT && `(${s.address})`}</p>
                                </div>
                            </div>
                            <button className={`p-4 rounded-2xl text-white shadow-lg transition-all ${s.status === StaffStatus.ABSENT ? 'bg-slate-200' : 'bg-indigo-600'}`}><Check size={24} /></button>
                        </div>
                    ))}
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
