
import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
    Plus,
    ChevronLeft,
    ChevronRight,
    UserMinus,
    RefreshCcw,
    RotateCcw,
    CheckCircle,
    CheckCircle2,
    Database,
    ShieldAlert,
    Wand2,
    Copy,
    X,
    Check,
    UserCircle,
    Clock
} from 'lucide-react';

const DB_PREFIX = 'girsu_v20_';
const STAFF_KEY = `${DB_PREFIX}staff`;
const ADN_ROUTES_KEY = `${DB_PREFIX}adn_routes`;
const ADN_TRANS_KEY = `${DB_PREFIX}adn_trans`;
const ADN_MGRS_KEY = `${DB_PREFIX}adn_mgrs`;
const DAILY_DATA_KEY = `${DB_PREFIX}day_`;
const DAILY_TRANS_KEY = `${DB_PREFIX}trans_`;
const DAILY_MGRS_KEY = `${DB_PREFIX}mgrs_`;

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

  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerState, setPickerState] = useState<{ type: string, targetId: string, field: string, role: string, currentValueId?: string, unitIdx?: number } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);

  // Funciones auxiliares para crear registros vacíos
  const createEmptyTrans = useCallback((s: string): TransferRecord => ({ 
    id: `TR-${s}`, 
    shift: s as any, 
    units: [{ id: 'U1', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U2', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }, { id: 'U3', driver: null, domain1: '', domain2: '', trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] }] as any, 
    maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null, auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, balancero2: null, lonero: null, suplenciaLona: null, observaciones: '' 
  }), []);

  const getInitialRecordsFromConstants = useCallback((list: StaffMember[]) => {
    const findS = (id: any) => list.find(s => String(s.id).trim() === String(id || '').trim()) || null;
    const createInitial = (master: any[], shift: string, cat: string): RouteRecord[] => master.map((m, idx) => ({ id: `${m.zone}-${shift}-${idx}`, zone: m.zone, internalId: m.interno || '', domain: m.domain || '', reinforcement: 'MASTER', shift: shift as any, departureTime: '', dumpTime: '', tonnage: '', category: cat as any, zoneStatus: ZoneStatus.PENDING, order: idx, driver: findS(m.driver), aux1: findS(m.aux1), aux2: findS(m.aux2), aux3: findS(m.aux3), aux4: findS(m.aux4), replacementDriver: null, replacementAux1: null, replacementAux2: null, supervisionReport: '' }));
    return [
        ...createInitial(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'), 
        ...createInitial(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'), 
        ...createInitial(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'), 
        ...createInitial(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'), 
        ...createInitial(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'), 
        ...createInitial(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL')
    ];
  }, []);

  useEffect(() => {
    setIsLoaded(false);
    const savedStaff = localStorage.getItem(STAFF_KEY);
    const initialStaff = deduplicateStaff(savedStaff ? JSON.parse(savedStaff) : EXTRA_STAFF);
    setStaffList(initialStaff);
    
    const findS = (id: any, list: StaffMember[]) => list.find(s => String(s.id).trim() === String(id || '').trim()) || null;

    // --- LOGICA DE CARGA ---
    if (activeTab === 'adn') {
        const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);
        const adnTrans = localStorage.getItem(ADN_TRANS_KEY);
        const adnMgrs = localStorage.getItem(ADN_MGRS_KEY);
        
        if (adnRoutes) setRecords(JSON.parse(adnRoutes).map((r: any) => ({ ...r, driver: findS(r.driver, initialStaff), aux1: findS(r.aux1, initialStaff), aux2: findS(r.aux2, initialStaff), aux3: findS(r.aux3, initialStaff), aux4: findS(r.aux4, initialStaff) })));
        else setRecords(getInitialRecordsFromConstants(initialStaff));
        
        if (adnTrans) setTransferRecords(JSON.parse(adnTrans).map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista, initialStaff), encargado: findS(tr.encargado, initialStaff), balancero1: findS(tr.balancero1, initialStaff), auxTolva1: findS(tr.auxTolva1, initialStaff), auxTolva2: findS(tr.auxTolva2, initialStaff), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver, initialStaff) })) })));
        else setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
        
        if (adnMgrs) setShiftManagers(JSON.parse(adnMgrs));
    } else {
        // Estamos en el Parte Diario
        const dayRoutes = localStorage.getItem(`${DAILY_DATA_KEY}${selectedDate}`);
        const dayTrans = localStorage.getItem(`${DAILY_TRANS_KEY}${selectedDate}`);
        const dayMgrs = localStorage.getItem(`${DAILY_MGRS_KEY}${selectedDate}`);

        if (dayRoutes) {
            // Existe información específica guardada para este día
            setRecords(JSON.parse(dayRoutes).map((r: any) => ({ ...r, driver: findS(r.driver, initialStaff), aux1: findS(r.aux1, initialStaff), aux2: findS(r.aux2, initialStaff), aux3: findS(r.aux3, initialStaff), aux4: findS(r.aux4, initialStaff), replacementDriver: findS(r.replacementDriver, initialStaff), replacementAux1: findS(r.replacementAux1, initialStaff), replacementAux2: findS(r.replacementAux2, initialStaff) })));
            if (dayTrans) setTransferRecords(JSON.parse(dayTrans).map((tr: any) => ({ ...tr, maquinista: findS(tr.maquinista, initialStaff), encargado: findS(tr.encargado, initialStaff), balancero1: findS(tr.balancero1, initialStaff), auxTolva1: findS(tr.auxTolva1, initialStaff), auxTolva2: findS(tr.auxTolva2, initialStaff), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver, initialStaff) })) })));
            if (dayMgrs) setShiftManagers(JSON.parse(dayMgrs));
        } else {
            // DIA NUEVO: Intentamos cargar desde el ADN Maestro automáticamente
            const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);
            const adnTrans = localStorage.getItem(ADN_TRANS_KEY);
            const adnMgrs = localStorage.getItem(ADN_MGRS_KEY);

            if (adnRoutes) {
                // Copiamos el ADN al día nuevo
                setRecords(JSON.parse(adnRoutes).map((r: any) => ({ 
                    ...r, 
                    id: `${r.zone}-${selectedDate}-${Math.random()}`, 
                    driver: findS(r.driver, initialStaff), 
                    aux1: findS(r.aux1, initialStaff), 
                    aux2: findS(r.aux2, initialStaff), 
                    aux3: findS(r.aux3, initialStaff), 
                    aux4: findS(r.aux4, initialStaff), 
                    zoneStatus: ZoneStatus.PENDING, 
                    tonnage: '', 
                    departureTime: '' 
                })));
                
                if (adnTrans) setTransferRecords(JSON.parse(adnTrans).map((tr: any) => ({ 
                    ...tr, 
                    id: `TR-${tr.shift}-${selectedDate}`, 
                    maquinista: findS(tr.maquinista, initialStaff), 
                    encargado: findS(tr.encargado, initialStaff), 
                    balancero1: findS(tr.balancero1, initialStaff), 
                    auxTolva1: findS(tr.auxTolva1, initialStaff), 
                    auxTolva2: findS(tr.auxTolva2, initialStaff), 
                    units: tr.units.map((u:any) => ({ 
                        ...u, 
                        driver: findS(u.driver, initialStaff), 
                        trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] 
                    })) 
                })));
                
                if (adnMgrs) setShiftManagers(JSON.parse(adnMgrs));
            } else {
                // Si no hay ADN, usamos las constantes
                setRecords(getInitialRecordsFromConstants(initialStaff));
                setTransferRecords([createEmptyTrans('MAÑANA'), createEmptyTrans('TARDE'), createEmptyTrans('NOCHE')]);
            }
        }
    }
    setIsLoaded(true);
  }, [selectedDate, activeTab, createEmptyTrans, getInitialRecordsFromConstants]);

  const handleLoadFromADN = () => {
    if (!window.confirm('¿Desea forzar la carga de la plantilla ADN Maestro para este día? Se perderán los cambios actuales.')) return;
    
    const adnRoutes = localStorage.getItem(ADN_ROUTES_KEY);
    const adnTrans = localStorage.getItem(ADN_TRANS_KEY);
    const adnMgrs = localStorage.getItem(ADN_MGRS_KEY);
    const findS = (id: any) => staffList.find(s => String(s.id).trim() === String(id || '').trim()) || null;

    if (adnRoutes) {
      setRecords(JSON.parse(adnRoutes).map((r: any) => ({ ...r, id: `${r.zone}-${selectedDate}-${Math.random()}`, driver: findS(r.driver), aux1: findS(r.aux1), aux2: findS(r.aux2), aux3: findS(r.aux3), aux4: findS(r.aux4), zoneStatus: ZoneStatus.PENDING, tonnage: '', departureTime: '' })));
    }
    if (adnTrans) {
      setTransferRecords(JSON.parse(adnTrans).map((tr: any) => ({ ...tr, id: `TR-${tr.shift}-${selectedDate}`, maquinista: findS(tr.maquinista), encargado: findS(tr.encargado), balancero1: findS(tr.balancero1), auxTolva1: findS(tr.auxTolva1), auxTolva2: findS(tr.auxTolva2), units: tr.units.map((u:any) => ({ ...u, driver: findS(u.driver), trips: [{ hora: '', ton: '' }, { hora: '', ton: '' }, { hora: '', ton: '' }] })) })));
    }
    if (adnMgrs) {
      setShiftManagers(JSON.parse(adnMgrs));
    }
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
    setStaffList(prev => deduplicateStaff(prev.map(s => String(s.id).trim() === idToFind ? updatedMember : s)));
    
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
      const query = pickerSearch.trim().toLowerCase();
      let filtered = staffList.filter(s => 
          s.name.toLowerCase().includes(query) || 
          s.id.toLowerCase().includes(query)
      );
      return filtered.sort((a, b) => {
          const isASelected = a.id === pickerState?.currentValueId;
          const isBSelected = b.id === pickerState?.currentValueId;
          if (isASelected && !isBSelected) return -1;
          if (!isASelected && isBSelected) return 1;
          const isAExactID = a.id.toLowerCase() === query;
          const isBExactID = b.id.toLowerCase() === query;
          if (isAExactID && !isBExactID) return -1;
          if (!isAExactID && isBExactID) return 1;
          return a.name.localeCompare(b.name);
      }).slice(0, 40);
  }, [staffList, pickerSearch, pickerState?.currentValueId]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-800 font-sans">
      <aside className={`w-64 text-white flex flex-col shrink-0 z-[100] shadow-2xl transition-all duration-500 ${activeTab === 'adn' ? 'bg-amber-950 shadow-amber-950/20' : 'bg-[#0f172a]'}`}>
        <div className="p-8 text-center border-b border-white/5">
            <div className="bg-white p-2 rounded-2xl shadow-xl inline-block mb-3"><img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Logo_de_Quilmes.png" className="w-10 grayscale brightness-0" alt="Quilmes" /></div>
            <h2 className="text-xl font-black italic text-white uppercase leading-none tracking-tight">QUILMES</h2>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">G.I.R.S.U.</p>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-8">
            <button onClick={() => setActiveTab('parte')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'parte' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><ClipboardList size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Parte Diario</span></button>
            <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}><Users size={20} /><span className="text-[11px] font-black uppercase tracking-widest">Personal</span></button>
            <div className="pt-8 px-4 mt-auto mb-8">
                <button onClick={() => { if(window.confirm('¿ELIMINAR HISTORIAL?')) { localStorage.clear(); window.location.reload(); } }} className="w-full flex items-center gap-2 px-4 py-3 bg-red-950/20 text-red-400 rounded-xl text-[9px] font-black uppercase hover:bg-red-950/40 transition-all border border-red-900/20"><RefreshCcw size={14} /> Reset Total</button>
            </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className={`h-20 border-b px-6 flex items-center justify-between shrink-0 z-[90] shadow-sm transition-colors duration-500 ${activeTab === 'adn' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-6">
              {activeTab === 'adn' ? (
                  <div className="flex items-center gap-3 px-4 py-2 bg-amber-500 text-white rounded-2xl shadow-lg">
                      <ShieldAlert size={20} />
                      <h1 className="text-sm font-black uppercase tracking-tight italic">MODO ADN MAESTRO</h1>
                  </div>
              ) : (
                  <h1 className="text-lg font-black text-slate-800 tracking-tight uppercase italic">GIRSU <span className="text-indigo-600">OPERATIVO</span></h1>
              )}
          </div>
          <div className="flex items-center gap-3 relative z-[100]">
             {activeTab !== 'adn' && (
                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-full px-2 py-1 bg-white border-slate-200 shadow-sm mr-2">
                        <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400"><ChevronLeft size={14} /></button>
                        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-transparent text-[10px] font-black text-slate-700 outline-none uppercase cursor-pointer px-1 w-24 text-center" />
                        <button onClick={() => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]); }} className="p-1.5 rounded-full hover:bg-slate-50 text-slate-400"><ChevronRight size={14} /></button>
                        {selectedDate !== today && <button onClick={() => setSelectedDate(today)} className="p-1.5 bg-slate-100 text-slate-500 rounded-full hover:text-indigo-600 transition-all ml-1 shadow-sm"><RotateCcw size={14} /></button>}
                    </div>
                    <button onClick={handleLoadFromADN} className="bg-indigo-50 text-indigo-600 p-3 rounded-2xl border border-indigo-100 shadow-sm hover:bg-indigo-100 transition-all group" title="Forzar Carga ADN"><Wand2 size={18} className="group-hover:rotate-12 transition-transform" /></button>
                    <button onClick={() => setActiveTab('adn')} className="bg-amber-500 text-white p-3 rounded-2xl shadow-md hover:bg-amber-600 transition-all"><Database size={18} /></button>
                    <button onClick={() => setIsNewRouteModalOpen(true)} className="bg-slate-800 text-white p-3 rounded-2xl shadow-md"><Plus size={18} /></button>
                    <button onClick={() => setIsCloseModalOpen(true)} className="bg-emerald-600 text-white p-3 rounded-2xl shadow-md"><CheckCircle2 size={18} /></button>
                </div>
             )}
             {activeTab === 'adn' && (
                 <button onClick={() => setActiveTab('parte')} className="bg-emerald-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-xl hover:bg-emerald-700 transition-all"><CheckCircle size={18} /> GUARDAR ADN MAESTRO</button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-[#f8fafc] flex flex-col">
            {isLoaded ? (
                activeTab !== 'personal' ? (
                <>
                    <div className={`px-6 py-3 border-b flex items-center gap-6 shrink-0 z-40 ${activeTab === 'adn' ? 'bg-amber-100/50 border-amber-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex p-1 bg-slate-100 rounded-xl shrink-0">
                            {['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'].map(f => (
                                <button key={f} onClick={() => setShiftFilter(f as any)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${shiftFilter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>{f}</button>
                            ))}
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-2" />
                        <div className="flex p-1 bg-slate-100 rounded-xl shrink-0">
                            <button onClick={() => setSubTab('GENERAL')} className={`px-5 py-1.5 text-[9px] font-black rounded-lg transition-all ${subTab === 'GENERAL' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>RECOLECCIÓN</button>
                            <button onClick={() => setSubTab('REPASO')} className={`px-5 py-1.5 text-[9px] font-black rounded-lg transition-all ${subTab === 'REPASO' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>REPASO</button>
                            <button onClick={() => setSubTab('TRANSFERENCIA')} className={`px-5 py-1.5 text-[9px] font-black rounded-lg transition-all ${subTab === 'TRANSFERENCIA' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>TOLVA</button>
                        </div>
                        
                        {shiftFilter !== 'TODOS' && (
                            <div className="flex-1 flex items-center gap-4 bg-slate-50 px-4 py-1.5 rounded-2xl border border-slate-100 animate-in slide-in-from-left">
                                <Clock size={16} className="text-slate-400" />
                                <ShiftManagersTop 
                                  shift={shiftFilter} 
                                  data={shiftManagers[shiftFilter]} 
                                  staffList={staffList} 
                                  onOpenPicker={(f, r, c) => setPickerState({ type: 'managers', targetId: shiftFilter, field: f, role: r, currentValueId: c })} 
                                  onUpdateStaff={handleUpdateStaff} 
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 p-4 overflow-hidden flex flex-col gap-4">
                        <div className="flex-1 bg-white rounded-3xl shadow-xl border overflow-hidden flex flex-col border-slate-200">
                            {subTab === 'TRANSFERENCIA' ? (
                                <TransferTable 
                                    isMasterMode={activeTab === 'adn'} 
                                    data={transferRecords.filter(tr => shiftFilter === 'TODOS' || tr.shift === shiftFilter)} 
                                    onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(tr => tr.id === id ? {...tr, [f]: v} : tr))} 
                                    onOpenPicker={(id, field, role, curr, uIdx) => setPickerState({ type: 'transfer', targetId: id, field, role, currentValueId: curr, unitIdx: uIdx })} 
                                    onUpdateStaff={handleUpdateStaff} 
                                />
                            ) : (
                                <ReportTable 
                                    isMasterMode={activeTab === 'adn'} 
                                    data={records.filter(r => (shiftFilter === 'TODOS' || r.shift === shiftFilter) && (subTab === 'GENERAL' ? (r.category !== 'REPASO_LATERAL') : (r.category === 'REPASO_LATERAL')))} 
                                    onUpdateRecord={(id, f, v) => setRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} 
                                    onDeleteRecord={id => setRecords(prev => prev.filter(r => r.id !== id))} 
                                    onOpenPicker={(id, field, role, curr) => setPickerState({ type: 'route', targetId: id, field, role, currentValueId: curr })} 
                                    onUpdateStaff={handleUpdateStaff} 
                                    selectedDate={selectedDate} 
                                    activeShiftLabel={shiftFilter}
                                />
                            )}
                        </div>
                    </div>
                </>
                ) : (
                <div className="flex-1 p-8 overflow-y-auto bg-slate-50"><StaffManagement staffList={staffList} onUpdateStaff={handleUpdateStaff} onAddStaff={(s) => setStaffList(prev => deduplicateStaff([...prev, s]))} onBulkAddStaff={newS => setStaffList(prev => deduplicateStaff([...prev, ...newS]))} onRemoveStaff={id => setStaffList(prev => prev.filter(s => s.id !== id))} records={records} selectedShift={shiftFilter} searchTerm={searchTerm} onSearchChange={setSearchTerm} /></div>
                )
            ) : (
                <div className="flex h-full items-center justify-center bg-white w-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
            )}
        </div>
      </main>

      {pickerState && (
        <div className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <UserCircle className="text-indigo-400" size={24} />
                        <h3 className="text-xl font-black uppercase italic tracking-tight">Seleccionar {pickerState.role}</h3>
                    </div>
                    <button onClick={() => setPickerState(null)} className="p-2 hover:bg-white/10 rounded-xl"><X size={24} /></button>
                </div>
                <div className="px-8 py-6 border-b flex gap-6 bg-white items-center">
                    <button onClick={() => handlePickerSelection(null)} className="px-8 py-4 border-2 border-red-100 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-sm"><UserMinus size={18} /> Quitar</button>
                    <div className="relative flex-1 group">
                        <input autoFocus type="text" placeholder="LEGAJO O APELLIDO..." value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} className="w-full pl-6 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[11px] font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-100 transition-all uppercase" />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-[#f8fafc]">
                    {sortedPickerList.length > 0 ? sortedPickerList.map(s => (
                        <div key={s.id} onClick={() => s.status !== StaffStatus.ABSENT && handlePickerSelection(s)} className={`p-5 rounded-2xl border-2 bg-white shadow-sm flex items-center justify-between cursor-pointer transition-all ${s.id === pickerState.currentValueId ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-transparent hover:border-indigo-400 hover:bg-indigo-50/20'} ${s.status === StaffStatus.ABSENT ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${s.status === StaffStatus.ABSENT ? getAbsenceStyles(s.address || 'FALTA') : (s.id === pickerState.currentValueId ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500')}`}>{s.name.charAt(0)}</div>
                                <div><h4 className="text-[12px] font-black uppercase text-slate-800 tracking-tight leading-none">{s.name}</h4><p className="text-[9px] font-bold text-slate-400 mt-2">LEGAJO: {s.id} {s.status === StaffStatus.ABSENT && <span className="text-red-500 ml-2">[{s.address}]</span>}</p></div>
                            </div>
                            <button className={`p-3 rounded-xl text-white ${s.status === StaffStatus.ABSENT ? 'bg-slate-200' : 'bg-indigo-600 hover:scale-110 transition-transform'}`}><Check size={20} /></button>
                        </div>
                    )) : (
                        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                             <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Sin resultados para la búsqueda</p>
                        </div>
                    )}
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
