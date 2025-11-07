import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { HistogramBin } from '../types';

interface HistogramChartProps {
    data: { date: string, value: number }[];
    nutrient: string;
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


export const HistogramChart: React.FC<HistogramChartProps> = ({ data, nutrient }) => {

    const histogramData = useMemo(() => createHistogramData(data), [data]);

    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-gray-500">No hay datos disponibles para esta selección.</div>;
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart
                data={histogramData}
                margin={{
                    top: 5,
                    right: 30,
                    left: 0,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#6b7280" fontSize={10} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} stroke="#6b7280" fontSize={12} />
                <Tooltip 
                    contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' 
                    }} 
                    labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Bar dataKey="count" name="Frecuencia" fill="#06b6d4" />
            </BarChart>
        </ResponsiveContainer>
    );
};