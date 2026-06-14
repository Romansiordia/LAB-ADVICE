
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';

interface TrendChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
    color?: string;
    isCompact?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, nutrient, color, isCompact = false }) => {
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const values = data.map(d => d.value);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.length > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1) : 0;
        const stdDev = Math.sqrt(variance);
        
        return {
            mean,
            ucl: mean + (1 * stdDev), // Límite de Control Superior
            lcl: mean - (1 * stdDev)  // Límite de Control Inferior
        };
    }, [data]);

    if (!data || data.length === 0 || !stats) {
        return <div className="flex items-center justify-center h-full text-slate-400">No hay datos disponibles para esta selección.</div>;
    }

    const formatDate = (tickItem: string) => {
        return new Date(tickItem).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={isCompact ? { top: 10, right: 10, left: 10, bottom: 5 } : {
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                }}
            >
                {!isCompact && <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />}
                <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate} 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={500}
                    tick={{ fill: '#cbd5e1' }}
                    hide={isCompact} 
                    axisLine={isCompact ? { stroke: '#94a3b8', strokeWidth: 1 } : true}
                />
                {/* We show the XAxis line even in compact mode to provide a baseline */}
                {isCompact && <XAxis dataKey="date" hide={false} tick={false} axisLine={{ stroke: '#94a3b8', strokeWidth: 1 }} height={1} />}
                
                <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    fontWeight={500}
                    tick={{ fill: '#cbd5e1' }}
                    domain={['auto', 'auto']} 
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
                    labelFormatter={(label) => new Date(label).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                />
                {!isCompact && <Legend verticalAlign="top" height={36} formatter={() => `Tendencia Diaria (${nutrient})`} />}
                {!isCompact && (
                    <Brush 
                        dataKey="date" 
                        height={30} 
                        stroke="#94a3b8" 
                        fill="#f8fafc"
                        tickFormatter={formatDate}
                    />
                )}
                
                {!isCompact && <ReferenceLine y={stats.ucl} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopRight', value: 'LCS', fill: '#f43f5e', fontSize: 10 }} />}
                {!isCompact && <ReferenceLine y={stats.mean} stroke="#22c55e" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideTopRight', value: 'LC', fill: '#22c55e', fontSize: 10 }} />}
                {!isCompact && <ReferenceLine y={stats.lcl} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.5} label={{ position: 'insideBottomRight', value: 'LCI', fill: '#f43f5e', fontSize: 10 }} />}

                {isCompact && <ReferenceLine y={stats.ucl} stroke="#f43f5e" strokeDasharray="2 2" opacity={0.3} />}
                {isCompact && <ReferenceLine y={stats.mean} stroke="#22c55e" strokeDasharray="2 2" opacity={0.3} />}
                {isCompact && <ReferenceLine y={stats.lcl} stroke="#f43f5e" strokeDasharray="2 2" opacity={0.3} />}

                <Line isAnimationActive={false} 
                    type="monotone" 
                    dataKey="value" 
                    name={nutrient} 
                    stroke={color || "#06b6d4"} 
                    strokeWidth={isCompact ? 3 : 2} 
                    dot={isCompact ? false : { r: 2 }} 
                    activeDot={{ r: 6 }} 
                    connectNulls
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};
