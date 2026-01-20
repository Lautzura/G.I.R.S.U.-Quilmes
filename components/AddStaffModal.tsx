
import React, { useState } from 'react';
import { X, UserPlus, User, UserRound } from 'lucide-react';
import { StaffMember, StaffStatus } from '../types';

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: StaffMember) => void;
}

export const AddStaffModal: React.FC<AddStaffModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    gender: 'MASCULINO' as 'MASCULINO' | 'FEMENINO',
    role: 'AUXILIAR' as StaffMember['role'],
    preferredShift: 'MAÑANA' as 'MAÑANA' | 'TARDE' | 'NOCHE'
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id || !formData.name) return;
    
    onSave({
      id: formData.id,
      name: formData.name.toUpperCase(),
      status: StaffStatus.PRESENT,
      gender: formData.gender,
      role: formData.role,
      preferredShift: formData.preferredShift,
      assignedZone: 'BASE'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <UserPlus className="text-indigo-400" />
            <h3 className="text-lg font-black uppercase tracking-tight">Alta de Personal</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legajo / ID</label>
              <input 
                required
                type="text" 
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
                placeholder="EJ: 30455"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol Operativo</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="AUXILIAR">AUXILIAR</option>
                <option value="CHOFER">CHOFER</option>
                <option value="SUPERVISOR">SUPERVISOR</option>
                <option value="RESERVA">RESERVA</option>
                <option value="FRANQUERO">FRANQUERO</option>
                <option value="CARGA LATERAL">CARGA LATERAL</option>
                <option value="ENCARGADO">ENCARGADO</option>
                <option value="MAQUINISTA">MAQUINISTA</option>
                <option value="BALANCERO">BALANCERO</option>
                <option value="LONERO">LONERO</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="APELLIDO NOMBRE"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Género del Colaborador</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({...formData, gender: 'MASCULINO'})}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.gender === 'MASCULINO' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
              >
                <User size={14} /> MASCULINO
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, gender: 'FEMENINO'})}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all border ${formData.gender === 'FEMENINO' ? 'bg-pink-500 text-white border-pink-500 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
              >
                <UserRound size={14} /> FEMENINO
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno Habitual</label>
            <div className="grid grid-cols-3 gap-2">
              {(['MAÑANA', 'TARDE', 'NOCHE'] as const).map(shift => (
                <button
                  key={shift}
                  type="button"
                  onClick={() => setFormData({...formData, preferredShift: shift})}
                  className={`py-2 rounded-xl text-[10px] font-black transition-all border ${formData.preferredShift === shift ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 text-[11px] font-black uppercase text-white bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Guardar Colaborador</button>
          </div>
        </form>
      </div>
    </div>
  );
};
