
import React, { useState } from 'react';
import { RouteRecord } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, FileText, AlertCircle } from 'lucide-react';

interface GeminiInsightProps {
  data: RouteRecord[];
}

export const GeminiInsight: React.FC<GeminiInsightProps> = ({ data }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, isConfig?: boolean} | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      // Acceso directo a la variable de entorno según guías
      if (!process.env.API_KEY) {
        throw new Error("API_KEY no configurada en el entorno.");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Analiza el siguiente reporte de recolección de residuos de la ciudad de Quilmes. 
        Los datos corresponden a rutas logísticas en tiempo real.
        
        Tareas requeridas:
        1. Identificar rutas con estado "INCOMPLETE" y resumir las causas basándote en el campo "report".
        2. Detectar anomalías críticas en el tonelaje (por ejemplo, rutas con 0 TN o valores extremadamente altos).
        3. Evaluar la performance del turno: ¿Qué porcentaje de zonas están completas?
        
        Datos operativos:
        ${JSON.stringify(data.map(r => ({ 
            zona: r.zone, 
            estado: r.zoneStatus, 
            reporte_incidencia: r.supervisionReport, 
            tonelaje: r.tonnage 
        })), null, 2)}
        
        Respuesta: Utiliza un formato Markdown limpio y profesional, con viñetas. Sé directo, breve y enfocado en la toma de decisiones logística.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      // Acceso correcto a .text como propiedad
      setInsight(response.text || "No se pudo extraer el análisis del modelo.");
    } catch (err: any) {
      console.error("Gemini Error:", err);
      setError({ 
        message: err.message || "Error inesperado al conectar con el servicio de IA.",
        isConfig: err.message?.includes("configurada")
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-slate-100 rounded-[2.5rem] border border-indigo-100 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <div className="bg-white p-3 rounded-2xl shadow-sm text-indigo-600">
                <Sparkles className="w-6 h-6" />
            </div>
            <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-none">Análisis Operativo AI</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Inteligencia Artificial aplicada a logística</p>
            </div>
        </div>
        
        <button
          onClick={generateInsight}
          disabled={loading}
          className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-200 text-[11px] font-black uppercase tracking-widest active:scale-95"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          {loading ? 'Procesando Datos...' : 'Generar Reporte Ejecutivo'}
        </button>
      </div>

      {error && (
        <div className="p-6 bg-red-50 text-red-700 rounded-3xl mb-6 border-2 border-red-100 animate-in slide-in-from-top">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
                <p className="text-sm font-black uppercase">Atención Operativa</p>
                <p className="text-xs font-bold mt-1 opacity-80">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {insight && (
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-inner animate-in fade-in duration-500">
          <div className="prose prose-sm prose-slate max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-slate-700 font-medium">{insight}</pre>
          </div>
        </div>
      )}
      
      {!insight && !loading && !error && (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-[2rem]">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                Esperando comando para analizar incidencias del turno actual...
            </p>
        </div>
      )}
    </div>
  );
};
