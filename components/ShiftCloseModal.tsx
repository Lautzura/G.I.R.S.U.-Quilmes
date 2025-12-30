
import React, { useState, useMemo } from 'react';
import { X, ClipboardCheck, Printer, CheckCircle2, Users, Download, Loader2, Info } from 'lucide-react';
import { RouteRecord, ZoneStatus, StaffStatus } from '../types';

interface ShiftCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: string;
  records: RouteRecord[];
}

export const ShiftCloseModal: React.FC<ShiftCloseModalProps> = ({ isOpen, onClose, shift, records }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;
  
  const shiftRecords = records.filter(r => r.shift === shift);
  const incomplete = shiftRecords.filter(r => r.zoneStatus === ZoneStatus.INCOMPLETE);

  const statsSummary = useMemo(() => {
    let drivers = 0;
    let aux = 0;
    shiftRecords.forEach(r => {
        // Solo sumamos los que están marcados como PRESENTE en el sistema
        if (r.driver?.status === StaffStatus.PRESENT) drivers++;
        if (r.replacementDriver?.status === StaffStatus.PRESENT) drivers++;
        
        if (r.aux1?.status === StaffStatus.PRESENT) aux++;
        if (r.aux2?.status === StaffStatus.PRESENT) aux++;
        if (r.aux3?.status === StaffStatus.PRESENT) aux++;
        if (r.aux4?.status === StaffStatus.PRESENT) aux++;
        if (r.replacementAux1?.status === StaffStatus.PRESENT) aux++;
        if (r.replacementAux2?.status === StaffStatus.PRESENT) aux++;
    });
    return { drivers, aux, totalZones: shiftRecords.length, complete: shiftRecords.filter(r => r.zoneStatus === ZoneStatus.COMPLETE).length };
  }, [shiftRecords]);

  const handleDownloadPDF = () => {
    const element = document.getElementById('report-to-pdf');
    if (!element) return;
    setIsGenerating(true);
    const opt = {
      margin: 10,
      filename: `REPORTE_GIRSU_TURNO_${shift}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsGenerating(false);
    });
  };

  const countAuxiliaries = (r: RouteRecord) => {
    let count = 0;
    // Solo contamos auxiliares PRESENTES
    if (r.aux1?.status === StaffStatus.PRESENT) count++;
    if (r.aux2?.status === StaffStatus.PRESENT) count++;
    if (r.aux3?.status === StaffStatus.PRESENT) count++;
    if (r.aux4?.status === StaffStatus.PRESENT) count++;
    if (r.replacementAux1?.status === StaffStatus.PRESENT) count++;
    if (r.replacementAux2?.status === StaffStatus.PRESENT) count++;
    return count;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-0 md:p-4 no-print">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        
        <div className="bg-[#1e1b2e] p-8 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-500/30 p-3 rounded-2xl border border-white/10">
              <ClipboardCheck size={32} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-3xl font-black uppercase tracking-tight leading-none">CIERRE DE OPERATIVO – TURNO {shift}</h3>
              <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-[0.3em] mt-2 opacity-80">RESUMEN TÉCNICO DE INCIDENCIAS CRÍTICAS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all">
            <X size={32} />
          </button>
        </div>

        <div id="report-to-pdf" className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 bg-white">
          <div className="grid grid-cols-4 gap-6 no-print-section">
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Rutas Totales</p>
                <p className="text-2xl font-black text-slate-800">{statsSummary.totalZones}</p>
             </div>
             <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Completas</p>
                <p className="text-2xl font-black text-emerald-800">{statsSummary.complete}</p>
             </div>
             <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Choferes Reales</p>
                <p className="text-2xl font-black text-indigo-800">{statsSummary.drivers}</p>
             </div>
             <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Auxiliares Reales</p>
                <p className="text-2xl font-black text-indigo-800">{statsSummary.aux}</p>
             </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
               <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest italic border-l-4 border-indigo-500 pl-4">
                DETALLE DE ZONAS CON FALTANTES (REPORTE DE SUPERVISIÓN)
              </h4>
              <span className="text-[10px] font-bold text-slate-300 uppercase">FECHA: {new Date().toLocaleDateString()}</span>
            </div>
            
            {incomplete.length > 0 ? (
              <div className="bg-white rounded-[2rem] border-2 border-slate-100 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#242b3d] text-white text-[10px] uppercase font-black h-14">
                    <tr>
                      <th className="pl-8 w-40">RUTA / ZONA</th>
                      <th className="text-center w-24">INTERNO</th>
                      <th className="text-center w-32">PATENTE</th>
                      <th className="w-72">EQUIPO (CHOFER ACTIVO)</th>
                      <th className="text-center w-20">AUX.</th>
                      <th className="px-8">NOVEDAD (FALTANTE REGISTRADO)</th>
                      <th className="text-center w-28">TN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incomplete.map(r => (
                      <tr key={r.id} className="h-24 text-[12px] uppercase font-bold text-slate-700 hover:bg-slate-50/50 transition-colors">
                        <td className="pl-8 font-black text-indigo-600 underline decoration-indigo-200 decoration-4 underline-offset-8 text-sm">{r.zone}</td>
                        <td className="text-center font-black text-slate-900 text-base">{r.internalId || '-'}</td>
                        <td className="text-center font-mono text-slate-400 tracking-tighter uppercase font-black">{r.domain || '-'}</td>
                        <td className="py-2">
                          <div className="flex flex-col">
                            {r.driver?.status === StaffStatus.PRESENT ? (
                                <span className="font-black text-slate-800">{r.driver.name}</span>
                            ) : r.replacementDriver?.status === StaffStatus.PRESENT ? (
                                <span className="font-black text-indigo-600">{r.replacementDriver.name} (REEMP)</span>
                            ) : (
                                <span className="text-red-500 font-black">SIN CHOFER PRESENTE</span>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="bg-slate-100 px-3 py-2 rounded-xl text-slate-600 font-black text-[11px]">
                            {countAuxiliaries(r)}
                          </span>
                        </td>
                        <td className="px-8 italic text-red-600 font-black leading-snug text-[12px] uppercase tracking-tight max-w-sm">
                          {r.supervisionReport || 'SIN REPORTE CARGADO'}
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
                  <h4 className="font-black text-emerald-900 uppercase text-2xl">Operativo 100% Completo</h4>
                  <p className="text-emerald-600 text-[12px] font-black uppercase tracking-[0.4em] mt-3">Todas las zonas fueron cubiertas satisfactoriamente.</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-10 bg-slate-50 border-t flex flex-col md:flex-row justify-end items-center gap-4">
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
              className="flex-1 md:flex-none px-14 py-6 bg-indigo-600 text-white rounded-3xl text-[13px] font-black uppercase shadow-2xl shadow-indigo-600/30 flex items-center justify-center gap-4 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Download size={24} />}
              {isGenerating ? 'GENERANDO...' : 'DESCARGAR REPORTE PDF'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 md:flex-none px-16 py-6 bg-white border-2 border-slate-200 text-slate-400 rounded-3xl text-[13px] font-black uppercase hover:bg-slate-50 transition-all">
              CERRAR
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
