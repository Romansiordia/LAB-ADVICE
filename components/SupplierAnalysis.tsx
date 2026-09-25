import React, { useMemo } from 'react';
import { RawMaterialData } from '../types';
import { NUTRIENTS } from '../constants';
import { AlertTriangleIcon } from 'lucide-react';

interface SupplierAnalysisProps {
    data: RawMaterialData[];
    material: string;
    category?: 'nutrients' | 'mycotoxins';
    isPdfMode?: boolean;
}

export const SupplierAnalysis: React.FC<SupplierAnalysisProps> = ({ data, material, category, isPdfMode = false }) => {
    
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
            <div className={`border rounded-2xl p-6 text-center ${
                isPdfMode ? 'bg-white border-slate-200 text-slate-500' : 'bg-ui-card border-ui-border text-slate-400'
            }`}>
                No hay datos de proveedores suficientes para el análisis.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className={`text-xl font-bold mb-4 px-1 ${
                isPdfMode ? 'text-slate-900' : 'text-slate-100'
            }`}>
                Control de Calidad de Proveedores
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {suppliersData.map(supplier => (
                    <div key={supplier.name} className={`border rounded-2xl shadow-sm overflow-hidden flex flex-col ${
                        isPdfMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-ui-card border-ui-border'
                    }`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${
                            isPdfMode ? 'bg-slate-100 border-slate-200' : 'bg-ui-darkest border-ui-border'
                        }`}>
                            <h3 className={`text-lg font-bold ${
                                isPdfMode ? 'text-slate-900' : 'text-slate-100'
                            }`}>
                                {supplier.name}
                            </h3>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                isPdfMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-slate-200 text-slate-300'
                            }`}>
                                {supplier.samples} muestras
                            </span>
                        </div>
                        <div className="p-6 flex-1 space-y-6">
                            
                            {/* Rejections */}
                            <div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                                    isPdfMode ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                    Tasa de Rechazos (Fuera de LCI/LCS)
                                </h4>
                                {Object.keys(supplier.rejections).length > 0 ? (
                                    <div className="space-y-2">
                                        {Object.entries(supplier.rejections).map(([nutrient, countValue]) => {
                                             const count = countValue as number;
                                             const bgPercent = supplier.samples > 0 ? (count / supplier.samples) * 100 : 0;
                                             return (
                                                 <div key={`rej-${nutrient}`} className="relative">
                                                     <div className="flex justify-between text-sm mb-1">
                                                         <span className={`font-semibold ${isPdfMode ? 'text-slate-800' : 'text-slate-300'}`}>{nutrient.replace(' (%)', '')}</span>
                                                         <span className={`${count > 0 ? (isPdfMode ? 'text-rose-700 font-bold' : 'text-red-400 font-bold') : (isPdfMode ? 'text-slate-500' : 'text-slate-400')}`}>
                                                             {count} ({bgPercent.toFixed(1)}%)
                                                         </span>
                                                     </div>
                                                     <div className={`w-full rounded-full h-2 ${isPdfMode ? 'bg-slate-200' : 'bg-ui-dark'}`}>
                                                         <div 
                                                             className={`h-2 rounded-full ${count > 0 ? (isPdfMode ? 'bg-rose-600' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]/200') : (isPdfMode ? 'bg-slate-300' : 'bg-slate-300')}`} 
                                                             style={{ width: `${Math.min(bgPercent, 100)}%` }}
                                                         ></div>
                                                     </div>
                                                 </div>
                                             );
                                        })}
                                    </div>
                                ) : (
                                    <span className={`text-sm ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>Sin datos</span>
                                )}
                            </div>

                            {/* Reliability */}
                            <div>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${
                                    isPdfMode ? 'text-slate-600' : 'text-slate-400'
                                }`}>
                                    Índice de Confiabilidad (Desviación Estándar)
                                </h4>
                                <p className={`text-xs mb-3 ${isPdfMode ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                                    Valores menores indican mayor consistencia (menor varianza) en las entregas.
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(supplier.variances).map(([nutrient, stdDevValue]) => {
                                        const stdDev = stdDevValue as number;
                                        return (
                                        <div key={`var-${nutrient}`} className={`rounded-lg p-3 border flex justify-between items-center ${
                                            isPdfMode ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-ui-darkest border-ui-border'
                                        }`}>
                                            <span className={`text-xs font-semibold truncate mr-2 ${isPdfMode ? 'text-slate-600' : 'text-slate-400'}`} title={nutrient}>
                                                {nutrient.replace(' (%)', '')}
                                            </span>
                                            <span className={`text-sm font-black font-mono ${isPdfMode ? 'text-slate-900' : 'text-slate-100'}`}>
                                                {stdDev.toFixed(3)}
                                            </span>
                                        </div>
                                    )})}
                                </div>
                            </div>
                            
                            {/* Nelson Alerts */}
                            {supplier.alerts.length > 0 && (
                                <div className={`border rounded-xl p-4 mt-auto ${
                                    isPdfMode ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-orange-50 border border-orange-100 text-orange-800'
                                }`}>
                                    <div className="flex items-center space-x-2 font-bold mb-2">
                                        <AlertTriangleIcon className="w-4 h-4 text-amber-600" />
                                        <span className="text-sm">Alertas de Tendencia (Reglas de Nelson)</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {supplier.alerts.map((alert, idx) => (
                                            <li key={idx} className={`text-xs flex items-start font-medium ${isPdfMode ? 'text-amber-800' : 'text-orange-700'}`}>
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
