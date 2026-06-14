
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HistogramBin } from '../types';

interface HistogramChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
    color?: string;
    isCompact?: boolean;
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

export const HistogramChart: React.FC<HistogramChartProps> = ({ data, nutrient, color, isCompact = false }) => {

    const histogramData = useMemo(() => createHistogramData(data, isCompact ? 8 : 12), [data, isCompact]);

    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">No hay datos disponibles para esta selección.</div>;
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
                {!isCompact && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
                <XAxis 
                    dataKey="range" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight={500}
                    tick={{ fill: '#cbd5e1' }}
                    angle={-30} 
                    textAnchor="end" 
                    height={50} 
                    hide={isCompact}
                />
                {isCompact && <XAxis dataKey="range" hide={false} tick={false} axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }} height={1} />}
                
                <YAxis 
                    allowDecimals={false} 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={500}
                    tick={{ fill: '#cbd5e1' }}
                    hide={isCompact}
                />
                
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
                {!isCompact && <Legend />}
                <Bar isAnimationActive={false} 
                    dataKey="count" 
                    name="Frecuencia" 
                    fill={color || "#10b981"} 
                    radius={[4, 4, 0, 0]} 
                    animationDuration={1000}
                />
            </BarChart>
        </ResponsiveContainer>
    );
};
