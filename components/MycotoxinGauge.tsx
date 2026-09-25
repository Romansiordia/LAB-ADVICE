import React, { useMemo } from 'react';
import { ThresholdRange } from '../constants';

interface MycotoxinGaugeProps {
    value: number;
    maxObserved: number;
    thresholds: ThresholdRange;
    label: string;
    unit: string;
    stdDev?: number;
    rejectionRate?: number;
    onClick?: () => void;
    isPdfMode?: boolean;
}

export const MycotoxinGauge: React.FC<MycotoxinGaugeProps> = ({ 
    value, 
    maxObserved, 
    thresholds, 
    label, 
    unit,
    stdDev,
    rejectionRate,
    onClick,
    isPdfMode = false
}) => {
    const { min, max, part1_max, part2_max } = thresholds;

    // Determine current health status of average mycotoxin levels
    const { statusLabel, textClass, bgClass, borderClass, activeColor } = useMemo(() => {
        if (value <= part1_max) {
            return {
                statusLabel: 'BAJO (Seguro)',
                textClass: isPdfMode ? 'text-emerald-800 font-bold' : 'text-emerald-400',
                bgClass: isPdfMode ? 'bg-emerald-50' : 'bg-emerald-500/10',
                borderClass: isPdfMode ? 'border-emerald-300' : 'border-emerald-500/20',
                activeColor: 'bg-emerald-600'
            };
        } else if (value <= part2_max) {
            return {
                statusLabel: 'MEDIO (Límite)',
                textClass: isPdfMode ? 'text-amber-800 font-bold' : 'text-amber-400',
                bgClass: isPdfMode ? 'bg-amber-50' : 'bg-amber-500/10',
                borderClass: isPdfMode ? 'border-amber-300' : 'border-amber-500/20',
                activeColor: 'bg-amber-500'
            };
        } else {
            return {
                statusLabel: 'ALTO (Riesgo)',
                textClass: isPdfMode ? 'text-rose-800 font-bold' : 'text-red-400',
                bgClass: isPdfMode ? 'bg-rose-50' : 'bg-red-500/10',
                borderClass: isPdfMode ? 'border-rose-300' : 'border-red-500/20',
                activeColor: 'bg-red-600'
            };
        }
    }, [value, part1_max, part2_max, isPdfMode]);

    // Proportional widths for the multi-segment threshold bar
    const part1Width = (part1_max / max) * 100;
    const part2Width = ((part2_max - part1_max) / max) * 100;
    const part3Width = ((max - part2_max) / max) * 100;

    // Positioning of current values (percentage from 0 to 100%)
    const meanPercentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const maxPercentage = Math.min(Math.max((maxObserved / max) * 100, 0), 100);

    // Safe layout boundary clamping for the floating label to prevent card boundary overflow
    const labelPositionPercentage = Math.min(Math.max(meanPercentage, 16), 84);

    return (
        <div 
            id={`gauge-card-${label.toLowerCase().replace(/\s+/g, '-')}`} 
            onClick={onClick}
            className={`${
                isPdfMode 
                    ? 'bg-white rounded-xl border border-slate-200 shadow-sm text-slate-800' 
                    : 'bg-[#0f1d30] rounded-xl border border-white/5 shadow-lg group hover:border-[#38bdf8]/30'
            } p-5 flex flex-col justify-between relative overflow-hidden transition-all duration-300 cursor-pointer select-none`}
        >
            {/* Header */}
            <div className="w-full flex justify-between items-start mb-3">
                <div>
                    <h4 className={`font-bold text-sm transition-colors ${
                        isPdfMode ? 'text-slate-900' : 'text-slate-100 group-hover:text-ui-accent'
                    }`}>
                        {label}
                    </h4>
                    <span className={`text-[11px] font-medium ${
                        isPdfMode ? 'text-slate-500' : 'text-slate-400'
                    }`}>
                        {unit}
                    </span>
                </div>
                <div className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${bgClass} ${textClass} ${borderClass} tracking-wide`}>
                    {statusLabel}
                </div>
            </div>

            {/* Proportional Linear Gauge */}
            <div className="w-full space-y-4 my-2">
                {/* Pointer Values Label Stage */}
                <div className="relative h-5">
                    {/* Floating Average Indicator Label clamped to keep centered within card boundaries */}
                    <div 
                        className="absolute -top-1 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-500 ease-out"
                        style={{ left: `${labelPositionPercentage}%` }}
                    >
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white ${activeColor} shadow-md whitespace-nowrap`}>
                            {value.toFixed(2)} {unit}
                        </span>
                        <span className="w-1.5 h-1.5 rotate-45 bg-inherit -mt-1" style={{ backgroundColor: value <= part1_max ? '#10b981' : value <= part2_max ? '#f59e0b' : '#ef4444' }} />
                    </div>
                </div>

                {/* Track bar split into proportional zones */}
                <div className={`relative h-2.5 w-full rounded-full overflow-visible flex ${
                    isPdfMode ? 'bg-slate-200' : 'bg-slate-800'
                }`}>
                    <div 
                        style={{ width: `${part1Width}%` }} 
                        className={`h-full transition-colors rounded-l-full relative ${
                            isPdfMode ? 'bg-emerald-400/50' : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
                        }`}
                        title={`Límite de Seguridad: 0 a ${part1_max} ${unit}`}
                    />
                    <div 
                        style={{ width: `${part2Width}%` }} 
                        className={`h-full transition-colors relative ${
                            isPdfMode ? 'bg-amber-400/50' : 'bg-amber-500/20 group-hover:bg-amber-500/30'
                        }`}
                        title={`Límite de Alerta: ${part1_max} a ${part2_max} ${unit}`}
                    />
                    <div 
                        style={{ width: `${part3Width}%` }} 
                        className={`h-full transition-colors rounded-r-full relative ${
                            isPdfMode ? 'bg-rose-400/50' : 'bg-red-500/20 group-hover:bg-red-500/30'
                        }`}
                        title={`Límite Crítico: ${part2_max} a ${max} ${unit}`}
                    />

                    {/* Zone Boundary Lines ticks */}
                    <div 
                        className={`absolute top-0 bottom-0 w-[1px] z-1 ${
                            isPdfMode ? 'bg-slate-400' : 'bg-white/20'
                        }`} 
                        style={{ left: `${part1Width}%` }}
                    />
                    <div 
                        className={`absolute top-0 bottom-0 w-[1px] z-1 ${
                            isPdfMode ? 'bg-slate-400' : 'bg-white/20'
                        }`} 
                        style={{ left: `${part1Width + part2Width}%` }}
                    />

                    {/* Average Point Position Element */}
                    <div 
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 ${
                            isPdfMode ? 'border-white shadow-md' : 'border-[#0f1d30]'
                        } ${activeColor} z-20 transition-all duration-500 ease-out`}
                        style={{ left: `calc(${meanPercentage}% - 8px)` }}
                    />

                    {/* Peak Max Observed Marker Tick */}
                    <div 
                        className={`absolute -top-1 -bottom-1 w-[2px] ${
                            isPdfMode ? 'bg-rose-600 border border-white' : 'bg-red-400 border border-[#0f1d30]'
                        } shadow-sm z-10 transition-all duration-500 ease-out`}
                        style={{ left: `${maxPercentage}%` }}
                        title={`Máximo detectado: ${maxObserved.toFixed(2)} ${unit}`}
                    />
                </div>

                {/* Scale Axis text labels */}
                <div className={`flex justify-between items-center text-[9px] font-mono pt-0.5 ${
                    isPdfMode ? 'text-slate-600 font-semibold' : 'text-slate-500'
                }`}>
                    <span>{min}</span>
                    <span 
                        className={`absolute transform -translate-x-1/2 text-[9px] font-bold ${
                            isPdfMode ? 'text-emerald-700' : 'text-emerald-500/80'
                        }`} 
                        style={{ left: `calc(${part1Width}% + 20px)` }}
                    >
                        {part1_max}
                    </span>
                    <span 
                        className={`absolute transform -translate-x-1/2 text-[9px] font-bold ${
                            isPdfMode ? 'text-amber-700' : 'text-amber-500/80'
                        }`} 
                        style={{ left: `calc(${part1Width + part2Width}% + 20px)` }}
                    >
                        {part2_max}
                    </span>
                    <span>{max}</span>
                </div>
            </div>

            {/* Bottom integrated details section matching KPI cards data */}
            <div className={`w-full space-y-1.5 pt-3 mt-3 border-t text-[11px] ${
                isPdfMode ? 'border-slate-200 text-slate-700' : 'border-white/5 text-slate-400'
            }`}>
                {/* Standard Deviation */}
                <div className="flex items-center justify-between">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        isPdfMode ? 'text-slate-600' : 'text-slate-500'
                    }`}>Desv. Estándar (DE):</span>
                    <span className={`font-mono font-bold text-[11px] ${
                        isPdfMode ? 'text-slate-900' : 'text-slate-200'
                    }`}>
                        {stdDev !== undefined ? stdDev.toFixed(2) : 'N/A'}<span className={`text-[9.5px] ml-0.5 ${isPdfMode ? 'text-slate-500' : 'text-slate-500'}`}>{unit}</span>
                    </span>
                </div>

                {/* Max Observed */}
                <div className="flex items-center justify-between">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider font-sans ${
                        isPdfMode ? 'text-slate-600' : 'text-slate-500'
                    }`}>Máx Observado:</span>
                    <span className={`font-mono font-black text-[11px] ${
                        isPdfMode ? 'text-rose-700' : 'text-red-400'
                    }`}>
                        {maxObserved.toFixed(2)}<span className={`text-[9.5px] ml-0.5 ${isPdfMode ? 'text-rose-600' : 'text-red-500/70'}`}>{unit}</span>
                    </span>
                </div>

                {/* Rej rate / Fuera de Limite */}
                <div className="flex items-center justify-between pt-0.5">
                    <span className={`text-[10.5px] font-bold uppercase tracking-wider ${
                        isPdfMode ? 'text-slate-600' : 'text-slate-500'
                    }`}>Fuera de Límites:</span>
                    <span className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-bold ${
                        rejectionRate && rejectionRate > 0 
                            ? (isPdfMode ? 'bg-rose-50 text-rose-800 border border-rose-300' : 'bg-red-500/10 text-red-400 border border-red-500/20')
                            : (isPdfMode ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25')
                    }`}>
                        {rejectionRate !== undefined ? `${rejectionRate.toFixed(1)}%` : '0.0%'}
                    </span>
                </div>
            </div>
        </div>
    );
};

