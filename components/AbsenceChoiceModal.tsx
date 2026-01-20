
import React from 'react';
import { X, UserCheck, CalendarCheck, AlertTriangle } from 'lucide-react';
import { StaffMember } from '../types';

interface AbsenceChoiceModalProps {
  staff: StaffMember | null;
  onClose: () => void;
  onDecision: (decision: 'ONLY_TODAY' | 'DEFINITIVE') => void;
}

export const AbsenceChoiceModal: React.FC<AbsenceChoiceModalProps> = ({ staff, onClose, onDecision }) => {
  if (!staff) return null;

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <UserCheck size={24} />
            <h3 className="text-xl font-black uppercase tracking-tight">Confirmar Asistencia</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 mb-2">
                <CalendarCheck size={32} />
            </div>
            <h4 className="text-lg font-black uppercase text-slate-800">{staff.name}</h4>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Actualmente figura con falta: {staff.address}</p>
          </div>

          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="text-amber-600 shrink-0" size={18} />
            <p className="text-[10px] text-amber-700 font-bold uppercase leading-relaxed">
                Indique si el colaborador vino a trabajar hoy de forma excepcional o si debe removerse la falta definitivamente del legajo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-2">
            <button 
                onClick={() => onDecision('ONLY_TODAY')}
                className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black text-[11px] uppercase shadow-sm hover:bg-indigo-50 transition-all"
            >
              Solo por hoy (Excepción)
            </button>
            <button 
                onClick={() => onDecision('DEFINITIVE')}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase shadow-xl hover:bg-slate-800 transition-all"
            >
              Quitar falta definitivamente
            </button>
            <button 
                onClick={onClose}
                className="w-full py-3 text-slate-400 font-black text-[10px] uppercase hover:underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
