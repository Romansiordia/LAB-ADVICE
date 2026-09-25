import React, { useState, useMemo } from 'react';
import { RawMaterialData } from '../types';
import { NUTRIENTS, getPrintContrastingColor } from '../constants';
import { 
    calculatePca, 
    PcaResult, 
    PcaSamplePoint, 
    PcaLoading, 
    PcaGroupCluster, 
    GROUP_PALETTE 
} from '../pcaAnalysis';
import { 
    Compass, 
    Layers, 
    TrendingUp, 
    Users, 
    Info, 
    CheckSquare, 
    Square, 
    RotateCcw, 
    Sparkles, 
    ArrowUpRight, 
    Maximize2, 
    Filter,
    BarChart3,
    Table,
    HelpCircle,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    Tooltip as RechartsTooltip, 
    CartesianGrid, 
    Line, 
    ComposedChart,
    Cell
} from 'recharts';

interface PcaAnalysisViewProps {
    data: RawMaterialData[];
    selectedMaterial: string;
    isPdfMode?: boolean;
}

export const PcaAnalysisView: React.FC<PcaAnalysisViewProps> = ({
    data,
    selectedMaterial,
    isPdfMode = false
}) => {
    // 1. Estados de configuración
    const [groupField, setGroupField] = useState<'Cliente' | 'Proveedor' | 'subtipo' | 'material' | 'month'>('Cliente');
    const [showCentroids, setShowCentroids] = useState<boolean>(true);
    const [showVectors, setShowVectors] = useState<boolean>(true);
    const [showSampleLabels, setShowSampleLabels] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'biplot' | 'scree' | 'loadings' | 'correlation' | 'clients'>('biplot');
    const [hoveredSample, setHoveredSample] = useState<PcaSamplePoint | null>(null);
    const [hoveredLoading, setHoveredLoading] = useState<PcaLoading | null>(null);
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('TODOS');
    const [showInterpretationGuide, setShowInterpretationGuide] = useState<boolean>(true);

    // 2. Nutrientes con datos presentes en este dataset para preseleccionarlos
    const nutrientsWithData = useMemo(() => {
        return NUTRIENTS.filter(n => {
            const hasValues = data.some(d => {
                const val = d[n.key];
                return typeof val === 'number' && !isNaN(val) && val !== 0;
            });
            return hasValues;
        });
    }, [data]);

    // Variables seleccionadas por el usuario (por defecto los parámetros nutricionales principales disponibles)
    const [selectedVarKeys, setSelectedVarKeys] = useState<string[]>(() => {
        const defaultPreferred = ['proteina', 'grasa', 'fibra', 'humedad', 'ceniza', 'almidon', 'xantofilas'];
        const available = nutrientsWithData.map(n => n.key);
        const initial = defaultPreferred.filter(k => available.includes(k));
        return initial.length >= 2 ? initial : available.slice(0, 6);
    });

    // Mantener la lista si los datos cambian
    useMemo(() => {
        if (selectedVarKeys.length === 0 && nutrientsWithData.length >= 2) {
            setSelectedVarKeys(nutrientsWithData.slice(0, 6).map(n => n.key));
        }
    }, [nutrientsWithData, selectedVarKeys.length]);

    const toggleVariable = (key: string) => {
        if (selectedVarKeys.includes(key)) {
            if (selectedVarKeys.length > 2) {
                setSelectedVarKeys(selectedVarKeys.filter(k => k !== key));
            }
        } else {
            setSelectedVarKeys([...selectedVarKeys, key]);
        }
    };

    const handleSelectAllVariables = () => {
        setSelectedVarKeys(nutrientsWithData.map(n => n.key));
    };

    const handleResetVariables = () => {
        const defaultPreferred = ['proteina', 'grasa', 'fibra', 'humedad', 'ceniza', 'almidon', 'xantofilas'];
        const available = nutrientsWithData.map(n => n.key);
        const resetKeys = defaultPreferred.filter(k => available.includes(k));
        setSelectedVarKeys(resetKeys.length >= 2 ? resetKeys : available.slice(0, 6));
    };

    // 3. Ejecución del algoritmo matemático de PCA
    const pca: PcaResult = useMemo(() => {
        return calculatePca(data, selectedVarKeys, groupField);
    }, [data, selectedVarKeys, groupField]);

    // Muestras filtradas por grupo seleccionado (para visualización focalizada)
    const displayedSamples = useMemo(() => {
        if (!pca.isValid) return [];
        if (selectedGroupFilter === 'TODOS') return pca.samples;
        return pca.samples.filter(s => s.group === selectedGroupFilter);
    }, [pca, selectedGroupFilter]);

    // Dimensiones y escalamiento SVG para el Biplot
    const svgWidth = 800;
    const svgHeight = 560;
    const margin = 60;
    const innerWidth = svgWidth - margin * 2;
    const innerHeight = svgHeight - margin * 2;
    const centerX = margin + innerWidth / 2;
    const centerY = margin + innerHeight / 2;

    // Rango de coordenadas para el Biplot: [-1.2, 1.2]
    const biplotDomain = 1.25;
    const scaleX = (val: number) => centerX + (val / biplotDomain) * (innerWidth / 2);
    const scaleY = (val: number) => centerY - (val / biplotDomain) * (innerHeight / 2); // Invertir Y para orientación matemática estándar

    if (!pca.isValid) {
        return (
            <div className={`p-8 rounded-2xl border text-center ${
                isPdfMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-ui-card border-ui-border text-slate-300'
            }`}>
                <Compass className="w-12 h-12 mx-auto text-amber-500 mb-4 animate-pulse" />
                <h3 className="text-lg font-bold mb-2">No se pudo calcular el Análisis de Componentes Principales</h3>
                <p className="text-sm max-w-md mx-auto mb-4 text-slate-400">
                    {pca.errorMessage || 'Verifica que existan al menos 3 registros con datos en 2 o más nutrientes.'}
                </p>
                <div className="flex justify-center gap-3">
                    <button
                        onClick={handleSelectAllVariables}
                        className="px-4 py-2 bg-ui-accent text-[#040d1a] font-bold rounded-lg text-xs"
                    >
                        Seleccionar todos los parámetros disponibles
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header del Módulo PCA */}
            <div className={`p-6 rounded-2xl border transition-all ${
                isPdfMode 
                    ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
                    : 'bg-ui-card border-ui-border text-slate-100 shadow-md'
            }`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-ui-border/40">
                    <div className="flex items-start space-x-3">
                        <div className={`p-3 rounded-xl ${isPdfMode ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-ui-accent/10 text-ui-accent border border-ui-accent/20'}`}>
                            <Compass className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                    isPdfMode ? 'bg-slate-100 text-slate-700' : 'bg-ui-darkest text-ui-accent border border-ui-border'
                                }`}>
                                    Estadística Multivariada
                                </span>
                                <span className="text-xs text-slate-400">•</span>
                                <span className="text-xs font-semibold text-emerald-400">
                                    {pca.sampleCount} Muestras Procesadas
                                </span>
                            </div>
                            <h2 className={`text-xl md:text-2xl font-black mt-1 ${isPdfMode ? 'text-slate-900' : 'text-slate-100'}`}>
                                Análisis de Componentes Principales (PCA)
                            </h2>
                            <p className={`text-xs mt-1 max-w-3xl ${isPdfMode ? 'text-slate-600' : 'text-slate-400'}`}>
                                Proyección en plano factorial 2D de las variables nutricionales para descubrir correlaciones, perfiles homogéneos y diferencias entre clientes o lotes.
                            </p>
                        </div>
                    </div>

                    {/* Selector de Agrupación Principal (Clientes, etc.) */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold ${isPdfMode ? 'text-slate-700' : 'text-slate-300'}`}>
                                Agrupar por:
                            </span>
                            <select
                                value={groupField}
                                onChange={(e) => setGroupField(e.target.value as any)}
                                className={`text-xs font-bold py-2 px-3 rounded-lg border focus:ring-2 focus:ring-ui-accent outline-none cursor-pointer ${
                                    isPdfMode 
                                        ? 'bg-slate-50 border-slate-300 text-slate-900' 
                                        : 'bg-ui-darkest border-ui-border text-ui-accent'
                                }`}
                            >
                                <option value="Cliente">🏢 Clientes</option>
                                <option value="Proveedor">🚚 Proveedores</option>
                                <option value="month">📅 Mes / Período</option>
                                <option value="subtipo">🏷️ Subtipo</option>
                                <option value="material">🌾 Materia Prima</option>
                            </select>
                        </div>

                        {/* Botón Guía Rápida */}
                        <button
                            type="button"
                            onClick={() => setShowInterpretationGuide(!showInterpretationGuide)}
                            className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                showInterpretationGuide 
                                    ? (isPdfMode ? 'bg-sky-50 text-sky-800 border-sky-200' : 'bg-ui-accent/15 text-ui-accent border-ui-accent/30')
                                    : (isPdfMode ? 'bg-slate-50 text-slate-600 border-slate-200' : 'bg-ui-darkest text-slate-400 border-ui-border')
                            }`}
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>{showInterpretationGuide ? 'Ocultar Guía' : 'Guía de Interpretación'}</span>
                        </button>
                    </div>
                </div>

                {/* Métricas Clave de PCA */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                    <div className={`p-3.5 rounded-xl border ${
                        isPdfMode ? 'bg-sky-50/50 border-sky-100' : 'bg-ui-darkest/60 border-ui-border/50'
                    }`}>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Varianza PC1</div>
                        <div className={`text-xl font-black mt-0.5 ${isPdfMode ? 'text-sky-800' : 'text-sky-400'}`}>
                            {pca.components[0]?.varianceExplainedPct}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Autovalor λ₁ = {pca.components[0]?.eigenvalue.toFixed(2)}
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                        isPdfMode ? 'bg-emerald-50/50 border-emerald-100' : 'bg-ui-darkest/60 border-ui-border/50'
                    }`}>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Varianza PC2</div>
                        <div className={`text-xl font-black mt-0.5 ${isPdfMode ? 'text-emerald-800' : 'text-emerald-400'}`}>
                            {pca.components[1]?.varianceExplainedPct}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Autovalor λ₂ = {pca.components[1]?.eigenvalue.toFixed(2)}
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                        isPdfMode ? 'bg-amber-50/50 border-amber-100' : 'bg-ui-darkest/60 border-ui-border/50'
                    }`}>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Varianza Total 2D</div>
                        <div className={`text-xl font-black mt-0.5 ${isPdfMode ? 'text-amber-800' : 'text-amber-400'}`}>
                            {pca.totalVarianceExplained2D}%
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Retención en el plano PC1+PC2
                        </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border ${
                        isPdfMode ? 'bg-purple-50/50 border-purple-100' : 'bg-ui-darkest/60 border-ui-border/50'
                    }`}>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dimensiones</div>
                        <div className={`text-xl font-black mt-0.5 ${isPdfMode ? 'text-purple-800' : 'text-purple-400'}`}>
                            {pca.variableCount} <span className="text-xs font-normal text-slate-400">Nutrientes</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {pca.groups.length} Grupos / Segmentos
                        </div>
                    </div>
                </div>

                {/* Selector Interactivo de Nutrientes a Incluir en el PCA */}
                <div className="mt-6 pt-5 border-t border-ui-border/40">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                            <Filter className="w-3.5 h-3.5 text-ui-accent" />
                            <span className={`text-xs font-bold uppercase tracking-wider ${isPdfMode ? 'text-slate-800' : 'text-slate-300'}`}>
                                Variables Nutricionales en el Modelo ({selectedVarKeys.length} seleccionadas):
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                            <button
                                type="button"
                                onClick={handleSelectAllVariables}
                                className="text-ui-accent hover:underline text-[11px] font-semibold cursor-pointer"
                            >
                                Todas
                            </button>
                            <span className="text-slate-500">•</span>
                            <button
                                type="button"
                                onClick={handleResetVariables}
                                className="text-slate-400 hover:text-slate-200 text-[11px] cursor-pointer flex items-center gap-1"
                            >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Por Defecto</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {nutrientsWithData.map(nutrient => {
                            const isSelected = selectedVarKeys.includes(nutrient.key);
                            const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');
                            const unit = nutrient.label.includes('%') ? '%' : nutrient.label.includes('ppm') ? 'ppm' : 'ppb';
                            const contrastColor = getPrintContrastingColor(nutrient.color, isPdfMode);

                            return (
                                <button
                                    key={nutrient.key}
                                    type="button"
                                    onClick={() => toggleVariable(nutrient.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 border transition-all cursor-pointer ${
                                        isSelected
                                            ? (isPdfMode 
                                                ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-sm' 
                                                : 'bg-ui-darkest border-ui-accent text-slate-100 shadow-[0_0_10px_rgba(0,222,255,0.15)]')
                                            : (isPdfMode
                                                ? 'bg-white border-slate-200 text-slate-400 opacity-60'
                                                : 'bg-ui-darkest/40 border-ui-border text-slate-500 opacity-60')
                                    }`}
                                >
                                    <span 
                                        className="w-2.5 h-2.5 rounded-full inline-block shrink-0" 
                                        style={{ backgroundColor: contrastColor }} 
                                    />
                                    <span>{cleanLabel}</span>
                                    <span className="text-[10px] text-slate-400 font-normal font-mono">({unit})</span>
                                    {isSelected ? (
                                        <CheckSquare className="w-3.5 h-3.5 text-ui-accent" />
                                    ) : (
                                        <Square className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Guía Didáctica Desplegable de Interpretación */}
            {showInterpretationGuide && (
                <div className={`p-5 rounded-2xl border transition-all ${
                    isPdfMode ? 'bg-amber-50/70 border-amber-200 text-slate-800' : 'bg-amber-950/20 border-amber-500/30 text-slate-200'
                }`}>
                    <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="space-y-2 text-xs leading-relaxed">
                            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                                <span>¿Cómo interpretar este Análisis Multivariado (PCA)?</span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                                <div className="space-y-1">
                                    <strong className="text-slate-100 font-bold block">1. Vectores / Flechas de Nutrientes:</strong>
                                    <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                        La dirección indica hacia dónde crece cada nutriente. Si dos flechas apuntan juntas (ángulo cerrado), están <span className="font-bold text-emerald-400">positivamente correlacionadas</span> (suben juntas). Si apuntan en sentidos opuestos (180°), son <span className="font-bold text-rose-400">inversas</span>. Si forman 90°, son <span className="font-bold text-slate-400">independientes</span>.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-slate-100 font-bold block">2. Muestras y Clientes (Puntos):</strong>
                                    <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                        Cada punto es un lote o muestra. Muestras cercanas tienen calidad química casi idéntica. Si un cliente tiene sus puntos agrupados en la dirección de la flecha de <em>Proteína</em> o <em>Xantofilas</em>, significa que sus lotes reciben mayor concentración de ese parámetro.
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <strong className="text-slate-100 font-bold block">3. Cuadrantes y Centroides:</strong>
                                    <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                        El centro (0,0) representa el promedio general de la materia prima. Puntos alejados hacia la derecha tienen valores de PC1 altos; hacia arriba, valores de PC2 altos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Pestañas de Vistas Específicas del PCA */}
            <div className="flex flex-wrap gap-2 border-b border-ui-border/50 pb-2">
                {[
                    { id: 'biplot', label: '📊 Biplot 2D (Muestras + Vectores)', icon: Compass },
                    { id: 'clients', label: '🏢 Comparativa por Cliente / Grupo', icon: Users },
                    { id: 'loadings', label: '🧭 Cargas Factoriales (Loadings)', icon: Table },
                    { id: 'correlation', label: '🔗 Matriz de Correlación', icon: Layers },
                    { id: 'scree', label: '📈 Varianza Explicada (Scree)', icon: BarChart3 }
                ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 border transition-all cursor-pointer ${
                                isActive
                                    ? 'bg-ui-accent text-[#040d1a] border-ui-accent shadow-[0_0_12px_rgba(0,222,255,0.25)]'
                                    : (isPdfMode 
                                        ? 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50' 
                                        : 'bg-ui-card border-ui-border text-slate-300 hover:bg-ui-darkest')
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* VISTA 1: BIPLOT 2D */}
            {(activeTab === 'biplot' || isPdfMode) && (
                <div className={`p-6 rounded-2xl border ${
                    isPdfMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-ui-card border-ui-border text-slate-100'
                }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-ui-border/40 gap-3 mb-4">
                        <div>
                            <h3 className="text-base font-bold flex items-center space-x-2">
                                <span>Biplot Factorial 2D: PC1 vs PC2</span>
                                <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                                    isPdfMode ? 'bg-slate-100 text-slate-700' : 'bg-ui-darkest text-ui-accent border border-ui-border'
                                }`}>
                                    {pca.totalVarianceExplained2D}% Varianza Acumulada
                                </span>
                            </h3>
                            <p className={`text-xs ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Muestra las observaciones agrupadas por color y las flechas de los nutrientes analizados.
                            </p>
                        </div>

                        {/* Controles de visualización del Biplot */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showVectors}
                                    onChange={(e) => setShowVectors(e.target.checked)}
                                    className="rounded border-ui-border text-ui-accent focus:ring-0"
                                />
                                <span className={isPdfMode ? 'text-slate-700 font-medium' : 'text-slate-300'}>Vectores de Nutrientes</span>
                            </label>

                            <label className="flex items-center space-x-1.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showCentroids}
                                    onChange={(e) => setShowCentroids(e.target.checked)}
                                    className="rounded border-ui-border text-ui-accent focus:ring-0"
                                />
                                <span className={isPdfMode ? 'text-slate-700 font-medium' : 'text-slate-300'}>Centroides</span>
                            </label>

                            {/* Filtro rápido por grupo */}
                            <select
                                value={selectedGroupFilter}
                                onChange={(e) => setSelectedGroupFilter(e.target.value)}
                                className={`text-xs font-semibold py-1 px-2.5 rounded-lg border outline-none ${
                                    isPdfMode ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                                }`}
                            >
                                <option value="TODOS">Todos los grupos ({pca.groups.length})</option>
                                {pca.groups.map(g => (
                                    <option key={g.groupName} value={g.groupName}>
                                        {g.groupName} ({g.sampleCount})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Gráfico SVG Biplot */}
                    <div className="relative w-full overflow-hidden flex flex-col items-center">
                        <div className="w-full max-w-[950px] aspect-[800/560] relative">
                            <svg
                                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                className="w-full h-full select-none"
                                style={{
                                    backgroundColor: isPdfMode ? '#ffffff' : '#040d1a',
                                    borderRadius: '16px',
                                    border: isPdfMode ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)'
                                }}
                            >
                                <defs>
                                    {/* Marcador de punta de flecha para vectores */}
                                    <marker
                                        id="arrowhead"
                                        markerWidth="7"
                                        markerHeight="7"
                                        refX="5"
                                        refY="3.5"
                                        orient="auto"
                                    >
                                        <polygon points="0 0, 7 3.5, 0 7" fill="#0284c7" />
                                    </marker>
                                </defs>

                                {/* Cuadrícula de referencia y ejes */}
                                <line 
                                    x1={margin} 
                                    y1={centerY} 
                                    x2={svgWidth - margin} 
                                    y2={centerY} 
                                    stroke={isPdfMode ? '#cbd5e1' : '#334155'} 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4" 
                                />
                                <line 
                                    x1={centerX} 
                                    y1={margin} 
                                    x2={centerX} 
                                    y2={svgHeight - margin} 
                                    stroke={isPdfMode ? '#cbd5e1' : '#334155'} 
                                    strokeWidth="1.5" 
                                    strokeDasharray="4 4" 
                                />

                                {/* Círculos concéntricos de correlación unitaria */}
                                <circle 
                                    cx={centerX} 
                                    cy={centerY} 
                                    r={(innerWidth / 2) * (1.0 / biplotDomain)} 
                                    fill="none" 
                                    stroke={isPdfMode ? '#e2e8f0' : '#1e293b'} 
                                    strokeWidth="1" 
                                    strokeDasharray="2 3" 
                                />

                                {/* Etiquetas de Ejes */}
                                <text 
                                    x={svgWidth - margin} 
                                    y={centerY - 8} 
                                    textAnchor="end" 
                                    fill={isPdfMode ? '#0f172a' : '#38bdf8'} 
                                    fontSize="12" 
                                    fontWeight="bold"
                                    fontFamily="sans-serif"
                                >
                                    PC1 ({pca.components[0]?.varianceExplainedPct}%) →
                                </text>
                                <text 
                                    x={margin} 
                                    y={centerY - 8} 
                                    textAnchor="start" 
                                    fill={isPdfMode ? '#64748b' : '#64748b'} 
                                    fontSize="10" 
                                    fontFamily="sans-serif"
                                >
                                    ← PC1 Negativo
                                </text>

                                <text 
                                    x={centerX + 10} 
                                    y={margin + 12} 
                                    textAnchor="start" 
                                    fill={isPdfMode ? '#0f172a' : '#10b981'} 
                                    fontSize="12" 
                                    fontWeight="bold"
                                    fontFamily="sans-serif"
                                >
                                    ↑ PC2 ({pca.components[1]?.varianceExplainedPct}%)
                                </text>

                                {/* Centroide (0,0) */}
                                <circle 
                                    cx={centerX} 
                                    cy={centerY} 
                                    r="4" 
                                    fill={isPdfMode ? '#64748b' : '#94a3b8'} 
                                />
                                <text 
                                    x={centerX + 6} 
                                    y={centerY + 14} 
                                    fill={isPdfMode ? '#94a3b8' : '#64748b'} 
                                    fontSize="9" 
                                    fontFamily="monospace"
                                >
                                    (0, 0)
                                </text>

                                {/* MUESTRAS (Puntos individuales) */}
                                {displayedSamples.map((sample) => {
                                    const cx = scaleX(sample.pc1Scaled);
                                    const cy = scaleY(sample.pc2Scaled);
                                    const grp = pca.groups.find(g => g.groupName === sample.group);
                                    const ptColor = grp ? grp.color : '#0284c7';
                                    const isHovered = hoveredSample?.id === sample.id;

                                    return (
                                        <g 
                                            key={sample.id}
                                            onMouseEnter={() => setHoveredSample(sample)}
                                            onMouseLeave={() => setHoveredSample(null)}
                                            className="cursor-pointer transition-all duration-150"
                                        >
                                            <circle
                                                cx={cx}
                                                cy={cy}
                                                r={isHovered ? 8 : 4.5}
                                                fill={ptColor}
                                                fillOpacity={isHovered ? 0.95 : 0.65}
                                                stroke={isHovered ? '#ffffff' : (isPdfMode ? '#ffffff' : '#040d1a')}
                                                strokeWidth={isHovered ? 2.5 : 1}
                                            />
                                        </g>
                                    );
                                })}

                                {/* CENTROIDES DE GRUPO (Halos y marcadores) */}
                                {showCentroids && pca.groups.map(group => {
                                    const cX = scaleX((group.centroidPc1 / 3.0) * 0.95);
                                    const cY = scaleY((group.centroidPc2 / 3.0) * 0.95);

                                    return (
                                        <g key={`centroid-${group.groupName}`}>
                                            {/* Halo de dispersión */}
                                            <circle
                                                cx={cX}
                                                cy={cY}
                                                r={Math.min(45, Math.max(12, group.radius * 15))}
                                                fill={group.color}
                                                fillOpacity="0.12"
                                                stroke={group.color}
                                                strokeWidth="1.5"
                                                strokeDasharray="3 3"
                                            />
                                            {/* Punto central del centroide */}
                                            <polygon
                                                points={`${cX},${cY - 7} ${cX + 6},${cY + 5} ${cX - 6},${cY + 5}`}
                                                fill={group.color}
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                            />
                                            {/* Etiqueta del centroide */}
                                            <rect
                                                x={cX + 8}
                                                y={cY - 12}
                                                width={group.groupName.length * 6.5 + 10}
                                                height="18"
                                                rx="4"
                                                fill={isPdfMode ? '#ffffff' : '#0f172a'}
                                                fillOpacity="0.9"
                                                stroke={group.color}
                                                strokeWidth="1"
                                            />
                                            <text
                                                x={cX + 13}
                                                y={cY + 1}
                                                fill={isPdfMode ? '#0f172a' : '#f8fafc'}
                                                fontSize="9.5"
                                                fontWeight="bold"
                                                fontFamily="sans-serif"
                                            >
                                                {group.groupName}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* VECTORES DE NUTRIENTES (Flechas) */}
                                {showVectors && pca.loadings.map(loading => {
                                    // Escalamiento del vector: magnitude en [-1, 1]
                                    const targetX = scaleX(loading.pc1Loading);
                                    const targetY = scaleY(loading.pc2Loading);
                                    const vectorColor = getPrintContrastingColor(loading.color, isPdfMode);
                                    const isHovered = hoveredLoading?.key === loading.key;

                                    return (
                                        <g 
                                            key={`vector-${loading.key}`}
                                            onMouseEnter={() => setHoveredLoading(loading)}
                                            onMouseLeave={() => setHoveredLoading(null)}
                                            className="cursor-pointer"
                                        >
                                            {/* Línea del vector */}
                                            <line
                                                x1={centerX}
                                                y1={centerY}
                                                x2={targetX}
                                                y2={targetY}
                                                stroke={vectorColor}
                                                strokeWidth={isHovered ? 3.5 : 2}
                                                strokeLinecap="round"
                                            />
                                            {/* Cabeza de flecha */}
                                            <circle
                                                cx={targetX}
                                                cy={targetY}
                                                r={isHovered ? 5 : 3.5}
                                                fill={vectorColor}
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                            />
                                            {/* Fondo y etiqueta para legibilidad óptima */}
                                            <rect
                                                x={targetX + 6}
                                                y={targetY - 10}
                                                width={loading.label.length * 6.8 + 12}
                                                height="20"
                                                rx="5"
                                                fill={isPdfMode ? '#ffffff' : '#091528'}
                                                fillOpacity="0.92"
                                                stroke={vectorColor}
                                                strokeWidth="1"
                                            />
                                            <text
                                                x={targetX + 12}
                                                y={targetY + 4}
                                                fill={isPdfMode ? '#0f172a' : '#ffffff'}
                                                fontSize="10"
                                                fontWeight="bold"
                                                fontFamily="sans-serif"
                                            >
                                                {loading.label}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Tooltip Flotante de Muestra al pasar el cursor */}
                            {hoveredSample && (
                                <div 
                                    className={`absolute z-30 pointer-events-none p-3 rounded-xl shadow-xl border text-xs max-w-xs transition-opacity duration-150 ${
                                        isPdfMode ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900/95 text-slate-100 border-ui-border'
                                    }`}
                                    style={{
                                        top: Math.max(10, Math.min(svgHeight - 180, scaleY(hoveredSample.pc2Scaled) - 100)),
                                        left: Math.max(10, Math.min(svgWidth - 250, scaleX(hoveredSample.pc1Scaled) + 15))
                                    }}
                                >
                                    <div className="flex items-center justify-between gap-2 border-b border-ui-border/40 pb-1.5 mb-2">
                                        <span className="font-bold text-ui-accent truncate">
                                            {hoveredSample.noId || hoveredSample.lote || 'Muestra'}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(hoveredSample.date).toLocaleDateString('es-ES')}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div><strong>{groupField}:</strong> {hoveredSample.group}</div>
                                        {hoveredSample.subtipo && <div><strong>Subtipo:</strong> {hoveredSample.subtipo}</div>}
                                        <div className="text-slate-400 pt-1 border-t border-ui-border/30">
                                            PC1: <span className="text-sky-400 font-mono">{hoveredSample.pc1.toFixed(2)}</span> | 
                                            PC2: <span className="text-emerald-400 font-mono"> {hoveredSample.pc2.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-1.5 border-t border-ui-border/40 grid grid-cols-2 gap-1 text-[10px]">
                                        {Object.entries(hoveredSample.values).slice(0, 6).map(([k, v]) => {
                                            const nConf = NUTRIENTS.find(n => n.key === k);
                                            const name = nConf ? nConf.label.replace(/\s*\(.*?\)/, '') : k;
                                            return (
                                                <div key={k} className="flex justify-between">
                                                    <span className="text-slate-400">{name}:</span>
                                                    <span className="font-semibold text-slate-200">{Number(v).toFixed(2)}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Tooltip de Vector al pasar el cursor */}
                            {hoveredLoading && (
                                <div 
                                    className={`absolute z-30 pointer-events-none p-3 rounded-xl shadow-xl border text-xs max-w-xs ${
                                        isPdfMode ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900/95 text-slate-100 border-ui-border'
                                    }`}
                                    style={{
                                        top: Math.max(10, Math.min(svgHeight - 120, scaleY(hoveredLoading.pc2Loading))),
                                        left: Math.max(10, Math.min(svgWidth - 250, scaleX(hoveredLoading.pc1Loading) + 20))
                                    }}
                                >
                                    <div className="font-bold text-sm mb-1" style={{ color: hoveredLoading.color }}>
                                        {hoveredLoading.label}
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div>Correlación con PC1: <strong className="text-sky-400">{hoveredLoading.pc1Loading}</strong> ({hoveredLoading.contributionPc1}% de contribución)</div>
                                        <div>Correlación con PC2: <strong className="text-emerald-400">{hoveredLoading.pc2Loading}</strong> ({hoveredLoading.contributionPc2}% de contribución)</div>
                                        <div>Representación 2D (r²): <strong>{(hoveredLoading.magnitude * 100).toFixed(1)}%</strong></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Leyenda de Grupos del Biplot */}
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-3 border-t border-ui-border/40 w-full text-xs">
                            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                Leyenda ({groupField}):
                            </span>
                            {pca.groups.map(group => (
                                <button
                                    key={group.groupName}
                                    type="button"
                                    onClick={() => setSelectedGroupFilter(selectedGroupFilter === group.groupName ? 'TODOS' : group.groupName)}
                                    className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                                        selectedGroupFilter === group.groupName 
                                            ? 'bg-ui-accent/20 border-ui-accent text-white font-bold' 
                                            : 'border-transparent text-slate-300 hover:border-ui-border'
                                    }`}
                                >
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: group.color }} />
                                    <span>{group.groupName}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({group.sampleCount})</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 2: COMPARATIVA DETALLADA POR CLIENTE / GRUPO */}
            {(activeTab === 'clients' || isPdfMode) && (
                <div className={`p-6 rounded-2xl border ${
                    isPdfMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-ui-card border-ui-border text-slate-100'
                }`}>
                    <div className="flex items-center justify-between pb-4 border-b border-ui-border/40 mb-6">
                        <div>
                            <h3 className="text-base font-bold flex items-center space-x-2">
                                <Users className="w-5 h-5 text-ui-accent" />
                                <span>Segmentación y Comportamiento por {groupField}</span>
                            </h3>
                            <p className={`text-xs ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Identifica qué clientes reciben lotes con mayor concentración de proteína, grasa o xantofilas, y quiénes tienen mayor dispersión (inestabilidad).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pca.groups.map(group => {
                            // Encontrar el cuadrante
                            const isHighPc1 = group.centroidPc1 > 0;
                            const isHighPc2 = group.centroidPc2 > 0;

                            return (
                                <div 
                                    key={group.groupName}
                                    className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                                        isPdfMode 
                                            ? 'bg-slate-50 border-slate-200' 
                                            : 'bg-ui-darkest/70 border-ui-border hover:border-ui-accent/40'
                                    }`}
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center space-x-2 truncate">
                                                <span 
                                                    className="w-3.5 h-3.5 rounded-full shrink-0" 
                                                    style={{ backgroundColor: group.color }} 
                                                />
                                                <h4 className="font-bold text-sm text-slate-100 truncate">
                                                    {group.groupName}
                                                </h4>
                                            </div>
                                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                                isPdfMode ? 'bg-white text-slate-700 border' : 'bg-ui-card text-ui-accent border border-ui-border'
                                            }`}>
                                                {group.sampleCount} Muestras
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                                            {group.description}
                                        </p>

                                        {/* Coordenadas del Centroide */}
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono p-2.5 rounded-lg bg-ui-card/50 border border-ui-border/40 mb-3">
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-sans">Centroide PC1</span>
                                                <span className={group.centroidPc1 >= 0 ? 'text-sky-400 font-bold' : 'text-rose-400 font-bold'}>
                                                    {group.centroidPc1 > 0 ? `+${group.centroidPc1}` : group.centroidPc1}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-slate-400 block font-sans">Centroide PC2</span>
                                                <span className={group.centroidPc2 >= 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                                                    {group.centroidPc2 > 0 ? `+${group.centroidPc2}` : group.centroidPc2}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Indicador de Homogeneidad / Dispersión */}
                                    <div className="pt-2 border-t border-ui-border/30 flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">Variabilidad interna:</span>
                                        <span className={`font-semibold ${
                                            group.radius < 1.0 ? 'text-emerald-400' : group.radius < 1.8 ? 'text-amber-400' : 'text-rose-400'
                                        }`}>
                                            {group.radius < 1.0 ? 'Muy Homogéneo' : group.radius < 1.8 ? 'Variabilidad Moderada' : 'Alta Dispersión'} 
                                            <span className="text-[10px] text-slate-500 font-mono ml-1">(σ={group.radius})</span>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Resumen Automático de Conclusiones */}
                    <div className={`mt-6 p-4 rounded-xl border ${
                        isPdfMode ? 'bg-sky-50/70 border-sky-200 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                    }`}>
                        <div className="flex items-start space-x-2.5">
                            <Sparkles className="w-4 h-4 text-ui-accent shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                                <strong className="text-slate-100 font-bold block">Conclusiones del agrupamiento:</strong>
                                {pca.interpretation.groupInsights.map((insight, idx) => (
                                    <p key={idx} className="leading-relaxed text-slate-300">
                                        • {insight}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VISTA 3: CARGAS FACTORIALES (LOADINGS) */}
            {(activeTab === 'loadings' || isPdfMode) && (
                <div className={`p-6 rounded-2xl border ${
                    isPdfMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-ui-card border-ui-border text-slate-100'
                }`}>
                    <div className="flex items-center justify-between pb-4 border-b border-ui-border/40 mb-4">
                        <div>
                            <h3 className="text-base font-bold flex items-center space-x-2">
                                <Table className="w-5 h-5 text-ui-accent" />
                                <span>Cargas Factoriales (Loadings) y Calidad de Representación</span>
                            </h3>
                            <p className={`text-xs ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Correlación directa entre cada variable original y los componentes principales PC1 y PC2.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className={`border-b ${isPdfMode ? 'border-slate-200 text-slate-600 bg-slate-50' : 'border-ui-border/60 text-slate-400 bg-ui-darkest/60'}`}>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider">Nutriente</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Carga en PC1</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Contrib. PC1 (%)</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Carga en PC2</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Contrib. PC2 (%)</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-right">Calidad 2D (r²)</th>
                                    <th className="py-2.5 px-3 font-bold uppercase tracking-wider text-center">Interpretación</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ui-border/30">
                                {pca.loadings.map(loading => {
                                    const contrastColor = getPrintContrastingColor(loading.color, isPdfMode);
                                    return (
                                        <tr key={loading.key} className={isPdfMode ? 'hover:bg-slate-50' : 'hover:bg-ui-darkest/40'}>
                                            <td className="py-2.5 px-3 font-bold flex items-center space-x-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: contrastColor }} />
                                                <span>{loading.label}</span>
                                            </td>
                                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                                loading.pc1Loading > 0.4 ? 'text-sky-400' : loading.pc1Loading < -0.4 ? 'text-rose-400' : 'text-slate-400'
                                            }`}>
                                                {loading.pc1Loading > 0 ? `+${loading.pc1Loading}` : loading.pc1Loading}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                                {loading.contributionPc1}%
                                            </td>
                                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                                                loading.pc2Loading > 0.4 ? 'text-emerald-400' : loading.pc2Loading < -0.4 ? 'text-amber-400' : 'text-slate-400'
                                            }`}>
                                                {loading.pc2Loading > 0 ? `+${loading.pc2Loading}` : loading.pc2Loading}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                                {loading.contributionPc2}%
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-200">
                                                {(loading.magnitude * 100).toFixed(1)}%
                                            </td>
                                            <td className="py-2.5 px-3 text-center text-[11px] text-slate-300">
                                                {Math.abs(loading.pc1Loading) > Math.abs(loading.pc2Loading) ? (
                                                    <span className="px-2 py-0.5 rounded bg-sky-950/60 text-sky-300 border border-sky-800/40">
                                                        Define el Eje Horizontal (PC1)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                                                        Define el Eje Vertical (PC2)
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* VISTA 4: MATRIZ DE CORRELACIÓN INTERACTIVA */}
            {(activeTab === 'correlation' || isPdfMode) && (
                <div className={`p-6 rounded-2xl border ${
                    isPdfMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-ui-card border-ui-border text-slate-100'
                }`}>
                    <div className="flex items-center justify-between pb-4 border-b border-ui-border/40 mb-4">
                        <div>
                            <h3 className="text-base font-bold flex items-center space-x-2">
                                <Layers className="w-5 h-5 text-ui-accent" />
                                <span>Matriz de Correlación de Pearson (r)</span>
                            </h3>
                            <p className={`text-xs ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Mide el grado de asociación lineal entre pares de nutrientes. +1.0 indica correlación perfecta directa, -1.0 correlación inversa.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse mx-auto">
                            <thead>
                                <tr>
                                    <th className="p-2"></th>
                                    {pca.variableLabels.map(label => (
                                        <th key={label} className="p-2 font-bold text-center text-[11px] text-slate-300">
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pca.variableLabels.map((rowLabel, rIdx) => (
                                    <tr key={rowLabel}>
                                        <td className="p-2 font-bold text-right text-[11px] text-slate-300 whitespace-nowrap">
                                            {rowLabel}
                                        </td>
                                        {pca.variableLabels.map((colLabel, cIdx) => {
                                            const corr = pca.correlationMatrix[rIdx]?.[cIdx] ?? 0;
                                            const isDiag = rIdx === cIdx;

                                            // Coloreado según correlación
                                            let bgColor = 'transparent';
                                            let textColor = '#ffffff';

                                            if (isDiag) {
                                                bgColor = isPdfMode ? '#f1f5f9' : '#1e293b';
                                                textColor = isPdfMode ? '#0f172a' : '#94a3b8';
                                            } else if (corr > 0.6) {
                                                bgColor = isPdfMode ? '#dcfce7' : 'rgba(16, 185, 129, 0.4)';
                                                textColor = isPdfMode ? '#166534' : '#6ee7b7';
                                            } else if (corr > 0.25) {
                                                bgColor = isPdfMode ? '#e0f2fe' : 'rgba(2, 132, 199, 0.3)';
                                                textColor = isPdfMode ? '#075985' : '#7dd3fc';
                                            } else if (corr < -0.6) {
                                                bgColor = isPdfMode ? '#ffe4e6' : 'rgba(244, 63, 94, 0.4)';
                                                textColor = isPdfMode ? '#9f1239' : '#fda4af';
                                            } else if (corr < -0.25) {
                                                bgColor = isPdfMode ? '#ffedd5' : 'rgba(249, 115, 22, 0.3)';
                                                textColor = isPdfMode ? '#9a3412' : '#fdba74';
                                            }

                                            return (
                                                <td
                                                    key={`${rowLabel}-${colLabel}`}
                                                    className="p-2.5 text-center font-mono font-bold text-[11px] border border-ui-border/30 rounded"
                                                    style={{ backgroundColor: bgColor, color: textColor }}
                                                    title={`${rowLabel} vs ${colLabel}: r = ${corr.toFixed(3)}`}
                                                >
                                                    {corr.toFixed(2)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Resumen de correlaciones destacadas */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {pca.topCorrelations.slice(0, 4).map((c, i) => (
                            <div 
                                key={i}
                                className={`p-3 rounded-xl border flex items-center justify-between ${
                                    isPdfMode ? 'bg-slate-50 border-slate-200' : 'bg-ui-darkest border-ui-border/60'
                                }`}
                            >
                                <span className="font-semibold text-slate-300">
                                    {c.var1Label} ↔ {c.var2Label}
                                </span>
                                <span className={`font-mono font-bold px-2 py-0.5 rounded ${
                                    c.correlation > 0 
                                        ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40' 
                                        : 'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                                }`}>
                                    r = {c.correlation > 0 ? `+${c.correlation.toFixed(2)}` : c.correlation.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* VISTA 5: GRAFICA DE VARIANZA EXPLICADA (SCREE PLOT / PARETO) */}
            {(activeTab === 'scree' || isPdfMode) && (
                <div className={`p-6 rounded-2xl border ${
                    isPdfMode ? 'bg-white border-slate-200 text-slate-900' : 'bg-ui-card border-ui-border text-slate-100'
                }`}>
                    <div className="flex items-center justify-between pb-4 border-b border-ui-border/40 mb-4">
                        <div>
                            <h3 className="text-base font-bold flex items-center space-x-2">
                                <BarChart3 className="w-5 h-5 text-ui-accent" />
                                <span>Gráfica de Sedimentación (Scree Plot) y Varianza Acumulada</span>
                            </h3>
                            <p className={`text-xs ${isPdfMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                Porcentaje de varianza original retenido por cada componente principal.
                            </p>
                        </div>
                    </div>

                    <div className="h-[280px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={pca.components.map(c => ({
                                    name: `PC${c.component}`,
                                    varianza: c.varianceExplainedPct,
                                    acumulada: c.cumulativeVariancePct
                                }))}
                                margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke={isPdfMode ? '#e2e8f0' : '#1e293b'} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke={isPdfMode ? '#64748b' : '#94a3b8'} 
                                    fontSize={11} 
                                    fontWeight="bold" 
                                />
                                <YAxis 
                                    stroke={isPdfMode ? '#64748b' : '#94a3b8'} 
                                    fontSize={11} 
                                    unit="%" 
                                    domain={[0, 100]} 
                                />
                                <RechartsTooltip 
                                    contentStyle={{
                                        backgroundColor: isPdfMode ? '#ffffff' : '#0f172a',
                                        borderColor: isPdfMode ? '#cbd5e1' : '#334155',
                                        borderRadius: '8px',
                                        color: isPdfMode ? '#0f172a' : '#f8fafc',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="varianza" name="Varianza Individual (%)" radius={[6, 6, 0, 0]}>
                                    {pca.components.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index === 0 ? '#0284c7' : index === 1 ? '#10b981' : '#64748b'} 
                                        />
                                    ))}
                                </Bar>
                                <Line 
                                    type="monotone" 
                                    dataKey="acumulada" 
                                    name="Varianza Acumulada (%)" 
                                    stroke="#f59e0b" 
                                    strokeWidth={3} 
                                    dot={{ fill: '#f59e0b', r: 5 }} 
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
};
