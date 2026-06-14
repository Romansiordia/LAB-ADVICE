
import React from 'react';
import { KpiCard } from './KpiCard';
import { getNutrientIcon } from './icons/getNutrientIcon';
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
        if (val !== undefined && val !== null && val !== '') {
            const numVal = Number(val);
            if (!isNaN(numVal) && numVal !== 0) {
                const monthKey = d.date.substring(0, 7); // YYYY-MM
                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = { sum: 0, count: 0 };
                }
                monthlyData[monthKey].sum += numVal;
                monthlyData[monthKey].count++;
            }
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
        return <div className="text-center text-slate-400 py-10">No hay datos disponibles para generar tendencias mensuales.</div>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {NUTRIENTS.map((nutrient) => {
                const chartData = getMonthlyData(data, nutrient.key);

                if (chartData.length === 0) return null;

                const cleanLabel = nutrient.label.replace(' (%)', '');
                return (
                    <KpiCard
                        key={`monthly-${nutrient.key}`}
                        title={`Prom. ${cleanLabel}`}
                        value={chartData.length > 0 ? `${chartData[chartData.length - 1].value.toFixed(2)}%` : undefined}
                        icon={getNutrientIcon(nutrient.key, "w-4 h-4 text-white")}
                        color={nutrient.color || '#0ea5e9'}
                        onClick={onExpand ? () => onExpand(nutrient.key) : undefined}
                    />
                );
            })}
        </div>
    );
};
