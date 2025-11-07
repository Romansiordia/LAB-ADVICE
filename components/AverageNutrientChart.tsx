import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ChartData {
    name: string;
    value: number;
}

interface AverageNutrientChartProps {
    data: ChartData[];
}

const COLORS = ['#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2'];

export const AverageNutrientChart: React.FC<AverageNutrientChartProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No hay datos de promedios para mostrar.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#6b7280" 
                    fontSize={12} 
                    width={80} 
                    tick={{ fill: '#4b5563' }}
                    interval={0}
                />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }} 
                    labelStyle={{ color: '#374151' }}
                    formatter={(value: number) => [value.toFixed(2), 'Promedio']}
                />
                <Bar dataKey="value" name="Promedio">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};