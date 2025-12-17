
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { NUTRIENTS } from '../constants';

interface MultiTrendChartProps {
    data: any[];
    activeNutrients: string[];
}

export const MultiTrendChart: React.FC<MultiTrendChartProps> = ({ data, activeNutrients }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No hay datos disponibles para esta selección.</div>;
    }

    if (activeNutrients.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">Selecciona al menos un parámetro para visualizar.</div>;
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }} 
                    labelStyle={{ color: '#334155' }}
                />
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
                        <Line 
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
