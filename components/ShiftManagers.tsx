
import React from 'react';
import { ShiftMetadata, StaffMember, StaffStatus } from '../types';
import { User, Shield } from 'lucide-react';

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
    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
      {/* ENCARGADO ULTRA COMPACTO */}
      <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-white transition-all">
        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Enc.:</span>
        <button 
          onClick={() => onOpenPicker('supervisor', 'ENCARGADO')}
          className={`flex-1 flex items-center justify-between text-[9px] font-black uppercase truncate ${
              supervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-600' : 'text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
              <User size={10} className={`${supervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-500' : 'text-indigo-500'}`} />
              <span className="truncate">{data.supervisor || 'ASIGNAR'}</span>
          </div>
        </button>
      </div>

      {/* SUBENCARGADO ULTRA COMPACTO */}
      <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-white transition-all">
        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Sub:</span>
        <button 
          onClick={() => onOpenPicker('subSupervisor', 'SUBENCARGADO')}
          className={`flex-1 flex items-center justify-between text-[9px] font-black uppercase truncate ${
              subSupervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-600' : 'text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
              <Shield size={10} className={`${subSupervisorStaff?.status === StaffStatus.ABSENT ? 'text-red-500' : 'text-indigo-500'}`} />
              <span className="truncate">{data.subSupervisor || 'ASIGNAR'}</span>
          </div>
        </button>
      </div>
    </div>
  );
};
