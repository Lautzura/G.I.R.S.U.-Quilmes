
import React from 'react';
import { ShiftMetadata } from '../types';
import { User, Shield } from 'lucide-react';

interface ComponentProps {
  shift: string;
  data: ShiftMetadata;
  onChange: (field: keyof ShiftMetadata, value: any) => void;
}

export const ShiftManagersTop: React.FC<ComponentProps> = ({ data, onChange }) => {
  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 items-center">
      {/* SECCIÓN ENCARGADOS */}
      <div className="flex gap-4 flex-1 w-full">
        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Encargado de Turno</label>
          <div className="relative">
            <User className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
            <input 
              type="text" 
              value={data.supervisor}
              onChange={(e) => onChange('supervisor', e.target.value.toUpperCase())}
              placeholder="NOMBRE DEL SUPERVISOR"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 placeholder-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all uppercase"
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Subencargado</label>
          <div className="relative">
            <Shield className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
            <input 
              type="text" 
              value={data.subSupervisor}
              onChange={(e) => onChange('subSupervisor', e.target.value.toUpperCase())}
              placeholder="NOMBRE DEL SUBENCARGADO"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 placeholder-slate-300 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all uppercase"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
