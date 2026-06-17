
import React, { useMemo } from 'react';
import { NUTRIENTS } from '../constants';
import { RawMaterialData } from '../types';
import { REFERENCE_VALUES } from '../reference-values';
import { DownloadIcon } from './icons/DownloadIcon';

interface NutrientStatsTableProps {
    data: RawMaterialData[];
    material?: string;
    category?: 'nutrients' | 'mycotoxins';
}

export const NutrientStatsTable: React.FC<NutrientStatsTableProps> = ({ data, material, category }) => {
    
    const statsData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const refValues = material ? REFERENCE_VALUES[material] : null;

        const filteredNutrients = category 
            ? NUTRIENTS.filter(n => (n.category || 'nutrients') === category)
            : NUTRIENTS;

        return filteredNutrients.map(nutrient => {
            const values = data
                .map(d => d[nutrient.key])
                .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v !== 0);

            if (values.length === 0) return null;

            const count = values.length;
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / count;
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            // Variance/StdDev
            const squaredDiffs = values.map(val => (val - mean) ** 2);
            const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (count > 1 ? count - 1 : 1);
            const stdDev = Math.sqrt(variance);

            // Validation Logic
            let status: 'normal' | 'low' | 'high' | 'unknown' = 'unknown';
            
            const lcl = mean - stdDev;
            const ucl = mean + stdDev;
            let refRangeString = `${lcl.toFixed(2)} - ${ucl.toFixed(2)}`;

            if (refValues && refValues[nutrient.key]) {
                const range = refValues[nutrient.key];
                
                if (mean < range.min) {
                    status = 'low';
                } else if (mean > range.max) {
                    status = 'high';
                } else {
                    status = 'normal';
                }
            }

            return {
                label: nutrient.label.replace(' (%)', ''),
                key: nutrient.key,
                mean: mean.toFixed(2),
                min: min.toFixed(2),
                max: max.toFixed(2),
                stdDev: stdDev.toFixed(2),
                count,
                status,
                refRangeString
            };
        }).filter(item => item !== null);
    }, [data, material]);

    const handleDownloadCsv = () => {
        if (!statsData.length) return;
        
        const headers = ['Parámetro', 'Promedio', 'Referencia', 'Estado', 'Mínimo', 'Máximo', 'Desv. Estándar', 'Muestras'];
        const rows = statsData.map(item => [
            item!.label,
            item!.mean,
            item!.refRangeString,
            item!.status,
            item!.min,
            item!.max,
            item!.stdDev,
            item!.count
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'estadisticas_calidad.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!statsData.length) return <div className="flex items-center justify-center h-full text-slate-400">No hay datos suficientes para calcular estadísticas.</div>;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'normal':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ui-success/20 text-ui-success">Normal</span>;
            case 'low':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ui-warning/20 text-ui-warning">Bajo</span>;
            case 'high':
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ui-warning/20 text-ui-warning">Alto</span>;
            default:
                return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-ui-dark text-slate-400">N/A</span>;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-2">
                 <button 
                    onClick={handleDownloadCsv}
                    className="flex items-center text-xs bg-ui-accent/10 text-ui-accent hover:bg-ui-accent/20 text-ui-accent py-1.5 px-3 rounded transition-colors border border-ui-accent/30"
                    title="Descargar tabla en CSV"
                >
                    <DownloadIcon />
                    <span className="ml-1 font-medium">Descargar CSV</span>
                </button>
            </div>
            <div className="overflow-auto flex-1 border border-ui-border rounded-lg">
                <table className="min-w-full divide-y divide-ui-border text-sm">
                    <thead className="bg-ui-darkest sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold text-slate-400">Parámetro</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-400">Promedio</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-400">Rango Ref.</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-400">Estado</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-400">Mín</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-400">Max</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-400">DE</th>
                             <th className="px-4 py-3 text-right font-semibold text-slate-400">N</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-ui-border bg-ui-card">
                        {statsData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-ui-darkest transition-colors">
                                <td className="px-4 py-2 font-medium text-slate-300">{row!.label}</td>
                                <td className="px-4 py-2 text-right font-semibold text-slate-100">{row!.mean}</td>
                                <td className="px-4 py-2 text-center text-slate-400 text-xs">{row!.refRangeString}</td>
                                <td className="px-4 py-2 text-center">{getStatusBadge(row!.status)}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{row!.min}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{row!.max}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{row!.stdDev}</td>
                                <td className="px-4 py-2 text-right text-slate-400">{row!.count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
