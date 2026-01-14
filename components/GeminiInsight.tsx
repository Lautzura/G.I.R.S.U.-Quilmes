
import React, { useState } from 'react';
import { RouteRecord } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Loader2, FileText, AlertCircle } from 'lucide-react';

interface GeminiInsightProps {
  data: RouteRecord[];
  dailyContext: any; // Contexto estructurado del día
}

export const GeminiInsight: React.FC<GeminiInsightProps> = ({ data, dailyContext }) => {
  const [insight, setInsight] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{message: string, isConfig?: boolean} | null>(null);

  const generateInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!process.env.API_KEY) {
        throw new Error("API_KEY no configurada en el entorno.");
      }

      // Initialize AI client as per SDK guidelines
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
        Analiza el siguiente contexto operativo de recolección de residuos (GIRSU Quilmes).
        Utiliza los datos estructurados para dar un diagnóstico ejecutivo.
        
        CONTEXTO ESTRUCTURADO:
        ${JSON.stringify(dailyContext, null, 2)}
        
        REGISTROS DETALLADOS DE INCIDENCIAS:
        ${JSON.stringify(data.filter(r => r.zoneStatus !== 'COMPLETA').map(r => ({
            zona: r.zone,
            incidencia: r.supervisionReport || "Sin reporte",
            estado: r.zoneStatus
        })), null, 2)}
        
        TAREAS:
        1. Resumen de Flota: ¿Cuántos camiones (internos) están operando y si hay zonas sin camión asignado?
        2. Análisis de Dotación: Detectar si hay zonas con falta de auxiliares o choferes.
        3. Alertas Críticas: Menciona zonas incompletas y la razón reportada.
        
        Formato: Markdown profesional con emojis logísticos. Sé breve y contundente.
      `;

      // Use gemini-3-pro-preview for complex reasoning tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
      });

      // Extract text using the .text property directly as per latest SDK guidelines
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
          {loading ? 'Analizando Contexto...' : 'Generar Reporte Ejecutivo'}
        </button>
      </div>

      {error && (
        <div className="p-6 bg-red-50 text-red-700 rounded-3xl mb-6 border-2 border-red-100">
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
                Listo para procesar el contexto operativo de {data.length} zonas...
            </p>
        </div>
      )}
    </div>
  );
};
