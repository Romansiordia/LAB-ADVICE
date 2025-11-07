
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, nutrient }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No hay datos disponibles para esta selección.</div>;
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tickFormatter={formatDate} stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }} 
                    labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Line type="monotone" dataKey="value" name={nutrient} stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 6 }} />
            </LineChart>
        </ResponsiveContainer>
    );
};