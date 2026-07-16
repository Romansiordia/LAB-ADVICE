import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShieldAlert, 
  CheckCircle2, 
  Award, 
  Percent, 
  AlertTriangle,
  Activity,
  UserCheck
} from 'lucide-react';

interface ParameterComparison {
  key: string;
  label: string;
  clientMean: number;
  globalMean: number;
  diffPct: number;
}

interface ClientComparisonProps {
  clientName: string;
  category: 'nutrients' | 'mycotoxins';
  kpis: {
    avgDiffPct: number;
    clientRejectionRate: number;
    globalRejectionRate: number;
    rejectionDiff: number;
    clientSamples: number;
    globalSamples: number;
    parameterBreakdown: ParameterComparison[];
  } | null;
}

export const ClientComparison: React.FC<ClientComparisonProps> = ({ clientName, category, kpis }) => {
  if (!kpis) return null;

  const isMycotoxins = category === 'mycotoxins';
  
  // KPI 1: Mean deviation from global average
  // For nutrients, a positive deviation is GOOD (higher concentration of nutrients).
  // For mycotoxins, a negative deviation is GOOD (lower toxicity).
  const isKpi1Positive = isMycotoxins ? kpis.avgDiffPct < 0 : kpis.avgDiffPct > 0;
  
  // KPI 2: Outlier / Rejection rate difference
  // For both categories, a lower rejection rate than global is GOOD (negative rejectionDiff).
  const isKpi2Positive = kpis.rejectionDiff < 0;

  // Smart dynamic decimal formatting based on magnitude
  const formatVal = (val: number) => {
    if (val === 0) return '0.00';
    if (Math.abs(val) < 10) return val.toFixed(3);
    return val.toFixed(2);
  };

  return (
    <div 
      id="client-comparison-section" 
      className="bg-gradient-to-br from-[#0c192e] to-[#040d1a] border-2 border-ui-accent/30 rounded-2xl p-5 md:p-6 mb-8 shadow-[0_0_20px_rgba(0,222,255,0.06)] animate-fade-in"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-ui-border pb-4 mb-5 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-ui-accent/10 border border-ui-accent/30 rounded-xl text-ui-accent">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base md:text-lg tracking-tight">
              Análisis Comparativo del Cliente: <span className="text-ui-accent">{clientName}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativa de desempeño y calidad frente al promedio global histórico.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 bg-ui-darkest/60 px-3 py-1.5 rounded-lg border border-ui-border font-mono">
          <span className="flex items-center text-ui-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-ui-accent mr-1.5 animate-pulse" />
            Muestras Cliente: {kpis.clientSamples}
          </span>
          <span className="mx-1 text-slate-600">|</span>
          <span>Historial Global: {kpis.globalSamples}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* KPI Card 1: Concentration / Quality Deviation */}
        <div 
          id="kpi-card-deviation" 
          className="bg-[#091122]/90 border border-ui-border/80 rounded-xl p-4 flex flex-col justify-between hover:border-ui-accent/20 transition-all duration-300 relative overflow-hidden group"
        >
          {/* Subtle background glow */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-[50px] opacity-10 transition-all duration-500 group-hover:opacity-20 ${
            isKpi1Positive ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isMycotoxins ? 'Nivel de Toxinas vs. Global' : 'Calidad Nutricional vs. Global'}
              </p>
              <h4 className="text-2xl font-black text-slate-100 mt-2 flex items-baseline font-mono">
                {kpis.avgDiffPct > 0 ? '+' : ''}{kpis.avgDiffPct.toFixed(2)}%
                <span className="text-xs font-normal text-slate-400 ml-1.5">de desv. media</span>
              </h4>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isKpi1Positive 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {isKpi1Positive ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ui-border/40 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {isMycotoxins 
                ? 'Nivel de micotoxinas comparado con el estándar promedio.' 
                : 'Densidad de nutrientes clave respecto al promedio de planta.'}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
              isKpi1Positive 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
            }`}>
              {isMycotoxins 
                ? (isKpi1Positive ? 'Menos Riesgo' : 'Mayor Riesgo') 
                : (isKpi1Positive ? 'Mayor Calidad' : 'Menor Calidad')}
            </span>
          </div>
        </div>

        {/* KPI Card 2: Outlier / Rejection Rate comparison */}
        <div 
          id="kpi-card-rejection" 
          className="bg-[#091122]/90 border border-ui-border/80 rounded-xl p-4 flex flex-col justify-between hover:border-ui-accent/20 transition-all duration-300 relative overflow-hidden group"
        >
          {/* Subtle background glow */}
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-[50px] opacity-10 transition-all duration-500 group-hover:opacity-20 ${
            isKpi2Positive ? 'bg-emerald-500' : 'bg-amber-500'
          }`} />

          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Descarte Comparativo de Lotes
              </p>
              <h4 className="text-2xl font-black text-slate-100 mt-2 flex items-baseline font-mono">
                {kpis.clientRejectionRate.toFixed(1)}% 
                <span className="text-xs text-slate-500 font-normal mx-1.5">vs</span> 
                <span className="text-slate-400">{kpis.globalRejectionRate.toFixed(1)}%</span>
              </h4>
            </div>
            <div className={`p-2.5 rounded-xl border ${
              isKpi2Positive 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {isKpi2Positive ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-ui-border/40 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-400">
              {kpis.rejectionDiff <= 0 
                ? `La tasa de rechazo del cliente está -${Math.abs(kpis.rejectionDiff).toFixed(1)}% por debajo del promedio.` 
                : `La tasa de rechazo del cliente está +${Math.abs(kpis.rejectionDiff).toFixed(1)}% por encima del promedio.`}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ${
              isKpi2Positive 
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}>
              {isKpi2Positive ? 'Estable' : 'Inconsistente'}
            </span>
          </div>
        </div>
      </div>

      {/* Parameter Breakdown Details Table */}
      {kpis.parameterBreakdown && kpis.parameterBreakdown.length > 0 && (
        <div id="parameter-breakdown-details" className="mb-6 bg-[#091122]/70 border border-ui-border/80 rounded-xl overflow-hidden shadow-inner">
          <div className="px-4 py-3 bg-[#0a1424] border-b border-ui-border/80 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-ui-accent" />
              Desviación por {isMycotoxins ? 'Micotoxina' : 'Nutriente / Parámetro'}
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Valores de media ponderada</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-ui-border/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-[#060c18]">
                  <th className="px-4 py-3">Parámetro</th>
                  <th className="px-4 py-3 text-right">Promedio Cliente</th>
                  <th className="px-4 py-3 text-right">Promedio Global</th>
                  <th className="px-4 py-3 text-right">Desviación respecto al Global</th>
                  <th className="px-4 py-3 text-center">Inocuidad / Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border/40 text-xs text-slate-300">
                {kpis.parameterBreakdown.map((param) => {
                  const isPositiveDev = isMycotoxins ? param.diffPct < 0 : param.diffPct > 0;
                  
                  return (
                    <tr key={param.key} className="hover:bg-ui-accent/5 transition-colors duration-150">
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {param.label}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-100">
                        {formatVal(param.clientMean)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-400">
                        {formatVal(param.globalMean)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-black ${
                        isPositiveDev ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {param.diffPct > 0 ? '+' : ''}{param.diffPct.toFixed(2)}%
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                          isPositiveDev 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        }`}>
                          {isPositiveDev ? (isMycotoxins ? 'Menor Riesgo' : 'Óptimo') : (isMycotoxins ? 'Mayor Riesgo' : 'Por debajo')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 p-3.5 bg-ui-darkest/45 border border-ui-border/60 rounded-xl flex items-start space-x-3">
        <div className="p-1.5 bg-ui-accent/10 border border-ui-accent/20 rounded-lg text-ui-accent mt-0.5 shrink-0">
          <Activity className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed text-slate-300">
          <strong className="text-slate-200">Interpretación Pecuaria: </strong>
          {isMycotoxins ? (
            isKpi1Positive ? (
              <span>El lote de {clientName} presenta una inocuidad superior a la media, con menor incidencia de toxinas peligrosas para la salud animal.</span>
            ) : (
              <span>Atención: Este cliente registra niveles de micotoxinas superiores al estándar global, sugiriendo la necesidad de implementar secuestrantes o revisión inmediata del almacenamiento.</span>
            )
          ) : (
            isKpi1Positive ? (
              <span>Los análisis de {clientName} demuestran una excelente riqueza nutricional (proteínas, grasa o parámetros clave) por encima de la media histórica de la planta.</span>
            ) : (
              <span>El suministro de {clientName} se encuentra ligeramente por debajo de la media nutricional del material. Se recomienda ajustar formulaciones para asegurar el aporte dietario óptimo.</span>
            )
          )}
        </div>
      </div>
    </div>
  );
};
