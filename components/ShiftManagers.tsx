
import React from 'react';
import { ShiftMetadata, StaffMember, StaffStatus } from '../types';
import { User, Shield, CheckCircle2 } from 'lucide-react';
import { getAbsenceStyles } from '../App';

interface ComponentProps {
  shift: string;
  data: ShiftMetadata;
  staffList: StaffMember[];
  onOpenPicker: (field: keyof ShiftMetadata, role: string) => void;
  onUpdateStaff: (staff: StaffMember) => void;
}

const ManagerSlot: React.FC<{
  label: string;
  name: string;
  staff: StaffMember | null | undefined;
  icon: React.ReactNode;
  onOpen: () => void;
  onMarkPresent: (staff: StaffMember) => void;
}> = ({ label, name, staff, icon, onOpen, onMarkPresent }) => {
  const isAbsent = staff?.status === StaffStatus.ABSENT;
  const absenceStyle = isAbsent ? getAbsenceStyles(staff.address || 'FALTA') : '';

  return (
    <div className={`flex-1 flex items-center gap-2 border rounded-lg px-3 py-1.5 transition-all group/slot relative ${isAbsent ? `${absenceStyle}` : 'bg-slate-50 border-slate-200 hover:bg-white'}`}>
      <span className={`text-[7px] font-black uppercase tracking-widest ${isAbsent ? 'text-current opacity-70' : 'text-slate-400'}`}>{label}:</span>
      <button 
        onClick={onOpen}
        className={`flex-1 flex items-center justify-between text-[9px] font-black uppercase truncate ${
            isAbsent ? 'text-current' : 'text-slate-800'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
            {React.cloneElement(icon as React.ReactElement<any>, { 
                className: `${isAbsent ? 'text-current' : 'text-indigo-500'}` 
            })}
            <span className="truncate">{name || 'ASIGNAR'}</span>
            {isAbsent && <span className="text-[7px] font-black bg-white/40 px-1 rounded ml-1">{staff.address || 'FALTA'}</span>}
        </div>
      </button>

      {isAbsent && staff && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onMarkPresent({ 
                ...staff, 
                status: StaffStatus.PRESENT, 
                address: '',
                absenceStartDate: undefined,
                absenceReturnDate: undefined,
                isIndefiniteAbsence: false
            });
          }}
          className="bg-emerald-500 text-white p-1 rounded-md opacity-0 group-hover/slot:opacity-100 transition-opacity shadow-lg z-10 hover:bg-emerald-600 ml-1"
          title="Marcar como Presente"
        >
          <CheckCircle2 size={12} />
        </button>
      )}
    </div>
  );
};

export const ShiftManagersTop: React.FC<ComponentProps> = ({ data, staffList, onOpenPicker, onUpdateStaff }) => {
  const getStaffStatus = (name: string) => {
    if (!name) return null;
    return staffList.find(s => s.name === name);
  };

  const supervisorStaff = getStaffStatus(data?.supervisor || '');
  const subSupervisorStaff = getStaffStatus(data?.subSupervisor || '');

  return (
    <div className="flex items-center gap-2 flex-1 min-w-[300px]">
      <ManagerSlot 
        label="Enc"
        name={data?.supervisor || ''}
        staff={supervisorStaff}
        icon={<User size={10} />}
        onOpen={() => onOpenPicker('supervisor', 'ENCARGADO')}
        onMarkPresent={onUpdateStaff}
      />
      <ManagerSlot 
        label="Sub"
        name={data?.subSupervisor || ''}
        staff={subSupervisorStaff}
        icon={<Shield size={10} />}
        onOpen={() => onOpenPicker('subSupervisor', 'SUBENCARGADO')}
        onMarkPresent={onUpdateStaff}
      />
    </div>
  );
};
