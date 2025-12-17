
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

interface MonthlyTrendChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
}

export const MonthlyTrendChart: React.FC<MonthlyTrendChartProps> = ({ data, nutrient }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-500">No hay datos suficientes para una tendencia mensual.</div>;
    }

    const formatDate = (tickItem: string) => {
        return new Date(tickItem).toLocaleDateString('es-ES', { year: '2-digit', month: 'short' });
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
                <YAxis stroke="#64748b" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }} 
                    labelStyle={{ color: '#334155' }}
                    formatter={(value: number) => [value.toFixed(2), 'Promedio Mensual']}
                />
                <Legend verticalAlign="top" height={36} formatter={() => `Promedio Mensual (${nutrient})`} />
                <Brush 
                    dataKey="date" 
                    height={30} 
                    stroke="#94a3b8" 
                    fill="#f8fafc"
                    tickFormatter={formatDate}
                />
                <Line type="monotone" dataKey="value" name={nutrient} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 7 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};
