
import React from 'react';
import { TransferRecord, StaffMember, TransferUnit, StaffStatus } from '../types';
import { CheckCircle2, Zap } from 'lucide-react';
import { getAbsenceStyles } from '../styles';

interface TransferTableProps {
  data: TransferRecord[];
  onUpdateRow: (id: string, field: keyof TransferRecord, value: any) => void;
  onOpenPicker: (id: string, field: string, role: string, currentValueId?: string, unitIdx?: number) => void;
  onUpdateStaff: (staff: StaffMember) => void;
  presenceOverrides?: string[];
  isMasterMode?: boolean;
}

export const TransferTable: React.FC<TransferTableProps> = ({ data, onUpdateRow, onOpenPicker, onUpdateStaff, presenceOverrides = [], isMasterMode = false }) => {
  
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

  const navigateTolva = (e: React.KeyboardEvent, rowId: string, uIdx: number, field: string) => {
    const { key } = e;
    const target = e.target as HTMLInputElement;
    const fields = ['dom1', 'dom2', 't0h', 't0n', 't1h', 't1n', 't2h', 't2n'];
    const currentFieldIdx = fields.indexOf(field);

    if (key === 'Enter' || key === 'ArrowDown' || key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = key === 'ArrowUp' ? uIdx - 1 : uIdx + 1;
        if (nextIdx >= 0 && nextIdx < 3) {
            const container = document.querySelector(`[data-row-id="${rowId}"]`);
            const targetEl = container?.querySelector(`[data-unit="${nextIdx}"][data-field="${field}"]`) as HTMLInputElement;
            if (targetEl) { targetEl.focus(); targetEl.select(); }
        }
    } else if (key === 'ArrowLeft' && target.selectionStart === 0) {
        if (currentFieldIdx > 0) {
            e.preventDefault();
            const container = document.querySelector(`[data-row-id="${rowId}"]`);
            const targetEl = container?.querySelector(`[data-unit="${uIdx}"][data-field="${fields[currentFieldIdx - 1]}"]`) as HTMLInputElement;
            if (targetEl) { targetEl.focus(); targetEl.select(); }
        }
    } else if (key === 'ArrowRight' && target.selectionEnd === target.value.length) {
        if (currentFieldIdx < fields.length - 1) {
            e.preventDefault();
            const container = document.querySelector(`[data-row-id="${rowId}"]`);
            const targetEl = container?.querySelector(`[data-unit="${uIdx}"][data-field="${fields[currentFieldIdx + 1]}"]`) as HTMLInputElement;
            if (targetEl) { targetEl.focus(); targetEl.select(); }
        }
    }
  };

  const StaffSlot = ({ label, value, onClick, className = "", small = false }: any) => {
    const isOverridden = value ? presenceOverrides.includes(value.id) : false;
    const isAbsent = value?.status === StaffStatus.ABSENT && !isOverridden;
    const absenceStyle = isAbsent ? getAbsenceStyles(value.address || 'FALTA') : '';

    return (
      <div 
        onClick={onClick} 
        className={`flex flex-col border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all relative group/slot ${className} ${isAbsent ? absenceStyle : isOverridden ? 'bg-indigo-50' : ''}`}
      >
        {label && <div className={`px-2 py-0.5 border-b border-slate-200 text-[7px] font-black uppercase ${isAbsent ? 'bg-white/20 text-current' : 'bg-slate-100 text-slate-500'}`}>{label}</div>}
        <div className={`${small ? 'p-1' : 'p-2'} min-h-[30px] flex flex-col justify-center`}>
          <div className="flex items-center gap-2">
            <span className={`${small ? 'text-[8px]' : 'text-[10px]'} font-black uppercase truncate ${isAbsent ? 'text-white' : 'text-slate-800'}`}>
                {value?.name || '---'}
            </span>
            {isOverridden && <Zap size={10} className="text-indigo-600 fill-current" />}
          </div>
          {value && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[7px] font-bold px-1 rounded ${isAbsent ? 'bg-white/40 text-white' : 'bg-slate-100 text-slate-500'}`}>LEG: {value.id}</span>
              {isAbsent && <span className="text-[7px] font-black uppercase bg-white/60 px-1 rounded text-red-600">FALTA</span>}
            </div>
          )}
        </div>
        {!isMasterMode && isAbsent && (
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                onUpdateStaff(value); 
            }} 
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-emerald-500 text-white p-1 rounded-md opacity-0 group-hover/slot:opacity-100 transition-opacity shadow-lg z-10 hover:bg-emerald-600"
          >
            <CheckCircle2 size={12} />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full p-4 gap-6 w-full min-w-[1200px] overflow-auto custom-scrollbar ${isMasterMode ? 'bg-orange-50/20' : 'bg-white'}`}>
      {data.map((row) => (
        <div key={row.id} data-row-id={row.id} className={`rounded-[1.5rem] border-2 overflow-hidden shadow-sm flex flex-col shrink-0 mb-4 bg-white ${isMasterMode ? 'border-orange-200' : 'border-slate-200'}`}>
            <div className="flex">
                <div className="flex-1 flex flex-col border-r border-slate-100">
                    <div className={`flex text-white text-[8px] font-black uppercase tracking-widest text-center py-2 ${isMasterMode ? 'bg-orange-600' : 'bg-slate-900'}`}>
                        <div className="w-44">Chofer / Maquinista</div>
                        <div className="w-44 border-l border-white/20">Dominios</div>
                        {!isMasterMode && (
                            <>
                                <div className="flex-1 border-l border-white/20">Viaje 1 (H/TN)</div>
                                <div className="flex-1 border-l border-white/20">Viaje 2 (H/TN)</div>
                                <div className="flex-1 border-l border-white/20">Viaje 3 (H/TN)</div>
                            </>
                        )}
                        {isMasterMode && <div className="flex-1 border-l border-white/20">Modo Plantilla</div>}
                    </div>
                    {row.units.map((unit, uIdx) => (
                        <div key={unit.id} className="flex border-b border-slate-100">
                            <div className="w-44">
                                <StaffSlot value={unit.driver} onClick={() => onOpenPicker(row.id, 'units', `CHOFER ${uIdx + 1}`, unit.driver?.id, uIdx)} />
                            </div>
                            <div className="w-44 grid grid-cols-2 p-1 gap-1">
                                <input data-unit={uIdx} data-field="dom1" type="text" value={unit.domain1} onChange={e => updateUnitField(row.id, uIdx, 'domain1', e.target.value.toUpperCase())} onKeyDown={e => navigateTolva(e, row.id, uIdx, 'dom1')} className="text-center font-mono font-black text-[9px] bg-slate-50 rounded border outline-none uppercase focus:bg-white focus:ring-1 focus:ring-indigo-500" placeholder="DOM 1" />
                                <input data-unit={uIdx} data-field="dom2" type="text" value={unit.domain2} onChange={e => updateUnitField(row.id, uIdx, 'domain2', e.target.value.toUpperCase())} onKeyDown={e => navigateTolva(e, row.id, uIdx, 'dom2')} className="text-center font-mono font-black text-[9px] bg-slate-50 rounded border outline-none uppercase focus:bg-white focus:ring-1 focus:ring-indigo-500" placeholder="DOM 2" />
                            </div>
                            {!isMasterMode ? (
                                unit.trips.map((trip, tIdx) => (
                                    <div key={tIdx} className="flex-1 border-l border-slate-100 flex items-center">
                                        <input data-unit={uIdx} data-field={`t${tIdx}h`} type="text" value={trip.hora} onChange={e => updateTrip(row.id, uIdx, tIdx, 'hora', e.target.value)} onKeyDown={e => navigateTolva(e, row.id, uIdx, `t${tIdx}h`)} className="w-1/2 text-center text-[10px] font-black outline-none border-r border-slate-50 focus:bg-indigo-50" placeholder="--:--" />
                                        <input data-unit={uIdx} data-field={`t${tIdx}n`} type="text" value={trip.ton} onChange={e => updateTrip(row.id, uIdx, tIdx, 'ton', e.target.value)} onKeyDown={e => navigateTolva(e, row.id, uIdx, `t${tIdx}n`)} className="w-1/2 text-center text-[10px] font-black text-indigo-600 outline-none focus:bg-indigo-50" placeholder="0.0" />
                                    </div>
                                ))
                            ) : (
                                <div className="flex-1 bg-orange-50/10 flex items-center justify-center">
                                    <span className="text-[7px] font-black text-orange-300 uppercase tracking-widest italic">Plantilla Activa</span>
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="flex bg-slate-50">
                        <div className="w-44">
                            <StaffSlot label="MAQUINISTA" value={row.maquinista} onClick={() => onOpenPicker(row.id, 'maquinista', 'MAQUINISTA', row.maquinista?.id)} />
                        </div>
                        <div className="w-44 p-1 flex items-center">
                            <input type="text" value={row.maquinistaDomain} onChange={e => onUpdateRow(row.id, 'maquinistaDomain', e.target.value.toUpperCase())} className="w-full text-center font-mono font-black text-[9px] uppercase border rounded outline-none focus:bg-white" placeholder="DOMINIO MAQ." />
                        </div>
                        <div className="flex-1 text-center flex items-center justify-center">
                             <span className="text-[8px] font-black uppercase tracking-widest italic text-slate-400">
                                Movimientos Planta Transferencia
                             </span>
                        </div>
                    </div>
                </div>
                <div className="w-64 flex flex-col shrink-0">
                     <div className={`text-white text-[8px] font-black text-center py-2 uppercase tracking-widest ${isMasterMode ? 'bg-orange-700' : 'bg-[#8b3d6a]'}`}>Auxiliares y Control</div>
                     <div className="grid grid-cols-1 divide-y divide-slate-100 flex-1">
                        <StaffSlot label="Tolva 1" value={row.auxTolva1} onClick={() => onOpenPicker(row.id, 'auxTolva1', 'AUX TOLVA 1', row.auxTolva1?.id)} small />
                        <StaffSlot label="Tolva 2" value={row.auxTolva2} onClick={() => onOpenPicker(row.id, 'auxTolva2', 'AUX TOLVA 2', row.auxTolva2?.id)} small />
                        <StaffSlot label="Encargado" value={row.encargado} onClick={() => onOpenPicker(row.id, 'encargado', 'ENCARGADO TOLVA', row.encargado?.id)} small />
                        <StaffSlot label="Balancero" value={row.balancero1} onClick={() => onOpenPicker(row.id, 'balancero1', 'BALANCERO', row.balancero1?.id)} small />
                     </div>
                </div>
            </div>
            {!isMasterMode && (
                <div className="bg-slate-50 p-3 border-t border-slate-200">
                    <textarea value={row.observaciones} onChange={e => onUpdateRow(row.id, 'observaciones', e.target.value.toUpperCase())} className="w-full h-10 bg-white border rounded-xl px-3 py-1 text-[9px] font-bold uppercase resize-none outline-none focus:ring-2 focus:ring-indigo-100" placeholder="OBSERVACIONES DEL TURNO..." />
                </div>
            )}
        </div>
      ))}
    </div>
  );
};
