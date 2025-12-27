
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
    // Verificación de API KEY para entorno de producción (Vercel)
    if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
        setError({
            message: "Falta configurar la 'API_KEY' en las variables de entorno de Vercel.",
            isConfig: true
        });
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Analiza el siguiente reporte de recolección de residuos de Quilmes. 
        Los datos están en formato JSON.
        
        Identifica:
        1. Las zonas con estado "INCOMPLETE" y resume sus problemas basándote en el "supervisionReport".
        2. Cualquier anomalía en el tonelaje (muy bajo o muy alto).
        3. Resume la performance general del turno.
        
        Datos:
        ${JSON.stringify(data.map(r => ({ zone: r.zone, status: r.zoneStatus, report: r.supervisionReport, tonnage: r.tonnage })), null, 2)}
        
        Formatea la respuesta en Markdown limpio, usando viñetas. Sé conciso y profesional, como un jefe de operaciones que informa al Secretario.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setInsight(response.text || "No se pudo generar el análisis.");
    } catch (err) {
      console.error(err);
      setError({ message: "Error de conexión con Gemini. Verifique los límites de su API Key." });
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
                {error.isConfig && (
                    <div className="mt-4 p-3 bg-white/50 rounded-xl text-[10px] font-bold">
                        Paso: Vercel Dashboard > Settings > Environment Variables > Key: API_KEY
                    </div>
                )}
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
