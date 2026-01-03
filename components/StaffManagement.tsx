
import React, { useState, useMemo, useRef } from 'react';
import { StaffMember, StaffStatus, RouteRecord, AbsenceReason, ZoneStatus } from '../types';
import { Search, UserPlus, Trash2, Edit3, AlertCircle, LayoutList, ArrowUp, ArrowDown, ArrowUpDown, Users, CheckCircle, Star, UserMinus, Info, ChevronDown, ChevronUp, User as UserIcon, FileSpreadsheet, Loader2 } from 'lucide-react';
import { AddStaffModal } from './AddStaffModal';
import { EditStaffModal } from './EditStaffModal';
import { getAbsenceStyles } from '../App';
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
}

type SortKey = 'name' | 'id' | 'role';

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList, onRemoveStaff, onUpdateStaff, onAddStaff, onBulkAddStaff, selectedShift, records, searchTerm, onSearchChange }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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
            alert('El archivo está vacío.');
            setIsImporting(false);
            return;
        }

        let headerIdx = -1;
        let legajoCol = -1;
        let apellidoCol = -1;
        let nombresCol = -1;

        // Búsqueda profunda de encabezados
        for (let i = 0; i < Math.min(rows.length, 30); i++) {
            const row = rows[i].map(c => String(c).trim().toUpperCase());
            const lIdx = row.findIndex(c => c === 'LEGAJO' || c === 'LEGA');
            if (lIdx !== -1) {
                headerIdx = i;
                legajoCol = lIdx;
                apellidoCol = row.findIndex(c => c.includes('APELLIDO'));
                nombresCol = row.findIndex(c => c.includes('NOMBRE'));
                break;
            }
        }

        if (headerIdx === -1 || legajoCol === -1) {
            alert('No se detectaron los encabezados "LEGAJO", "APELLIDO" y "NOMBRES". Verifique que el Excel tenga estos nombres en la primera fila de datos.');
            setIsImporting(false);
            return;
        }

        const newStaff: StaffMember[] = [];
        const dataRows = rows.slice(headerIdx + 1);

        dataRows.forEach((row) => {
            const id = String(row[legajoCol] || '').trim();
            const apellido = String(row[apellidoCol] || '').trim();
            const nombres = String(row[nombresCol] || '').trim();

            if (id && (apellido || nombres)) {
                const fullName = `${apellido} ${nombres}`.trim().toUpperCase();
                newStaff.push({
                    id: id,
                    name: fullName,
                    status: StaffStatus.PRESENT,
                    role: 'AUXILIAR',
                    gender: 'MASCULINO',
                    preferredShift: 'MAÑANA',
                    assignedZone: 'BASE'
                });
            }
        });

        if (newStaff.length > 0 && onBulkAddStaff) {
            onBulkAddStaff(newStaff);
            alert(`¡Carga terminada! Se procesaron ${newStaff.length} colaboradores.`);
        } else {
            alert('No se encontraron registros válidos debajo de los encabezados.');
        }

      } catch (err) {
        alert('Error al procesar el Excel. Asegúrese de que el formato sea correcto.');
        console.error(err);
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const shiftStaff = useMemo(() => {
    return staffList.filter(s => selectedShift === 'TODOS' || s.preferredShift === selectedShift);
  }, [staffList, selectedShift]);

  const displayedStaff = useMemo(() => {
    let filtered = shiftStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      const valA = (a[sortConfig.key] || '').toString().toUpperCase();
      const valB = (b[sortConfig.key] || '').toString().toUpperCase();
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [shiftStaff, searchTerm, sortConfig]);

  const stats = useMemo(() => {
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
  }, [shiftStaff]);

  const staffInReason = useMemo(() => {
    if (!selectedReason) return [];
    return shiftStaff.filter(s => s.status === StaffStatus.ABSENT && (s.address || 'OTRO / NO ESPECIFICADO') === selectedReason);
  }, [shiftStaff, selectedReason]);

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
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="TOTAL" value={stats.total} icon={<Users size={28} />} color="indigo" />
        <StatCard label="PRESENTES" value={stats.presente} icon={<CheckCircle size={28} />} color="emerald" />
        <StatCard label="RESERVA" value={stats.reserva} icon={<Star size={28} />} color="amber" />
        <StatCard label="FALTAS" value={stats.ausentes} icon={<UserMinus size={28} />} color="red" />
      </div>

      {/* DESGLOSE DE INASISTENCIAS */}
      {stats.ausentes > 0 && (
        <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-3 mb-6 px-4">
                <AlertCircle className="text-red-500" size={18} />
                <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] italic">Desglose por Motivo de Inasistencia</h3>
                <span className="text-[9px] text-slate-300 font-bold uppercase ml-auto">(Haz clic en un motivo para ver el listado)</span>
            </div>
            
            <div className="flex flex-wrap gap-4 px-4 mb-4">
                {stats.absenceBreakdown.map(([reason, count]) => {
                    const isActive = selectedReason === reason;
                    return (
                        <button 
                            key={reason} 
                            onClick={() => setSelectedReason(isActive ? null : reason)}
                            className={`px-5 py-3 rounded-2xl border flex items-center gap-4 transition-all hover:scale-105 shadow-sm active:scale-95 ${getAbsenceStyles(reason)} ${isActive ? 'ring-4 ring-indigo-500/20 scale-105' : ''}`}
                        >
                            <span className="text-[10px] font-black uppercase tracking-tight">{reason}</span>
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black text-sm">
                                {count}
                            </div>
                            {isActive ? <ChevronUp size={14} className="opacity-50" /> : <ChevronDown size={14} className="opacity-50" />}
                        </button>
                    );
                })}
            </div>

            {selectedReason && (
                <div className="mx-4 mt-6 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-3">
                            <Info size={16} className="text-indigo-500" />
                            <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Personal ausente por: {selectedReason}</h4>
                        </div>
                        <button onClick={() => setSelectedReason(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {staffInReason.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center gap-3 shadow-sm group hover:border-indigo-300 transition-all">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-black">{s.name.charAt(0)}</div>
                                <div className="overflow-hidden flex-1">
                                    <p className="text-[10px] font-black text-slate-800 uppercase truncate">{s.name}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">LEG: {s.id}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => setEditingStaff(s)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><Edit3 size={14} /></button>
                                  <button onClick={() => { if(window.confirm(`¿Eliminar a ${s.name}?`)) onRemoveStaff(String(s.id)); }} className="p-1.5 text-red-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* BARRA DE GESTIÓN Y BÚSQUEDA */}
      <div className="bg-white rounded-[3rem] p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto">
            <div className="flex items-center gap-4 shrink-0">
                <div className="bg-[#111827] text-white p-3 rounded-2xl shadow-xl"><LayoutList size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">PADRÓN GENERAL</h2>
            </div>
            
            <div className="relative w-full lg:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input 
                    type="text" 
                    placeholder="BUSCAR NOMBRE O LEGAJO..." 
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-black uppercase outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-2 shrink-0">ORDEN:</span>
                <SortButton label="NOMBRE" sortKey="name" />
                <SortButton label="LEGAJO" sortKey="id" />
                <SortButton label="ROL" sortKey="role" />
            </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleExcelImport} 
                className="hidden" 
                accept=".xlsx, .xls" 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-emerald-600 text-white rounded-[2rem] text-[11px] font-black uppercase shadow-xl shadow-emerald-200 hover:brightness-110 transition-all active:scale-95"
            >
              {isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
              IMPORTAR EXCEL
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)} 
              className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-[#5850ec] text-white rounded-[2rem] text-[11px] font-black uppercase shadow-2xl shadow-indigo-200 hover:brightness-110 transition-all active:scale-95"
            >
              <UserPlus size={18} /> NUEVO INGRESO
            </button>
        </div>
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
                    <div className="flex justify-end gap-3">
                      <button 
                        onClick={() => setEditingStaff(s)} 
                        className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-indigo-50"
                        title="Editar"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation();
                          if(window.confirm(`¿Estás seguro de eliminar a ${s.name} del padrón permanentemente?`)) {
                            onRemoveStaff(String(s.id)); 
                          }
                        }} 
                        className="p-3 text-red-500 hover:bg-red-50 rounded-2xl transition-all shadow-md border border-red-200"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {displayedStaff.length === 0 && (
            <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                <Search size={48} className="text-slate-200" />
                <p className="text-slate-400 font-black uppercase text-xs">No se encontraron resultados para "{searchTerm}"</p>
            </div>
        )}
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
