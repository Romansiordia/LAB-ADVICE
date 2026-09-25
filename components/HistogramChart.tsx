
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HistogramBin } from '../types';
import { getPrintContrastingColor } from '../constants';

interface HistogramChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
    color?: string;
    isCompact?: boolean;
    isPdfMode?: boolean;
}

const createHistogramData = (data: { value: number }[], numBins = 10): HistogramBin[] => {
    if (data.length === 0) return [];

    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
         return [{ range: `${min.toFixed(2)}`, count: values.length }];
    }

    const binSize = (max - min) / numBins;
    const bins: HistogramBin[] = Array.from({ length: numBins }, (_, i) => {
        const lowerBound = min + i * binSize;
        const upperBound = min + (i + 1) * binSize;
        return {
            range: `${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)}`,
            count: 0
        };
    });

    values.forEach(value => {
        let binIndex = Math.floor((value - min) / binSize);
        // Special case for the max value
        if (value === max) {
            binIndex = numBins - 1;
        }
        if (bins[binIndex]) {
            bins[binIndex].count++;
        }
    });

    return bins;
};

export const HistogramChart: React.FC<HistogramChartProps> = ({ data, nutrient, color, isCompact = false, isPdfMode = false }) => {

    const histogramData = useMemo(() => createHistogramData(data, isCompact ? 8 : 12), [data, isCompact]);
    const barFillColor = getPrintContrastingColor(color || "#10b981", isPdfMode);

    if (!data || data.length === 0) {
        return <div className={`flex items-center justify-center h-full ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay datos disponibles para esta selección.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={histogramData}
                margin={isCompact ? { top: 10, right: 10, left: 10, bottom: 5 } : {
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                }}
            >
                {!isCompact && (
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={isPdfMode ? "#e2e8f0" : "rgba(255,255,255,0.1)"} 
                    />
                )}
                <XAxis 
                    dataKey="range" 
                    stroke={isPdfMode ? "#64748b" : "#94a3b8"} 
                    fontSize={10} 
                    fontWeight={isPdfMode ? 600 : 500}
                    tick={{ fill: isPdfMode ? '#334155' : '#cbd5e1' }}
                    angle={-30} 
                    textAnchor="end" 
                    height={50} 
                    hide={isCompact}
                />
                {isCompact && <XAxis dataKey="range" hide={false} tick={false} axisLine={{ stroke: isPdfMode ? '#cbd5e1' : '#94a3b8', strokeWidth: 1 }} height={1} />}
                
                <YAxis 
                    allowDecimals={false} 
                    stroke={isPdfMode ? "#64748b" : "#94a3b8"} 
                    fontSize={11} 
                    fontWeight={isPdfMode ? 600 : 500}
                    tick={{ fill: isPdfMode ? '#334155' : '#cbd5e1' }}
                    hide={isCompact}
                />
                
                {!isPdfMode && (
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#132641', 
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            borderRadius: '8px',
                            fontSize: '12px'
                        }} 
                        labelStyle={{ color: '#f1f5f9', fontWeight: 'bold' }}
                        cursor={{ fill: '#f1f5f9' }}
                    />
                )}
                {!isCompact && (
                    <Legend 
                        formatter={() => (
                            <span className={isPdfMode ? "text-slate-800 font-bold text-xs" : "text-slate-200 text-xs"}>
                                Frecuencia
                            </span>
                        )} 
                    />
                )}
                <Bar isAnimationActive={false} 
                    dataKey="count" 
                    name="Frecuencia" 
                    fill={barFillColor} 
                    stroke={isPdfMode ? barFillColor : undefined}
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

