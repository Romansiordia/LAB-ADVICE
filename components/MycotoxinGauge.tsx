import React, { useMemo } from 'react';
import { ThresholdRange } from '../constants';

interface MycotoxinGaugeProps {
    value: number;
    maxObserved: number;
    thresholds: ThresholdRange;
    label: string;
    unit: string;
}

export const MycotoxinGauge: React.FC<MycotoxinGaugeProps> = ({ value, maxObserved, thresholds, label, unit }) => {
    const { min, max, part1_max, part2_max } = thresholds;

    // Determine current health status of average mycotoxin levels
    const { statusLabel, textClass, bgClass, borderClass, activeColor } = useMemo(() => {
        if (value <= part1_max) {
            return {
                statusLabel: 'BAJO (Seguro)',
                textClass: 'text-emerald-400',
                bgClass: 'bg-emerald-500/10',
                borderClass: 'border-emerald-500/20',
                activeColor: 'bg-emerald-500'
            };
        } else if (value <= part2_max) {
            return {
                statusLabel: 'MEDIO (Límite)',
                textClass: 'text-amber-400',
                bgClass: 'bg-amber-500/10',
                borderClass: 'border-amber-500/20',
                activeColor: 'bg-amber-500'
            };
        } else {
            return {
                statusLabel: 'ALTO (Riesgo)',
                textClass: 'text-red-400',
                bgClass: 'bg-red-500/10',
                borderClass: 'border-red-500/20',
                activeColor: 'bg-red-500'
            };
        }
    }, [value, part1_max, part2_max]);

    // Proportional widths for the multi-segment threshold bar
    const part1Width = (part1_max / max) * 100;
    const part2Width = ((part2_max - part1_max) / max) * 100;
    const part3Width = ((max - part2_max) / max) * 100;

    // Positioning of current values (percentage from 0 to 100%)
    const meanPercentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const maxPercentage = Math.min(Math.max((maxObserved / max) * 100, 0), 100);

    return (
        <div 
            id={`gauge-card-${label.toLowerCase().replace(/\s+/g, '-')}`} 
            className="bg-[#0f1d30] rounded-xl border border-white/5 p-5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-[#38bdf8]/20 transition-all duration-300"
        >
            {/* Header */}
            <div className="w-full flex justify-between items-start mb-4">
                <div>
                    <h4 className="font-semibold text-slate-100 text-sm group-hover:text-white transition-colors">
                        {label}
                    </h4>
                    <span className="text-[11px] text-slate-400">
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
                    {/* Floating Average Indicator Label */}
                    <div 
                        className="absolute -top-1 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-500 ease-out"
                        style={{ left: `${meanPercentage}%` }}
                    >
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${activeColor} shadow-sm font-mono whitespace-nowrap`}>
                            {value.toFixed(2)} {unit}
                        </span>
                        <span className="w-1.5 h-1.5 rotate-45 bg-inherit -mt-1 bg-[#1e293b]" />
                    </div>
                </div>

                {/* Track bar split into proportional zones */}
                <div className="relative h-2.5 w-full rounded-full overflow-visible bg-slate-800 flex">
                    <div 
                        style={{ width: `${part1Width}%` }} 
                        className="h-full bg-emerald-500/20 group-hover:bg-emerald-500/30 transition-colors rounded-l-full relative"
                        title={`Límite de Seguridad: 0 a ${part1_max} ${unit}`}
                    />
                    <div 
                        style={{ width: `${part2Width}%` }} 
                        className="h-full bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors relative"
                        title={`Límite de Alerta: ${part1_max} a ${part2_max} ${unit}`}
                    />
                    <div 
                        style={{ width: `${part3Width}%` }} 
                        className="h-full bg-red-500/20 group-hover:bg-red-500/30 transition-colors rounded-r-full relative"
                        title={`Límite Crítico: ${part2_max} a ${max} ${unit}`}
                    />

                    {/* Zone Boundary Lines ticks */}
                    <div 
                        className="absolute top-0 bottom-0 w-[1px] bg-white/20 z-1" 
                        style={{ left: `${part1Width}%` }}
                    />
                    <div 
                        className="absolute top-0 bottom-0 w-[1px] bg-white/20 z-1" 
                        style={{ left: `${part1Width + part2Width}%` }}
                    />

                    {/* Average Point Position Element */}
                    <div 
                        className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#0f1d30] shadow-md ${activeColor} z-20 transition-all duration-500 ease-out`}
                        style={{ left: `calc(${meanPercentage}% - 8px)` }}
                    />

                    {/* Peak Max Observed Marker Tick */}
                    <div 
                        className="absolute -top-1 -bottom-1 w-[2px] bg-red-400 border border-[#0f1d30] shadow-sm z-10 transition-all duration-500 ease-out"
                        style={{ left: `${maxPercentage}%` }}
                        title={`Máximo detectado: ${maxObserved.toFixed(2)} ${unit}`}
                    />
                </div>

                {/* Scale Axis text labels */}
                <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 pt-0.5">
                    <span>{min}</span>
                    <span 
                        className="absolute transform -translate-x-1/2 text-[9px] font-semibold text-emerald-500/80" 
                        style={{ left: `calc(${part1Width}% + 20px)` }}
                    >
                        {part1_max}
                    </span>
                    <span 
                        className="absolute transform -translate-x-1/2 text-[9px] font-semibold text-amber-500/80" 
                        style={{ left: `calc(${part1Width + part2Width}% + 20px)` }}
                    >
                        {part2_max}
                    </span>
                    <span>{max}</span>
                </div>
            </div>

            {/* Bottom details block */}
            <div className="w-full grid grid-cols-2 gap-2 pt-3 mt-1 border-t border-white/5 text-[10px] text-slate-400">
                <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                    <span>Promedio:</span>
                    <strong className="font-mono text-slate-200">{value.toFixed(2)}</strong>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    <span>Máx Observado:</span>
                    <strong className="font-mono text-red-400">{maxObserved.toFixed(2)}</strong>
                </div>
            </div>
        </div>
    );
};
