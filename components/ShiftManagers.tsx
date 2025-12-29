
import React from 'react';
import { ShiftMetadata, StaffMember, StaffStatus } from '../types';
import { User, Shield, AlertCircle } from 'lucide-react';

interface ComponentProps {
  shift: string;
  data: ShiftMetadata;
  staffList: StaffMember[];
  onOpenPicker: (field: keyof ShiftMetadata, role: string) => void;
}

export const ShiftManagersTop: React.FC<ComponentProps> = ({ data, staffList, onOpenPicker }) => {
  const getStaffStatus = (name: string) => {
    if (!name) return null;
    return staffList.find(s => s.name === name);
  };

  const supervisorStaff = getStaffStatus(data.supervisor);
  const subSupervisorStaff = getStaffStatus(data.subSupervisor);

  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 items-center">
      <div className="flex gap-4 flex-1 w-full">
        {/* ENCARGADO */}
        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Encargado de Turno</label>
          <button 
            onClick={() => onOpenPicker('supervisor', 'ENCARGADO')}
            className={`w-full flex items-center justify-between px-6 py-3 border rounded-2xl text-[11px] font-black transition-all uppercase text-left shadow-sm group ${
                supervisorStaff?.status === StaffStatus.ABSENT 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-indigo-500'
            }`}
          >
            <div className="flex items-center gap-3">
                <User className={`w-4 h-4 ${supervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-500' : 'text-indigo-400'} group-hover:scale-110 transition-transform`} />
                <span className={data.supervisor ? 'truncate' : 'text-slate-300'}>
                {data.supervisor || 'ASIGNAR ENCARGADO'}
                </span>
            </div>
            {supervisorStaff?.status === StaffStatus.ABSENT && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white px-2 py-0.5 rounded-lg animate-pulse">
                    <AlertCircle size={10} />
                    <span className="text-[8px]">AUSENTE</span>
                </div>
            )}
          </button>
        </div>

        {/* SUBENCARGADO */}
        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Subencargado</label>
          <button 
            onClick={() => onOpenPicker('subSupervisor', 'SUBENCARGADO')}
            className={`w-full flex items-center justify-between px-6 py-3 border rounded-2xl text-[11px] font-black transition-all uppercase text-left shadow-sm group ${
                subSupervisorStaff?.status === StaffStatus.ABSENT 
                ? 'bg-red-50 border-red-200 text-red-600' 
                : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-indigo-500'
            }`}
          >
            <div className="flex items-center gap-3">
                <Shield className={`w-4 h-4 ${subSupervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-500' : 'text-indigo-400'} group-hover:scale-110 transition-transform`} />
                <span className={data.subSupervisor ? 'truncate' : 'text-slate-300'}>
                {data.subSupervisor || 'ASIGNAR SUBENCARGADO'}
                </span>
            </div>
            {subSupervisorStaff?.status === StaffStatus.ABSENT && (
                <div className="flex items-center gap-1.5 bg-red-600 text-white px-2 py-0.5 rounded-lg animate-pulse">
                    <AlertCircle size={10} />
                    <span className="text-[8px]">AUSENTE</span>
                </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
