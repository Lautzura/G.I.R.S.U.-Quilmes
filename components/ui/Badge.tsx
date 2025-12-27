
import React from 'react';
import { ZoneStatus } from '../../types';

interface BadgeProps {
  status: ZoneStatus | string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  if (status === ZoneStatus.INCOMPLETE) {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black bg-red-50 text-red-600 border border-red-200 shadow-sm uppercase tracking-wider">
        Incompleta
      </span>
    );
  }
  if (status === ZoneStatus.COMPLETE || status === 'Completa') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-sm uppercase tracking-wider">
        Completa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black bg-slate-50 text-slate-500 border border-slate-200 shadow-sm uppercase tracking-wider">
      {status}
    </span>
  );
};
