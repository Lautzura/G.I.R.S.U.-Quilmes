
import React, { useState, useMemo } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason } from '../types';
import { Search, UserPlus, Trash2, Edit3, AlertCircle, Users, CheckCircle, UserMinus, Info, Calendar, Infinity } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (member: StaffMember) => void;
  onRemoveStaff: (id: string) => void;
  onUpdateStaff: (member: StaffMember) => void;
  records: RouteRecord[];
  selectedShift: string;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onRemoveStaff, onUpdateStaff, onAddStaff, selectedShift, records }) => {
  const [searchTerm, setSearchTerm] = useState('');
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

    return {
      total: shiftStaff.length,
      operativos: shiftStaff.filter(s => s.status === StaffStatus.PRESENT || s.status === StaffStatus.RESERVA).length,
      faltas: shiftStaff.filter(s => s.status === StaffStatus.ABSENT).length,
      breakdown
    };
  }, [staffList, selectedShift]);

  const getAbsenceBadgeColor = (reason: string) => {
    switch (reason) {
      case AbsenceReason.FALTA_SIN_AVISO:
      case AbsenceReason.SUSPENSION:
        return 'bg-red-50 text-red-700 border-red-200';
      case AbsenceReason.ART:
      case AbsenceReason.FALTA_CON_AVISO:
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case AbsenceReason.VACACIONES:
      case AbsenceReason.DIA_ESTUDIANTIL:
      case AbsenceReason.DIA_ANT_ESTUDIANTIL:
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case AbsenceReason.LICENCIA_MEDICA:
      case AbsenceReason.ARTICULO_93:
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case AbsenceReason.DIA_FEMENINO:
        return 'bg-pink-50 text-pink-700 border-pink-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* PANEL DE ESTADÍSTICAS SUPERIOR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 transition-transform group-hover:scale-110">
            <Users size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Personal</p>
            <h3 className="text-3xl font-black text-slate-800 leading-none mt-1">{stats.total}</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">En el padrón {selectedShift}</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all border-l-8 border-l-emerald-500">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 transition-transform group-hover:scale-110">
            <CheckCircle size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operativos</p>
            <h3 className="text-3xl font-black text-emerald-600 leading-none mt-1">{stats.operativos}</h3>
            <p className="text-[9px] text-emerald-600/60 font-bold uppercase mt-1">Presentes / Reserva</p>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all border-l-8 border-l-red-500">
          <div className="bg-red-50 p-4 rounded-2xl text-red-600 transition-transform group-hover:scale-110">
            <UserMinus size={32} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ausencias</p>
            <h3 className="text-3xl font-black text-red-600 leading-none mt-1">{stats.faltas}</h3>
            <p className="text-[9px] text-red-600/60 font-bold uppercase mt-1">Faltas registradas</p>
          </div>
        </div>
      </div>

      {stats.faltas > 0 && (
        <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3 mb-3 px-2">
            <Info size={14} className="text-slate-400" />
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Desglose de Novedades por Motivo</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.breakdown).map(([reason, count]) => (
              <div 
                key={reason} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 font-black text-[10px] uppercase shadow-sm ${getAbsenceBadgeColor(reason)}`}
              >
                <span>{reason}</span>
                <span className="bg-white/50 w-5 h-5 flex items-center justify-center rounded-lg text-[11px] border border-black/5">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight italic">Listado Detallado</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestión individual por colaborador</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="BUSCAR TRABAJADOR..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10 w-64 uppercase transition-all" 
            />
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
          >
            <UserPlus size={16} /> Nuevo Ingreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e1b2e] text-white h-14 text-[9px] uppercase font-black tracking-widest">
              <tr>
                <th className="pl-8">Colaborador / Legajo</th>
                <th className="text-center">Rol Operativo</th>
                <th className="text-center">Turno Pref.</th>
                <th className="text-center">Zona Actual</th>
                <th className="text-center">Estado / Novedad</th>
                <th className="pr-8 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStaff.map(s => (
                <tr key={s.id} className="h-24 hover:bg-slate-50/80 transition-colors group">
                  <td className="pl-8">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-110 ${s.status === StaffStatus.ABSENT ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{s.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">LEGAJO: {s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center">
                    <span className="text-[9px] font-black px-3 py-1.5 bg-slate-100 rounded-xl text-slate-500 uppercase tracking-tight">{s.role || 'AUXILIAR'}</span>
                  </td>
                  <td className="text-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase">{s.preferredShift || 'MAÑANA'}</span>
                  </td>
                  <td className="text-center">
                    <p className="font-black text-indigo-600 text-[10px] uppercase bg-indigo-50 px-4 py-1.5 rounded-2xl inline-block border border-indigo-100 shadow-sm">{s.assignedZone || 'BASE'}</p>
                  </td>
                  <td className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      {s.status === StaffStatus.ABSENT ? (
                        <div className={`flex flex-col p-2 rounded-2xl border-2 shadow-sm ${getAbsenceBadgeColor(s.address || '')}`}>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase">
                                <AlertCircle size={14} className="shrink-0" />
                                <span>{s.status} - {s.address || 'F'}</span>
                            </div>
                            {/* MOSTRAR RETORNO SI EXISTE */}
                            {s.isIndefiniteAbsence ? (
                                <div className="mt-1 flex items-center gap-1 text-[8px] font-black opacity-60">
                                    <Infinity size={10} /> INDEFINIDO
                                </div>
                            ) : s.absenceReturnDate ? (
                                <div className="mt-1 flex items-center gap-1 text-[8px] font-black opacity-60">
                                    <Calendar size={10} /> VUELVE: {new Date(s.absenceReturnDate).toLocaleDateString()}
                                </div>
                            ) : null}
                        </div>
                      ) : (
                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase border-2 ${s.status === StaffStatus.RESERVA ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                          {s.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="pr-8 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setEditingStaff(s)}
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => onRemoveStaff(s.id)} 
                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm bg-white border border-slate-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayedStaff.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <div className="flex flex-col items-center opacity-20">
                        <Search size={48} className="text-slate-400 mb-4" />
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No se encontraron colaboradores en este turno</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddStaffModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={onAddStaff} 
      />

      {editingStaff && (
        <EditStaffModal 
          isOpen={true} 
          staff={editingStaff} 
          onClose={() => setEditingStaff(null)} 
          onSave={onUpdateStaff}
          allRecords={records}
        />
      )}
    </div>
  );
};
