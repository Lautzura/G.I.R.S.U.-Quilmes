
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Edit3, MapPin, AlertTriangle, Briefcase, Calendar, Infinity } from 'lucide-react';
import { StaffMember, StaffStatus, AbsenceReason, RouteRecord } from '../types';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: StaffMember) => void;
  staff: StaffMember;
  allRecords: RouteRecord[];
}

export const EditStaffModal: React.FC<EditStaffModalProps> = ({ isOpen, onClose, onSave, staff, allRecords }) => {
  const [formData, setFormData] = useState({
    id: staff.id,
    name: staff.name,
    role: (staff.role || 'AUXILIAR') as StaffMember['role'],
    gender: (staff.gender || 'MASCULINO') as 'MASCULINO' | 'FEMENINO',
    preferredShift: (staff.preferredShift || 'MAÑANA') as 'MAÑANA' | 'TARDE' | 'NOCHE',
    status: staff.status,
    assignedZone: staff.assignedZone || '',
    address: staff.address || '',
    absenceReturnDate: staff.absenceReturnDate || '',
    isIndefiniteAbsence: !!staff.isIndefiniteAbsence
  });

  const availableZones = useMemo(() => {
    const zones = allRecords
      .filter(r => r.shift === formData.preferredShift)
      .map(r => r.zone);
    return Array.from(new Set(['BASE', 'REFUERZO', 'TALLER', ...zones])).sort();
  }, [formData.preferredShift, allRecords]);

  useEffect(() => {
    setFormData({
      id: staff.id,
      name: staff.name,
      role: (staff.role || 'AUXILIAR') as StaffMember['role'],
      gender: (staff.gender || 'MASCULINO') as 'MASCULINO' | 'FEMENINO',
      preferredShift: (staff.preferredShift || 'MAÑANA') as 'MAÑANA' | 'TARDE' | 'NOCHE',
      status: staff.status,
      assignedZone: staff.assignedZone || '',
      address: staff.address || '',
      absenceReturnDate: staff.absenceReturnDate || '',
      isIndefiniteAbsence: !!staff.isIndefiniteAbsence
    });
  }, [staff]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...staff,
      id: formData.id,
      name: formData.name.toUpperCase(),
      role: formData.role,
      gender: formData.gender,
      preferredShift: formData.preferredShift,
      status: formData.status,
      assignedZone: formData.assignedZone,
      address: formData.status === StaffStatus.ABSENT ? formData.address : '',
      absenceReturnDate: formData.status === StaffStatus.ABSENT && !formData.isIndefiniteAbsence ? formData.absenceReturnDate : undefined,
      isIndefiniteAbsence: formData.status === StaffStatus.ABSENT ? formData.isIndefiniteAbsence : false
    });
    onClose();
  };

  const isLongTermAbsence = [
    AbsenceReason.ART, 
    AbsenceReason.VACACIONES, 
    AbsenceReason.LICENCIA_MEDICA, 
    AbsenceReason.SUSPENSION,
    AbsenceReason.MATERNIDAD,
    AbsenceReason.LICENCIA_GREMIAL,
    AbsenceReason.ASISTENCIA_FAMILIAR
  ].includes(formData.address as AbsenceReason);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
        <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-2 rounded-xl">
                <Edit3 size={24} className="text-indigo-400" />
            </div>
            <div>
                <h3 className="text-xl font-black uppercase tracking-tight leading-none">Editar Colaborador</h3>
                <p className="text-[10px] text-indigo-300 font-bold uppercase mt-1 tracking-widest opacity-60">Ficha técnica de personal</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legajo / ID</label>
              <input 
                required
                type="text" 
                value={formData.id}
                onChange={e => setFormData({...formData, id: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol Operativo</label>
              <select 
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all cursor-pointer"
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre y Apellido</label>
            <input 
              required
              type="text" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Género</label>
              <div className="flex gap-2">
                {(['MASCULINO', 'FEMENINO'] as const).map(g => (
                    <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({...formData, gender: g})}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all border ${formData.gender === g ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200'}`}
                    >
                        {g === 'MASCULINO' ? 'HOMBRE' : 'MUJER'}
                    </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno Pref.</label>
              <select 
                value={formData.preferredShift}
                onChange={e => setFormData({...formData, preferredShift: e.target.value as any})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
              >
                <option value="MAÑANA">MAÑANA</option>
                <option value="TARDE">TARDE</option>
                <option value="NOCHE">NOCHE</option>
              </select>
            </div>
          </div>

          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Briefcase size={12} className="text-slate-400" /> Asistencia
                    </label>
                    <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value as any})}
                    className={`w-full px-5 py-3.5 border-2 rounded-2xl text-xs font-black uppercase outline-none transition-all ${
                        formData.status === StaffStatus.ABSENT ? 'bg-red-50 border-red-100 text-red-600 focus:ring-red-500' : 
                        formData.status === StaffStatus.RESERVA ? 'bg-indigo-50 border-indigo-100 text-indigo-600 focus:ring-indigo-500' :
                        'bg-white border-slate-200 text-emerald-600 focus:ring-emerald-500'
                    }`}
                    >
                    <option value={StaffStatus.PRESENT}>PRESENTE</option>
                    <option value={StaffStatus.ABSENT}>FALTA</option>
                    <option value={StaffStatus.RESERVA}>RESERVA</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    Motivo de Falta
                    </label>
                    <select 
                    disabled={formData.status !== StaffStatus.ABSENT}
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                    <option value="">-- SELECCIONAR --</option>
                    {Object.values(AbsenceReason)
                        .filter(reason => {
                            if (formData.gender === 'MASCULINO') {
                                return reason !== AbsenceReason.DIA_FEMENINO && reason !== AbsenceReason.MATERNIDAD;
                            }
                            return true;
                        })
                        .map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                    </select>
                </div>
             </div>

             {/* GESTIÓN DE DURACIÓN POR CALENDARIO */}
             {formData.status === StaffStatus.ABSENT && isLongTermAbsence && (
                 <div className="pt-4 border-t border-slate-200 space-y-4 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                           <Calendar size={12} className="text-indigo-500" /> Fecha de reincorporación
                        </label>
                        <button 
                            type="button"
                            onClick={() => setFormData(p => ({...p, isIndefiniteAbsence: !p.isIndefiniteAbsence}))}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${formData.isIndefiniteAbsence ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                        >
                            <Infinity size={14} /> Indefinido
                        </button>
                    </div>

                    {!formData.isIndefiniteAbsence && (
                        <div className="space-y-2">
                            <input 
                                type="date" 
                                value={formData.absenceReturnDate} 
                                onChange={e => setFormData({...formData, absenceReturnDate: e.target.value})} 
                                className="w-full px-5 py-3.5 bg-white border border-indigo-100 rounded-2xl text-xs font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
                            />
                        </div>
                    )}
                 </div>
             )}
          </div>

          <div className="pt-4 flex gap-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase text-slate-400 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors">Cancelar</button>
            <button type="submit" className="flex-[2] py-4 text-[11px] font-black uppercase text-white bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-95">
              <Save size={18} /> Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
