
import React, { useState, useMemo, useRef } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason } from '../types';
import { Search, UserPlus, Trash, Edit3, AlertCircle, LayoutList, ArrowUp, ArrowDown, ArrowUpDown, Users, CheckCircle, Star, UserMinus, FileSpreadsheet, Briefcase, ChevronDown, CalendarClock } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { getAbsenceStyles } from '../styles';
import { getEffectiveStaffStatus } from '../App';
import * as XLSX from 'xlsx';

interface StaffManagementProps {
  staffList: StaffMember[];
  onAddStaff: (member: StaffMember) => void;
  onBulkAddStaff?: (newStaff: StaffMember[]) => void;
  onRemoveStaff: (id: string) => void;
  onUpdateStaff: (member: StaffMember, originalId?: string) => void;
  records: RouteRecord[];
  selectedShift: string;
  searchTerm: string; 
  onSearchChange: (val: string) => void;
  selectedDate: string; // Recibimos la fecha para el cálculo dinámico
}

type SortKey = 'name' | 'id' | 'role';

const uniqueById = (list: StaffMember[]) => {
  const seen = new Set();
  return list.filter(s => {
    const id = String(s.id).trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onRemoveStaff, onUpdateStaff, onAddStaff, onBulkAddStaff, selectedShift, records, searchTerm, onSearchChange, selectedDate }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [isImporting, setIsImporting] = useState(false);
  const [activeReasonFilter, setActiveReasonFilter] = useState<string | null>(null);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
        
        if (rows.length === 0) {
            setIsImporting(false);
            return;
        }

        let headerIdx = -1;
        let legajoCol = -1;
        let apellidoCol = -1;
        let nombresCol = -1;

        for (let i = 0; i < Math.min(rows.length, 50); i++) {
            const row = rows[i].map(c => String(c).trim().toUpperCase());
            const lIdx = row.findIndex(c => 
                c === 'LEGAJO' || c === 'LEGA' || c === 'ID' || c.includes('LEGAJO') || c.includes('NRO LEG')
            );
            
            if (lIdx !== -1) {
                headerIdx = i;
                legajoCol = lIdx;
                apellidoCol = row.findIndex(c => c.includes('APELLIDO'));
                nombresCol = row.findIndex(c => c.includes('NOMBRE'));
                break;
            }
        }

        if (headerIdx === -1 || legajoCol === -1) {
            alert('No se detectó una columna de "LEGAJO" en el archivo.');
            setIsImporting(false);
            return;
        }

        const newStaff: StaffMember[] = [];
        const dataRows = rows.slice(headerIdx + 1);
        
        dataRows.forEach((row) => {
            const idRaw = String(row[legajoCol] || '').trim();
            if (!idRaw) return;

            const apellido = apellidoCol !== -1 ? String(row[apellidoCol] || '').trim() : "";
            const nombres = nombresCol !== -1 ? String(row[nombresCol] || '').trim() : "";
            
            let fullName = "";
            if (apellido && nombres) fullName = `${apellido} ${nombres}`;
            else if (apellido) fullName = apellido;
            else if (nombres) fullName = nombres;
            else return;

            newStaff.push({ 
                id: idRaw, 
                name: fullName.toUpperCase(), 
                status: StaffStatus.PRESENT, 
                role: 'AUXILIAR', 
                gender: 'MASCULINO', 
                preferredShift: 'MAÑANA', 
                assignedZone: 'BASE' 
            });
        });

        if (newStaff.length > 0 && onBulkAddStaff) {
            onBulkAddStaff(newStaff);
        } else if (newStaff.length === 0) {
            alert('No se encontraron registros válidos.');
        }

      } catch (err) { 
          console.error(err);
          alert('Error crítico al procesar el archivo Excel.'); 
      } finally { 
          setIsImporting(false); 
          if (fileInputRef.current) fileInputRef.current.value = ''; 
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const shiftStaff = useMemo(() => {
    return uniqueById(staffList.filter(s => selectedShift === 'TODOS' || s.preferredShift === selectedShift));
  }, [staffList, selectedShift]);

  // Lista con estados dinámicos calculados para la visualización
  const processedStaff = useMemo(() => {
    return shiftStaff.map(s => ({
        ...s,
        effectiveStatus: getEffectiveStaffStatus(s, selectedDate)
    }));
  }, [shiftStaff, selectedDate]);

  const roleBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    processedStaff.forEach(s => {
      const role = s.role || 'SIN ROL';
      counts[role] = (counts[role] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [processedStaff]);

  const absenceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    processedStaff.forEach(s => {
      if (s.effectiveStatus === StaffStatus.ABSENT && s.address) {
          counts[s.address] = (counts[s.address] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [processedStaff]);

  const filteredStaff = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();
    return processedStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(search) || s.id.toLowerCase().includes(search);
      if (!matchesSearch) return false;
      if (activeReasonFilter && (s.effectiveStatus !== StaffStatus.ABSENT || s.address !== activeReasonFilter)) return false;
      if (activeRoleFilter && s.role !== activeRoleFilter) return false;
      return true;
    });
  }, [processedStaff, searchTerm, activeReasonFilter, activeRoleFilter]);

  const groupedStaff: Record<string, any[]> = useMemo(() => {
    let sorted = [...filteredStaff].sort((a, b) => {
      const valA = (a[sortConfig.key as keyof StaffMember] || '').toString().toUpperCase();
      const valB = (b[sortConfig.key as keyof StaffMember] || '').toString().toUpperCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    if (selectedShift === 'TODOS') {
      const groups: Record<string, any[]> = { 'MAÑANA': [], 'TARDE': [], 'NOCHE': [] };
      sorted.forEach(s => {
        if (s.preferredShift && groups[s.preferredShift]) groups[s.preferredShift].push(s);
        else groups['MAÑANA'].push(s);
      });
      return groups;
    }
    return { [selectedShift]: sorted };
  }, [filteredStaff, selectedShift, sortConfig]);

  const stats = useMemo(() => ({ 
    total: processedStaff.length, 
    presente: processedStaff.filter(s => s.effectiveStatus === StaffStatus.PRESENT).length, 
    reserva: processedStaff.filter(s => s.effectiveStatus === StaffStatus.RESERVA).length, 
    ausentes: processedStaff.filter(s => s.effectiveStatus === StaffStatus.ABSENT).length
  }), [processedStaff]);

  const SortButton = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
    <button 
      onClick={() => handleSort(sortKey)}
      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border flex items-center gap-1.5 ${
        sortConfig.key === sortKey ? 'bg-indigo-600 text-white border-indigo-600 shadow-md italic' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
      }`}
    >
      {label}
      {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : <ArrowUpDown size={10} className="opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="TOTAL" value={stats.total} icon={<Users size={22} />} color="indigo" />
        <StatCard label="PRESENTES (Efectivos)" value={stats.presente} icon={<CheckCircle size={22} />} color="emerald" />
        <StatCard label="RESERVA" value={stats.reserva} icon={<Star size={22} />} color="amber" />
        <StatCard label="FALTAS (Efectivas)" value={stats.ausentes} icon={<UserMinus size={22} />} color="red" />
      </div>

      <div className="bg-white rounded-[2.5rem] p-5 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4">
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-3 shrink-0">
                <div className="bg-[#111827] text-white p-2.5 rounded-2xl shadow-lg"><LayoutList size={20} /></div>
                <h2 className="text-base font-black text-slate-800 uppercase italic tracking-tighter">Padrón de Personal</h2>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-72 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    <input 
                      type="text" 
                      placeholder="LEGAJO O NOMBRE..." 
                      value={searchTerm} 
                      onChange={(e) => onSearchChange(e.target.value)} 
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-indigo-100 transition-all shadow-sm" 
                    />
                </div>

                <div className="relative w-48 shrink-0">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={16} />
                    <select 
                      value={activeRoleFilter || ''} 
                      onChange={e => setActiveRoleFilter(e.target.value || null)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-indigo-100 appearance-none cursor-pointer transition-all shadow-sm"
                    >
                        <option value="">TODOS LOS ROLES</option>
                        {roleBreakdown.map(([role, count]) => (
                            <option key={role} value={role}>{role} ({count})</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <SortButton label="NOMBRE" sortKey="name" />
                <SortButton label="LEGAJO" sortKey="id" />
                <SortButton label="ROL" sortKey="role" />
            </div>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto">
            <input type="file" ref={fileInputRef} onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
            <button 
                disabled={isImporting}
                onClick={() => fileInputRef.current?.click()} 
                className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg hover:brightness-110 transition-all disabled:opacity-50"
            >
                <FileSpreadsheet size={16} /> 
                {isImporting ? 'PROCESANDO...' : 'IMPORTAR EXCEL'}
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:brightness-110 transition-all"><UserPlus size={16} /> NUEVO</button>
        </div>
      </div>

      {absenceBreakdown.length > 0 && (
          <div className="flex items-center gap-3 px-6 py-2 bg-red-50/50 border border-red-100 rounded-3xl animate-in slide-in-from-top-2">
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-[9px] font-black text-red-600 uppercase tracking-widest mr-2">Novedades Activas Hoy:</span>
              <div className="flex flex-wrap gap-2">
                  {absenceBreakdown.map(([reason, count]) => (
                      <button 
                        key={reason} 
                        onClick={() => setActiveReasonFilter(activeReasonFilter === reason ? null : reason)}
                        className={`px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all border ${activeReasonFilter === reason ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:border-red-400'}`}
                      >
                          {reason} ({count})
                      </button>
                  ))}
              </div>
              {activeReasonFilter && (
                  <button onClick={() => setActiveReasonFilter(null)} className="ml-auto text-[8px] font-black text-red-600 uppercase hover:underline">Ver Todos</button>
              )}
          </div>
      )}

      <div className="bg-white rounded-[3rem] shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#f8fafc] text-slate-400 h-14 text-[9px] uppercase font-black tracking-widest border-b border-slate-100">
              <tr className="text-center">
                <th className="pl-10 text-left w-64">Colaborador</th>
                <th>Rol Operativo</th>
                <th>Turno</th>
                <th>Asistencia</th>
                <th className="pr-10 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(groupedStaff).map(([shift, members]) => (
                <React.Fragment key={shift}>
                  {selectedShift === 'TODOS' && (members as any[]).length > 0 && (
                    <tr className="bg-indigo-50/30">
                      <td colSpan={5} className="px-10 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-indigo-600 tracking-[0.2em] uppercase italic">TURNO {shift} — {(members as any[]).length} INTEGRANTES</span>
                          <div className="h-px bg-indigo-100 flex-1" />
                        </div>
                      </td>
                    </tr>
                  )}
                  {(members as any[]).map(s => {
                    const hasAbsenceInDB = s.status === StaffStatus.ABSENT;
                    const isEffectivelyPresent = s.effectiveStatus === StaffStatus.PRESENT;
                    const isEffectivelyAbsent = s.effectiveStatus === StaffStatus.ABSENT;
                    
                    return (
                        <tr key={s.id} className="h-20 hover:bg-slate-50 transition-colors group">
                          <td className="pl-10">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${isEffectivelyAbsent ? getAbsenceStyles(s.address || 'FALTA') : 'bg-slate-100 text-slate-500'}`}>{s.name.charAt(0)}</div>
                              <div>
                                <p className="font-black text-slate-800 text-[11px] uppercase leading-none">{s.name}</p>
                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">LEG: {s.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-center">
                            <span className="text-[9px] font-black px-3 py-1.5 bg-slate-100 rounded-lg text-slate-500 uppercase">{s.role || '---'}</span>
                          </td>
                          <td className="text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase italic opacity-70">{s.preferredShift}</span>
                          </td>
                          <td className="text-center">
                            <div className="flex flex-col items-center justify-center gap-1">
                              {/* Estado Efectivo (Hoy) */}
                              <span className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase border ${isEffectivelyAbsent ? getAbsenceStyles(s.address || '') : s.effectiveStatus === StaffStatus.RESERVA ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>
                                  {isEffectivelyAbsent ? (s.address || 'AUSENTE') : isEffectivelyPresent ? 'PRESENTE' : s.effectiveStatus}
                              </span>
                              
                              {/* Indicador de registro en Padrón si está fuera de rango */}
                              {hasAbsenceInDB && isEffectivelyPresent && (
                                  <div className="flex items-center gap-1 text-[7px] font-black text-indigo-400 uppercase italic">
                                      <CalendarClock size={10} /> Registrada en Padrón
                                  </div>
                              )}
                            </div>
                          </td>
                          <td className="pr-10 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingStaff(s)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit3 size={16} /></button>
                              <button onClick={() => onRemoveStaff(s.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash size={16} /></button>
                            </div>
                          </td>
                        </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <Users size={40} className="mb-4 opacity-10" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Sin resultados en este turno</p>
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

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => {
    const colorClasses: Record<string, string> = {
        indigo: "border-indigo-600 bg-indigo-50 text-indigo-600",
        emerald: "border-emerald-600 bg-emerald-50 text-emerald-600",
        amber: "border-amber-600 bg-amber-50 text-amber-600",
        red: "border-red-600 bg-red-50 text-red-600"
    };
    return (
        <div className={`bg-white rounded-[2rem] p-5 flex items-center gap-4 shadow-sm border-l-[8px] transition-all hover:translate-y-[-2px] ${colorClasses[color]}`}>
            <div className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${color === 'indigo' ? 'bg-indigo-100' : color === 'emerald' ? 'bg-emerald-100' : color === 'amber' ? 'bg-amber-100' : 'bg-red-100'}`}>{icon}</div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
            </div>
        </div>
    );
};
