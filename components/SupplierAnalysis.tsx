import React, { useMemo } from 'react';
import { RawMaterialData } from '../types';
import { NUTRIENTS } from '../constants';
import { AlertTriangleIcon } from 'lucide-react';

interface SupplierAnalysisProps {
    data: RawMaterialData[];
    material: string;
    category?: 'nutrients' | 'mycotoxins';
}

export const SupplierAnalysis: React.FC<SupplierAnalysisProps> = ({ data, material, category }) => {
    
    // Group data by supplier
    const suppliersData = useMemo(() => {
        const grouped: Record<string, {
            name: string;
            samples: number;
            variances: Record<string, number>;
            rejections: Record<string, number>;
            alerts: string[];
        }> = {};

        // Find available suppliers
        const suppliers: string[] = Array.from(new Set(data.filter(d => !!d.Proveedor).map(d => String(d.Proveedor))));
        if (suppliers.length === 0) return null;

        // Filter and ensure we only look at nutrients that have values in this dataset
        const filteredNutrientsConfig = category 
            ? NUTRIENTS.filter(n => (n.category || 'nutrients') === category)
            : NUTRIENTS;

        const activeNutrients = filteredNutrientsConfig.filter(n => data.some(d => typeof d[n.key] === 'number' && d[n.key] !== 0));

        suppliers.forEach(supplier => {
            const sData = data.filter(d => d.Proveedor === supplier);
            
            // Calculate global stats for the material (for control limits)
            const statsByNutrient: Record<string, { mean: number, lcl: number, ucl: number, stdDev: number }> = {};
            activeNutrients.forEach(n => {
                const globalValues = data.map(d => Number(d[n.key])).filter(v => !isNaN(v) && v !== 0);
                if (globalValues.length > 1) {
                    const mean = globalValues.reduce((a, b) => a + b, 0) / globalValues.length;
                    const variance = globalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (globalValues.length - 1);
                    const stdDev = Math.sqrt(variance);
                    statsByNutrient[n.key] = { mean, stdDev, lcl: mean - stdDev, ucl: mean + stdDev };
                }
            });

            const variances: Record<string, number> = {};
            const rejections: Record<string, number> = {};
            const alerts: string[] = [];

            activeNutrients.forEach(n => {
                const values = sData.map(d => Number(d[n.key])).filter(v => !isNaN(v) && v !== 0);
                
                if (values.length > 1) {
                    // Variance
                    const mean = values.reduce((a, b) => a + b, 0) / values.length;
                    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);
                    variances[n.label] = Math.sqrt(variance); // Standard deviation as reliability index

                    // Rejections based on global LCL and UCL limits
                    const stats = statsByNutrient[n.key];
                    if (stats) {
                        const rejectedCount = values.filter(v => v < stats.lcl || v > stats.ucl).length;
                        rejections[n.label] = rejectedCount;

                        // Nelson Rules simplified (e.g. 7 points trending up or down)
                        if (values.length >= 7) {
                            for (let i = 0; i <= values.length - 7; i++) {
                                const slice = values.slice(i, i + 7);
                                let isIncreasing = true;
                                let isDecreasing = true;
                                for (let j = 1; j < 7; j++) {
                                    if (slice[j] <= slice[j - 1]) isIncreasing = false;
                                    if (slice[j] >= slice[j - 1]) isDecreasing = false;
                                }
                                if (isIncreasing) {
                                    alerts.push(`${n.label}: 7 puntos en tendencia ascendente`);
                                    break;
                                }
                                if (isDecreasing) {
                                    alerts.push(`${n.label}: 7 puntos en tendencia descendente`);
                                    break;
                                }
                            }
                        }
                    }
                }
            });

            grouped[supplier] = {
                name: supplier,
                samples: sData.length,
                variances,
                rejections,
                alerts: [...new Set(alerts)] // Deduplicate
            };
        });

        return Object.values(grouped);
    }, [data]);

    if (!suppliersData) {
        return (
            <div className="bg-ui-card border border-ui-border rounded-2xl p-6 text-center text-slate-400">
                No hay datos de proveedores suficientes para el análisis.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4 px-1">Control de Calidad de Proveedores</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suppliersData.map(supplier => (
                    <div key={supplier.name} className="bg-ui-card border border-ui-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="bg-ui-darkest border-b border-ui-border px-6 py-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-slate-100">{supplier.name}</h3>
                                <span className="text-xs font-medium bg-slate-200 text-slate-300 px-2 py-1 rounded-full">
                                    {supplier.samples} muestras
                                </span>
                            </div>
                        </div>
                        <div className="p-6 flex-1 space-y-6">
                            
                            {/* Rejections */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Tasa de Rechazos (Fuera de LCI/LCS)</h4>
                                {Object.keys(supplier.rejections).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(supplier.rejections).map(([nutrient, countValue]) => {
                                            const count = countValue as number;
                                            const bgPercent = supplier.samples > 0 ? (count / supplier.samples) * 100 : 0;
                                            return (
                                                <div key={`rej-${nutrient}`} className="relative">
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-slate-300">{nutrient.replace(' (%)', '')}</span>
                                                        <span className={`${count > 0 ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                                                            {count} ({bgPercent.toFixed(1)}%)
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-ui-dark rounded-full h-1.5">
                                                        <div 
                                                            className={`h-1.5 rounded-full ${count > 0 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]/200' : 'bg-slate-300'}`} 
                                                            style={{ width: `${Math.min(bgPercent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <span className="text-sm text-slate-400">Sin datos</span>
                                )}
                            </div>

                            {/* Reliability */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Índice de Confiabilidad (Desviación Estándar)</h4>
                                <p className="text-xs text-slate-400 mb-3">Valores menores indican mayor consistencia (menor varianza) en las entregas.</p>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(supplier.variances).map(([nutrient, stdDevValue]) => {
                                        const stdDev = stdDevValue as number;
                                        return (
                                        <div key={`var-${nutrient}`} className="bg-ui-darkest rounded-lg p-3 border border-ui-border flex justify-between items-center">
                                            <span className="text-xs font-medium text-slate-400 truncate mr-2" title={nutrient}>{nutrient.replace(' (%)', '')}</span>
                                            <span className="text-sm font-bold text-slate-100">{stdDev.toFixed(3)}</span>
                                        </div>
                                    )})}
                                </div>
                            </div>
                            
                            {/* Nelson Alerts */}
                            {supplier.alerts.length > 0 && (
                                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mt-auto">
                                    <div className="flex items-center space-x-2 text-orange-800 font-semibold mb-2">
                                        <AlertTriangleIcon className="w-4 h-4" />
                                        <span className="text-sm">Alertas de Tendencia (Reglas de Nelson)</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {supplier.alerts.map((alert, idx) => (
                                            <li key={idx} className="text-xs text-orange-700 flex items-start">
                                                <span className="mr-2 mt-0.5">•</span>
                                                <span>{alert}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
