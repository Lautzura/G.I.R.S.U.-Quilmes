
import React, { useState, useMemo } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason } from '../types';
import { Search, UserPlus, Trash2, Edit3, AlertCircle, Users, CheckCircle, UserMinus, Info, Star, ArrowUpDown, ArrowUp, ArrowDown, LayoutList } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { getAbsenceStyles } from '../App';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (member: StaffMember) => void;
  onRemoveStaff: (id: string) => void;
  onUpdateStaff: (member: StaffMember) => void;
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

  const handleConfirmRemove = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${name}? Esto quitará su asignación de todas las rutas pero NO borrará las rutas.`)) {
      onRemoveStaff(id);
    }
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
    return { 
      total: shiftStaff.length, 
      operativos: shiftStaff.filter(s => s.status === StaffStatus.PRESENT).length, 
      reserva: shiftStaff.filter(s => s.status === StaffStatus.RESERVA).length, 
      faltas: shiftStaff.filter(s => s.status === StaffStatus.ABSENT).length 
    };
  }, [staffList, selectedShift]);

  const SortButton = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
    <button 
      onClick={() => handleSort(sortKey)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
        sortConfig.key === sortKey ? 'bg-indigo-600 text-white border-indigo-600 shadow-md italic' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'
      }`}
    >
      {label}
      {sortConfig.key === sortKey ? (
        sortConfig.direction === 'asc' ? <ArrowUp size={12} strokeWidth={3} /> : <ArrowDown size={12} strokeWidth={3} />
      ) : <ArrowUpDown size={12} className="opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard icon={<Users />} label="Total" val={stats.total} color="bg-indigo-50 text-indigo-600" />
        <StatCard icon={<CheckCircle />} label="Presentes" val={stats.operativos} color="bg-emerald-50 text-emerald-600" border="border-emerald-500" />
        <StatCard icon={<Star />} label="Reserva" val={stats.reserva} color="bg-amber-50 text-amber-600" border="border-amber-500" fill />
        <StatCard icon={<UserMinus />} label="Faltas" val={stats.faltas} color="bg-red-50 text-red-600" border="border-red-500" />
      </div>

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="bg-slate-900 text-white p-2 rounded-xl"><LayoutList size={20} /></div>
             <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic leading-none">Gestión de Personal</h2>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border">Ordenar listado por:</span>
             <div className="flex gap-2">
                <SortButton label="Nombre" sortKey="name" />
                <SortButton label="Legajo" sortKey="id" />
                <SortButton label="Rol" sortKey="role" />
             </div>
          </div>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="w-full lg:w-auto flex items-center justify-center gap-3 px-8 py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95">
          <UserPlus size={20} /> Nuevo Ingreso
        </button>
      </div>

      <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1b2e] text-white h-16 text-[10px] uppercase font-black tracking-widest">
              <tr>
                <th className="pl-10">Operario / Legajo</th>
                <th className="text-center">Rol Operativo</th>
                <th className="text-center">Turno Hab.</th>
                <th className="text-center">Zona Actual</th>
                <th className="text-center">Asistencia</th>
                <th className="pr-10 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map(s => (
                <tr key={s.id} className="h-24 hover:bg-slate-50 transition-colors group">
                  <td className="pl-10">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner transition-transform group-hover:scale-110 ${s.status === StaffStatus.ABSENT ? 'bg-red-50 text-red-600' : s.status === StaffStatus.RESERVA ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{s.name.charAt(0)}</div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase leading-none tracking-tight">{s.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 bg-slate-100 px-2 py-0.5 rounded inline-block">LEG: {s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="text-[9px] font-black px-4 py-1.5 bg-slate-100 rounded-xl text-slate-500 uppercase tracking-tighter inline-block shadow-sm">{s.role || 'SIN ROL'}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase italic">{s.preferredShift || 'MAÑANA'}</span>
                  </td>
                  <td className="text-center">
                    <p className="font-black text-indigo-600 text-[10px] uppercase bg-indigo-50 px-4 py-1.5 rounded-xl inline-block border-2 border-indigo-100 shadow-sm">{s.assignedZone || 'BASE'}</p>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center">
                      {s.status === StaffStatus.ABSENT ? (
                        <div className={`flex flex-col p-2 rounded-2xl border-2 shadow-sm ${getAbsenceStyles(s.address || '')}`}>
                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase"><AlertCircle size={14} className="shrink-0" /><span>{s.address || 'FALTA'}</span></div>
                        </div>
                      ) : (
                        <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase border-2 shadow-sm ${s.status === StaffStatus.RESERVA ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{s.status}</span>
                      )}
                    </div>
                  </td>
                  <td className="pr-10 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => setEditingStaff(s)} title="Editar Ficha" className="p-3 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm border border-indigo-100"><Edit3 size={18} /></button>
                      <button onClick={() => handleConfirmRemove(s.id, s.name)} title="Eliminar del Padrón" className="p-3 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-sm border border-red-100"><Trash2 size={18} /></button>
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

const StatCard = ({ icon, label, val, color, border = "", fill = false }: any) => (
  <div className={`bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all ${border ? `border-l-8 ${border}` : ''}`}>
    <div className={`${color} p-4 rounded-3xl transition-transform group-hover:scale-110`}>
      {React.cloneElement(icon, { size: 28, className: fill ? 'fill-current' : '' })}
    </div>
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
      <h3 className="text-3xl font-black text-slate-800 leading-none">{val}</h3>
    </div>
  </div>
);
