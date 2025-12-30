
import React, { useState, useMemo } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason } from '../types';
import { Search, UserPlus, Trash2, Edit3, AlertCircle, Users, CheckCircle, UserMinus, Info, Star } from 'lucide-react';
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
  searchTerm: string; // Recibe el término de búsqueda como prop
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onRemoveStaff, onUpdateStaff, onAddStaff, selectedShift, records, searchTerm }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  
  const displayedStaff = useMemo(() => {
    return staffList.filter(s => {
      const matchesShift = selectedShift === 'TODOS' || s.preferredShift === selectedShift;
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.includes(searchTerm);
      return matchesShift && matchesSearch;
    });
  }, [staffList, selectedShift, searchTerm]);

  const stats = useMemo(() => {
    const shiftStaff = staffList.filter(s => selectedShift === 'TODOS' || s.preferredShift === selectedShift);
    const breakdown: { [key: string]: number } = {};
    shiftStaff.forEach(s => {
      if (s.status === StaffStatus.ABSENT && s.address) {
        breakdown[s.address] = (breakdown[s.address] || 0) + 1;
      }
    });
    return { total: shiftStaff.length, operativos: shiftStaff.filter(s => s.status === StaffStatus.PRESENT).length, reserva: shiftStaff.filter(s => s.status === StaffStatus.RESERVA).length, faltas: shiftStaff.filter(s => s.status === StaffStatus.ABSENT).length, breakdown };
  }, [staffList, selectedShift]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><Users size={24} /></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p><h3 className="text-2xl font-black text-slate-800 leading-none mt-1">{stats.total}</h3></div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all border-l-4 border-l-emerald-500">
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><CheckCircle size={24} /></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Presentes</p><h3 className="text-2xl font-black text-emerald-600 leading-none mt-1">{stats.operativos}</h3></div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all border-l-4 border-l-amber-500">
          <div className="bg-amber-50 p-3 rounded-2xl text-amber-600"><Star size={24} className="fill-amber-600" /></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reserva</p><h3 className="text-2xl font-black text-amber-600 leading-none mt-1">{stats.reserva}</h3></div>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md transition-all border-l-4 border-l-red-500">
          <div className="bg-red-50 p-3 rounded-2xl text-red-600"><UserMinus size={24} /></div>
          <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faltas</p><h3 className="text-2xl font-black text-red-600 leading-none mt-1">{stats.faltas}</h3></div>
        </div>
      </div>

      {stats.faltas > 0 && !searchTerm && (
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Info size={14} className="text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Novedades Turno {selectedShift}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.breakdown).map(([reason, count]) => (
              <div key={reason} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase shadow-sm ${getAbsenceStyles(reason)}`}>
                <span>{reason}</span>
                <span className="bg-white/50 w-5 h-5 flex items-center justify-center rounded-lg text-[11px] border border-black/5">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic leading-none">Padrón {selectedShift}</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            {searchTerm ? `Resultados para "${searchTerm}": ${displayedStaff.length}` : `Total ${displayedStaff.length} colaboradores habilitados`}
          </p>
        </div>
        
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"><UserPlus size={16} /> Nuevo Ingreso</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1b2e] text-white h-14 text-[9px] uppercase font-black tracking-widest">
              <tr>
                <th className="pl-8">Colaborador / Legajo</th>
                <th className="text-center">Rol</th>
                <th className="text-center">Turno Hab.</th>
                <th className="text-center">Zona</th>
                <th className="text-center">Estado / Novedad</th>
                <th className="pr-8 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map(s => (
                <tr key={s.id} className="h-20 hover:bg-slate-50/80 transition-colors group">
                  <td className="pl-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${s.status === StaffStatus.ABSENT ? 'bg-red-50 text-red-600' : s.status === StaffStatus.RESERVA ? 'bg-amber-50 text-amber-600' : 'bg-indigo-50 text-indigo-600'}`}>{s.name.charAt(0)}</div>
                      <div><p className="font-black text-slate-800 text-xs uppercase leading-tight">{s.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">LEGAJO: {s.id}</p></div>
                    </div>
                  </td>
                  <td className="text-center"><span className="text-[8px] font-black px-2 py-1 bg-slate-100 rounded-lg text-slate-500 uppercase tracking-tighter inline-block min-w-[80px]">{s.role || 'SIN ROL'}</span></td>
                  <td className="text-center"><span className="text-[9px] font-black text-slate-400 uppercase">{s.preferredShift || 'MAÑANA'}</span></td>
                  <td className="text-center"><p className="font-black text-indigo-600 text-[9px] uppercase bg-indigo-50 px-3 py-1 rounded-lg inline-block border border-indigo-100">{s.assignedZone || 'BASE'}</p></td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-1">
                      {s.status === StaffStatus.ABSENT ? (
                        <div className={`flex flex-col p-1.5 rounded-xl border-2 shadow-sm ${getAbsenceStyles(s.address || '')}`}>
                            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase"><AlertCircle size={12} className="shrink-0" /><span>{s.address || 'FALTA'}</span></div>
                        </div>
                      ) : (
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase border-2 ${s.status === StaffStatus.RESERVA ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{s.status}</span>
                      )}
                    </div>
                  </td>
                  <td className="pr-8 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditingStaff(s)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Edit3 size={16} /></button>
                      <button onClick={() => onRemoveStaff(s.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-slate-100"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Search size={40} className="mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No se encontraron resultados para "{searchTerm}"</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddStaffModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={onAddStaff} />
      {editingStaff && <EditStaffModal isOpen={true} staff={editingStaff} onClose={() => setEditingStaff(null)} onSave={onUpdateStaff} allRecords={records} />}
    </div>
  );
};
