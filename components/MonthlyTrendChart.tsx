
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';
import { getPrintContrastingColor } from '../constants';

interface MonthlyTrendChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
    color?: string;
    isCompact?: boolean;
    showAxes?: boolean;
    isPdfMode?: boolean;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ 
    data, 
    nutrient, 
    color,
    isCompact = false, 
    showAxes = false,
    isPdfMode = false 
}) => {
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.length > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1) : 0;
        const stdDev = Math.sqrt(variance);
        
        return {
            mean,
            ucl: mean + (1 * stdDev),
            lcl: mean - (1 * stdDev)
        };
    }, [data]);

    const chartColor = getPrintContrastingColor(color || "#3b82f6", isPdfMode);

    if (!data || data.length === 0 || !stats) {
        return <div className={`flex items-center justify-center h-full ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>No hay datos suficientes para una tendencia mensual.</div>;
    }

    const formatDate = (tickItem: string) => {
        return new Date(tickItem).toLocaleDateString('es-ES', { year: '2-digit', month: 'short' });
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={(isCompact && !showAxes) ? { top: 10, right: 10, left: 10, bottom: 5 } : {
                    top: 10,
                    right: 25,
                    left: -15,
                    bottom: 5,
                }}
            >
                {(!isCompact || showAxes) && (
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke={isPdfMode ? "#e2e8f0" : "rgba(255,255,255,0.08)"} 
                    />
                )}
                <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                    stroke={isPdfMode ? "#64748b" : "#94a3b8"} 
                    fontSize={10} 
                    fontWeight={isPdfMode ? 600 : 500}
                    tick={{ fill: isPdfMode ? '#334155' : '#cbd5e1' }}
                    hide={isCompact && !showAxes} 
                />
                {isCompact && !showAxes && <XAxis dataKey="date" hide={false} tick={false} axisLine={{ stroke: isPdfMode ? '#cbd5e1' : '#94a3b8', strokeWidth: 1 }} height={1} />}
                
                <YAxis 
                    stroke={isPdfMode ? "#64748b" : "#94a3b8"} 
                    fontSize={10} 
                    fontWeight={isPdfMode ? 600 : 500}
                    tick={{ fill: isPdfMode ? '#334155' : '#cbd5e1' }}
                    domain={['dataMin - 1', 'dataMax + 1']} 
                    hide={isCompact && !showAxes}
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
                        labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        formatter={(value: number) => [value.toFixed(2), 'Promedio Mensual']}
                    />
                )}
                {!isCompact && (
                    <Legend 
                        verticalAlign="top" 
                        height={36} 
                        formatter={() => (
                            <span className={isPdfMode ? "text-slate-800 font-bold text-xs" : "text-slate-200 text-xs"}>
                                Promedio Mensual ({nutrient})
                            </span>
                        )} 
                    />
                )}
                {!isCompact && !isPdfMode && (
                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#94a3b8" 
                        fill="#f8fafc"
                        tickFormatter={formatDate}
                    />
                )}

                {!isCompact && (
                    <ReferenceLine 
                        y={stats.ucl} 
                        stroke={isPdfMode ? "#dc2626" : "#f43f5e"} 
                        strokeDasharray="3 3" 
                        opacity={isPdfMode ? 0.85 : 0.5} 
                        label={{ position: 'insideTopRight', value: 'LCS', fill: isPdfMode ? '#dc2626' : '#f43f5e', fontSize: 10, fontWeight: 700 }} 
                    />
                )}
                {!isCompact && (
                    <ReferenceLine 
                        y={stats.mean} 
                        stroke={isPdfMode ? "#16a34a" : "#22c55e"} 
                        strokeDasharray="3 3" 
                        opacity={isPdfMode ? 0.85 : 0.5} 
                        label={{ position: 'insideTopRight', value: 'LC', fill: isPdfMode ? '#16a34a' : '#22c55e', fontSize: 10, fontWeight: 700 }} 
                    />
                )}
                {!isCompact && (
                    <ReferenceLine 
                        y={stats.lcl} 
                        stroke={isPdfMode ? "#dc2626" : "#f43f5e"} 
                        strokeDasharray="3 3" 
                        opacity={isPdfMode ? 0.85 : 0.5} 
                        label={{ position: 'insideBottomRight', value: 'LCI', fill: isPdfMode ? '#dc2626' : '#f43f5e', fontSize: 10, fontWeight: 700 }} 
                    />
                )}

                {isCompact && <ReferenceLine y={stats.ucl} stroke={isPdfMode ? "#dc2626" : "#f43f5e"} strokeDasharray="2 2" opacity={0.4} />}
                {isCompact && <ReferenceLine y={stats.mean} stroke={isPdfMode ? "#16a34a" : "#22c55e"} strokeDasharray="2 2" opacity={0.4} />}
                {isCompact && <ReferenceLine y={stats.lcl} stroke={isPdfMode ? "#dc2626" : "#f43f5e"} strokeDasharray="2 2" opacity={0.4} />}

                <Line isAnimationActive={false} 
                    type="monotone" 
                    dataKey="value" 
                    name={nutrient} 
                    stroke={chartColor} 
                    strokeWidth={isCompact ? 3 : (isPdfMode ? 2.5 : 2)} 
                    dot={isCompact ? false : { r: isPdfMode ? 3 : 3, fill: chartColor }} 
                    activeDot={{ r: 7 }} 
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

