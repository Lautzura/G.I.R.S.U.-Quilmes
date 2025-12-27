
import React from 'react';
import { RouteRecord } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, TrendingDown, Package, Sun, Moon, Sunrise, Recycle, Star, Info } from 'lucide-react';

const hourlyData = [
  { time: '6:00', flow: 20, flow2: 35 },
  { time: '8:00', flow: 65, flow2: 45 },
  { time: '10:00', flow: 45, flow2: 80 },
  { time: '12:00', flow: 75, flow2: 50 },
  { time: '14:00', flow: 15, flow2: 25 },
  { time: '16:00', flow: 35, flow2: 40 },
  { time: '18:00', flow: 20, flow2: 55 },
  { time: '20:00', flow: 50, flow2: 15 },
  { time: '22:00', flow: 10, flow2: 5 },
];

export const DashboardStats: React.FC<{ data: RouteRecord[] }> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fade-in p-2">
      {/* Top Banner: Alertas Rápidas */}
      <div className="flex gap-4">
        <div className="bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full border border-orange-200 text-[10px] font-black uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
          Stock Transferencia Alto
        </div>
        <div className="bg-yellow-50 text-yellow-700 px-4 py-1.5 rounded-full border border-yellow-200 text-[10px] font-black uppercase flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-500 rounded-full" />
          21 Unidades en Taller
        </div>
      </div>

      {/* Main Stock Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Stock Transferencia */}
        <div className="lg:col-span-2 bg-[#fffdf6] rounded-3xl p-8 border border-orange-100 shadow-sm relative overflow-hidden flex justify-between">
           <div className="relative z-10">
             <div className="flex items-center gap-2 text-red-500 mb-4">
               <Recycle size={18} className="rotate-45" />
               <span className="text-xs font-black uppercase tracking-widest">Stock Transferencia</span>
             </div>
             <div className="flex items-baseline gap-2">
               <h3 className="text-7xl font-black text-[#2e1008]">161.6</h3>
               <span className="text-xl font-bold text-slate-400">TN</span>
             </div>
             <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 w-fit px-3 py-1 rounded-full text-[10px] font-black">
               <TrendingDown size={14} /> ALERTA
             </div>
           </div>
           
           <div className="text-right flex flex-col justify-between">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase">Saturación Estimada</p>
               <div className="flex items-center justify-end gap-2 text-xl font-black text-slate-800">
                 <Clock size={20} className="text-slate-400" /> 17:49
               </div>
             </div>
             <div className="opacity-10 absolute -bottom-10 -right-10 scale-150">
               <Package size={200} />
             </div>
           </div>
        </div>

        {/* Card Stock Separación */}
        <div className="bg-[#1e1b2e] rounded-3xl p-8 text-white relative overflow-hidden flex flex-col justify-center">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-indigo-400 mb-6">
              <Recycle size={18} />
              <span className="text-xs font-black uppercase tracking-widest">Stock Separación</span>
            </div>
            <div className="flex items-baseline gap-2">
               <h3 className="text-6xl font-black">21.9</h3>
               <span className="text-xl font-bold text-indigo-400">TN</span>
            </div>
          </div>
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="opacity-5 absolute -bottom-4 -right-4">
             <Recycle size={120} />
          </div>
        </div>
      </div>

      {/* Shifts Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <ShiftCard title="MAÑANA" value="105.3" unit="TN" progress={70} objective="150 TN" icon={<Sunrise size={18} />} color="bg-[#f44336]" />
        <ShiftCard title="TARDE" value="0.0" unit="TN" progress={0} objective="150 TN" icon={<Sun size={18} />} color="bg-[#42a5f5]" active />
        <ShiftCard title="NOCHE" value="0.0" unit="TN" progress={0} objective="5 VIAJES" icon={<Moon size={18} />} color="bg-[#7e57c2]" />
        <ShiftCard title="ESPECIALES" value="170.4" unit="TN" progress={74} objective="230 TN" icon={<Star size={18} />} color="bg-[#ffa726]" />
        <ShiftCard title="RECUPERO" value="7.2" unit="TN" progress={24} objective="-" icon={<Recycle size={18} />} color="bg-[#26a69a]" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Monitor de Flujo Horario</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-indigo-400" /> ENTRADA
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <div className="w-2 h-2 rounded-full bg-pink-400" /> SALIDA
              </div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData}>
                <defs>
                  <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFlow2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="flow" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorFlow)" />
                <Area type="monotone" dataKey="flow2" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorFlow2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border shadow-sm flex flex-col items-center justify-between">
           <div className="w-full flex justify-between items-center mb-4">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Balance Transferencia</h4>
             <TrendingDown className="text-emerald-500" size={18} />
           </div>
           <div className="relative h-48 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie data={[{value: 17.6}, {value: 82.4}]} innerRadius={60} outerRadius={80} startAngle={90} endAngle={450} dataKey="value">
                   <Cell fill="#10b981" />
                   <Cell fill="#f1f5f9" />
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
               <span className="text-[10px] font-black text-slate-400 uppercase">Neto</span>
               <span className="text-3xl font-black text-slate-800">17.6</span>
             </div>
           </div>
           <div className="w-full bg-slate-50 p-3 rounded-2xl flex justify-between items-center">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Estado Actual</span>
             <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Estable</span>
           </div>
        </div>
      </div>
    </div>
  );
};

const ShiftCard = ({ title, value, unit, progress, objective, icon, color, active = false }: any) => (
  <div className={`${color} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden transition-transform hover:scale-[1.02] cursor-pointer`}>
    {active && <div className="absolute top-2 right-2 bg-white/20 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">Activo</div>}
    <div className="flex items-center gap-2 mb-3 opacity-90">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-wider">{title}</span>
    </div>
    <div className="flex items-baseline gap-1 mb-4">
      <span className="text-3xl font-black">{value}</span>
      <span className="text-[10px] font-bold opacity-70">{unit}</span>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-black uppercase opacity-80">
        <span>Progreso Meta</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-black/20 rounded-full h-1">
        <div className="bg-white h-1 rounded-full shadow-[0_0_8px_white]" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[8px] font-bold opacity-60 text-right uppercase mt-1">Objetivo: {objective}</p>
    </div>
    <div className="absolute -bottom-2 -right-2 opacity-10">
       {icon && React.cloneElement(icon as any, { size: 60 })}
    </div>
  </div>
);
