
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush, ReferenceLine } from 'recharts';

interface TrendChartProps {
    data: { date: string, value: number, noId?: string, lote?: string }[];
    nutrient: string;
    color?: string;
    isCompact?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dataItem = payload[0].payload;
        return (
            <div className="bg-[#132641] border border-white/10 p-3 rounded-lg shadow-xl text-xs space-y-1.5 min-w-[160px]">
                <p className="text-slate-100 font-bold border-b border-white/10 pb-1 mb-1">
                    {isNaN(Date.parse(label)) ? label : new Date(label).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                </p>
                {dataItem.noId && (
                    <p className="text-slate-300">
                        <span className="font-semibold text-ui-accent">ID Muestra:</span>{' '}
                        <span className="font-mono bg-ui-darkest/40 px-1 py-0.5 rounded text-[11px] text-slate-100">{dataItem.noId}</span>
                    </p>
                )}
                {dataItem.lote && (
                    <p className="text-slate-300">
                        <span className="font-semibold text-slate-400">Lote:</span>{' '}
                        <span className="font-mono bg-ui-darkest/40 px-1 py-0.5 rounded text-[11px] text-slate-100">{dataItem.lote}</span>
                    </p>
                )}
                <p className="text-slate-100 font-semibold mt-1">
                    {payload[0].name}: <span className="text-ui-accent text-sm font-bold">{dataItem.value}</span>
                </p>
            </div>
        );
    }
    return null;
};

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
                
                <Tooltip content={<CustomTooltip />} />
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
