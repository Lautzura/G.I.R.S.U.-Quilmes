
import React, { useState, useMemo } from 'react';
import { Search, Truck, Filter, Settings2, MoreHorizontal } from 'lucide-react';
import { FLEET_MASTER_DATA } from '../constants';

export const FleetInventory: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [areaFilter, setAreaFilter] = useState('TODOS');

    const filteredData = useMemo(() => {
        return FLEET_MASTER_DATA.filter(d => {
            const matchesSearch = d.interno.includes(searchTerm) || d.dominio.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [searchTerm]);

    return (
        <div className="max-w-screen-2xl mx-auto space-y-6 animate-fade-in p-2">
            <div className="bg-white rounded-3xl p-6 border shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                <Settings2 size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Estación de Control Taller</h2>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-12">Ficha Técnica y Gestión de Mantenimiento Preventivo</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            {['TODOS', 'ADMIN', 'AMBIENTE', 'CARGA LATERAL', 'HIGIENE URBANA'].map(f => (
                                <button key={f} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${areaFilter === f ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>{f}</button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                            type="text" 
                            placeholder="BUSCAR UNIDAD (INTERNO O PATENTE)..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold placeholder-slate-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-4">
                        <StatusDot color="bg-emerald-500" label="OPERATIVO" />
                        <StatusDot color="bg-orange-500" label="TALLER" />
                        <StatusDot color="bg-red-500" label="BAJA" />
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#1e1b2e] text-white text-[9px] uppercase font-black tracking-widest">
                                <th colSpan={3} className="p-4 border-r border-slate-700 text-center">Identificación</th>
                                <th colSpan={4} className="p-4 border-r border-slate-700 text-center">Estado y Técnica</th>
                                <th colSpan={3} className="p-4 border-r border-slate-700 text-center">Mantenimiento Preventivo</th>
                                <th className="p-4 text-center">Acción</th>
                            </tr>
                            <tr className="bg-[#1e1b2e] text-slate-400 text-[8px] uppercase font-black border-t border-slate-700">
                                <th className="p-3 pl-6">Área</th>
                                <th className="p-3 text-center">Interno</th>
                                <th className="p-3 border-r border-slate-700">Dominio</th>
                                <th className="p-3 text-center">Estado</th>
                                <th className="p-3">Tipo</th>
                                <th className="p-3">Marca/Modelo</th>
                                <th className="p-3 text-center border-r border-slate-700">GPS</th>
                                <th className="p-3 text-center">F. Preventivo</th>
                                <th className="p-3 text-center">Próximo</th>
                                <th className="p-3 text-center border-r border-slate-700">Falta</th>
                                <th className="p-3 text-center">Ficha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50 transition-all text-slate-600 font-bold text-[10px]">
                                    <td className="p-4 pl-6 text-slate-300 font-black text-[8px] uppercase">{item.area}</td>
                                    <td className="p-4 text-center text-slate-900 font-black text-sm">{item.interno}</td>
                                    <td className="p-4 text-slate-500 font-mono">{item.dominio}</td>
                                    <td className="p-4 text-center">
                                        <div className={`w-2.5 h-2.5 rounded-full mx-auto ${item.estado === 'Operativo' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-orange-500'}`} />
                                    </td>
                                    <td className="p-4 text-[9px] text-slate-400 font-black uppercase">{item.tipo}</td>
                                    <td className="p-4 text-slate-300">-</td>
                                    <td className="p-4 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black ${item.gps === 'Activo' ? 'text-slate-300' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                                            {item.gps === 'Activo' ? 'NO' : 'SI'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center text-slate-300">-</td>
                                    <td className="p-4 text-center text-slate-300">-</td>
                                    <td className="p-4 text-center text-slate-300">-</td>
                                    <td className="p-4 text-center">
                                        <button className="p-2 hover:bg-slate-100 rounded-full text-slate-300 hover:text-indigo-600 transition-all">
                                            <Settings2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const StatusDot = ({ color, label }: any) => (
    <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-[8px] font-black text-slate-400 tracking-tighter">{label}</span>
    </div>
);
