
import { AbsenceReason } from './types';

/**
 * Retorna las clases de Tailwind correspondientes al motivo de ausencia.
 * Se utiliza para pintar las celdas de la tabla y las tarjetas de personal.
 */
export const getAbsenceStyles = (reason: string) => {
    const r = (reason || '').toUpperCase();
    
    // Categoría: Falta Directa (Rojo no tan intenso)
    if (r === 'FALTA' || r.includes('INJUSTIFICADA') || r.includes('95') || r.includes('SUSPENSION')) {
        return 'bg-red-500 text-white border-red-600 font-black shadow-inner';
    }
    
    // Categoría: Vacaciones (Ámbar/Naranja)
    if (r.includes('VACACIONES')) {
        return 'bg-amber-600 text-white border-amber-700 font-black shadow-inner';
    }
    
    // Categoría: Médicas / ART (Azul)
    if (r.includes('MEDICA') || r.includes('ART') || r.includes('NACIMIENTO') || r.includes('DUELO')) {
        return 'bg-blue-800 text-white border-blue-900 font-black shadow-inner';
    }
    
    // Categoría: Licencias / Gremial (Índigo)
    if (r.includes('LICENCIA') || r.includes('EXAMEN') || r.includes('FEMENINO')) {
        return 'bg-indigo-800 text-white border-indigo-900 font-black shadow-inner';
    }
    
    // Fallback para cualquier otra falta (Gris oscuro)
    return 'bg-slate-700 text-white border-slate-800 font-black';
};

/**
 * Mapa de colores para los botones de selección rápida de motivos.
 */
export const REASON_COLORS: Record<string, string> = {
    [AbsenceReason.ART]: 'bg-blue-600 text-white hover:bg-blue-700',
    [AbsenceReason.VACACIONES]: 'bg-amber-500 text-white hover:bg-amber-600',
    [AbsenceReason.LICENCIA_MEDICA]: 'bg-blue-700 text-white hover:bg-blue-800',
    [AbsenceReason.SUSPENSION]: 'bg-red-800 text-white hover:bg-red-900',
    [AbsenceReason.ARTICULO_95]: 'bg-red-900 text-white hover:bg-red-950',
    [AbsenceReason.RESERVA]: 'bg-indigo-500 text-white hover:bg-indigo-600',
    [AbsenceReason.NACIMIENTO]: 'bg-sky-600 text-white hover:bg-sky-700',
    [AbsenceReason.CASAMIENTO]: 'bg-pink-600 text-white hover:bg-pink-700',
    [AbsenceReason.DUELO]: 'bg-slate-900 text-white hover:bg-black',
};
