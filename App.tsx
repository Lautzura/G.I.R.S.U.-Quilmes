
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { RouteRecord, TransferRecord, StaffMember, StaffStatus, ZoneStatus, ShiftMetadata, TransferUnit } from './types';
import { ReportTable } from './components/ReportTable';
import { StaffManagement } from './components/StaffManagement';
import { TransferTable } from './components/TransferTable';
import { ShiftCloseModal } from './components/ShiftCloseModal';
import { NewRouteModal } from './components/NewRouteModal';
import { ShiftManagersTop } from './components/ShiftManagers';
import { STAFF_DB, MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA, MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA, EXTRA_STAFF } from './constants';
import { 
    Table as TableIcon,
    Users,
    Search,
    Plus,
    Download,
    Upload,
    Cloud,
    Wifi,
    CheckCircle2
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
  const [showWelcomeMsg, setShowWelcomeMsg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [shiftsMetadata, setShiftsMetadata] = useState<{ [key: string]: ShiftMetadata }>({
    'MAÑANA': { supervisor: '', subSupervisor: '', absences: [] },
    'TARDE': { supervisor: '', subSupervisor: '', absences: [] },
    'NOCHE': { supervisor: '', subSupervisor: '', absences: [] }
  });

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

  useEffect(() => {
    const v = 'v21_production';
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
            const staffMap = new Map(parsedStaff.map(s => [s.id, s]));
            const mergedStaff = EXTRA_STAFF.map(ms => staffMap.has(ms.id) ? { ...ms, ...staffMap.get(ms.id) } : ms);
            const extraIds = new Set(EXTRA_STAFF.map(m => m.id));
            const customStaff = parsedStaff.filter(ps => !extraIds.has(ps.id));
            currentStaff = [...mergedStaff, ...customStaff];
        } catch(e) {}
    }
    setStaffList(currentStaff);

    if (localRecords) {
        try {
            const parsed = JSON.parse(localRecords) as RouteRecord[];
            const recordMap = new Map(parsed.map(r => [r.id, r]));
            const merged = allMasterRoutes.map(mr => recordMap.has(mr.id) ? recordMap.get(mr.id)! : mr);
            const masterIds = new Set(allMasterRoutes.map(m => m.id));
            const custom = parsed.filter(p => !masterIds.has(p.id));
            setRecords([...merged, ...custom]);
        } catch (e) { setRecords(allMasterRoutes); }
    } else { setRecords(allMasterRoutes); }

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
    const v = 'v21_production';
    localStorage.setItem(`girsu_records_${v}`, JSON.stringify(records));
    localStorage.setItem(`girsu_transfers_${v}`, JSON.stringify(transferRecords));
    localStorage.setItem(`girsu_staff_${v}`, JSON.stringify(staffList));
    localStorage.setItem(`girsu_metadata_${v}`, JSON.stringify(shiftsMetadata));
  }, [records, transferRecords, staffList, shiftsMetadata, isLoaded]);

  const handleExportData = () => {
    const backup = { records, transferRecords, staffList, shiftsMetadata, date: new Date().toLocaleString() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SINCRONIZACION_GIRSU_${new Date().toLocaleDateString()}.json`;
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
            setRecords(content.records);
            setStaffList(content.staffList);
            setTransferRecords(content.transferRecords);
            setShiftsMetadata(content.shiftsMetadata);
            setShowWelcomeMsg(false);
            alert("DATOS RECIBIDOS.");
        } catch (err) { alert("Error al leer el archivo."); }
    };
    reader.readAsText(file);
  };

  const handleUpdateRecord = useCallback((id: string, field: keyof RouteRecord, value: any) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  const handleUpdateMetadata = (field: keyof ShiftMetadata, value: any) => {
    if (shiftFilter === 'TODOS') return;
    setShiftsMetadata(prev => ({
        ...prev,
        [shiftFilter]: { ...prev[shiftFilter], [field]: value }
    }));
  };

  const handleUpdateStaff = useCallback((updatedMember: StaffMember) => {
    setStaffList(prev => prev.map(s => s.id === updatedMember.id ? updatedMember : s));
    setRecords(prevRecords => prevRecords.map(record => {
        const r = { ...record };
        if (r.driver?.id === updatedMember.id) r.driver = updatedMember;
        if (r.aux1?.id === updatedMember.id) r.aux1 = updatedMember;
        if (r.aux2?.id === updatedMember.id) r.aux2 = updatedMember;
        if (r.aux3?.id === updatedMember.id) r.aux3 = updatedMember;
        if (r.aux4?.id === updatedMember.id) r.aux4 = updatedMember;
        if (r.replacementDriver?.id === updatedMember.id) r.replacementDriver = updatedMember;
        if (r.replacementAux1?.id === updatedMember.id) r.replacementAux1 = updatedMember;
        if (r.replacementAux2?.id === updatedMember.id) r.replacementAux2 = updatedMember;
        return r;
    }));
    setTransferRecords(prevTransfers => prevTransfers.map(row => {
        const r = { ...row };
        if (r.maquinista?.id === updatedMember.id) r.maquinista = updatedMember;
        if (r.auxTolva1?.id === updatedMember.id) r.auxTolva1 = updatedMember;
        if (r.auxTolva2?.id === updatedMember.id) r.auxTolva2 = updatedMember;
        if (r.auxTolva3?.id === updatedMember.id) r.auxTolva3 = updatedMember;
        if (r.auxTransferencia1?.id === updatedMember.id) r.auxTransferencia1 = updatedMember;
        if (r.auxTransferencia2?.id === updatedMember.id) r.auxTransferencia2 = updatedMember;
        if (r.encargado?.id === updatedMember.id) r.encargado = updatedMember;
        if (r.balancero1?.id === updatedMember.id) r.balancero1 = updatedMember;
        if (r.balancero2?.id === updatedMember.id) r.balancero2 = updatedMember;
        if (r.lonero?.id === updatedMember.id) r.lonero = updatedMember;
        if (r.suplenciaLona?.id === updatedMember.id) r.suplenciaLona = updatedMember;
        r.units = r.units.map(u => ({
            ...u,
            driver: u.driver?.id === updatedMember.id ? updatedMember : u.driver
        })) as [TransferUnit, TransferUnit, TransferUnit];
        return r;
    }));
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    if (window.confirm("¿Eliminar ruta?")) setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleAddRecord = (zone: string, shift: string) => {
    const newRecord: RouteRecord = {
      id: `custom-${Date.now()}`,
      zone, shift: shift as any, category: subTab === 'repaso_lateral' ? 'REPASO_LATERAL' : 'RECOLECCIÓN',
      internalId: '', domain: '', reinforcement: 'Vacio', departureTime: '', dumpTime: '', tonnage: '',
      zoneStatus: ZoneStatus.PENDING, order: records.length,
      driver: null, aux1: null, aux2: null, aux3: null, aux4: null,
      replacementDriver: null, replacementAux1: null, replacementAux2: null,
      supervisionReport: ''
    };
    setRecords(prev => [...prev, newRecord]);
  };

  const filteredRecords = useMemo(() => {
    let res = records;
    if (shiftFilter !== 'TODOS') res = res.filter(r => r.shift === shiftFilter);
    if (subTab === 'recoleccion') res = res.filter(r => r.category === 'RECOLECCIÓN');
    else if (subTab === 'repaso_lateral') res = res.filter(r => r.category === 'REPASO_LATERAL');
    if (searchTerm) {
      const l = searchTerm.toLowerCase();
      res = res.filter(r => r.zone.toLowerCase().includes(l) || (r.internalId.toLowerCase().includes(l)));
    }
    return [...res].sort((a, b) => a.order - b.order);
  }, [records, searchTerm, shiftFilter, subTab]);

  return (
    <div className="flex h-screen w-screen bg-[#f8fafc] overflow-hidden">
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col shrink-0">
        <div className="p-8">
            <div className="bg-indigo-600 rounded-[2rem] p-6 text-center shadow-2xl border border-indigo-400">
                <span className="block text-2xl font-black tracking-tighter uppercase">Quilmes</span>
                <span className="block text-[8px] font-bold tracking-[0.4em] uppercase opacity-80 mt-1">G.I.R.S.U. v21</span>
            </div>
        </div>

        <nav className="flex-1 px-6 space-y-3">
            <button onClick={() => setActiveTab('parte')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${activeTab === 'parte' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <TableIcon size={20} className={activeTab === 'parte' ? 'text-indigo-400' : ''} />
                <span className="text-[11px] font-black uppercase tracking-widest">Panel de Parte</span>
            </button>
            <button onClick={() => setActiveTab('personal')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${activeTab === 'personal' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                <Users size={20} className={activeTab === 'personal' ? 'text-indigo-400' : ''} />
                <span className="text-[11px] font-black uppercase tracking-widest">Padrón Personal</span>
            </button>
        </nav>

        <div className="p-8 mt-auto">
            <div className="bg-slate-800/50 rounded-[2.5rem] p-6 border border-slate-700/50 space-y-6">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-indigo-400 px-1">
                    <div className="flex items-center gap-2"><Cloud size={14} /><span>Multi-Usuario</span></div>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
                <div className="space-y-3">
                    <button onClick={handleExportData} className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 group">
                        <Download size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                        <span>Pasar a otra PC</span>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5 group">
                        <Upload size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                        <span>Recibir Cambios</span>
                        <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" />
                    </button>
                </div>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {showWelcomeMsg && (
            <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-8">
                <div className="bg-white rounded-[3.5rem] p-12 max-w-lg w-full shadow-2xl text-center border-4 border-indigo-100 animate-in zoom-in-95">
                    <div className="bg-indigo-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 shadow-xl">
                        <Wifi size={48} />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter leading-none mb-4">Sincronización</h2>
                    <p className="text-[12px] font-bold text-slate-400 uppercase leading-relaxed mb-10">¿Vienes de otra computadora? Sube tu archivo.</p>
                    <div className="space-y-4">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-indigo-600 text-white py-6 rounded-3xl font-black uppercase text-[12px] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-4">
                            <Upload size={20} /> Sincronizar datos
                        </button>
                        <button onClick={() => setShowWelcomeMsg(false)} className="w-full bg-slate-100 text-slate-400 py-6 rounded-3xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all">Empezar Turno</button>
                    </div>
                </div>
            </div>
        )}

        <header className="h-24 bg-white border-b border-slate-200 px-10 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {(['MAÑANA', 'TARDE', 'NOCHE', 'TODOS'] as const).map(s => (
                <button key={s} onClick={() => setShiftFilter(s)} className={`px-6 py-2.5 text-[10px] font-black rounded-xl transition-all ${shiftFilter === s ? 'bg-white shadow-xl text-indigo-600 border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}>{s}</button>
              ))}
          </div>

          <div className="flex items-center gap-4">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="BUSCAR RUTA..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black outline-none w-72 uppercase transition-all focus:ring-4 focus:ring-indigo-500/10 focus:bg-white" />
             </div>
             <button onClick={() => setIsNewRouteModalOpen(true)} className="p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-3 px-8">
                <Plus size={20} />
                <span className="text-[11px] font-black uppercase tracking-widest">Añadir</span>
             </button>
          </div>
        </header>

        {activeTab === 'parte' && (
          <div className="bg-white border-b border-slate-200 px-10 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-sm z-10">
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
                <button onClick={() => setSubTab('recoleccion')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'recoleccion' ? 'bg-[#0f172a] text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>General</button>
                <button onClick={() => setSubTab('repaso_lateral')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'repaso_lateral' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Repaso / Lateral</button>
                <button onClick={() => setSubTab('transferencia')} className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === 'transferencia' ? 'bg-[#8b3d6a] text-white shadow-xl' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>Transferencia</button>
            </div>
            
            {shiftFilter !== 'TODOS' && (
                <div className="flex-1 max-w-2xl w-full">
                    <ShiftManagersTop 
                        shift={shiftFilter} 
                        data={shiftsMetadata[shiftFilter]} 
                        onChange={handleUpdateMetadata} 
                    />
                </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto bg-slate-50">
            {activeTab === 'parte' ? (
                subTab === 'transferencia' ? (
                  <TransferTable data={transferRecords.filter(r => shiftFilter === 'TODOS' || r.shift === shiftFilter)} onUpdateRow={(id, f, v) => setTransferRecords(prev => prev.map(r => r.id === id ? {...r, [f]: v} : r))} staffList={staffList} />
                ) : (
                  <div className="p-10">
                      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                        <ReportTable data={filteredRecords} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} activeShiftLabel={`OPERATIVO - ${shiftFilter}`} staffList={staffList} />
                      </div>
                  </div>
                )
            ) : (
              <div className="p-10 h-full">
                  <StaffManagement staffList={staffList} onAddStaff={(m) => setStaffList([...staffList, m])} onRemoveStaff={(id) => setStaffList(staffList.filter(s => s.id !== id))} onUpdateStaff={handleUpdateStaff} records={records} selectedShift={shiftFilter} />
              </div>
            )}
        </div>
      </main>

      <ShiftCloseModal isOpen={isShiftCloseModalOpen} onClose={() => setIsShiftCloseModalOpen(false)} shift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} records={records} />
      <NewRouteModal isOpen={isNewRouteModalOpen} onClose={() => setIsNewRouteModalOpen(false)} onSave={handleAddRecord} currentShift={shiftFilter === 'TODOS' ? 'MAÑANA' : shiftFilter} />
    </div>
  );
};

export default App;
