
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RouteRecord, TransferRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { ShiftManagersTop } from './components/ShiftManagers';
import { NewRouteModal } from './components/NewRouteModal';
import { STAFF_DB, MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA, MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA, EXTRA_STAFF } from './constants';
import { 
    Table as TableIcon,
    Users,
    Search,
    RefreshCw,
    ClipboardCheck,
    Plus,
    Download,
    Upload,
    Database,
    Cloud,
    Wifi,
    WifiOff
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'parte' | 'personal'>('parte');
  const [subTab, setSubTab] = useState<'recoleccion' | 'repaso_lateral' | 'transferencia'>('recoleccion');
  const [records, setRecords] = useState<RouteRecord[]>([]);
  const [transferRecords, setTransferRecords] = useState<TransferRecord[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'MAÑANA' | 'TARDE' | 'NOCHE' | 'TODOS'>('MAÑANA');
  const [isShiftCloseModalOpen, setIsShiftCloseModalOpen] = useState(false);
  const [isNewRouteModalOpen, setIsNewRouteModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); 
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showWelcomeMsg, setShowWelcomeMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [shiftsMetadata, setShiftsMetadata] = useState<{ [key: string]: ShiftMetadata }>({
    'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] },
    'TARDE': { supervisor: '', subSupervisor: '', absences: [] },
    'NOCHE': { supervisor: '', subSupervisor: '', absences: [] }
  });

  // Escuchar estado de conexión para sincronización
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const createRecord = (m: any, shift: string, category: string, id: string): RouteRecord => ({
    id,
    zone: m.zone,
    category: category as any,
    internalId: m.interno || '',
    domain: m.domain || '',
    reinforcement: m.ref || 'Vacio',
    departureTime: m.time || '',
    dumpTime: '',
    tonnage: m.ton || '',
    shift: shift as any,
    zoneStatus: m.status || ZoneStatus.PENDING,
    order: 0,
    driver: m.driver ? (STAFF_DB[m.driver] || null) : null,
    aux1: m.aux1 ? (STAFF_DB[m.aux1] || null) : null,
    aux2: m.aux2 ? (STAFF_DB[m.aux2] || null) : null,
    aux3: m.aux3 ? (STAFF_DB[m.aux3] || null) : null,
    aux4: m.aux4 ? (STAFF_DB[m.aux4] || null) : null,
    replacementDriver: m.repChofer ? (STAFF_DB[m.repChofer] || null) : null,
    replacementAux1: m.repAux1 ? (STAFF_DB[m.repAux1] || null) : null,
    replacementAux2: m.repAux2 ? (STAFF_DB[m.repAux2] || null) : null,
    supervisionReport: m.report || ''
  });

  // --- MOTOR DE SINCRONIZACIÓN CENTRALIZADO ---
  useEffect(() => {
    const v = 'v20_cloud'; // Nueva versión para evitar conflictos
    const localRecords = localStorage.getItem(`girsu_records_${v}`);
    const localTransfers = localStorage.getItem(`girsu_transfers_${v}`);
    const localStaff = localStorage.getItem(`girsu_staff_${v}`);
    const localMetadata = localStorage.getItem(`girsu_metadata_${v}`);

    if (!localRecords) setShowWelcomeMsg(true);

    const mReco = MANANA_MASTER_DATA.map((m, i) => createRecord(m, 'MAÑANA', 'RECOLECCIÓN', `m-reco-${i}`));
    const mRepaso = MANANA_REPASO_DATA.map((m, i) => createRecord(m, 'MAÑANA', 'REPASO_LATERAL', `m-repaso-${i}`));
    const tReco = TARDE_MASTER_DATA.map((m, i) => createRecord(m, 'TARDE', 'RECOLECCIÓN', `t-reco-${i}`));
    const tRepaso = TARDE_REPASO_DATA.map((m, i) => createRecord(m, 'TARDE', 'REPASO_LATERAL', `t-repaso-${i}`));
    const nReco = NOCHE_MASTER_DATA.map((m, i) => createRecord(m, 'NOCHE', 'RECOLECCIÓN', `n-reco-${i}`));
    const nRepaso = NOCHE_REPASO_DATA.map((m, i) => createRecord(m, 'NOCHE', 'REPASO_LATERAL', `n-repaso-${i}`));
    
    const allMasterRoutes = [...mReco, ...mRepaso, ...tReco, ...tRepaso, ...nReco, ...nRepaso];

    let currentStaff: StaffMember[] = EXTRA_STAFF;
    if (localStaff) {
        try {
            const parsedStaff = JSON.parse(localStaff) as StaffMember[];
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const verifiedStaff = parsedStaff.map(s => {
                if (s.status === StaffStatus.ABSENT && s.absenceReturnDate && !s.isIndefiniteAbsence) {
                    const returnDate = new Date(s.absenceReturnDate);
                    returnDate.setHours(0, 0, 0, 0);
                    if (today >= returnDate) {
                        return { ...s, status: StaffStatus.PRESENT, address: '', absenceReturnDate: undefined, isIndefiniteAbsence: false };
                    }
                }
                return s;
            });

            const staffMap = new Map(verifiedStaff.map(s => [s.id, s]));
            const mergedStaff = EXTRA_STAFF.map(ms => staffMap.has(ms.id) ? { ...ms, ...staffMap.get(ms.id) } : ms);
            const extraIds = new Set(EXTRA_STAFF.map(m => m.id));
            const customStaff = verifiedStaff.filter(ps => !extraIds.has(ps.id));
            currentStaff = [...mergedStaff, ...customStaff];
        } catch(e) { console.error("Error cargando staff", e); }
    }
    setStaffList(currentStaff);
    const globalStaffMap = new Map(currentStaff.map(s => [s.id, s]));

    const syncStaffInRecord = (r: RouteRecord) => {
        const sync = (s: StaffMember | null) => (s && globalStaffMap.has(s.id)) ? globalStaffMap.get(s.id)! : s;
        return {
            ...r,
            driver: sync(r.driver), aux1: sync(r.aux1), aux2: sync(r.aux2), aux3: sync(r.aux3), aux4: sync(r.aux4),
            replacementDriver: sync(r.replacementDriver), replacementAux1: sync(r.replacementAux1), replacementAux2: sync(r.replacementAux2)
        };
    };

    if (localRecords) {
        try {
            const parsed = JSON.parse(localRecords) as RouteRecord[];
            const recordMap = new Map(parsed.map(r => [r.id, r]));
            const merged = allMasterRoutes.map(mr => recordMap.has(mr.id) ? syncStaffInRecord(recordMap.get(mr.id)!) : syncStaffInRecord(mr));
            const masterIds = new Set(allMasterRoutes.map(m => m.id));
            const custom = parsed.filter(p => !masterIds.has(p.id)).map(syncStaffInRecord);
            setRecords([...merged, ...custom]);
        } catch (e) { setRecords(allMasterRoutes.map(syncStaffInRecord)); }
    } else { setRecords(allMasterRoutes.map(syncStaffInRecord)); }

    if (localMetadata) { try { setShiftsMetadata(JSON.parse(localMetadata)); } catch(e) {} }
    if (localTransfers) { try { setTransferRecords(JSON.parse(localTransfers)); } catch(e) {} } 
    else {
        const initialTransfers: TransferRecord[] = (['MAÑANA', 'TARDE', 'NOCHE'] as const).map(s => ({
            id: `trans-${s.toLowerCase()}`, shift: s, units: [
                { id: `u1-${s}`, driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] },
                { id: `u2-${s}`, driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] },
                { id: `u3-${s}`, driver: null, domain1: '', domain2: '', trips: [{hora: '', ton: ''}, {hora: '', ton: ''}, {hora: '', ton: ''}] }
            ],
            maquinista: null, maquinistaDomain: '', auxTolva1: null, auxTolva2: null, auxTolva3: null,
            auxTransferencia1: null, auxTransferencia2: null, encargado: null, balancero1: null, 
            balancero2: null, lonero: null, suplenciaLona: null, observaciones: ''
        }));
        setTransferRecords(initialTransfers);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return; 
    const v = 'v20_cloud';
    localStorage.setItem(`girsu_records_${v}`, JSON.stringify(records));
    localStorage.setItem(`girsu_transfers_${v}`, JSON.stringify(transferRecords));
    localStorage.setItem(`girsu_staff_${v}`, JSON.stringify(staffList));
    localStorage.setItem(`girsu_metadata_${v}`, JSON.stringify(shiftsMetadata));
  }, [records, transferRecords, staffList, shiftsMetadata, isLoaded]);

  // --- EXPORTAR / IMPORTAR PARA MOVILIDAD ---
  const handleExportData = () => {
    const backup = {
        records,
        transferRecords,
        staffList,
        shiftsMetadata,
        version: 'v20_cloud',
        date: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GIRSU_PRODUCCION_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = JSON.parse(e.target?.result as string);
            if (content.records && content.staffList) {
                setRecords(content.records);
                setStaffList(content.staffList);
                setTransferRecords(content.transferRecords);
                setShiftsMetadata(content.shiftsMetadata);
                setShowWelcomeMsg(false);
                alert("SISTEMA ACTUALIZADO: Los datos han sido sincronizados desde el archivo.");
            } else {
                alert("Error: El archivo no es un respaldo compatible.");
            }
        } catch (err) {
            alert("Error al procesar el respaldo.");
        }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpdateRecord = useCallback((id: string, field: keyof RouteRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    if (window.confirm("¿ELIMINAR RUTA?")) {
      setRecords(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  const handleAddRecord = (zone: string, shift: string) => {
    const newRecord: RouteRecord = {
      id: `custom-${Date.now()}`,
      zone,
      shift: shift as any,
      category: subTab === 'repaso_lateral' ? 'REPASO_LATERAL' : 'RECOLECCIÓN',
      internalId: '', domain: '', reinforcement: 'Vacio', departureTime: '', dumpTime: '', tonnage: '',
      zoneStatus: ZoneStatus.PENDING, order: records.length,
      driver: null, aux1: null, aux2: null, aux3: null, aux4: null,
      replacementDriver: null, replacementAux1: null, replacementAux2: null,
      supervisionReport: ''
    };
    setRecords(prev => [...prev, newRecord]);
  };

  const handleUpdateStaff = useCallback((updatedMember: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
  }, []);

  const handleUpdateTransfer = useCallback((id: string, field: keyof TransferRecord, value: any) => {
    setTransferRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const handleMetadataChange = useCallback((field: keyof ShiftMetadata, value: any) => {
    if (shiftFilter === 'TODOS') return;
    setShiftsMetadata(prev => ({ ...prev, [shiftFilter]: { ...prev[shiftFilter], [field]: value } }));
  }, [shiftFilter]);

  const filteredRecords = useMemo(() => {
    let res = records;
    if (shiftFilter !== 'TODOS') res = res.filter(r => r.shift === shiftFilter);
    if (subTab === 'recoleccion') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'repaso_lateral') res = res.filter(r => r.category === 'REPASO_LATERAL');
    if (searchTerm) {
      const l = searchTerm.toLowerCase();
      res = res.filter(r => r.zone.toLowerCase().includes(l) || (r.driver?.name.toLowerCase().includes(l)) || (r.internalId.toLowerCase().includes(l)));
    }
    return [...res].sort((a, b) => a.order - b.order);
  }, [records, searchTerm, shiftFilter, subTab]);

  return (
    <div className="flex h-screen w-screen bg-[#f1f5f9] overflow-hidden text-slate-900 font-sans">
      
      {/* BARRA LATERAL (SIDEBAR) */}
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-8">
            <div className="bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-500/20 text-center border border-indigo-400">
                <h1 className="text-xl font-black tracking-tighter leading-none">QUILMES</h1>
                <p className="text-[9px] font-bold opacity-80 mt-1 tracking-[0.2em] uppercase text-indigo-100">G.I.R.S.U. Central</p>
            </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
            <button onClick={() => setActiveTab('parte')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'parte' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <TableIcon size={20} className={activeTab === 'parte' ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="text-[11px] font-black uppercase tracking-wider">Parte Diario</span>
            </button>
            <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${activeTab === 'personal' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Users size={20} className={activeTab === 'personal' ? 'text-indigo-400' : 'text-slate-500'} />
                <span className="text-[11px] font-black uppercase tracking-wider">Personal / Padrón</span>
            </button>
        </nav>

        {/* INDICADOR DE SINCRONIZACIÓN Y NUBE */}
        <div className="p-6 mt-auto">
            <div className="bg-slate-800/50 rounded-3xl p-5 border border-slate-700/50 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-red-500" />}
                        <span className={`text-[9px] font-black uppercase ${isOnline ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isOnline ? 'Cloud Link Activo' : 'Modo Offline'}
                        </span>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700">
                    <button onClick={handleExportData} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group border border-white/5">
                        <Download size={14} className="text-slate-400 group-hover:text-white" />
                        <span className="text-[8px] font-black uppercase text-slate-500 group-hover:text-slate-300">Guardar</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all group border border-white/5">
                        <Upload size={14} className="text-slate-400 group-hover:text-white" />
                        <span className="text-[8px] font-black uppercase text-slate-500 group-hover:text-slate-300">Sincronizar</span>
                        <input type="file" ref={fileInputRef} onChange={handleImportData} accept=".json" className="hidden" />
                    </button>
                </div>
                
                <p className="text-[7px] text-slate-500 font-bold uppercase text-center mt-2 tracking-widest leading-relaxed">
                    Usa "Guardar" para llevar tus cambios a otra computadora.
                </p>
            </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {showWelcomeMsg && (
            <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl text-center border-4 border-indigo-100 animate-in zoom-in-95">
                    <div className="bg-indigo-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-indigo-600 shadow-xl shadow-indigo-100">
                        <Cloud size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-4">Sistema GIRSU Online</h2>
                    <p className="text-[12px] font-bold text-slate-400 uppercase leading-relaxed mb-8">
                        Para ver los cambios hechos en otra computadora, importa el archivo de sincronización. Si es tu primera vez, empieza con una base limpia.
                    </p>
                    <div className="space-y-4">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[12px] shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-3">
                            <Upload size={20} /> Sincronizar desde archivo (.json)
                        </button>
                        <button onClick={() => setShowWelcomeMsg(false)} className="w-full bg-slate-100 text-slate-400 py-5 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all">
                            Nueva Sesión de Trabajo
                        </button>
                    </div>
                </div>
            </div>
        )}

        <header className="h-24 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                <button key={s} onClick={() => setShiftFilter(s)} className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all ${shiftFilter === s ? 'bg-white shadow-lg text-indigo-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
              ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" placeholder="BUSCAR RUTA O INTERNO..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black outline-none w-64 uppercase transition-all focus:ring-4 focus:ring-indigo-500/10 focus:bg-white" />
             </div>
             
             {activeTab === 'parte' && subTab !== 'transferencia' && (
                <button onClick={() => setIsNewRouteModalOpen(true)} className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-3 px-6 transition-all active:scale-95">
                  <Plus size={20} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Añadir Ruta</span>
                </button>
             )}

             <button onClick={() => setIsShiftCloseModalOpen(true)} className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 flex items-center gap-3 px-6 transition-all active:scale-95">
                 <ClipboardCheck size={20} />
                 <span className="text-[11px] font-black uppercase tracking-widest">Cierre Turno</span>
             </button>
          </div>
        </header>

        {activeTab === 'parte' && (
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex gap-4 shrink-0 shadow-sm z-10">
            <button onClick={() => setSubTab('recoleccion')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === 'recoleccion' ? 'bg-[#1e1b2e] text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Recolección Gral.</button>
            <button onClick={() => setSubTab('repaso_lateral')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === 'repaso_lateral' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Repaso / Lateral</button>
            <button onClick={() => setSubTab('transferencia')} className={`px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${subTab === 'transferencia' ? 'bg-[#8b3d6a] text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Transferencia</button>
          </div>
        )}

        <div className="flex-1 overflow-auto bg-slate-50">
          {!isLoaded ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-400">
                <RefreshCw size={64} className="animate-spin text-indigo-600 opacity-20" />
                <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40">Accediendo a la red GIRSU...</p>
            </div>
          ) : (
            activeTab === 'parte' ? (
                subTab === 'transferencia' ? (
                  <TransferTable data={transferRecords.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter)} onUpdateRow={handleUpdateTransfer} staffList={staffList} />
                ) : (
                  <div className="p-8">
                      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
                        <ReportTable data={filteredRecords} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} activeShiftLabel={`OPERATIVO - ${shiftFilter}`} staffList={staffList} />
                      </div>
                  </div>
                )
            ) : (
              <div className="p-8 h-full">
                  <StaffManagement staffList={staffList} onAddStaff={(m) => setStaffList([...staffList, m])} onRemoveStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} onUpdateStaff={handleUpdateStaff} records={records} selectedShift={shiftFilter} />
              </div>
            )
          )}
        </div>
      </main>
      
      {/* MODALES */}
      <ShiftCloseModal isOpen={isShiftCloseModalOpen} onClose={() => setIsShiftCloseModalOpen(false)} shift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={handleAddRecord} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

export default App;
