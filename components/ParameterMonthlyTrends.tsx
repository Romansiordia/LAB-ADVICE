
import React from 'react';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ChartCard } from './ChartCard';
import { CalendarIcon } from './icons/CalendarIcon';
import { NUTRIENTS } from '../constants';
import { RawMaterialData } from '../types';

interface ParameterMonthlyTrendsProps {
    data: RawMaterialData[];
    onExpand?: (key: string) => void;
}

export const getMonthlyData = (data: RawMaterialData[], nutrientKey: string) => {
    const monthlyData: { [key: string]: { sum: number; count: number } } = {};

    data.forEach(d => {
        const val = d[nutrientKey];
        if (val !== undefined && val !== null && !isNaN(Number(val))) {
            const numVal = Number(val);
            const monthKey = d.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { sum: 0, count: 0 };
            }
            monthlyData[monthKey].sum += numVal;
            monthlyData[monthKey].count++;
        }
    });

    const result = Object.entries(monthlyData).map(([monthKey, stats]) => ({
        date: `${monthKey}-01T00:00:00.000Z`,
        value: parseFloat((stats.sum / stats.count).toFixed(2)),
    }));
    
    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const ParameterMonthlyTrends: React.FC<ParameterMonthlyTrendsProps> = ({ data, onExpand }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-slate-500 py-10">No hay datos disponibles para generar tendencias mensuales.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {NUTRIENTS.map((nutrient) => {
                const chartData = getMonthlyData(data, nutrient.key);

                if (chartData.length === 0) return null;

                return (
                    <ChartCard 
                        key={nutrient.key} 
                        title={`Promedio Mensual: ${nutrient.label}`} 
                        icon={<CalendarIcon />}
                        onExpand={onExpand ? () => onExpand(nutrient.key) : undefined}
                    >
                        <MonthlyTrendChart data={chartData} nutrient={nutrient.label} />
                    </ChartCard>
                );
            })}
        </div>
    );
};
