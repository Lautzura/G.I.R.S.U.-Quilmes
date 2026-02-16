
import React from 'react';
import { X, History, ArrowRight, Trash2 } from 'lucide-react';

interface LoadADNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mappings: any) => void;
}

export const LoadADNModal: React.FC<LoadADNModalProps> = ({ isOpen, onClose, onSelect }) => {
  const adnHistoryRaw = localStorage.getItem('girsu_v36_adn_timeline');
  const adnHistory = adnHistoryRaw ? JSON.parse(adnHistoryRaw) : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <History size={24} />
            <h3 className="text-xl font-black uppercase tracking-tight">Cargar Plantilla (ADN)</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={20} /></button>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar">
          {adnHistory.length > 0 ? (
            adnHistory.sort((a: any, b: any) => b.date.localeCompare(a.date)).map((entry: any) => (
              <button 
                key={entry.date}
                onClick={() => {
                  onSelect(entry.mappings);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <div className="text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Fecha de Guardado</p>
                  <p className="text-lg font-black text-slate-800 uppercase italic">
                    {entry.date.split('-').reverse().join('/')}
                  </p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-sm text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <ArrowRight size={20} />
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10">
              <History size={40} className="mx-auto text-slate-200 mb-3" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No hay plantillas guardadas aún</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t">
          <p className="text-[9px] text-slate-400 font-bold uppercase text-center leading-relaxed">
            Al cargar una plantilla, se reemplazará la asignación actual de personal en todas las rutas del día.
          </p>
        </div>
      </div>
    </div>
  );
};
