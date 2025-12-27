
import React, { useState } from 'react';
import { TransferRecord, StaffMember, StaffStatus, TransferUnit } from '../types';
import { Search, X, User, Truck } from 'lucide-react';

interface TransferTableProps {
  data: TransferRecord[];
  onUpdateRow: (id: string, field: keyof TransferRecord, value: any) => void;
  staffList?: StaffMember[];
}

export const TransferTable: React.FC<TransferTableProps> = ({ data, onUpdateRow, staffList = [] }) => {
  const [picker, setPicker] = useState<{ id: string, unitIdx?: number, field: any, role: string } | null>(null);
  const [search, setSearch] = useState('');

  const calculateTotalTons = () => {
    return data.reduce((acc, row) => {
      return acc + row.units.reduce((uAcc, unit) => {
        return uAcc + unit.trips.reduce((tAcc, trip) => tAcc + (parseFloat(trip.ton) || 0), 0);
      }, 0);
    }, 0).toFixed(1);
  };

  const calculateTotalTrips = () => {
    return data.reduce((acc, row) => {
      return acc + row.units.reduce((uAcc, unit) => {
        return uAcc + unit.trips.filter(t => t.hora || t.ton).length;
      }, 0);
    }, 0);
  };

  const updateUnitField = (rowId: string, unitIdx: number, field: keyof TransferUnit, val: any) => {
    const row = data.find(r => r.id === rowId);
    if (!row) return;
    const newUnits = [...row.units] as [TransferUnit, TransferUnit, TransferUnit];
    newUnits[unitIdx] = { ...newUnits[unitIdx], [field]: val };
    onUpdateRow(rowId, 'units', newUnits);
  };

  const updateTrip = (rowId: string, unitIdx: number, tripIdx: number, field: 'hora' | 'ton', val: string) => {
    const row = data.find(r => r.id === rowId);
    if (!row) return;
    const newUnits = [...row.units] as [TransferUnit, TransferUnit, TransferUnit];
    const newTrips = [...newUnits[unitIdx].trips];
    newTrips[tripIdx] = { ...newTrips[tripIdx], [field]: val };
    newUnits[unitIdx] = { ...newUnits[unitIdx], trips: newTrips as any };
    onUpdateRow(rowId, 'units', newUnits);
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search)
  );

  const StaffSlot = ({ label, value, onClick, className = "", small = false }: any) => (
    <div onClick={onClick} className={`flex flex-col border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all ${className}`}>
      {label && (
        <div className="bg-slate-100 px-2 py-0.5 border-b border-slate-200">
            <span className="text-[7px] font-black text-slate-500 uppercase">{label}</span>
        </div>
      )}
      <div className={`${small ? 'p-0.5 min-h-[24px]' : 'p-1 min-h-[30px]'} flex flex-col justify-center`}>
        <span className={`${small ? 'text-[8px]' : 'text-[10px]'} font-black text-slate-800 uppercase truncate`}>
          {value?.name || '---'}
        </span>
        {value && <span className="text-[7px] font-bold text-slate-400 leading-none">LEG: {value.id}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f1f5f9] overflow-hidden p-6 gap-6">
      
      {/* PICKER MODAL */}
      {picker && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest">Asignar {picker.role}</h3>
                    <button onClick={() => setPicker(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="BUSCAR PERSONAL..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none mb-4"
                    />
                    <div className="max-h-80 overflow-y-auto space-y-1">
                        <button onClick={() => { 
                             if (picker.unitIdx !== undefined) updateUnitField(picker.id, picker.unitIdx, picker.field, null);
                             else onUpdateRow(picker.id, picker.field, null); 
                             setPicker(null); 
                        }} className="w-full p-3 text-left text-red-500 font-black text-[10px] uppercase border rounded-xl hover:bg-red-50">QUITAR ASIGNACIÓN</button>
                        {filteredStaff.map(s => (
                            <button key={s.id} onClick={() => { 
                                if (picker.unitIdx !== undefined) updateUnitField(picker.id, picker.unitIdx, picker.field, s);
                                else onUpdateRow(picker.id, picker.field, s); 
                                setPicker(null); 
                            }} className="w-full p-4 flex justify-between items-center border rounded-xl hover:bg-indigo-50 transition-all text-left">
                                <div>
                                    <p className="text-[10px] font-black text-slate-800 uppercase">{s.name}</p>
                                    <p className="text-[8px] text-slate-400 font-bold">LEG: {s.id} • {s.role}</p>
                                </div>
                                <span className="text-[8px] font-black px-2 py-1 rounded bg-slate-100">{s.status}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* HEADER DE GESTIÓN */}
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-[#8b3d6a] text-white rounded-2xl shadow-lg">
                  <User size={24} />
              </div>
              <div>
                  <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Control de Tolvas y Transferencia</h2>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">G.I.R.S.U. QUILMES - OPERATIVO DIARIO</p>
              </div>
          </div>

          <div className="flex gap-4">
              <div className="flex flex-col">
                  <div className="bg-white border-2 border-[#8b3d6a] rounded-t-xl px-4 py-1 text-center">
                      <span className="text-[8px] font-black text-[#8b3d6a] uppercase">Total Tonelaje</span>
                  </div>
                  <div className="bg-[#8b3d6a] rounded-b-xl px-4 py-2 text-center shadow-lg">
                      <span className="text-2xl font-black text-white">{calculateTotalTons()} TN</span>
                  </div>
              </div>
              <div className="flex flex-col">
                  <div className="bg-white border-2 border-[#8b3d6a] rounded-t-xl px-4 py-1 text-center">
                      <span className="text-[8px] font-black text-[#8b3d6a] uppercase">Total Viajes</span>
                  </div>
                  <div className="bg-[#8b3d6a] rounded-b-xl px-4 py-2 text-center shadow-lg min-w-[100px]">
                      <span className="text-2xl font-black text-white">{calculateTotalTrips()}</span>
                  </div>
              </div>
          </div>
      </div>

      {/* LISTADO DE FICHAS */}
      <div className="flex-1 overflow-auto space-y-6">
          {data.map((row) => (
            <div key={row.id} className="bg-white rounded-[2rem] border-2 border-slate-200 overflow-hidden shadow-sm flex flex-col">
                
                <div className="flex">
                    {/* PARTE IZQUIERDA: CHOFERES Y MAQUINISTA */}
                    <div className="flex-1 flex flex-col border-r-2 border-slate-100">
                        {/* HEADER DE COLUMNAS */}
                        <div className="flex bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest text-center py-2 border-b border-slate-700">
                            <div className="w-48 px-2">Chofer / Maquinista</div>
                            <div className="w-48 px-2 border-l border-slate-700">Dominio 1 / 2</div>
                            <div className="flex-1 border-l border-slate-700">Viaje 1</div>
                            <div className="flex-1 border-l border-slate-700">Viaje 2</div>
                            <div className="flex-1 border-l border-slate-700">Viaje 3</div>
                        </div>

                        {/* FILAS DE CHOFERES (1-3) */}
                        {row.units.map((unit, uIdx) => (
                            <div key={unit.id} className="flex border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <div className="w-48 border-r border-slate-100">
                                    <StaffSlot 
                                        label="" 
                                        value={unit.driver} 
                                        onClick={() => setPicker({ id: row.id, unitIdx: uIdx, field: 'driver', role: `CHOFER ${uIdx + 1}` })}
                                    />
                                </div>
                                <div className="w-48 border-r border-slate-100 grid grid-cols-2 p-1 gap-1">
                                    <input type="text" value={unit.domain1} onChange={e => updateUnitField(row.id, uIdx, 'domain1', e.target.value.toUpperCase())} className="w-full text-center font-mono font-black text-[9px] bg-slate-50 p-1 rounded border border-slate-200 uppercase outline-none" placeholder="DOM 1" />
                                    <input type="text" value={unit.domain2} onChange={e => updateUnitField(row.id, uIdx, 'domain2', e.target.value.toUpperCase())} className="w-full text-center font-mono font-black text-[9px] bg-slate-50 p-1 rounded border border-slate-200 uppercase outline-none" placeholder="DOM 2" />
                                </div>
                                {unit.trips.map((trip, tIdx) => (
                                    <div key={tIdx} className="flex-1 border-r border-slate-100 flex items-center">
                                        <div className="flex-1 border-r border-slate-50">
                                            <input type="text" value={trip.hora} onChange={e => updateTrip(row.id, uIdx, tIdx, 'hora', e.target.value)} className="w-full text-center text-[10px] font-black outline-none py-2" placeholder="--:--" />
                                        </div>
                                        <div className="flex-1">
                                            <input type="text" value={trip.ton} onChange={e => updateTrip(row.id, uIdx, tIdx, 'ton', e.target.value)} className="w-full text-center text-[10px] font-black text-indigo-600 outline-none py-2" placeholder="0.0" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}

                        {/* FILA DE MAQUINISTA (NUEVA) */}
                        <div className="flex bg-slate-100/50">
                            <div className="w-48 border-r border-slate-200">
                                <StaffSlot 
                                    label="MAQUINISTA" 
                                    value={row.maquinista} 
                                    onClick={() => setPicker({ id: row.id, field: 'maquinista', role: 'MAQUINISTA' })}
                                    className="bg-slate-200/40"
                                />
                            </div>
                            <div className="w-48 border-r border-slate-200 p-1 flex items-center">
                                <div className="flex items-center gap-2 bg-white p-1 rounded border border-slate-300 w-full">
                                    <Truck size={12} className="text-slate-400" />
                                    <input type="text" value={row.maquinistaDomain} onChange={e => onUpdateRow(row.id, 'maquinistaDomain', e.target.value.toUpperCase())} className="flex-1 text-center font-mono font-black text-[9px] uppercase outline-none" placeholder="DOMINIO MAQ." />
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-200/20"></div>
                        </div>
                    </div>

                    {/* PARTE DERECHA: PERSONAL DE CONTROL (AUXILIARES, ENCARGADO, BALANZA) */}
                    <div className="w-72 flex flex-col shrink-0">
                         {/* AUXILIARES */}
                         <div className="bg-[#8b3d6a] text-white text-[8px] font-black text-center py-2 uppercase tracking-widest">Auxiliares Tolva / Transferencia</div>
                         <div className="grid grid-cols-1 divide-y divide-slate-100 border-b-2 border-slate-100">
                            <StaffSlot label="Tolva 1" value={row.auxTolva1} onClick={() => setPicker({ id: row.id, field: 'auxTolva1', role: 'AUX TOLVA 1' })} small />
                            <StaffSlot label="Tolva 2" value={row.auxTolva2} onClick={() => setPicker({ id: row.id, field: 'auxTolva2', role: 'AUX TOLVA 2' })} small />
                            <StaffSlot label="Tolva 3" value={row.auxTolva3} onClick={() => setPicker({ id: row.id, field: 'auxTolva3', role: 'AUX TOLVA 3' })} small />
                            <StaffSlot label="Transf. 1" value={row.auxTransferencia1} onClick={() => setPicker({ id: row.id, field: 'auxTransferencia1', role: 'AUX TRANS 1' })} small className="bg-purple-50" />
                            <StaffSlot label="Transf. 2" value={row.auxTransferencia2} onClick={() => setPicker({ id: row.id, field: 'auxTransferencia2', role: 'AUX TRANS 2' })} small className="bg-purple-50" />
                         </div>
                         
                         {/* ENCARGADO Y BALANZA */}
                         <div className="p-2 space-y-2 bg-slate-50/50 flex-1">
                             <StaffSlot label="Encargado/A" value={row.encargado} onClick={() => setPicker({ id: row.id, field: 'encargado', role: 'ENCARGADO' })} small />
                             <div className="space-y-1">
                                <div className="bg-slate-900 text-white text-[7px] font-black text-center py-0.5 rounded-t uppercase">Balanza</div>
                                <StaffSlot label="Balancero 1" value={row.balancero1} onClick={() => setPicker({ id: row.id, field: 'balancero1', role: 'BALANCERO 1' })} small />
                                <StaffSlot label="Balancero 2" value={row.balancero2} onClick={() => setPicker({ id: row.id, field: 'balancero2', role: 'BALANCERO 2' })} small />
                             </div>
                         </div>
                    </div>
                </div>

                {/* FILA INFERIOR: LONERO Y OBSERVACIONES */}
                <div className="bg-slate-50 p-3 flex gap-4 items-center border-t border-slate-200">
                    <div className="flex gap-2 w-72 shrink-0">
                         <StaffSlot label="Lonero" value={row.lonero} onClick={() => setPicker({ id: row.id, field: 'lonero', role: 'LONERO' })} className="bg-white flex-1" small />
                         <StaffSlot label="Suplencia" value={row.suplenciaLona} onClick={() => setPicker({ id: row.id, field: 'suplenciaLona', role: 'SUPLENCIA' })} className="bg-white flex-1" small />
                    </div>
                    <div className="flex-1">
                        <label className="text-[7px] font-black text-slate-400 uppercase mb-0.5 block">Observaciones del Turno</label>
                        <textarea 
                            value={row.observaciones}
                            onChange={e => onUpdateRow(row.id, 'observaciones', e.target.value.toUpperCase())}
                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 py-1 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 uppercase resize-none"
                            placeholder="NOTIFICAR INCIDENCIAS O NOVEDADES..."
                        />
                    </div>
                </div>
            </div>
          ))}
      </div>
    </div>
  );
};
