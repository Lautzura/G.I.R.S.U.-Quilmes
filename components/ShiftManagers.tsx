
import React from 'react';
import { ShiftMetadata } from '../types';
import { User, Shield } from 'lucide-react';

interface ComponentProps {
  shift: string;
  data: ShiftMetadata;
  onOpenPicker: (field: keyof ShiftMetadata, role: string) => void;
}

export const ShiftManagersTop: React.FC<ComponentProps> = ({ data, onOpenPicker }) => {
  return (
    <div className="flex flex-col xl:flex-row gap-6 flex-1 items-center">
      <div className="flex gap-4 flex-1 w-full">
        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Encargado de Turno</label>
          <button 
            onClick={() => onOpenPicker('supervisor', 'ENCARGADO')}
            className="w-full flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 hover:bg-white hover:border-indigo-500 transition-all uppercase text-left shadow-sm group"
          >
            <User className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className={data.supervisor ? 'text-slate-800' : 'text-slate-300'}>
              {data.supervisor || 'ASIGNAR ENCARGADO'}
            </span>
          </button>
        </div>

        <div className="flex-1">
          <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase tracking-widest ml-1">Subencargado</label>
          <button 
            onClick={() => onOpenPicker('subSupervisor', 'SUBENCARGADO')}
            className="w-full flex items-center gap-3 px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-800 hover:bg-white hover:border-indigo-500 transition-all uppercase text-left shadow-sm group"
          >
            <Shield className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
            <span className={data.subSupervisor ? 'text-slate-800' : 'text-slate-300'}>
              {data.subSupervisor || 'ASIGNAR SUBENCARGADO'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
