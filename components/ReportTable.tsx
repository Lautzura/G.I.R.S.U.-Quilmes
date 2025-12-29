
import { RouteRecord, StaffStatus, StaffMember, ZoneStatus, AbsenceReason } from '../types';
import React, { useRef } from 'react';
import { Lock, Trash2 } from 'lucide-react';

interface ReportTableProps {
  data: RouteRecord[];
  onUpdateRecord?: (id: string, field: keyof RouteRecord, value: any) => void;
  onDeleteRecord?: (id: string) => void;
  onOpenPicker: (id: string, field: string, role: string) => void;
  activeShiftLabel?: string;
  staffList?: StaffMember[];
}

const getAbsenceColorClasses = (reason: string) => {
  switch (reason) {
    case AbsenceReason.FALTA_SIN_AVISO:
    case AbsenceReason.SUSPENSION:
      return { cell: 'bg-red-600 text-white', label: 'text-red-700' };
    case AbsenceReason.ART:
    case AbsenceReason.FALTA_CON_AVISO:
      return { cell: 'bg-orange-500 text-white', label: 'text-orange-700' };
    case AbsenceReason.VACACIONES:
    case AbsenceReason.DIA_ESTUDIANTIL:
    case AbsenceReason.DIA_ANT_ESTUDIANTIL:
      return { cell: 'bg-blue-600 text-white', label: 'text-blue-700' };
    case AbsenceReason.LICENCIA_MEDICA:
    case AbsenceReason.ARTICULO_93:
      return { cell: 'bg-teal-600 text-white', label: 'text-teal-700' };
    case AbsenceReason.DIA_FEMENINO:
      return { cell: 'bg-pink-500 text-white', label: 'text-pink-700' };
    default:
      return { cell: 'bg-slate-700 text-white', label: 'text-slate-700' };
  }
};

const StaffCell: React.FC<{ 
    staff: StaffMember | null; 
    role?: string; 
    isSuplente?: boolean;
    isDisabled?: boolean;
    quotaInfo?: string;
    onClick?: () => void;
}> = ({ staff, role, isSuplente, isDisabled, quotaInfo, onClick }) => {
  if (isDisabled) return (
    <td className={`border border-slate-200 bg-slate-100/50 cursor-not-allowed group relative`}>
        <div className="flex flex-col items-center justify-center h-full opacity-20 grayscale">
            <Lock size={12} className="text-slate-400" />
            {quotaInfo && <span className="text-[7px] font-black mt-1">{quotaInfo}</span>}
        </div>
    </td>
  );

  if (!staff) return (
    <td 
        onClick={onClick}
        className={`border border-slate-300 cursor-pointer hover:bg-indigo-100/50 transition-colors ${isSuplente ? 'bg-cyan-50/40' : 'bg-slate-50/50'}`}
    >
        <div className="flex flex-col items-center justify-center h-full relative">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">ASIGNAR</span>
        </div>
    </td>
  );
  
  const isAbsent = staff.status === StaffStatus.ABSENT;
  const isReserva = staff.status === StaffStatus.RESERVA;
  const isDriver = role?.includes('CHOFER');
  
  let cellStyles = { cell: isSuplente ? 'bg-cyan-600 text-white' : 'bg-white text-slate-700', label: '' };
  if (isAbsent) cellStyles = getAbsenceColorClasses(staff.address || '');
  if (isReserva) cellStyles = { cell: 'bg-indigo-600 text-white', label: 'text-indigo-700' };
  
  return (
    <td 
        onClick={onClick}
        className={`border border-slate-300 p-0 min-w-[150px] h-11 cursor-pointer group transition-all ${cellStyles.cell} hover:brightness-95`}
    >
      <div className="flex flex-col items-center justify-center h-full px-2 text-center overflow-hidden relative">
        <span className={`uppercase truncate w-full leading-tight font-black ${isDriver ? 'text-[11px]' : 'text-[10px]'}`}>
          {staff.name}
        </span>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[8px] font-bold px-1 py-0 rounded ${
            (isAbsent || isReserva || isSuplente) ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            {staff.id}
          </span>
          {isAbsent && (
            <span className={`text-[8px] font-black uppercase bg-white px-1.5 py-0 rounded shadow-sm text-slate-900 border border-black/5`}>
              {staff.address || 'F'}
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ data, onUpdateRecord, onDeleteRecord, onOpenPicker, activeShiftLabel }) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, rowIdx: number, colIdx: number) => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key)) return;

    let targetRow = rowIdx;
    let targetCol = colIdx;

    if (e.key === 'ArrowUp') targetRow--;
    if (e.key === 'ArrowDown') targetRow++;
    if (e.key === 'ArrowLeft') targetCol--;
    if (e.key === 'ArrowRight') targetCol++;

    if (targetRow < 0) return;
    if (targetRow >= data.length) return;
    if (targetCol < 0) return;
    if (targetCol > 6) return;

    e.preventDefault();
    const targetElement = tableRef.current?.querySelector(`[data-row="${targetRow}"][data-col="${targetCol}"]`) as HTMLElement;
    targetElement?.focus();
  };

  const renderRow = (r: RouteRecord, rowIdx: number) => {
    const titulares = [r.aux1, r.aux2, r.aux3, r.aux4];
    const activosTitularesCount = titulares.filter(a => a !== null && a.status !== StaffStatus.ABSENT).length;
    const canEnableSupl1 = (4 - activosTitularesCount) >= 1;
    const canEnableSupl2 = (4 - activosTitularesCount) >= (r.replacementAux1 ? 2 : 1);

    return (
      <tr key={r.id} className="h-11 hover:bg-slate-50 transition-colors group">
        <td className="sticky left-0 z-20 font-black border border-slate-300 text-center bg-white shadow-md uppercase text-[10px] text-indigo-700 px-2">
          {r.zone}
        </td>
        <td className="border border-slate-300 text-center bg-slate-50/20">
          <input 
            type="text" 
            data-row={rowIdx} data-col={0}
            value={r.internalId || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'internalId', e.target.value)} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 0)}
            className="w-full h-full bg-transparent text-center font-black outline-none focus:bg-indigo-50" 
            placeholder="-" 
          />
        </td>
        <td className="border border-slate-300 text-center font-mono uppercase font-black tracking-tighter">
          <input 
            type="text" 
            data-row={rowIdx} data-col={1}
            value={r.domain || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'domain', e.target.value.toUpperCase())} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 1)}
            className="w-full h-full bg-transparent text-center font-black outline-none uppercase focus:bg-indigo-50" 
            placeholder="---" 
          />
        </td>
        <td className="border border-slate-300 text-center text-slate-400 italic text-[9px]">
          {r.reinforcement || '-'}
        </td>
        
        <StaffCell staff={r.driver} role="CHOFER" onClick={() => onOpenPicker(r.id, 'driver', 'CHOFER')} />
        <StaffCell staff={r.aux1} role="AUXILIAR" onClick={() => onOpenPicker(r.id, 'aux1', 'AUXILIAR')} />
        <StaffCell staff={r.aux2} role="AUXILIAR" onClick={() => onOpenPicker(r.id, 'aux2', 'AUXILIAR')} />
        <StaffCell staff={r.aux3} role="AUXILIAR" onClick={() => onOpenPicker(r.id, 'aux3', 'AUXILIAR')} />
        <StaffCell staff={r.aux4} role="AUXILIAR" onClick={() => onOpenPicker(r.id, 'aux4', 'AUXILIAR')} />

        <StaffCell staff={r.replacementDriver} role="CHOFER" isSuplente onClick={() => onOpenPicker(r.id, 'replacementDriver', 'CHOFER SUPLENTE')} />
        <StaffCell staff={r.replacementAux1} role="AUXILIAR" isSuplente isDisabled={!canEnableSupl1 && !r.replacementAux1} onClick={() => onOpenPicker(r.id, 'replacementAux1', 'AUX SUPLENTE')} />
        <StaffCell staff={r.replacementAux2} role="AUXILIAR" isSuplente isDisabled={!canEnableSupl2 && !r.replacementAux2} onClick={() => onOpenPicker(r.id, 'replacementAux2', 'AUX SUPLENTE')} />

        <td className="border border-slate-300 bg-white">
          <select 
            data-row={rowIdx} data-col={2}
            value={r.zoneStatus} 
            onChange={e => onUpdateRecord?.(r.id, 'zoneStatus', e.target.value as any)} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 2)}
            className={`w-full bg-transparent border-none outline-none text-[9px] font-black uppercase text-center cursor-pointer focus:bg-indigo-50 ${r.zoneStatus === ZoneStatus.COMPLETE ? 'text-emerald-600' : r.zoneStatus === ZoneStatus.INCOMPLETE ? 'text-red-600' : 'text-slate-400'}`}
          >
            <option value={ZoneStatus.PENDING}>PENDIENTE</option>
            <option value={ZoneStatus.COMPLETE}>COMPLETA</option>
            <option value={ZoneStatus.INCOMPLETE}>INCOMPLETA</option>
          </select>
        </td>
        <td className="border border-slate-300 bg-white px-3">
          <input 
            type="text" 
            data-row={rowIdx} data-col={3}
            value={r.supervisionReport || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'supervisionReport', e.target.value.toUpperCase())} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 3)}
            placeholder="NOVEDADES..." 
            className="w-full h-full bg-transparent outline-none text-[10px] text-slate-600 font-bold uppercase focus:bg-indigo-50" 
          />
        </td>
        <td className="border border-slate-300 text-center font-bold text-slate-500 bg-slate-50/20">
          <input 
            type="text" 
            data-row={rowIdx} data-col={4}
            value={r.departureTime || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'departureTime', e.target.value)} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 4)}
            placeholder="--:--" 
            className="w-full h-full bg-transparent border-none text-center outline-none font-mono focus:bg-indigo-50" 
          />
        </td>
        <td className="border border-slate-300 text-center font-bold text-slate-500 bg-slate-50/20">
          <input 
            type="text" 
            data-row={rowIdx} data-col={5}
            value={r.dumpTime || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'dumpTime', e.target.value)} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 5)}
            placeholder="--:--" 
            className="w-full h-full bg-transparent border-none text-center outline-none font-mono focus:bg-indigo-50" 
          />
        </td>
        <td className="border border-slate-300 text-center font-black text-indigo-700 bg-indigo-50/30">
          <input 
            type="text" 
            data-row={rowIdx} data-col={6}
            value={r.tonnage || ''} 
            onChange={e => onUpdateRecord?.(r.id, 'tonnage', e.target.value)} 
            onKeyDown={e => handleKeyDown(e, rowIdx, 6)}
            placeholder="0.0" 
            className="w-full h-full bg-transparent border-none text-center outline-none font-black text-[12px] focus:bg-indigo-100" 
          />
        </td>
        <td className="sticky right-0 bg-slate-50 border border-slate-300 text-center z-20">
             <button 
                onClick={(e) => { e.stopPropagation(); onDeleteRecord?.(r.id); }} 
                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 transition-all hover:bg-red-50 rounded-lg active:scale-90"
                title="Eliminar"
             >
                <Trash2 size={14} />
             </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="bg-[#1e293b] text-white px-4 py-2 flex justify-between items-center shrink-0 shadow-lg relative z-30">
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-widest">{activeShiftLabel}</span>
        </div>
        <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
          <span className="flex items-center gap-1.5 text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> COMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.COMPLETE).length}</span>
          <span className="flex items-center gap-1.5 text-red-400"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> INCOMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.INCOMPLETE).length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table ref={tableRef} className="border-collapse text-[10px] w-full min-w-[3200px] table-fixed">
          <thead className="sticky top-0 z-30 bg-slate-50 text-slate-500 font-black uppercase text-[8px] border-b border-slate-300 shadow-md">
            <tr className="h-12">
              <th className="sticky left-0 bg-slate-50 border border-slate-300 px-2 w-32 z-40">ZONA OPERATIVA</th>
              <th className="border border-slate-300 w-20 text-center">INTERNO</th>
              <th className="border border-slate-300 w-24 text-center">DOMINIO</th>
              <th className="border border-slate-300 w-16 text-center">REF.</th>
              <th className="border border-slate-300 w-52 text-center">CHOFER TITULAR</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR I</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR II</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR III</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR IV</th>
              <th className="border border-slate-300 w-52 text-center bg-cyan-100/30 text-cyan-800">C. SUPLENTE</th>
              <th className="border border-slate-300 w-48 text-center bg-cyan-100/30 text-cyan-800">A. SUPL. I</th>
              <th className="border border-slate-300 w-48 text-center bg-cyan-100/30 text-cyan-800">A. SUPL. II</th>
              <th className="border border-slate-300 w-32 text-center">ESTADO</th>
              <th className="border border-slate-300 w-[350px] text-left px-3">NOVEDADES / REPORTE SUPERVISIÓN</th>
              <th className="border border-slate-300 w-20 text-center">SALIDA</th>
              <th className="border border-slate-300 w-20 text-center">ENTRADA</th>
              <th className="border border-slate-300 w-20 text-center font-black">TN</th>
              <th className="sticky right-0 w-14 bg-slate-50 border border-slate-300 text-center z-40">ACC.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data.map((r, idx) => renderRow(r, idx))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
