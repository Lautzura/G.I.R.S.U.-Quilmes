
import React from 'react';
import { TransferRecord, StaffMember, TransferUnit } from '../types';

interface TransferTableProps {
  data: TransferRecord[];
  onUpdateRow: (id: string, field: keyof TransferRecord, value: any) => void;
  onOpenPicker: (id: string, field: string, role: string, unitIdx?: number) => void;
  staffList?: StaffMember[];
}

export const TransferTable: React.FC<TransferTableProps> = ({ data, onUpdateRow, onOpenPicker }) => {
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

  const StaffSlot = ({ label, value, onClick, className = "", small = false }: any) => (
    <div onClick={onClick} className={`flex flex-col border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all ${className}`}>
      {label && <div className="bg-slate-100 px-2 py-0.5 border-b border-slate-200 text-[7px] font-black text-slate-500 uppercase">{label}</div>}
      <div className={`${small ? 'p-1' : 'p-2'} min-h-[30px] flex flex-col justify-center`}>
        <span className={`${small ? 'text-[8px]' : 'text-[10px]'} font-black text-slate-800 uppercase truncate`}>{value?.name || '---'}</span>
        {value && <span className="text-[7px] font-bold text-slate-400">LEG: {value.id}</span>}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-white p-4 gap-6 w-full min-w-[1200px]">
      {data.map((row) => (
        <div key={row.id} className="bg-white rounded-[1.5rem] border-2 border-slate-200 overflow-hidden shadow-sm flex flex-col">
            <div className="flex">
                <div className="flex-1 flex flex-col border-r border-slate-100">
                    <div className="flex bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest text-center py-2">
                        <div className="w-44">Chofer / Maquinista</div>
                        <div className="w-44 border-l border-slate-700">Dominios</div>
                        <div className="flex-1 border-l border-slate-700">Viaje 1</div>
                        <div className="flex-1 border-l border-slate-700">Viaje 2</div>
                        <div className="flex-1 border-l border-slate-700">Viaje 3</div>
                    </div>
                    {row.units.map((unit, uIdx) => (
                        <div key={unit.id} className="flex border-b border-slate-100">
                            <div className="w-44">
                                <StaffSlot value={unit.driver} onClick={() => onOpenPicker(row.id, 'units', `CHOFER ${uIdx + 1}`, uIdx)} />
                            </div>
                            <div className="w-44 grid grid-cols-2 p-1 gap-1">
                                <input type="text" value={unit.domain1} onChange={e => updateUnitField(row.id, uIdx, 'domain1', e.target.value.toUpperCase())} className="text-center font-mono font-black text-[9px] bg-slate-50 rounded border outline-none uppercase" placeholder="DOM 1" />
                                <input type="text" value={unit.domain2} onChange={e => updateUnitField(row.id, uIdx, 'domain2', e.target.value.toUpperCase())} className="text-center font-mono font-black text-[9px] bg-slate-50 rounded border outline-none uppercase" placeholder="DOM 2" />
                            </div>
                            {unit.trips.map((trip, tIdx) => (
                                <div key={tIdx} className="flex-1 border-l border-slate-100 flex items-center">
                                    <input type="text" value={trip.hora} onChange={e => updateTrip(row.id, uIdx, tIdx, 'hora', e.target.value)} className="w-1/2 text-center text-[10px] font-black outline-none border-r border-slate-50" placeholder="--:--" />
                                    <input type="text" value={trip.ton} onChange={e => updateTrip(row.id, uIdx, tIdx, 'ton', e.target.value)} className="w-1/2 text-center text-[10px] font-black text-indigo-600 outline-none" placeholder="0.0" />
                                </div>
                            ))}
                        </div>
                    ))}
                    <div className="flex bg-slate-50">
                        <div className="w-44">
                            <StaffSlot label="MAQUINISTA" value={row.maquinista ? { name: row.maquinista.name, id: row.maquinista.id } : null} onClick={() => onOpenPicker(row.id, 'maquinista', 'MAQUINISTA')} />
                        </div>
                        <div className="w-44 p-1 flex items-center">
                            <input type="text" value={row.maquinistaDomain} onChange={e => onUpdateRow(row.id, 'maquinistaDomain', e.target.value.toUpperCase())} className="w-full text-center font-mono font-black text-[9px] uppercase border rounded outline-none" placeholder="DOMINIO MAQ." />
                        </div>
                        <div className="flex-1"></div>
                    </div>
                </div>
                <div className="w-64 flex flex-col shrink-0">
                     <div className="bg-[#8b3d6a] text-white text-[8px] font-black text-center py-2 uppercase tracking-widest">Auxiliares y Control</div>
                     <div className="grid grid-cols-1 divide-y divide-slate-100">
                        <StaffSlot label="Tolva 1" value={row.auxTolva1} onClick={() => onOpenPicker(row.id, 'auxTolva1', 'AUX TOLVA 1')} small />
                        <StaffSlot label="Tolva 2" value={row.auxTolva2} onClick={() => onOpenPicker(row.id, 'auxTolva2', 'AUX TOLVA 2')} small />
                        <StaffSlot label="Encargado" value={row.encargado} onClick={() => onOpenPicker(row.id, 'encargado', 'ENCARGADO TOLVA')} small />
                        <StaffSlot label="Balancero" value={row.balancero1} onClick={() => onOpenPicker(row.id, 'balancero1', 'BALANCERO')} small />
                     </div>
                </div>
            </div>
            <div className="bg-slate-50 p-3 border-t border-slate-200">
                <textarea value={row.observaciones} onChange={e => onUpdateRow(row.id, 'observaciones', e.target.value.toUpperCase())} className="w-full h-10 bg-white border rounded-xl px-3 py-1 text-[9px] font-bold uppercase resize-none outline-none" placeholder="OBSERVACIONES DEL TURNO..." />
            </div>
        </div>
      ))}
    </div>
  );
};
