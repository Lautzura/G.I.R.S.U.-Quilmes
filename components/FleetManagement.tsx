
import React, { useState, useMemo } from 'react';
import { Truck as TruckIcon, Search, X, Clock, Hammer, Save, Info, CheckCircle2, Calendar } from 'lucide-react';
import { Truck, TruckStatus } from '../types';

interface FleetManagementProps {
    fleetList: Truck[];
    onUpdateFleet: (fleet: Truck[]) => void;
    isReadOnly?: boolean;
}

export const FleetManagement: React.FC<FleetManagementProps> = ({ fleetList, onUpdateFleet, isReadOnly = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Truck | null>(null);

  const handleSelectTruck = (truck: Truck) => {
    setSelectedTruck(truck);
    setEditData({ ...truck });
    setIsEditing(false);
  };

  const handleSave = () => {
    if (editData) {
        const finalData = editData.status === TruckStatus.ACTIVE ? {
            ...editData,
            repairReason: '',
            inactiveSince: '',
            estimatedRepairDays: undefined
        } : editData;

        onUpdateFleet(fleetList.map(t => t.id === finalData.id ? finalData : t));
        setSelectedTruck(finalData);
        setIsEditing(false);
    }
  };

  const getStatusColor = (status: TruckStatus) => {
      switch(status) {
          case TruckStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
          case TruckStatus.MAINTENANCE: return 'bg-orange-100 text-orange-700 border-orange-200';
          case TruckStatus.OUT_OF_SERVICE: return 'bg-red-100 text-red-700 border-red-200';
          default: return 'bg-gray-100 text-gray-700 border-gray-200';
      }
  };

  const getInactivityDays = (date?: string) => {
      if (!date) return 0;
      const start = new Date(date);
      const today = new Date();
      const diffTime = today.getTime() - start.getTime();
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const fleetStats = useMemo(() => {
    return {
        total: fleetList.length,
        active: fleetList.filter(t => t.status === TruckStatus.ACTIVE).length,
        taller: fleetList.filter(t => t.status === TruckStatus.MAINTENANCE).length,
        fuera: fleetList.filter(t => t.status === TruckStatus.OUT_OF_SERVICE).length
    };
  }, [fleetList]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-20">
      {selectedTruck && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTruck(null)}>
            <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TruckIcon className="w-10 h-10 text-indigo-400" />
                        <div>
                            <h3 className="font-bold text-lg uppercase">Interno {selectedTruck.internalId}</h3>
                            <p className="text-indigo-200 text-xs font-mono">{selectedTruck.domain}</p>
                        </div>
                    </div>
                    <button onClick={() => setSelectedTruck(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase border-b pb-2">Estado de Operación</h4>
                        {isEditing ? (
                            <select 
                                value={editData?.status} 
                                onChange={e => setEditData(p => p ? {...p, status: e.target.value as any} : null)} 
                                className="w-full p-2.5 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-indigo-100 outline-none"
                            >
                                <option value={TruckStatus.ACTIVE}>OPERATIVO (EN RUTA)</option>
                                <option value={TruckStatus.MAINTENANCE}>TALLER (REPARACIÓN)</option>
                                <option value={TruckStatus.OUT_OF_SERVICE}>FUERA DE SERVICIO (BAJA)</option>
                            </select>
                        ) : (
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${getStatusColor(selectedTruck.status)}`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${selectedTruck.status === TruckStatus.ACTIVE ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {selectedTruck.status === TruckStatus.ACTIVE ? 'CAMIÓN ACTIVO' : 'UNIDAD INACTIVA'}
                            </div>
                        )}
                    </section>

                    {(isEditing ? editData?.status !== TruckStatus.ACTIVE : selectedTruck.status !== TruckStatus.ACTIVE) && (
                        <section className="space-y-4 animate-in fade-in slide-in-from-top duration-300 p-4 bg-orange-50 rounded-xl border border-orange-100">
                            <h4 className="text-xs font-bold text-orange-700 uppercase flex items-center gap-2">
                                <Hammer className="w-4 h-4" /> Reporte de Incidencia / Taller
                            </h4>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Motivo del Arreglo / Problema</p>
                                    {isEditing ? (
                                        <input 
                                            type="text" 
                                            value={editData?.repairReason || ''} 
                                            onChange={e => setEditData(p => p ? {...p, repairReason: e.target.value} : null)} 
                                            placeholder="Ej: Cambio de frenos, Embrague..." 
                                            className="w-full p-2 text-sm border rounded bg-white outline-none focus:ring-2 focus:ring-orange-200" 
                                        />
                                    ) : <p className="text-sm font-semibold text-gray-800">{selectedTruck.repairReason || 'Sin motivo registrado'}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Inactivo desde</p>
                                        {isEditing ? (
                                            <input 
                                                type="date" 
                                                value={editData?.inactiveSince || ''} 
                                                onChange={e => setEditData(p => p ? {...p, inactiveSince: e.target.value} : null)} 
                                                className="w-full p-2 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-orange-200" 
                                            />
                                        ) : <p className="text-sm font-medium">{selectedTruck.inactiveSince || 'Desconocido'}</p>}
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-orange-600 font-bold uppercase mb-1">Demora Est. (Días)</p>
                                        {isEditing ? (
                                            <input 
                                                type="number" 
                                                value={editData?.estimatedRepairDays || ''} 
                                                onChange={e => setEditData(p => p ? {...p, estimatedRepairDays: parseInt(e.target.value)} : null)} 
                                                className="w-full p-2 text-xs border rounded bg-white outline-none focus:ring-2 focus:ring-orange-200" 
                                            />
                                        ) : <p className="text-sm font-medium">{selectedTruck.estimatedRepairDays ? `${selectedTruck.estimatedRepairDays} días` : 'Indefinido'}</p>}
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="space-y-4">
                        <h4 className="text-xs font-bold text-indigo-600 uppercase border-b pb-2">Documentación General</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">VTV (Vencimiento)</p>
                                {isEditing ? <input type="date" value={editData?.vtvExpiry || ''} onChange={e => setEditData(p => p ? {...p, vtvExpiry: e.target.value} : null)} className="w-full text-xs border p-1.5 rounded" /> : <p className="text-sm font-medium">{selectedTruck.vtvExpiry || 'No cargada'}</p>}
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Seguro (Vencimiento)</p>
                                {isEditing ? <input type="date" value={editData?.insuranceExpiry || ''} onChange={e => setEditData(p => p ? {...p, insuranceExpiry: e.target.value} : null)} className="w-full text-xs border p-1.5 rounded" /> : <p className="text-sm font-medium">{selectedTruck.insuranceExpiry || 'No cargada'}</p>}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-6 bg-gray-50 border-t flex gap-3">
                    {isEditing ? (
                        <><button onClick={() => setIsEditing(false)} className="flex-1 bg-white border border-gray-300 py-2 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-100 transition-colors">Cancelar</button>
                        <button onClick={handleSave} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Guardar Unidad</button></>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-colors">Editar Ficha Técnica</button>
                    )}
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Control de Flota y Taller</h2>
            <p className="text-gray-500 mt-1">Seguimiento de unidades operativas e inactivas.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <div className="px-4 py-2 text-center">
                    <p className="text-xs font-bold text-emerald-600">{fleetStats.active}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Activos</p>
                </div>
                <div className="w-px bg-gray-100 my-2"></div>
                <div className="px-4 py-2 text-center">
                    <p className="text-xs font-bold text-orange-600">{fleetStats.taller}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Taller</p>
                </div>
                <div className="w-px bg-gray-100 my-2"></div>
                <div className="px-4 py-2 text-center">
                    <p className="text-xs font-bold text-red-600">{fleetStats.fuera}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Parados</p>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
             <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-2"><TruckIcon className="w-5 h-5 text-indigo-600" /><span className="font-bold text-gray-700 uppercase text-xs tracking-wider">Inventario de Unidades</span></div>
                <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por interno..." className="pl-9 pr-4 py-2 text-xs border rounded-lg outline-none w-full sm:w-48 bg-white" />
                </div>
             </div>
             
             <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[700px] overflow-y-auto custom-scrollbar">
                {fleetList.filter(t => t.internalId.includes(searchTerm)).map(truck => {
                    const daysStop = getInactivityDays(truck.inactiveSince);
                    const isInactive = truck.status !== TruckStatus.ACTIVE;
                    
                    return (
                        <div key={truck.id} onClick={() => handleSelectTruck(truck)} className={`p-4 rounded-2xl border-2 transition-all group cursor-pointer shadow-sm relative overflow-hidden hover:-translate-y-1 hover:shadow-xl ${isInactive ? 'border-orange-200 bg-orange-50/40 hover:border-orange-400' : 'border-gray-100 bg-white hover:border-indigo-400'}`}>
                            {isInactive && <div className="absolute top-0 right-0 p-1.5 bg-orange-500 text-white rounded-bl-xl shadow-sm z-10"><Hammer size={10} /></div>}
                            
                            <div className="flex items-center justify-between mb-3">
                                <span className={`text-xl font-black tracking-tight ${isInactive ? 'text-orange-950' : 'text-slate-800'}`}>INT. {truck.internalId}</span>
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase border shadow-sm ${getStatusColor(truck.status)}`}>{truck.status}</span>
                            </div>
                            
                            <p className="text-[10px] text-gray-500 font-mono mb-4 uppercase font-bold tracking-tighter">{truck.domain} • {truck.model}</p>
                            
                            {isInactive ? (
                                <div className="space-y-2 p-2.5 bg-white/80 rounded-xl border border-orange-200 shadow-inner">
                                    <div className="flex items-start gap-2">
                                        <Hammer className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                                        <div className="overflow-hidden">
                                            <p className="text-[9px] font-black text-orange-800 uppercase leading-none mb-1">En Reparación</p>
                                            <p className="text-[10px] text-gray-700 truncate font-medium">{truck.repairReason || 'Sin motivo especificado'}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-between border-t border-orange-100 pt-2 bg-orange-50/50 -mx-2.5 -mb-2.5 rounded-b-xl px-2.5 pb-2">
                                        <div className="text-center px-1">
                                            <p className="text-[11px] font-black text-orange-700">{daysStop}</p>
                                            <p className="text-[7px] text-orange-400 uppercase font-black">DÍAS PARADO</p>
                                        </div>
                                        <div className="text-center px-1">
                                            <p className="text-[11px] font-black text-slate-800">{truck.estimatedRepairDays || '?'}</p>
                                            <p className="text-[7px] text-slate-400 uppercase font-black">ESTIMADO</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                     <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 text-center group-hover:bg-white transition-colors">
                                         <p className="text-[10px] font-black text-slate-800">{truck.vtvExpiry ? truck.vtvExpiry.split('-').reverse().slice(0,2).join('/') : '-'}</p>
                                         <p className="text-[7px] text-gray-400 uppercase font-black">VTV Vence</p>
                                     </div>
                                     <div className="p-2 bg-gray-50 rounded-xl border border-gray-100 text-center group-hover:bg-white transition-colors">
                                         <p className="text-[10px] font-black text-slate-800">{truck.insuranceExpiry ? truck.insuranceExpiry.split('-').reverse().slice(0,2).join('/') : '-'}</p>
                                         <p className="text-[7px] text-gray-400 uppercase font-black">Seguro Vence</p>
                                     </div>
                                </div>
                            )}
                            
                            <div className="mt-4 flex justify-between items-center text-[9px] text-indigo-600 opacity-0 group-hover:opacity-100 transition-all font-black uppercase tracking-widest translate-y-2 group-hover:translate-y-0">
                                DETALLES TÉCNICOS
                                <Info className="w-3.5 h-3.5" />
                            </div>
                        </div>
                    );
                })}
             </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl shadow-xl text-white">
                <h3 className="text-xs font-bold text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-widest border-b border-slate-800 pb-4">
                    <Clock className="w-4 h-4 text-orange-500" /> Taller Activo
                </h3>
                <div className="space-y-4">
                    {fleetList.filter(t => t.status !== TruckStatus.ACTIVE).length > 0 ? fleetList.filter(t => t.status !== TruckStatus.ACTIVE).map((t, i) => (
                        <div key={i} className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex flex-col gap-2 hover:bg-slate-800 transition-colors">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black tracking-tight uppercase">INT. {t.internalId}</span>
                                <span className="text-[8px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-lg font-black uppercase border border-red-500/30">{t.status}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 font-medium italic">"{t.repairReason || 'En revisión general'}"</p>
                            <div className="flex items-center gap-3 mt-1 border-t border-slate-700/50 pt-2">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{getInactivityDays(t.inactiveSince)} días inactivo</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500/30 mx-auto mb-3" />
                            <p className="text-xs text-slate-500 font-medium">Flota 100% operativa.</p>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Disponibilidad de Flota</h4>
                <div className="space-y-2">
                    <div className="flex justify-between text-xs items-end">
                        <span className="text-gray-500 font-bold uppercase text-[9px]">En Servicio</span>
                        <span className="font-black text-indigo-600 text-lg leading-none">{Math.round((fleetStats.active / fleetStats.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${(fleetStats.active / fleetStats.total) * 100}%` }} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
