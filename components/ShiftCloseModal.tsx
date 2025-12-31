
import React, { useState, useMemo } from 'react';
import { X, ClipboardCheck, Printer, CheckCircle2, Users, Download, Loader2, Info, AlertTriangle } from 'lucide-react';
import { RouteRecord, ZoneStatus, StaffStatus } from '../types';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: string;
  records: RouteRecord[];
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose, shift, records }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // FILTRADO ROBUSTO: Aseguramos que 'records' sea un array y filtramos nulos/undefined
  const shiftRecords = useMemo(() => {
    if (!records || !Array.isArray(records)) return [];
    
    const validRecords = records.filter(r => r && typeof r === 'object' && r.id);
    
    if (shift === 'TODOS') return validRecords;
    return validRecords.filter(r => r.shift === shift);
  }, [records, shift]);

  // Filtrar EXCLUSIVAMENTE zonas INCOMPLETAS para el reporte final
  const incompleteOnly = useMemo(() => {
    return shiftRecords.filter(r => r.zoneStatus === ZoneStatus.INCOMPLETE);
  }, [shiftRecords]);

  // Renderizado condicional DESPUÉS de los hooks para evitar Error #310
  if (!isOpen) return null;

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-to-pdf');
    if (!element) return;
    
    // @ts-ignore - html2pdf se carga vía CDN en index.html
    if (typeof window.html2pdf !== 'function') {
      alert("La librería de generación de PDF aún no se ha cargado. Por favor, espere un momento e intente de nuevo.");
      return;
    }

    setIsGenerating(true);
    const opt = {
      margin: 10,
      filename: `INCOMPLETAS_GIRSU_${shift}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save()
      .then(() => setIsGenerating(false))
      .catch((err: any) => {
        console.error("Error al generar PDF:", err);
        setIsGenerating(false);
        alert("Ocurrió un error al intentar generar el archivo PDF.");
      });
  };

  const countAuxiliaries = (r: RouteRecord) => {
    if (!r) return 0;
    let count = 0;
    const auxList = [r.aux1, r.aux2, r.aux3, r.aux4, r.replacementAux1, r.replacementAux2];
    auxList.forEach(a => {
        if (a?.status === StaffStatus.PRESENT) count++;
    });
    return count;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-0 md:p-4 no-print">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        {/* Cabecera del Modal */}
        <div className="bg-[#1e1b2e] p-8 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="bg-red-500/20 p-3 rounded-2xl border border-white/10 text-red-400">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tight leading-none">
                REPORTE DE ZONAS INCOMPLETAS
              </h3>
              <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-[0.3em] mt-2 opacity-80">
                TURNO: {shift} | REGISTRO DE FALLAS OPERATIVAS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X size={32} />
          </button>
        </div>

        {/* Contenido del Reporte */}
        <div id="report-to-pdf" className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 bg-white">
          <div className="space-y-6">
            <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest italic border-l-4 border-red-500 pl-4">
              DETALLE DE NOVEDADES (EXCLUSIVO INCOMPLETAS)
            </h4>
            
            {incompleteOnly.length > 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#242b3d] text-white text-[10px] uppercase font-black h-14 text-center">
                    <tr>
                      <th className="pl-8 text-left">ZONA</th>
                      <th className="w-24">INT.</th>
                      <th className="w-28">ESTADO</th>
                      <th className="w-64 text-left">PERSONAL</th>
                      <th className="w-20">AUX.</th>
                      <th className="px-8 text-left">INFORME DE FALLA</th>
                      <th className="w-28">TN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incompleteOnly.map(r => (
                      <tr key={r.id || Math.random().toString()} className="h-24 text-[11px] uppercase font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                        <td className="pl-8 font-black text-indigo-600 text-xs">{r.zone}</td>
                        <td className="text-center font-black text-slate-900 text-base">{r.internalId || '---'}</td>
                        <td className="text-center">
                          <span className="px-2 py-1 rounded-lg text-[8px] font-black border bg-red-50 text-red-600 border-red-200">
                            INCOMPLETA
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-black text-slate-800 truncate">
                              {r.driver?.name || r.replacementDriver?.name || 'SIN ASIGNAR'}
                            </span>
                            <span className="text-[9px] text-slate-400">
                              LEG: {r.driver?.id || r.replacementDriver?.id || '---'}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="bg-slate-100 px-3 py-1.5 rounded-xl text-slate-600 font-black text-[10px]">
                            {countAuxiliaries(r)}
                          </span>
                        </td>
                        <td className="px-8 italic text-red-600 font-black leading-snug max-w-sm">
                          {r.supervisionReport || 'SIN MOTIVO ESPECIFICADO EN EL PARTE'}
                        </td>
                        <td className="text-center pr-8 font-black text-indigo-600 text-base">
                          {r.tonnage || '0.00'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-emerald-50 border-4 border-dashed border-emerald-100 p-24 rounded-[4rem] text-center">
                  <CheckCircle2 size={80} className="text-emerald-500 mx-auto mb-6" />
                  <h4 className="font-black text-emerald-900 uppercase text-2xl">Sin Zonas Incompletas</h4>
                  <p className="text-emerald-600 text-[12px] font-black uppercase mt-3">El operativo se ha cumplido sin deudas en el listado seleccionado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Acciones del Footer */}
        <div className="p-10 bg-slate-50 border-t flex justify-end gap-4">
          <button 
            type="button"
            onClick={handleDownloadPDF}
            disabled={isGenerating || incompleteOnly.length === 0}
            className="px-14 py-6 bg-red-600 text-white rounded-3xl text-[13px] font-black uppercase shadow-2xl flex items-center gap-4 hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
            {isGenerating ? 'GENERANDO ARCHIVO...' : 'DESCARGAR REPORTE DE FALLAS'}
          </button>
          <button onClick={onClose} className="px-16 py-6 bg-white border-2 border-slate-200 text-slate-400 rounded-3xl text-[13px] font-black uppercase hover:bg-slate-50 transition-all">
            CERRAR VENTANA
          </button>
        </div>
      </div>
    </div>
  );
};
