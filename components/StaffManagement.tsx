
import React, { useState, useMemo } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason, ZoneStatus } from '../types';
import { Search, UserPlus, Trash2, Edit3, AlertCircle, LayoutList, ArrowUp, ArrowDown, ArrowUpDown, Users, CheckCircle, Star, UserMinus, Info } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { getAbsenceStyles } from '../App';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (member: StaffMember) => void;
  onRemoveStaff: (id: string) => void;
  onUpdateStaff: (member: StaffMember, originalId?: string) => void;
  records: RouteRecord[];
  selectedShift: string;
  searchTerm: string; 
}

type SortKey = 'name' | 'id' | 'role';

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onRemoveStaff, onUpdateStaff, onAddStaff, selectedShift, records, searchTerm }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const displayedStaff = useMemo(() => {
    let filtered = staffList.filter(s => {
      const matchesShift = selectedShift === 'TODOS' || s.preferredShift === selectedShift;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesShift && matchesSearch;
    });

    return filtered.sort((a, b) => {
      const valA = (a[sortConfig.key] || '').toString().toUpperCase();
      const valB = (b[sortConfig.key] || '').toString().toUpperCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [staffList, selectedShift, searchTerm, sortConfig]);

  const stats = useMemo(() => {
    const shiftStaff = staffList.filter(s => selectedShift === 'TODOS' || s.preferredShift === selectedShift);
    
    // Calcular desglose de inasistencias
    const absenceBreakdown: Record<string, number> = {};
    shiftStaff.forEach(s => {
      if (s.status === StaffStatus.ABSENT) {
        const reason = s.address || 'OTRO / NO ESPECIFICADO';
        absenceBreakdown[reason] = (absenceBreakdown[reason] || 0) + 1;
      }
    });

    return { 
      total: shiftStaff.length, 
      presente: shiftStaff.filter(s => s.status === StaffStatus.PRESENT).length, 
      reserva: shiftStaff.filter(s => s.status === StaffStatus.RESERVA).length, 
      ausentes: shiftStaff.filter(s => s.status === StaffStatus.ABSENT).length,
      absenceBreakdown: Object.entries(absenceBreakdown).sort((a, b) => b[1] - a[1])
    };
  }, [staffList, selectedShift]);

  const SortButton = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
    <button 
      onClick={() => handleSort(sortKey)}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center gap-2 ${
        sortConfig.key === sortKey 
          ? 'bg-[#5850ec] text-white border-[#5850ec] shadow-lg shadow-indigo-100 italic' 
          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
      }`}
    >
      {label}
      {sortConfig.key === sortKey ? (
        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
      ) : <ArrowUpDown size={12} className="opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      
      {/* TARJETAS DE ESTADÍSTICAS (ESTILO IMAGEN) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="TOTAL" value={stats.total} icon={<Users size={28} />} color="indigo" />
        <StatCard label="PRESENTES" value={stats.presente} icon={<CheckCircle size={28} />} color="emerald" />
        <StatCard label="RESERVA" value={stats.reserva} icon={<Star size={28} />} color="amber" />
        <StatCard label="FALTAS" value={stats.ausentes} icon={<UserMinus size={28} />} color="red" />
      </div>

      {/* DESGLOSE DE INASISTENCIAS POR MOTIVO */}
      {stats.ausentes > 0 && (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 mb-6 px-4">
                <AlertCircle className="text-red-500" size={18} />
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Desglose por Motivo de Inasistencia</h3>
            </div>
            <div className="flex flex-wrap gap-4 px-4">
                {stats.absenceBreakdown.map(([reason, count]) => (
                    <div 
                        key={reason} 
                        className={`px-5 py-3 rounded-2xl border flex items-center gap-4 transition-all hover:scale-105 shadow-sm ${getAbsenceStyles(reason)}`}
                    >
                        <span className="text-[10px] font-black uppercase tracking-tight">{reason}</span>
                        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                            {count}
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* BARRA DE GESTIÓN (ESTILO IMAGEN) */}
      <div className="bg-white rounded-[3rem] p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex items-center gap-4">
                <div className="bg-[#111827] text-white p-3 rounded-2xl shadow-xl"><LayoutList size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">GESTIÓN DE PERSONAL</h2>
            </div>
            
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mr-2">ORDENAR LISTADO POR:</span>
                <SortButton label="NOMBRE" sortKey="name" />
                <SortButton label="LEGAJO" sortKey="id" />
                <SortButton label="ROL" sortKey="role" />
            </div>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)} 
          className="flex items-center gap-3 px-10 py-5 bg-[#5850ec] text-white rounded-[2rem] text-[11px] font-black uppercase shadow-2xl shadow-indigo-200 hover:brightness-110 transition-all active:scale-95"
        >
          <UserPlus size={18} /> NUEVO INGRESO
        </button>
      </div>

      {/* TABLA DE PERSONAL */}
      <div className="bg-white rounded-[3.5rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f8fafc] text-slate-400 h-16 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="pl-12">Colaborador</th>
                <th className="text-center">Rol Operativo</th>
                <th className="text-center">Turno Hab.</th>
                <th className="text-center">Asistencia</th>
                <th className="pr-12 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map(s => (
                <tr key={s.id} className="h-24 hover:bg-slate-50 transition-colors group">
                  <td className="pl-12">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${s.status === StaffStatus.ABSENT ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>{s.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800 text-[13px] uppercase leading-none tracking-tight">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-2">LEGAJO: {s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="text-[9px] font-black px-4 py-2 bg-slate-100 rounded-xl text-slate-500 uppercase tracking-tighter inline-block">{s.role || '---'}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase italic opacity-70">{s.preferredShift}</span>
                  </td>
                  <td className="text-center">
                    <div className="flex justify-center">
                      {s.status === StaffStatus.ABSENT ? (
                        <div className={`px-5 py-2 rounded-2xl border flex items-center gap-2 text-[9px] font-black uppercase ${getAbsenceStyles(s.address || '')}`}>
                            <AlertCircle size={12} /> {s.address || 'FALTA'}
                        </div>
                      ) : (
                        <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border ${s.status === StaffStatus.RESERVA ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{s.status}</span>
                      )}
                    </div>
                  </td>
                  <td className="pr-12 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingStaff(s)} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-indigo-50"><Edit3 size={18} /></button>
                      <button onClick={() => { if(window.confirm(`¿Eliminar a ${s.name} del padrón?`)) onRemoveStaff(s.id); }} className="p-3 text-red-400 hover:bg-red-50 rounded-2xl transition-all shadow-sm border border-red-50"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddStaffModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddStaff} />
      {editingStaff && <EditStaffModal isOpen={true} staff={editingStaff} onClose={() => setEditingStaff(null)} onSave={onUpdateStaff} allRecords={records} />}
    </div>
  );
};

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: 'indigo' | 'emerald' | 'amber' | 'red' }> = ({ label, value, icon, color }) => {
    const colors = {
        indigo: 'border-indigo-600 text-indigo-600 bg-indigo-50/50',
        emerald: 'border-emerald-500 text-emerald-600 bg-emerald-50/50',
        amber: 'border-amber-400 text-amber-600 bg-amber-50/50',
        red: 'border-red-500 text-red-600 bg-red-50/50'
    };

    return (
        <div className={`bg-white rounded-[2.5rem] p-8 flex items-center gap-6 shadow-sm border-l-[12px] ${colors[color]} border-t border-b border-r border-slate-100 transition-all hover:translate-y-[-4px] hover:shadow-xl`}>
            <div className={`p-4 rounded-full ${colors[color]} bg-white shadow-inner flex items-center justify-center shrink-0`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
                <p className="text-4xl font-black text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
};
