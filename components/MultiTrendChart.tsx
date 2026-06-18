
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { NUTRIENTS } from '../constants';

interface MultiTrendChartProps {
    data: any[];
    activeNutrients: string[];
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
                <div className="space-y-1 mt-2 pt-1 border-t border-white/5">
                    {payload.map((p: any) => (
                        <p key={p.name} className="font-semibold" style={{ color: p.color || p.stroke }}>
                            {p.name}: <span className="text-slate-100 font-bold">{p.value}</span>
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

export const MultiTrendChart: React.FC<MultiTrendChartProps> = ({ data, activeNutrients }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">No hay datos disponibles para esta selección.</div>;
    }

    if (activeNutrients.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">Selecciona al menos un parámetro para visualizar.</div>;
    }

    const formatDate = (tickItem: string) => {
        return new Date(tickItem).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart
                data={data}
                margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Brush 
                    dataKey="date" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#f8fafc" 
                    tickFormatter={formatDate}
                />
                {activeNutrients.map(key => {
                    const nutrientConfig = NUTRIENTS.find(n => n.key === key);
                    const color = nutrientConfig ? nutrientConfig.color : '#000000';
                    const label = nutrientConfig ? nutrientConfig.label.replace(' (%)', '') : key;

                    return (
                        <Line isAnimationActive={false} 
                            key={key}
                            type="monotone" 
                            dataKey={key} 
                            name={label} 
                            stroke={color} 
                            strokeWidth={2} 
                            dot={{ r: 2 }} 
                            activeDot={{ r: 5 }} 
                            connectNulls
                        />
                    );
                })}
            </LineChart>
        </ResponsiveContainer>
    );
};
