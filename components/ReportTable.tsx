
import { RouteRecord, StaffStatus, StaffMember, ZoneStatus, AbsenceReason } from '../types';
import React from 'react';
import { CheckCircle2, UserX, Trash2 } from 'lucide-react';
import { getAbsenceStyles } from '../App';

interface ReportTableProps {
  data: RouteRecord[];
  onUpdateRecord?: (id: string, field: keyof RouteRecord, value: any) => void;
  onDeleteRecord: (id: string) => void;
  onOpenPicker: (id: string, field: string, role: string) => void;
  onUpdateStaff: (staff: StaffMember) => void;
  activeShiftLabel?: string;
}

interface StaffCellProps {
  staff: StaffMember | null;
  role: string;
  isSuplente?: boolean;
  onClick?: () => void;
  onUpdateStatus?: (staff: StaffMember, newStatus: StaffStatus) => void;
  rowIndex: number;
  colIndex: number;
  onNavigate: (r: number, c: number) => void;
}

const StaffCell: React.FC<StaffCellProps> = ({ 
    staff, role, isSuplente, onClick, onUpdateStatus, rowIndex, colIndex, onNavigate 
}) => {
  const isAbsent = staff?.status === StaffStatus.ABSENT;
  const absenceStyle = isAbsent ? getAbsenceStyles(staff?.address || 'FALTA') : '';
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const { key } = e;
    if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        onClick?.();
    } else if (key === 'ArrowUp') { e.preventDefault(); onNavigate(rowIndex - 1, colIndex); }
    else if (key === 'ArrowDown') { e.preventDefault(); onNavigate(rowIndex + 1, colIndex); }
    else if (key === 'ArrowLeft') { e.preventDefault(); onNavigate(rowIndex, colIndex - 1); }
    else if (key === 'ArrowRight') { e.preventDefault(); onNavigate(rowIndex, colIndex + 1); }
  };

  return (
    <td 
      tabIndex={0}
      data-row={rowIndex}
      data-col={colIndex}
      onKeyDown={handleKeyDown}
      className={`border border-black p-0 min-w-[135px] h-10 transition-all relative group/cell focus:ring-2 focus:ring-indigo-500 focus:z-50 outline-none cursor-pointer select-none ${
        !staff ? (isSuplente ? 'bg-indigo-50/20' : 'bg-white') : 
        (isAbsent ? absenceStyle : isSuplente ? 'bg-indigo-100 text-indigo-900' : 'bg-white hover:bg-slate-50')
      }`}
    >
      <div onClick={onClick} className="w-full h-full flex flex-col items-center justify-center px-1">
        {!staff ? (
          <div className="flex flex-col items-center justify-center opacity-30">
              <span className="text-[7px] font-black uppercase tracking-tighter">{role}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center overflow-hidden">
            <span className={`uppercase truncate w-full font-black text-[9px] ${isAbsent ? '' : 'text-slate-800'}`}>
              {staff.name}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className={`text-[7px] font-bold px-1 py-0.2 rounded bg-black/5`}>
                {staff.id}
              </span>
              {isAbsent && (
                <span className="text-[7px] font-black uppercase bg-white/60 px-1 py-0 rounded">
                  {staff.address || 'FALTA'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {staff && (
        <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity flex gap-1 z-10">
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                onUpdateStatus?.(staff, isAbsent ? StaffStatus.PRESENT : StaffStatus.ABSENT); 
            }}
            className={`${isAbsent ? 'bg-emerald-500' : 'bg-red-500'} text-white p-1 rounded shadow-lg hover:scale-110 transition-transform`}
          >
            {isAbsent ? <CheckCircle2 size={12} /> : <UserX size={12} />}
          </button>
        </div>
      )}
    </td>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ data, onUpdateRecord, onDeleteRecord, onOpenPicker, onUpdateStaff, activeShiftLabel }) => {
  
  const focusCell = (r: number, c: number) => {
    if (r < 0 || r >= data.length || c < 0 || c > 13) return;

    const el = document.querySelector(`[data-row="${r}"][data-col="${c}"]`) as HTMLElement;
    if (el) {
        el.focus();
        const input = el.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
        if (input) {
            input.focus();
            if (input instanceof HTMLInputElement) input.select();
        }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rIdx: number, cIdx: number) => {
    const input = e.currentTarget;
    const { key } = e;

    if (key === 'Enter') {
        e.preventDefault();
        focusCell(rIdx + 1, cIdx);
    } else if (key === 'ArrowUp') {
        e.preventDefault();
        focusCell(rIdx - 1, cIdx);
    } else if (key === 'ArrowDown') {
        e.preventDefault();
        focusCell(rIdx + 1, cIdx);
    } else if (key === 'ArrowLeft') {
        if (input.selectionStart === 0) {
            e.preventDefault();
            focusCell(rIdx, cIdx - 1);
        }
    } else if (key === 'ArrowRight') {
        if (input.selectionStart === input.value.length) {
            e.preventDefault();
            focusCell(rIdx, cIdx + 1);
        }
    }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white">
      <div className="bg-[#1e1b2e] text-white px-6 py-2 flex justify-between items-center shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest italic">{activeShiftLabel}</span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="border-collapse text-[9px] w-full min-w-[3400px] table-fixed">
          <thead className="sticky top-0 z-30 bg-[#ccd1ff] text-black font-black uppercase text-[8px] border-b-2 border-black">
            <tr className="h-12">
              <th className="sticky left-0 bg-[#ccd1ff] px-2 w-32 border-r border-black z-40">ZONA</th>
              <th className="w-20 border-r border-black">INTERNO</th>
              <th className="w-28 border-r border-black">DOMINIO</th>
              <th className="w-48 border-r border-black">CHOFER</th>
              <th className="w-48 border-r border-black">AUXILIAR I</th>
              <th className="w-48 border-r border-black">AUXILIAR II</th>
              <th className="w-48 border-r border-black">AUXILIAR III</th>
              <th className="w-48 border-r border-black">AUXILIAR IV</th>
              <th className="w-48 border-r border-black">REEMPLAZO CHOFER</th>
              <th className="w-48 border-r border-black">REEMPLAZO AUXILIAR I</th>
              <th className="w-48 border-r border-black">REEMPLAZO AUXILIAR II</th>
              <th className="w-40 border-r border-black">ESTADO</th>
              <th className="w-[450px] border-r border-black px-4">INFORME DE SUPERVISIÓN</th>
              <th className="w-24 border-r border-black">TONELADAS</th>
              <th className="w-24 border-r border-black">HORA</th>
              <th className="w-14 bg-white"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {data.map((r, rowIndex) => (
                <tr key={r.id} className="h-11 hover:bg-slate-50">
                  <td className="sticky left-0 z-20 font-black border-r border-black text-center bg-slate-50 uppercase text-slate-900 px-2">
                    {r.zone}
                  </td>
                  <td data-row={rowIndex} data-col={0} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="text" value={r.internalId || ''} onChange={e => onUpdateRecord?.(r.id, 'internalId', e.target.value)} onKeyDown={e => handleInputKeyDown(e, rowIndex, 0)} className="w-full h-full bg-transparent text-center font-black outline-none border-none px-1" />
                  </td>
                  <td data-row={rowIndex} data-col={1} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="text" value={r.domain || ''} onChange={e => onUpdateRecord?.(r.id, 'domain', e.target.value.toUpperCase())} onKeyDown={e => handleInputKeyDown(e, rowIndex, 1)} className="w-full h-full bg-transparent text-center font-bold outline-none border-none px-1 uppercase" />
                  </td>
                  <StaffCell staff={r.driver} role="CHOFER" rowIndex={rowIndex} colIndex={2} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'driver', 'CHOFER')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.aux1} role="AUXILIAR I" rowIndex={rowIndex} colIndex={3} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux1', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.aux2} role="AUXILIAR II" rowIndex={rowIndex} colIndex={4} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux2', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.aux3} role="AUXILIAR III" rowIndex={rowIndex} colIndex={5} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux3', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.aux4} role="AUXILIAR IV" rowIndex={rowIndex} colIndex={6} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux4', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.replacementDriver} role="REEMPLAZO CHOFER" isSuplente rowIndex={rowIndex} colIndex={7} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementDriver', 'CHOFER')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.replacementAux1} role="REEMPLAZO AUXILIAR I" isSuplente rowIndex={rowIndex} colIndex={8} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementAux1', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <StaffCell staff={r.replacementAux2} role="REEMPLAZO AUXILIAR II" isSuplente rowIndex={rowIndex} colIndex={9} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementAux2', 'AUXILIAR')} onUpdateStatus={(s, st) => onUpdateStaff({...s, status: st, address: st === StaffStatus.ABSENT ? AbsenceReason.ARTICULO_95 : ''})} />
                  <td data-row={rowIndex} data-col={10} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <select value={r.zoneStatus} onChange={e => onUpdateRecord?.(r.id, 'zoneStatus', e.target.value as any)} onKeyDown={e => { if (e.key === 'ArrowUp') focusCell(rowIndex - 1, 10); else if (e.key === 'ArrowDown') focusCell(rowIndex + 1, 10); }} className={`w-full h-full bg-transparent border-none outline-none font-black text-[8px] text-center cursor-pointer ${r.zoneStatus === ZoneStatus.COMPLETE ? 'text-emerald-600' : r.zoneStatus === ZoneStatus.INCOMPLETE ? 'text-red-600' : 'text-slate-400'}`}>
                      <option value={ZoneStatus.PENDING}>PENDIENTE</option>
                      <option value={ZoneStatus.COMPLETE}>COMPLETA</option>
                      <option value={ZoneStatus.INCOMPLETE}>INCOMPLETA</option>
                    </select>
                  </td>
                  <td data-row={rowIndex} data-col={11} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="text" value={r.supervisionReport || ''} onChange={e => onUpdateRecord?.(r.id, 'supervisionReport', e.target.value.toUpperCase())} onKeyDown={e => handleInputKeyDown(e, rowIndex, 11)} className="w-full h-full bg-transparent outline-none px-2 font-bold text-[9px] uppercase" placeholder="..." />
                  </td>
                  <td data-row={rowIndex} data-col={12} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="text" value={r.tonnage || ''} onChange={e => onUpdateRecord?.(r.id, 'tonnage', e.target.value)} onKeyDown={e => handleInputKeyDown(e, rowIndex, 12)} className="w-full h-full bg-transparent text-center outline-none font-black text-indigo-600" placeholder="0.0" />
                  </td>
                  <td data-row={rowIndex} data-col={13} className="border-r border-black p-0 focus-within:ring-2 focus-within:ring-indigo-500">
                    <input type="text" value={r.departureTime || ''} onChange={e => onUpdateRecord?.(r.id, 'departureTime', e.target.value)} onKeyDown={e => handleInputKeyDown(e, rowIndex, 13)} className="w-full h-full bg-transparent text-center outline-none font-bold" placeholder="--:--" />
                  </td>
                  <td className="text-center bg-white">
                    <button onClick={() => onDeleteRecord(r.id)} className="p-1.5 text-red-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"><Trash2 size={14} /></button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
