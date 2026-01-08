
import { RouteRecord, StaffStatus, StaffMember, ZoneStatus, AbsenceReason } from '../types';
import React, { useMemo } from 'react';
import { Trash2, UserCheck, UserX } from 'lucide-react';
import { getAbsenceStyles } from '../styles';

interface ReportTableProps {
  data: RouteRecord[];
  onUpdateRecord?: (id: string, field: keyof RouteRecord, value: any) => void;
  onDeleteRecord: (id: string) => void;
  onOpenPicker: (id: string, field: string, role: string, currentValueId?: string) => void;
  onUpdateStaff: (staff: StaffMember) => void;
  activeShiftLabel?: string;
  isMasterMode?: boolean;
  selectedDate: string;
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
    if (key === 'ArrowUp') { e.preventDefault(); onNavigate(rowIndex - 1, colIndex); }
    else if (key === 'ArrowDown') { e.preventDefault(); onNavigate(rowIndex + 1, colIndex); }
    else if (key === 'ArrowLeft') { e.preventDefault(); onNavigate(rowIndex, colIndex - 1); }
    else if (key === 'ArrowRight') { e.preventDefault(); onNavigate(rowIndex, colIndex + 1); }
    else if (key === 'Enter') { e.preventDefault(); onNavigate(rowIndex + 1, colIndex); }
  };

  return (
    <td 
      tabIndex={0}
      data-row={rowIndex}
      data-col={colIndex}
      onKeyDown={handleKeyDown}
      className={`border border-black p-0 min-w-[130px] h-10 transition-all relative group/cell focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer select-none ${
        !staff ? (isSuplente ? 'bg-indigo-50/20' : 'bg-white') : 
        (isAbsent ? absenceStyle : isSuplente ? 'bg-indigo-50 text-indigo-900 italic' : 'bg-white hover:bg-slate-50')
      }`}
    >
      <div onClick={onClick} className="w-full h-full flex flex-col items-center justify-center px-1">
        {!staff ? (
          <span className="text-[7px] font-black uppercase opacity-20 tracking-tighter">{role}</span>
        ) : (
          <div className="flex flex-col items-center justify-center text-center leading-none overflow-hidden w-full">
            <span className={`uppercase truncate w-full font-black text-[10px] drop-shadow-sm ${isAbsent ? 'text-white' : 'text-slate-800'}`}>
              {staff.name}
            </span>
            <div className="flex items-center gap-1 mt-1 opacity-90">
              <span className={`text-[7px] font-black ${isAbsent ? 'text-white' : 'text-slate-400'}`}>
                {staff.id}
              </span>
              {isAbsent && (
                <span className="text-[7px] font-black uppercase bg-white/30 px-1 rounded truncate max-w-[60px] text-white">
                  {staff.address || 'FALTA'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {staff && (
        <button 
          onClick={(e) => { 
              e.stopPropagation(); 
              onUpdateStatus?.(staff, isAbsent ? StaffStatus.PRESENT : StaffStatus.ABSENT); 
          }}
          className={`absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity p-1.5 rounded-lg shadow-xl z-10 ${isAbsent ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white hover:bg-red-700'}`}
        >
          {isAbsent ? <UserCheck size={14} /> : <UserX size={14} />}
        </button>
      )}
    </td>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ data, onUpdateRecord, onDeleteRecord, onOpenPicker, onUpdateStaff, activeShiftLabel, selectedDate }) => {
  
  // Mapa de historial para autocompletar dominios
  const domainHistory = useMemo(() => {
    const history: Record<string, string> = {};
    data.forEach(r => {
      if (r.internalId && r.domain) {
        history[r.internalId] = r.domain;
      }
    });
    return history;
  }, [data]);

  const focusCell = (r: number, c: number) => {
    if (r < 0 || r >= data.length) return;
    const safeC = Math.max(0, Math.min(c, 13));
    const el = document.querySelector(`[data-row="${r}"][data-col="${safeC}"]`) as HTMLElement;
    if (el) {
        const input = el.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
        if (input) {
            input.focus();
            if (input instanceof HTMLInputElement) input.select();
        } else {
            el.focus();
        }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLElement>, rIdx: number, cIdx: number) => {
    const { key } = e;
    const target = e.target as HTMLInputElement;

    if (key === 'Enter') { 
      e.preventDefault(); 
      focusCell(rIdx + 1, cIdx); 
    }
    else if (key === 'ArrowUp') { 
      e.preventDefault(); 
      focusCell(rIdx - 1, cIdx); 
    }
    else if (key === 'ArrowDown') { 
      e.preventDefault(); 
      focusCell(rIdx + 1, cIdx); 
    }
    else if (key === 'ArrowLeft') {
      if (!(target instanceof HTMLInputElement) || target.selectionStart === 0) {
        e.preventDefault();
        focusCell(rIdx, cIdx - 1);
      }
    }
    else if (key === 'ArrowRight') {
      if (!(target instanceof HTMLInputElement) || target.selectionEnd === target.value.length) {
        e.preventDefault();
        focusCell(rIdx, cIdx + 1);
      }
    }
  };

  const handleToggleStatus = (s: StaffMember, newStatus: StaffStatus) => {
      if (newStatus === StaffStatus.PRESENT) {
          onUpdateStaff({
              ...s,
              status: StaffStatus.PRESENT,
              address: '',
              absenceStartDate: undefined,
              absenceReturnDate: undefined,
              isIndefiniteAbsence: false
          });
      } else {
          onUpdateStaff({
              ...s,
              status: StaffStatus.ABSENT,
              address: 'FALTA',
              absenceStartDate: selectedDate
          });
      }
  };

  return (
    <div className="flex flex-col w-full h-full overflow-hidden bg-white">
      <div className="bg-[#111827] text-white px-6 py-2 flex justify-between items-center shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest italic">{activeShiftLabel}</span>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="border-collapse text-[9px] w-full min-w-[2000px] table-fixed">
          <thead className="sticky top-0 z-30 text-black font-black uppercase text-[8px] border-b-2 border-black bg-indigo-50">
            <tr className="h-12">
              <th className="sticky left-0 px-2 w-32 border-r border-black z-40 bg-indigo-50">ZONA</th>
              <th className="w-20 border-r border-black">INT.</th>
              <th className="w-28 border-r border-black">DOMINIO</th>
              <th className="w-44 border-r border-black">CHOFER</th>
              <th className="w-44 border-r border-black">AUXILIAR I</th>
              <th className="w-44 border-r border-black">AUXILIAR II</th>
              <th className="w-44 border-r border-black">AUXILIAR III</th>
              <th className="w-44 border-r border-black">AUXILIAR IV</th>
              <th className="w-44 border-r border-black">REP. CHOFER</th>
              <th className="w-44 border-r border-black">REP. AUX I</th>
              <th className="w-44 border-r border-black">REP. AUX II</th>
              <th className="w-36 border-r border-black">ESTADO</th>
              <th className="w-[450px] border-r border-black px-4">SUPERVISIÓN</th>
              <th className="w-24 border-r border-black">TN</th>
              <th className="w-24 border-r border-black">HORA</th>
              <th className="w-14 bg-white text-center">ELIM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/10">
            {data.map((r, rowIndex) => (
                <tr key={r.id} className="h-10 hover:bg-slate-50 transition-colors">
                  <td className="sticky left-0 z-20 font-black border-r border-black text-center bg-slate-100 uppercase text-slate-900 px-2">{r.zone}</td>
                  <td data-row={rowIndex} data-col={0} className="border-r border-black p-0">
                    <input 
                      type="text" 
                      value={r.internalId || ''} 
                      onChange={e => {
                        const val = e.target.value;
                        onUpdateRecord?.(r.id, 'internalId', val);
                        // Sugerir dominio si existe en el historial
                        if (domainHistory[val] && !r.domain) {
                          onUpdateRecord?.(r.id, 'domain', domainHistory[val]);
                        }
                      }} 
                      onKeyDown={e => handleInputKeyDown(e, rowIndex, 0)} 
                      className="w-full h-full bg-transparent text-center font-black outline-none border-none" 
                    />
                  </td>
                  <td data-row={rowIndex} data-col={1} className="border-r border-black p-0">
                    <input type="text" value={r.domain || ''} onChange={e => onUpdateRecord?.(r.id, 'domain', e.target.value.toUpperCase())} onKeyDown={e => handleInputKeyDown(e, rowIndex, 1)} className="w-full h-full bg-transparent text-center font-bold outline-none border-none uppercase" />
                  </td>
                  <StaffCell staff={r.driver} role="CHOFER" rowIndex={rowIndex} colIndex={2} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'driver', 'CHOFER', r.driver?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.aux1} role="AUX I" rowIndex={rowIndex} colIndex={3} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux1', 'AUXILIAR', r.aux1?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.aux2} role="AUX II" rowIndex={rowIndex} colIndex={4} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux2', 'AUXILIAR', r.aux2?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.aux3} role="AUX III" rowIndex={rowIndex} colIndex={5} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux3', 'AUXILIAR', r.aux3?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.aux4} role="AUX IV" rowIndex={rowIndex} colIndex={6} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'aux4', 'AUXILIAR', r.aux4?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.replacementDriver} role="REP CHO" isSuplente rowIndex={rowIndex} colIndex={7} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementDriver', 'CHOFER', r.replacementDriver?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.replacementAux1} role="REP A1" isSuplente rowIndex={rowIndex} colIndex={8} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementAux1', 'AUXILIAR', r.replacementAux1?.id)} onUpdateStatus={handleToggleStatus} />
                  <StaffCell staff={r.replacementAux2} role="REP A2" isSuplente rowIndex={rowIndex} colIndex={9} onNavigate={focusCell} onClick={() => onOpenPicker(r.id, 'replacementAux2', 'AUXILIAR', r.replacementAux2?.id)} onUpdateStatus={handleToggleStatus} />
                  <td data-row={rowIndex} data-col={10} className="border-r border-black p-0">
                    <select value={r.zoneStatus} onKeyDown={e => handleInputKeyDown(e, rowIndex, 10)} onChange={e => onUpdateRecord?.(r.id, 'zoneStatus', e.target.value as any)} className={`w-full h-full bg-transparent border-none outline-none font-black text-[8px] text-center cursor-pointer ${r.zoneStatus === ZoneStatus.COMPLETE ? 'text-emerald-600' : r.zoneStatus === ZoneStatus.INCOMPLETE ? 'text-red-600' : 'text-slate-400'}`}>
                      <option value={ZoneStatus.PENDING}>PENDIENTE</option>
                      <option value={ZoneStatus.COMPLETE}>COMPLETA</option>
                      <option value={ZoneStatus.INCOMPLETE}>INCOMPLETA</option>
                    </select>
                  </td>
                  <td data-row={rowIndex} data-col={11} className="border-r border-black p-0">
                    <input type="text" value={r.supervisionReport || ''} onChange={e => onUpdateRecord?.(r.id, 'supervisionReport', e.target.value.toUpperCase())} onKeyDown={e => handleInputKeyDown(e, rowIndex, 11)} className="w-full h-full bg-transparent outline-none px-2 font-bold text-[9px] uppercase" placeholder="..." />
                  </td>
                  <td data-row={rowIndex} data-col={12} className="border-r border-black p-0">
                    <input type="text" value={r.tonnage || ''} onChange={e => onUpdateRecord?.(r.id, 'tonnage', e.target.value)} onKeyDown={e => handleInputKeyDown(e, rowIndex, 12)} className="w-full h-full bg-transparent text-center outline-none font-black text-indigo-600" placeholder="0.0" />
                  </td>
                  <td data-row={rowIndex} data-col={13} className="border-r border-black p-0">
                    <input type="text" value={r.departureTime || ''} onChange={e => onUpdateRecord?.(r.id, 'departureTime', e.target.value)} onKeyDown={e => handleInputKeyDown(e, rowIndex, 13)} className="w-full h-full bg-transparent text-center outline-none font-bold" placeholder="--:--" />
                  </td>
                  <td className="text-center bg-white">
                    <button onClick={() => onDeleteRecord(r.id)} className="p-1.5 text-red-300 hover:text-red-600 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
