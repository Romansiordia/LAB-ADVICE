import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChartData {
    name: string;
    value: number;
}

interface AverageNutrientChartProps {
    data: ChartData[];
}

const COLORS = ['#06b6d4', '#10b981', '#3b82f6', '#0891b2', '#059669', '#2563eb'];

export const AverageNutrientChart: React.FC<AverageNutrientChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400">No hay datos de promedios para mostrar.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#64748b" 
                    fontSize={12} 
                    width={80} 
                    tick={{ fill: '#475569' }}
                    interval={0}
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }} 
                    labelStyle={{ color: '#334155' }}
                    formatter={(value: number) => [value.toFixed(2), 'Promedio']}
                />
                <Bar isAnimationActive={false} dataKey="value" name="Promedio">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};