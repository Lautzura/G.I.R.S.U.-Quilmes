
import { RouteRecord, StaffStatus, StaffMember, ZoneStatus, AbsenceReason } from '../types';
import React, { useState } from 'react';
import { Search, UserPlus, X, RefreshCw, Lock, Trash2 } from 'lucide-react';

interface ReportTableProps {
  data: RouteRecord[];
  onUpdateRecord?: (id: string, field: keyof RouteRecord, value: any) => void;
  onDeleteRecord?: (id: string) => void;
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
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/5 pointer-events-none">
            <span className="text-[7px] font-black text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-200 uppercase">Cupo de 4 Lleno</span>
        </div>
    </td>
  );

  if (!staff) return (
    <td 
        onClick={onClick}
        className={`border border-slate-300 cursor-pointer hover:bg-indigo-100/50 transition-colors ${isSuplente ? 'bg-cyan-50/40 animate-pulse-subtle' : 'bg-slate-50/50'}`}
    >
        <div className="flex flex-col items-center justify-center h-full relative">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">ASIGNAR</span>
            {quotaInfo && isSuplente && <span className="text-[7px] font-black text-cyan-600/50 absolute bottom-1">{quotaInfo}</span>}
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
        className={`border border-slate-300 p-0 min-w-[150px] h-12 cursor-pointer group transition-all ${cellStyles.cell} hover:brightness-95`}
    >
      <div className="flex flex-col items-center justify-center h-full px-2 text-center overflow-hidden relative">
        <span className={`uppercase truncate w-full leading-tight font-black ${isDriver ? 'text-[10px]' : 'text-[9px]'}`}>
          {staff.name}
        </span>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${
            (isAbsent || isReserva || isSuplente) ? 'bg-black/20 text-white' : 'bg-slate-100 text-slate-400'
          }`}>
            LEG: {staff.id}
          </span>
          {isAbsent && (
            <span className={`text-[8px] font-black uppercase bg-white px-2 py-0.5 rounded shadow-sm border border-black/5 ${cellStyles.label}`}>
              {staff.address || 'F'}
            </span>
          )}
          {isReserva && (
            <span className="text-[8px] font-black uppercase bg-white px-2 py-0.5 rounded shadow-sm border border-black/5 text-indigo-700">
              RES
            </span>
          )}
          {isSuplente && !isAbsent && !isReserva && (
            <span className="text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded text-white border border-white/10">
              SUPL
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ data, onUpdateRecord, onDeleteRecord, activeShiftLabel, staffList = [] }) => {
  const [pickerState, setPickerState] = useState<{ id: string, field: keyof RouteRecord, role: string } | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');

  const shifts = ['MAÑANA', 'TARDE', 'NOCHE'] as const;
  const isShowingAll = activeShiftLabel?.includes('TODOS');

  const handleSelectStaff = (staff: StaffMember | null) => {
    if (pickerState && onUpdateRecord) {
        onUpdateRecord(pickerState.id, pickerState.field, staff);
    }
    setPickerState(null);
    setPickerSearch('');
  };

  const filteredStaffForPicker = staffList.filter(s => {
    if (s.status === StaffStatus.ABSENT) return false;
    const matchesSearch = s.name.toLowerCase().includes(pickerSearch.toLowerCase()) || s.id.includes(pickerSearch);
    const matchesRole = pickerState?.role.includes('CHOFER') ? s.role === 'CHOFER' : s.role === 'AUXILIAR';
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (a.status === StaffStatus.RESERVA && b.status !== StaffStatus.RESERVA) return -1;
    if (a.status !== StaffStatus.RESERVA && b.status === StaffStatus.RESERVA) return 1;
    return a.name.localeCompare(b.name);
  });

  const renderRow = (r: RouteRecord, idx: number) => {
    const isSpecial = r.zone.includes('AMBIENTE') || r.zone.includes('CARGA LATERAL');
    
    // Lógica de "Máximo 4 Auxiliares Activos"
    const titulares = [r.aux1, r.aux2, r.aux3, r.aux4];
    const activosTitularesCount = titulares.filter(a => a !== null && a.status !== StaffStatus.ABSENT).length;
    
    // Suplentes actuales cargados
    const suplente1Cargado = r.replacementAux1 !== null;
    const suplente2Cargado = r.replacementAux2 !== null;
    
    // Un suplente puede habilitarse si: Cupo (4) - Activos Titulares > Suplentes ya usados (sin contar este mismo slot)
    const canEnableSupl1 = (4 - activosTitularesCount) >= 1;
    const canEnableSupl2 = (4 - activosTitularesCount) >= (suplente1Cargado ? 2 : 1);
    
    const quotaInfo = `CUPO: ${activosTitularesCount}/4`;
    const canAssignReplDriver = r.driver?.status === StaffStatus.ABSENT;

    return (
      <tr key={r.id} className={`h-12 hover:bg-indigo-50/30 transition-colors group text-[9px] ${isSpecial ? 'bg-slate-50' : ''}`}>
        <td className={`sticky left-0 z-40 font-black border border-slate-300 text-center shadow-md uppercase text-[11px] ${isSpecial ? 'bg-slate-800 text-white' : 'bg-white text-indigo-700'}`}>
          {r.zone}
        </td>
        <td className="border border-slate-300 text-center font-black text-slate-800 bg-slate-50/30">
          <input type="text" value={r.internalId || ''} onChange={e => onUpdateRecord?.(r.id, 'internalId', e.target.value)} className="w-full h-full bg-transparent border-none text-center font-black outline-none" placeholder="-" />
        </td>
        <td className="border border-slate-300 text-center font-mono text-slate-500 uppercase font-bold tracking-tighter">
          <input type="text" value={r.domain || ''} onChange={e => onUpdateRecord?.(r.id, 'domain', e.target.value.toUpperCase())} className="w-full h-full bg-transparent border-none text-center font-black outline-none uppercase" placeholder="VACIO" />
        </td>
        <td className="border border-slate-300 text-center text-slate-400 font-medium italic">
          {r.reinforcement || '-'}
        </td>
        
        {/* TITULARES (MAX 4) */}
        <StaffCell staff={r.driver} role="CHOFER" onClick={() => setPickerState({ id: r.id, field: 'driver', role: 'CHOFER' })} />
        <StaffCell staff={r.aux1} role="AUXILIAR" onClick={() => setPickerState({ id: r.id, field: 'aux1', role: 'AUXILIAR' })} />
        <StaffCell staff={r.aux2} role="AUXILIAR" onClick={() => setPickerState({ id: r.id, field: 'aux2', role: 'AUXILIAR' })} />
        <StaffCell staff={r.aux3} role="AUXILIAR" onClick={() => setPickerState({ id: r.id, field: 'aux3', role: 'AUXILIAR' })} />
        <StaffCell staff={r.aux4} role="AUXILIAR" onClick={() => setPickerState({ id: r.id, field: 'aux4', role: 'AUXILIAR' })} />

        {/* SUPLENTES CON LÓGICA DE CUPO DE 4 */}
        <StaffCell 
            staff={r.replacementDriver} 
            role="CHOFER" 
            isSuplente 
            isDisabled={!canAssignReplDriver}
            onClick={() => canAssignReplDriver && setPickerState({ id: r.id, field: 'replacementDriver', role: 'CHOFER' })} 
        />
        <StaffCell 
            staff={r.replacementAux1} 
            role="AUXILIAR" 
            isSuplente 
            quotaInfo={quotaInfo}
            isDisabled={!canEnableSupl1 && !suplente1Cargado}
            onClick={() => (canEnableSupl1 || suplente1Cargado) && setPickerState({ id: r.id, field: 'replacementAux1', role: 'AUXILIAR' })} 
        />
        <StaffCell 
            staff={r.replacementAux2} 
            role="AUXILIAR" 
            isSuplente 
            quotaInfo={quotaInfo}
            isDisabled={!canEnableSupl2 && !suplente2Cargado}
            onClick={() => (canEnableSupl2 || suplente2Cargado) && setPickerState({ id: r.id, field: 'replacementAux2', role: 'AUXILIAR' })} 
        />

        <td className="border border-slate-300 bg-white px-2">
          <select value={r.zoneStatus} onChange={e => onUpdateRecord?.(r.id, 'zoneStatus', e.target.value as any)} className={`w-full bg-transparent border-none outline-none text-[9px] font-black uppercase text-center cursor-pointer ${r.zoneStatus === ZoneStatus.COMPLETE ? 'text-emerald-600' : r.zoneStatus === ZoneStatus.INCOMPLETE ? 'text-red-600 font-black' : 'text-slate-400'}`}>
            <option value={ZoneStatus.PENDING}>PENDIENTE</option>
            <option value={ZoneStatus.COMPLETE}>COMPLETA</option>
            <option value={ZoneStatus.INCOMPLETE}>INCOMPLETA</option>
          </select>
        </td>
        <td className="border border-slate-300 bg-white px-4">
          <input type="text" value={r.supervisionReport || ''} onChange={e => onUpdateRecord?.(r.id, 'supervisionReport', e.target.value.toUpperCase())} placeholder="CARGAR NOVEDAD..." className="w-full h-full bg-transparent outline-none text-[10px] text-slate-600 font-bold placeholder:text-slate-200 uppercase" />
        </td>
        <td className="border border-slate-300 text-center font-bold text-slate-500 bg-slate-50/10">
          <input type="text" value={r.departureTime || ''} onChange={e => onUpdateRecord?.(r.id, 'departureTime', e.target.value)} placeholder="00:00" className="w-full h-full bg-transparent border-none text-center outline-none font-mono font-bold" />
        </td>
        <td className="border border-slate-300 text-center font-bold text-slate-400 italic">
          <input type="text" value={r.dumpTime || ''} onChange={e => onUpdateRecord?.(r.id, 'dumpTime', e.target.value)} placeholder="00:00" className="w-full h-full bg-transparent border-none text-center outline-none font-mono" />
        </td>
        <td className="border border-slate-300 text-center font-black text-indigo-600 bg-indigo-50/20">
          <input type="text" value={r.tonnage || ''} onChange={e => onUpdateRecord?.(r.id, 'tonnage', e.target.value)} placeholder="0.00" className="w-full h-full bg-transparent border-none text-center outline-none font-black text-indigo-700" />
        </td>
        <td className="sticky right-0 z-40 bg-slate-50 border border-slate-300 text-center shadow-sm">
           <div className="flex items-center justify-center gap-1">
             <span className="text-slate-400 font-black text-[9px] mr-1">{idx + 1}</span>
             <button 
                onClick={(e) => { e.stopPropagation(); onDeleteRecord?.(r.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                title="Eliminar Ruta"
             >
                <Trash2 size={14} />
             </button>
           </div>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      {/* PICKER MODAL */}
      {pickerState && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black uppercase tracking-tight">Seleccionar {pickerState.role}</h3>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest mt-1 opacity-60">Personal disponible en este turno</p>
                    </div>
                    <button onClick={() => setPickerState(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
                </div>
                <div className="p-6">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        <input 
                            autoFocus
                            type="text" 
                            placeholder="BUSCAR POR NOMBRE O LEGAJO..." 
                            value={pickerSearch}
                            onChange={e => setPickerSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        />
                    </div>
                    <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
                        <button 
                            onClick={() => handleSelectStaff(null)}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-slate-100 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-red-100"><X size={18} /></div>
                            <span className="text-[10px] font-black uppercase">Desasignar Puesto (Vaciar)</span>
                        </button>
                        {filteredStaffForPicker.map(s => (
                            <button 
                                key={s.id} 
                                onClick={() => handleSelectStaff(s)}
                                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${s.status === StaffStatus.RESERVA ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {s.name.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{s.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">LEG: {s.id} • {s.role}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {s.status === StaffStatus.RESERVA ? (
                                        <span className="text-[8px] font-black px-2 py-1 rounded bg-indigo-600 text-white uppercase">RESERVA</span>
                                    ) : s.assignedZone ? (
                                        <div className="text-right">
                                            <span className="text-[7px] font-black text-slate-400 uppercase block">ACTUALMENTE EN:</span>
                                            <span className="text-[9px] font-black text-indigo-600 uppercase underline">{s.assignedZone}</span>
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-black px-2 py-1 rounded bg-emerald-500 text-white uppercase">LIBRE</span>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}

      <div className="px-6 py-3 bg-slate-800 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] italic">{activeShiftLabel || 'PARTE DIARIO DE OPERACIONES'}</h2>
            <div className="h-4 w-px bg-slate-600"></div>
            <div className="flex gap-2">
                <span className="text-[8px] px-2 py-0.5 rounded bg-indigo-600 text-white font-black shadow-sm">RESERVA</span>
                <span className="text-[8px] px-2 py-0.5 rounded bg-cyan-600 text-white font-black shadow-sm italic">SUPLENTE</span>
            </div>
        </div>
        <div className="flex gap-4 text-[9px] font-bold">
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> COMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.COMPLETE).length}</span>
          <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div> INCOMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.INCOMPLETE).length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <style>{`
            @keyframes pulse-subtle {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }
            .animate-pulse-subtle {
                animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
        `}</style>
        <table className="border-collapse text-[10px] w-full min-w-[3200px] table-fixed">
          <thead className="sticky top-0 z-50 bg-slate-100 text-slate-600 font-black uppercase text-[9px] border-b-2 border-slate-300 shadow-sm">
            <tr className="h-12">
              <th className="sticky left-0 bg-slate-100 border border-slate-300 px-2 w-28 z-50">ZONA</th>
              <th className="border border-slate-300 w-20 text-center">INTERNO</th>
              <th className="border border-slate-300 w-28 text-center">PATENTE</th>
              <th className="border border-slate-300 w-20 text-center">REF.</th>
              <th className="border border-slate-300 w-56 text-left px-4">CHOFER TITULAR</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR I</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR II</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR III</th>
              <th className="border border-slate-300 w-48 text-center">AUXILIAR IV</th>
              <th className="border border-slate-300 w-56 text-left px-4 bg-cyan-50/50">CHOFER SUPLENTE</th>
              <th className="border border-slate-300 w-48 text-center bg-cyan-50/50">AUX SUPLENTE I</th>
              <th className="border border-slate-300 w-48 text-center bg-cyan-50/50">AUX SUPLENTE II</th>
              <th className="border border-slate-300 w-36 text-center">ESTADO RUTA</th>
              <th className="border border-slate-300 w-[500px] text-left px-4">NOVEDADES / OBSERVACIONES</th>
              <th className="border border-slate-300 w-24 text-center bg-slate-200/50">SALIDA</th>
              <th className="border border-slate-300 w-24 text-center bg-slate-200/50">REGRESO</th>
              <th className="border border-slate-300 w-24 text-center bg-indigo-100/30 font-black">TN</th>
              <th className="sticky right-0 w-20 bg-slate-100 border border-slate-300 text-center">#</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isShowingAll ? (
              shifts.map(shiftName => {
                const shiftData = data.filter(r => r.shift === shiftName);
                if (shiftData.length === 0) return null;
                return (
                  <React.Fragment key={shiftName}>
                    <tr className="h-10 bg-slate-700 text-white">
                      <td colSpan={18} className="px-6 border border-slate-600">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black tracking-[0.3em] italic">TURNO {shiftName}</span>
                          <div className="flex-1 h-px bg-white/20"></div>
                        </div>
                      </td>
                    </tr>
                    {shiftData.map((r, idx) => renderRow(r, idx))}
                  </React.Fragment>
                );
              })
            ) : (
              data.map((r, idx) => renderRow(r, idx))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
