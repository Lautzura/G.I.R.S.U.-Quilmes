
import { RouteRecord, StaffStatus, StaffMember, ZoneStatus } from '../types';
import React from 'react';
import { User } from 'lucide-react';

interface ReportTableProps {
  data: RouteRecord[];
  onUpdateRecord?: (id: string, field: keyof RouteRecord, value: any) => void;
  onOpenPicker: (id: string, field: string, role: string) => void;
  activeShiftLabel?: string;
}

const StaffCell: React.FC<{ 
    staff: StaffMember | null; 
    role: string; 
    isSuplente?: boolean;
    onClick?: () => void;
}> = ({ staff, role, isSuplente, onClick }) => {
  if (!staff) return (
    <td onClick={onClick} className={`border border-slate-200 cursor-pointer hover:bg-slate-50 ${isSuplente ? 'bg-indigo-50/20' : 'bg-white'}`}>
        <div className="flex flex-col items-center justify-center h-full opacity-30">
            <User size={12} className="text-slate-400" />
            <span className="text-[7px] font-black uppercase mt-1">{role}</span>
        </div>
    </td>
  );
  
  const isAbsent = staff.status === StaffStatus.ABSENT;
  
  return (
    <td onClick={onClick} className={`border border-slate-200 p-0 min-w-[130px] h-10 cursor-pointer transition-all ${isAbsent ? 'bg-red-50' : isSuplente ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-slate-50'}`}>
      <div className="flex flex-col items-center justify-center h-full px-1 text-center relative overflow-hidden">
        <span className={`uppercase truncate w-full font-black ${isAbsent ? 'text-red-600' : isSuplente ? 'text-white' : 'text-slate-800'} text-[9px]`}>
          {staff.name}
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[7px] font-bold px-1 py-0.2 rounded ${isAbsent ? 'bg-red-600 text-white' : isSuplente ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {staff.id}
          </span>
          {isAbsent && (
            <span className="text-[7px] font-black uppercase bg-red-600 text-white px-1 py-0 rounded">
              {staff.address || 'FALTA'}
            </span>
          )}
        </div>
      </div>
    </td>
  );
};

export const ReportTable: React.FC<ReportTableProps> = ({ data, onUpdateRecord, onOpenPicker, activeShiftLabel }) => {
  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="bg-[#1e1b2e] text-white px-6 py-2 flex justify-between items-center shrink-0">
        <span className="text-[9px] font-black uppercase tracking-widest">{activeShiftLabel}</span>
        <div className="flex gap-4 text-[8px] font-black uppercase">
          <span className="text-emerald-400">COMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.COMPLETE).length}</span>
          <span className="text-red-400">INCOMPLETAS: {data.filter(r => r.zoneStatus === ZoneStatus.INCOMPLETE).length}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white custom-scrollbar">
        <table className="border-collapse text-[9px] w-full min-w-[2800px] table-fixed">
          <thead className="sticky top-0 z-30 bg-slate-900 text-slate-400 font-black uppercase text-[7px] border-b shadow">
            <tr className="h-10">
              <th className="sticky left-0 bg-slate-900 px-3 w-32 z-40 text-white">ZONA</th>
              <th className="w-16 text-center">INT.</th>
              <th className="w-24 text-center">DOMINIO</th>
              <th className="w-16 text-center">REF.</th>
              <th className="w-44 text-center">TITULAR</th>
              <th className="w-44 text-center">AUX 1</th>
              <th className="w-44 text-center">AUX 2</th>
              <th className="w-44 text-center">AUX 3</th>
              <th className="w-44 text-center">AUX 4</th>
              <th className="w-44 text-center bg-indigo-900/40 text-indigo-100">SUPLENTE</th>
              <th className="w-44 text-center bg-indigo-900/40 text-indigo-100">AUX SUPL 1</th>
              <th className="w-44 text-center bg-indigo-900/40 text-indigo-100">AUX SUPL 2</th>
              <th className="w-28 text-center">ESTADO</th>
              <th className="w-[300px] text-left px-4">REPORTES</th>
              <th className="w-20 text-center">TN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((r) => (
              <tr key={r.id} className="h-10 hover:bg-slate-50 transition-colors">
                <td className="sticky left-0 z-20 font-black border-r text-center bg-slate-50 uppercase text-slate-900 px-2">{r.zone}</td>
                <td className="border border-slate-100"><input type="text" value={r.internalId || ''} onChange={e => onUpdateRecord?.(r.id, 'internalId', e.target.value)} className="w-full h-full bg-transparent text-center font-black outline-none" /></td>
                <td className="border border-slate-100"><input type="text" value={r.domain || ''} onChange={e => onUpdateRecord?.(r.id, 'domain', e.target.value.toUpperCase())} className="w-full h-full bg-transparent text-center font-bold outline-none" /></td>
                <td className="border border-slate-100 text-center text-[7px] bg-slate-50/20">{r.reinforcement || '-'}</td>
                
                <StaffCell staff={r.driver} role="CHOFER" onClick={() => onOpenPicker(r.id, 'driver', 'CHOFER')} />
                <StaffCell staff={r.aux1} role="AUX 1" onClick={() => onOpenPicker(r.id, 'aux1', 'AUXILIAR')} />
                <StaffCell staff={r.aux2} role="AUX 2" onClick={() => onOpenPicker(r.id, 'aux2', 'AUXILIAR')} />
                <StaffCell staff={r.aux3} role="AUX 3" onClick={() => onOpenPicker(r.id, 'aux3', 'AUXILIAR')} />
                <StaffCell staff={r.aux4} role="AUX 4" onClick={() => onOpenPicker(r.id, 'aux4', 'AUXILIAR')} />

                <StaffCell staff={r.replacementDriver} role="SUPLENTE" isSuplente onClick={() => onOpenPicker(r.id, 'replacementDriver', 'CHOFER')} />
                <StaffCell staff={r.replacementAux1} role="AUX SUPL 1" isSuplente onClick={() => onOpenPicker(r.id, 'replacementAux1', 'AUXILIAR')} />
                <StaffCell staff={r.replacementAux2} role="AUX SUPL 2" isSuplente onClick={() => onOpenPicker(r.id, 'replacementAux2', 'AUXILIAR')} />

                <td className="border border-slate-100">
                  <select value={r.zoneStatus} onChange={e => onUpdateRecord?.(r.id, 'zoneStatus', e.target.value as any)} className={`w-full bg-transparent border-none outline-none font-black text-[8px] text-center ${r.zoneStatus === ZoneStatus.COMPLETE ? 'text-emerald-600' : r.zoneStatus === ZoneStatus.INCOMPLETE ? 'text-red-600' : 'text-slate-400'}`}>
                    <option value={ZoneStatus.PENDING}>PENDIENTE</option><option value={ZoneStatus.COMPLETE}>COMPLETA</option><option value={ZoneStatus.INCOMPLETE}>INCOMPLETA</option>
                  </select>
                </td>
                <td className="border border-slate-100 px-2"><input type="text" value={r.supervisionReport || ''} onChange={e => onUpdateRecord?.(r.id, 'supervisionReport', e.target.value.toUpperCase())} className="w-full h-full bg-transparent outline-none text-[8px] font-bold" /></td>
                <td className="border border-slate-100"><input type="text" value={r.tonnage || ''} onChange={e => onUpdateRecord?.(r.id, 'tonnage', e.target.value)} className="w-full h-full bg-transparent text-center outline-none font-black text-[10px]" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
