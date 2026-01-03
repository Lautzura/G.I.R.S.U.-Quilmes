
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
            alert('No se detectó el encabezado "LEGAJO". Verifique el archivo.');
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
                newStaff.push({
                    id: id,
                    name: `${apellido} ${nombres}`.trim().toUpperCase(),
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
            alert(`¡Carga de ${newStaff.length} colaboradores terminada!`);
        }
      } catch (err) {
        alert('Error al procesar el Excel.');
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

  const SortButton = ({ label, sortKey }: { label: string, sortKey: SortKey }) => (
    <button 
      onClick={() => handleSort(sortKey)}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all border flex items-center gap-2 ${
        sortConfig.key === sortKey 
          ? 'bg-[#5850ec] text-white border-[#5850ec] shadow-lg italic' 
          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
      }`}
    >
      {label}
      {sortConfig.key === sortKey ? (sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-30" />}
    </button>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-[1600px] mx-auto pb-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="TOTAL" value={stats.total} icon={<Users size={28} />} color="indigo" />
        <StatCard label="PRESENTES" value={stats.presente} icon={<CheckCircle size={28} />} color="emerald" />
        <StatCard label="RESERVA" value={stats.reserva} icon={<Star size={28} />} color="amber" />
        <StatCard label="FALTAS" value={stats.ausentes} icon={<UserMinus size={28} />} color="red" />
      </div>

      <div className="bg-white rounded-[3rem] p-6 shadow-sm border border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex flex-col lg:flex-row items-center gap-6 w-full xl:w-auto">
            <div className="flex items-center gap-4 shrink-0">
                <div className="bg-[#111827] text-white p-3 rounded-2xl shadow-xl"><LayoutList size={24} /></div>
                <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">PADRÓN GENERAL</h2>
            </div>
            
            <div className="relative w-full lg:w-80 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={18} />
                <input type="text" placeholder="BUSCAR NOMBRE O LEGAJO..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-50 rounded-[1.5rem] text-[11px] font-black uppercase outline-none focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm" />
            </div>

            <div className="flex items-center gap-2">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mr-2 shrink-0">ORDEN:</span>
                <SortButton label="NOMBRE" sortKey="name" />
                <SortButton label="LEGAJO" sortKey="id" />
            </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto">
            <input type="file" ref={fileInputRef} onChange={handleExcelImport} className="hidden" accept=".xlsx, .xls" />
            <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-8 py-5 bg-emerald-600 text-white rounded-[2rem] text-[11px] font-black uppercase shadow-xl hover:brightness-110 transition-all">
              {isImporting ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />} IMPORTAR EXCEL
            </button>
            <button onClick={() => setIsAddModalOpen(true)} className="flex-1 xl:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-[#5850ec] text-white rounded-[2rem] text-[11px] font-black uppercase shadow-2xl hover:brightness-110 transition-all">
              <UserPlus size={18} /> NUEVO INGRESO
            </button>
        </div>
      </div>

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
                      <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border ${s.status === StaffStatus.ABSENT ? getAbsenceStyles(s.address || '') : s.status === StaffStatus.RESERVA ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'}`}>{s.status === StaffStatus.ABSENT ? (s.address || 'FALTA') : s.status}</span>
                    </div>
                  </td>
                  <td className="pr-12 text-right">
                    <div className="flex justify-end gap-3">
                      <button type="button" onClick={() => setEditingStaff(s)} className="p-3 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm border border-indigo-50"><Edit3 size={18} /></button>
                      <button type="button" onClick={(e) => { e.preventDefault(); if(window.confirm(`¿Eliminar a ${s.name} permanentemente?`)) onRemoveStaff(String(s.id).trim()); }} className="p-3 text-red-500 hover:bg-red-600 hover:text-white rounded-2xl transition-all shadow-md border border-red-200"><Trash2 size={18} /></button>
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

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string }> = ({ label, value, icon, color }) => (
    <div className={`bg-white rounded-[2.5rem] p-8 flex items-center gap-6 shadow-sm border-l-[12px] border-${color}-600 border-slate-100 transition-all hover:translate-y-[-4px]`}>
        <div className={`p-4 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0`}>{icon}</div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{label}</p>
            <p className="text-4xl font-black text-slate-900 leading-none">{value}</p>
        </div>
    </div>
);
