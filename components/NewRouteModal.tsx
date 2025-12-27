
import React, { useState } from 'react';
import { X, PlusCircle, Info } from 'lucide-react';

interface NewRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (zone: string, shift: string) => void;
  currentShift: string;
}

export const NewRouteModal: React.FC<NewRouteModalProps> = ({ isOpen, onClose, onSave, currentShift }) => {
  const [zoneName, setZoneName] = useState('');
  const [selectedShift, setSelectedShift] = useState(currentShift);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) return;
    onSave(zoneName.trim().toUpperCase(), selectedShift);
    setZoneName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
        <div className="bg-[#1e1b2e] p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <PlusCircle className="text-indigo-400" size={24} />
            <h3 className="text-xl font-black uppercase tracking-tight">Nueva Ruta Operativa</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Zona / Ruta</label>
              <input 
                required
                type="text" 
                placeholder="EJ: RN 99 / AVENIDAS / CUADRICULA..." 
                value={zoneName} 
                onChange={e => setZoneName(e.target.value)} 
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all" 
                autoFocus 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Turno de Operación</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MAÑANA', 'TARDE', 'NOCHE'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedShift(s)}
                    className={`py-3 rounded-xl text-[10px] font-black transition-all border ${selectedShift === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-300'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-start gap-4">
             <Info className="text-indigo-600 mt-0.5 shrink-0" size={20} />
             <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed">
               La ruta se añadirá al final del listado del turno seleccionado. Podrá cargar el personal y camión directamente desde la tabla de control.
             </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[11px] uppercase transition-colors hover:bg-slate-200">
              Cancelar
            </button>
            <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">
              Crear Nueva Ruta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
