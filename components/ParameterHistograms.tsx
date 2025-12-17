
import React from 'react';
import { HistogramChart } from './HistogramChart';
import { ChartCard } from './ChartCard';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { NUTRIENTS } from '../constants';
import { RawMaterialData } from '../types';

interface ParameterHistogramsProps {
    data: RawMaterialData[];
}

export const ParameterHistograms: React.FC<ParameterHistogramsProps> = ({ data }) => {
    if (!data || data.length === 0) {
        return <div className="text-center text-slate-500 py-10">No hay datos disponibles para generar histogramas.</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {NUTRIENTS.map((nutrient) => {
                // Prepare data specific for this nutrient's histogram
                // HistogramChart expects { date: string, value: number }[]
                const chartData = data
                    .filter(d => {
                        const val = d[nutrient.key];
                        return val !== undefined && val !== null && !isNaN(Number(val));
                    })
                    .map(d => ({
                        date: d.date,
                        value: Number(d[nutrient.key])
                    }));

                // Skip rendering if no valid data for this nutrient
                if (chartData.length === 0) return null;

                return (
                    <ChartCard 
                        key={nutrient.key} 
                        title={`Distribución: ${nutrient.label}`} 
                        icon={<ChartBarIcon />}
                    >
                        <HistogramChart 
                            data={chartData} 
                            nutrient={nutrient.label} 
                            color={nutrient.color}
                        />
                    </ChartCard>
                );
            })}
        </div>
    );
};
