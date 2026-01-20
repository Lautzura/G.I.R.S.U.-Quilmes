
import React from 'react';
import { RouteRecord } from '../types';
import { TrendingUp, Package, Recycle, Truck, Info } from 'lucide-react';

export const DashboardStats: React.FC<{ data: RouteRecord[] }> = ({ data }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cards Principales: Transferencia y Separación */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Planta de Transferencia (Morado) */}
        <div className="bg-gradient-to-br from-[#8b5cf6] to-[#7c3aed] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-purple-200">
           <div className="relative z-10 flex flex-col justify-between h-full">
             <div>
                <div className="flex items-center gap-2 mb-4 opacity-80">
                    <Package size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Planta de Transferencia</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-7xl font-black">138.14</h3>
                    <span className="text-xl font-bold opacity-60 uppercase">TN</span>
                </div>
             </div>
             <div className="mt-8">
                <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Stock actual de residuos</span>
             </div>
           </div>
           <Package size={180} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
        </div>

        {/* Planta de Separación (Verde) */}
        <div className="bg-gradient-to-br from-[#10b981] to-[#059669] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-emerald-200">
           <div className="relative z-10 flex flex-col justify-between h-full">
             <div>
                <div className="flex items-center gap-2 mb-4 opacity-80">
                    <Recycle size={18} />
                    <span className="text-xs font-black uppercase tracking-widest">Planta de Separación</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-7xl font-black">45.20</h3>
                    <span className="text-xl font-bold opacity-60 uppercase">TN</span>
                </div>
             </div>
             <div className="mt-8">
                <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Material reciclable en proceso</span>
             </div>
           </div>
           <Recycle size={180} className="absolute -right-8 -bottom-8 opacity-10 rotate-12" />
        </div>
      </div>

      {/* Tarjetas de Turnos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ShiftCard 
            title="TURNO MAÑANA" 
            time="06:00 - 14:59" 
            trips={12} 
            tons={45.5} 
            meta={80} 
            color="bg-emerald-500" 
            progress={57} 
        />
        <ShiftCard 
            title="TURNO TARDE" 
            time="14:00 - 22:59" 
            trips={8} 
            tons={32.1} 
            meta={80} 
            color="bg-purple-500" 
            progress={40} 
        />
        <ShiftCard 
            title="TURNO NOCHE" 
            time="22:00 - 05:59" 
            trips={0} 
            tons={0.0} 
            meta={60} 
            color="bg-blue-500" 
            progress={0} 
        />
        <ShiftCard 
            title="OP. GUSANOS / BERALDI" 
            time="OPERACIÓN ESPECIAL" 
            trips={0} 
            tons={0.0} 
            meta={230} 
            color="bg-orange-500" 
            progress={0} 
        />
      </div>
    </div>
  );
};

const ShiftCard = ({ title, time, trips, tons, meta, color, progress }: any) => (
  <div className={`${color} rounded-[1.5rem] p-6 text-white shadow-lg relative overflow-hidden transition-all hover:scale-[1.02]`}>
    <div className="flex items-center gap-3 mb-1">
      <Truck size={16} className="opacity-80" />
      <span className="text-[11px] font-black uppercase tracking-tighter">{title}</span>
    </div>
    <span className="text-[9px] font-bold opacity-60 ml-7 block mb-4 uppercase">{time}</span>

    <div className="flex justify-between items-end mb-6">
        <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black leading-none">{trips}</span>
            <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Viajes</span>
        </div>
        <div className="text-right">
            <div className="flex items-baseline justify-end gap-1">
                <span className="text-xl font-black leading-none">{tons}</span>
                <span className="text-[9px] font-bold opacity-60 uppercase">TN</span>
            </div>
            <span className="text-[8px] font-black opacity-40 uppercase tracking-widest">Meta: {meta} TN</span>
        </div>
    </div>

    <div className="space-y-1">
        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest">
            <span>{progress}% Completado</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_white]" style={{ width: `${progress}%` }} />
        </div>
    </div>
  </div>
);
