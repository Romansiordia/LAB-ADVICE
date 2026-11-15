import React, { useState, useMemo, useEffect } from 'react';
import { RawMaterialData } from '../types';
import { NUTRIENTS, getPrintContrastingColor } from '../constants';
import {
    calculatePca,
    PcaGroupField,
    PcaResult,
    PcaSamplePoint,
    PcaLoading
} from '../pcaAnalysis';
import {
    Compass,
    CheckSquare,
    Square,
    RotateCcw,
    SlidersHorizontal,
    ChevronDown,
    ChevronUp,
    BarChart3,
    Layers,
    Table,
    Eye,
    EyeOff,
    Calendar,
    ArrowRight,
    Info,
    Sparkles
} from 'lucide-react';
import {
    ResponsiveContainer,
    Bar,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    CartesianGrid,
    Line,
    ComposedChart,
    Cell
} from 'recharts';
import { DateInputDDMMYYYY } from './DateInputDDMMYYYY';

interface PcaAnalysisViewProps {
    data: RawMaterialData[];
    selectedMaterial: string;
    isPdfMode?: boolean;
}

const CORE_NUTRIENT_KEYS = ['proteina', 'grasa', 'fibra', 'humedad', 'ceniza', 'almidon', 'xantofilas'];

const GROUP_OPTIONS: { id: PcaGroupField; label: string; badge?: string }[] = [
    { id: 'kmeans_3', label: 'Perfiles Automáticos (K-means: 3)', badge: 'IA Lab' },
    { id: 'kmeans_2', label: 'Perfiles Automáticos (K-means: 2)', badge: 'IA Lab' },
    { id: 'Origen', label: 'Origen' },
    { id: 'Cliente', label: 'Cliente' },
    { id: 'Proveedor', label: 'Proveedor' },
    { id: 'period_split', label: 'Antes vs Después' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'month', label: 'Mes' }
];

export const PcaAnalysisView: React.FC<PcaAnalysisViewProps> = ({
    data,
    selectedMaterial,
    isPdfMode = false
}) => {
    // Detectar qué dimensiones tienen múltiples valores
    const dimensionCounts = useMemo(() => {
        const countDistinct = (getter: (d: RawMaterialData) => string | undefined) => {
            const s = new Set(
                data
                    .map(d => String(getter(d) || '').trim())
                    .filter(v => v.length > 0)
            );
            return s.size;
        };

        return {
            Origen: countDistinct(d => d.Origen),
            Cliente: countDistinct(d => d.Cliente),
            Proveedor: countDistinct(d => d.Proveedor),
            subtipo: countDistinct(d => d.subtipo),
            material: countDistinct(d => d.material)
        };
    }, [data]);

    // Por defecto usar K-means (3 grupos) si el usuario no tiene proveedores/orígenes claros, o el que tenga datos
    const getDefaultGroupField = (): PcaGroupField => {
        return 'kmeans_3';
    };

    const [groupField, setGroupField] = useState<PcaGroupField>(getDefaultGroupField);
    const [cutoffDateIso, setCutoffDateIso] = useState<string | null>(null);

    // Filtros cruzados locales
    const [localFilterCliente, setLocalFilterCliente] = useState<string>('TODOS');
    const [localFilterOrigen, setLocalFilterOrigen] = useState<string>('TODOS');
    const [localFilterProveedor, setLocalFilterProveedor] = useState<string>('TODOS');

    // Controles visuales del mapa
    const [mapDensity, setMapDensity] = useState<'all' | 'zones'>('all');
    const [showVectors, setShowVectors] = useState<boolean>(true);
    const [showSampleLabels, setShowSampleLabels] = useState<boolean>(false);
    const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
    const [showParamSelector, setShowParamSelector] = useState<boolean>(false);
    const [activeSection, setActiveSection] = useState<'decision' | 'relations' | 'technical'>('decision');

    const [hoveredSample, setHoveredSample] = useState<PcaSamplePoint | null>(null);
    const [hoveredLoading, setHoveredLoading] = useState<PcaLoading | null>(null);

    const localOptions = useMemo(() => {
        const extract = (key: 'Cliente' | 'Origen' | 'Proveedor') => {
            const vals = Array.from(
                new Set(
                    data
                        .map(d => String(d[key] || '').trim())
                        .filter(Boolean)
                )
            ).sort();
            return vals;
        };
        return {
            clientes: extract('Cliente'),
            origenes: extract('Origen'),
            proveedores: extract('Proveedor')
        };
    }, [data]);

    const scopedData = useMemo(() => {
        return data.filter(d => {
            if (localFilterCliente !== 'TODOS' && String(d.Cliente || '').trim() !== localFilterCliente) return false;
            if (localFilterOrigen !== 'TODOS' && String(d.Origen || '').trim() !== localFilterOrigen) return false;
            if (localFilterProveedor !== 'TODOS' && String(d.Proveedor || '').trim() !== localFilterProveedor) return false;
            return true;
        });
    }, [data, localFilterCliente, localFilterOrigen, localFilterProveedor]);

    const nutrientsWithData = useMemo(() => {
        return NUTRIENTS.filter(n =>
            scopedData.some(d => {
                const raw = d[n.key];
                if (raw === undefined || raw === null || raw === '') return false;
                const val = Number(raw);
                return !isNaN(val) && isFinite(val) && val !== 0;
            })
        );
    }, [scopedData]);

    const coreNutrientsAvailable = useMemo(
        () => nutrientsWithData.filter(n => n.category === 'nutrients'),
        [nutrientsWithData]
    );
    const mycotoxinsAvailable = useMemo(
        () => nutrientsWithData.filter(n => n.category === 'mycotoxins'),
        [nutrientsWithData]
    );

    const [selectedVarKeys, setSelectedVarKeys] = useState<string[]>(() => {
        const available = nutrientsWithData.map(n => n.key);
        const preferred = CORE_NUTRIENT_KEYS.filter(k => available.includes(k));
        if (preferred.length >= 2) return preferred;
        const onlyNutrients = nutrientsWithData.filter(n => n.category === 'nutrients').map(n => n.key);
        return onlyNutrients.length >= 2 ? onlyNutrients.slice(0, 7) : available.slice(0, 6);
    });

    useEffect(() => {
        const available = nutrientsWithData.map(n => n.key);
        const validSelected = selectedVarKeys.filter(k => available.includes(k));
        if (validSelected.length < 2 && available.length >= 2) {
            const preferred = CORE_NUTRIENT_KEYS.filter(k => available.includes(k));
            setSelectedVarKeys(preferred.length >= 2 ? preferred : available.slice(0, 7));
        }
    }, [nutrientsWithData]);

    useEffect(() => {
        setHiddenGroups([]);
    }, [groupField, scopedData.length]);

    const toggleVariable = (key: string) => {
        if (selectedVarKeys.includes(key)) {
            if (selectedVarKeys.length > 2) {
                setSelectedVarKeys(selectedVarKeys.filter(k => k !== key));
            }
        } else {
            setSelectedVarKeys([...selectedVarKeys, key]);
        }
    };

    const applyPreset = (preset: 'core' | 'all_nutrients' | 'all') => {
        if (preset === 'core') {
            const available = nutrientsWithData.map(n => n.key);
            const preferred = CORE_NUTRIENT_KEYS.filter(k => available.includes(k));
            setSelectedVarKeys(preferred.length >= 2 ? preferred : available.slice(0, 7));
        } else if (preset === 'all_nutrients') {
            const list = coreNutrientsAvailable.map(n => n.key);
            if (list.length >= 2) setSelectedVarKeys(list);
        } else {
            setSelectedVarKeys(nutrientsWithData.map(n => n.key));
        }
    };

    const pca: PcaResult = useMemo(() => {
        return calculatePca(scopedData, selectedVarKeys, groupField, {
            cutoffDateIso
        });
    }, [scopedData, selectedVarKeys, groupField, cutoffDateIso]);

    const effectiveCutoffIso = cutoffDateIso || pca.suggestedCutoffIso;

    const visibleGroups = useMemo(() => {
        return pca.groups.filter(g => !hiddenGroups.includes(g.groupName));
    }, [pca.groups, hiddenGroups]);

    const visibleSamples = useMemo(() => {
        if (!pca.isValid) return [];
        return pca.samples.filter(s => !hiddenGroups.includes(s.group));
    }, [pca, hiddenGroups]);

    const toggleGroupVisibility = (groupName: string) => {
        setHiddenGroups(prev => {
            if (prev.includes(groupName)) {
                return prev.filter(g => g !== groupName);
            }
            if (prev.length >= pca.groups.length - 1) return prev;
            return [...prev, groupName];
        });
    };

    const isolateGroup = (groupName: string) => {
        const allOthers = pca.groups.map(g => g.groupName).filter(name => name !== groupName);
        if (hiddenGroups.length === allOthers.length && !hiddenGroups.includes(groupName)) {
            setHiddenGroups([]);
        } else {
            setHiddenGroups(allOthers);
        }
    };

    const hasLocalFilters =
        localFilterCliente !== 'TODOS' ||
        localFilterOrigen !== 'TODOS' ||
        localFilterProveedor !== 'TODOS';

    const resetLocalFilters = () => {
        setLocalFilterCliente('TODOS');
        setLocalFilterOrigen('TODOS');
        setLocalFilterProveedor('TODOS');
    };

    const svgWidth = 820;
    const svgHeight = 520;
    const marginX = 72;
    const marginY = 58;
    const innerWidth = svgWidth - marginX * 2;
    const innerHeight = svgHeight - marginY * 2;
    const centerX = marginX + innerWidth / 2;
    const centerY = marginY + innerHeight / 2;
    const biplotDomain = 1.15;

    const scaleX = (val: number) => centerX + (val / biplotDomain) * (innerWidth / 2);
    const scaleY = (val: number) => centerY - (val / biplotDomain) * (innerHeight / 2);
    const scaleRadius = (rScaled: number) => (rScaled / biplotDomain) * (innerWidth / 2);

    const formatMetric = (val: number | null) => {
        if (val === null || isNaN(val)) return '—';
        if (Math.abs(val) >= 100) return val.toFixed(1);
        return val.toFixed(2);
    };

    const activeGroupOptionLabel = GROUP_OPTIONS.find(o => o.id === groupField)?.label || groupField;
    const isKMeansMode = groupField.startsWith('kmeans_');

    const cardCls = isPdfMode
        ? 'bg-white border border-slate-200 text-slate-900'
        : 'bg-ui-card border border-ui-border text-slate-100';
    const subtlePanelCls = isPdfMode
        ? 'bg-slate-50 border border-slate-200 text-slate-800'
        : 'bg-ui-darkest/70 border border-ui-border text-slate-200';
    const mutedTextCls = isPdfMode ? 'text-slate-600' : 'text-slate-400';
    const headingTextCls = isPdfMode ? 'text-slate-900' : 'text-slate-100';

    if (!pca.isValid) {
        return (
            <div className={`p-8 rounded-2xl text-center space-y-4 ${cardCls}`}>
                <Compass className={`w-10 h-10 mx-auto ${isPdfMode ? 'text-amber-600' : 'text-amber-400'}`} />
                <div>
                    <h3 className={`text-lg font-bold ${headingTextCls}`}>
                        No hay datos suficientes para generar el mapa de calidad
                    </h3>
                    <p className={`text-sm max-w-lg mx-auto mt-1 ${mutedTextCls}`}>
                        {pca.errorMessage || 'Verifica que existan al menos 3 muestras y 2 parámetros con valores registrados.'}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-2">
                    {hasLocalFilters && (
                        <button
                            type="button"
                            onClick={resetLocalFilters}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                                isPdfMode
                                    ? 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'
                                    : 'bg-ui-darkest border-ui-border text-slate-200 hover:border-ui-accent'
                            }`}
                        >
                            Quitar filtros internos
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => applyPreset('all')}
                        className="px-4 py-2 bg-ui-accent text-[#040d1a] font-bold rounded-lg text-xs cursor-pointer"
                    >
                        Incluir todos los parámetros disponibles
                    </button>
                </div>
            </div>
        );
    }

    const sepBadgeStyle = (() => {
        if (pca.decisionSummary.separationLevel === 'Alta') {
            return isPdfMode ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50';
        }
        if (pca.decisionSummary.separationLevel === 'Moderada') {
            return isPdfMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-amber-950/60 text-amber-300 border-amber-700/50';
        }
        return isPdfMode ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-ui-darkest text-slate-300 border-ui-border';
    })();

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. ENCABEZADO SIMPLIFICADO PARA NUTRIÓLOGOS Y LAB */}
            <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-ui-border/40">
                    <div>
                        <div className={`flex flex-wrap items-center gap-2 text-xs ${mutedTextCls}`}>
                            <span className="font-semibold text-ui-accent">Análisis de Perfiles de Calidad</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{pca.sampleCount} lotes evaluados</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{pca.variableCount} parámetros de lab</span>
                        </div>
                        <h2 className={`text-xl md:text-2xl font-bold tracking-tight mt-1 ${headingTextCls}`}>
                            Mapa y Agrupamiento de Lotes ({selectedMaterial})
                        </h2>
                        <p className={`text-xs mt-1 max-w-3xl ${mutedTextCls}`}>
                            Diseñado para nutriólogos y laboratoristas: clasifica automáticamente los lotes por su perfil químico real o compáralos por origen, proveedor y fecha.
                        </p>
                    </div>

                    {!isPdfMode && (
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-ui-darkest border border-ui-border self-start lg:self-center">
                            {[
                                { id: 'decision', label: 'Mapa y Decisiones' },
                                { id: 'relations', label: 'Relaciones de Laboratorio' },
                                { id: 'technical', label: 'Detalle Estadístico' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveSection(tab.id as any)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                                        activeSection === tab.id
                                            ? 'bg-ui-accent text-[#040d1a] font-bold'
                                            : 'text-slate-300 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selector de Criterio / K-means */}
                <div className="pt-5 space-y-4">
                    <div>
                        <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isPdfMode ? 'text-slate-700' : 'text-slate-300'}`}>
                            <Sparkles className="w-3.5 h-3.5 text-ui-accent" />
                            <span>1. ¿Cómo deseas clasificar los lotes? (Prueba K-means para agrupar por similitud química pura):</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {GROUP_OPTIONS.map(opt => {
                                const isActive = groupField === opt.id;
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setGroupField(opt.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                                            isActive
                                                ? (isPdfMode
                                                    ? 'bg-sky-700 text-white border-sky-700'
                                                    : 'bg-ui-accent text-[#040d1a] border-ui-accent font-bold')
                                                : (isPdfMode
                                                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                                    : 'bg-ui-darkest/80 border-ui-border text-slate-300 hover:border-slate-500')
                                        }`}
                                    >
                                        <span>{opt.label}</span>
                                        {opt.badge && (
                                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                                                isActive
                                                    ? (isPdfMode ? 'bg-white/20 text-white' : 'bg-[#040d1a]/20 text-[#040d1a] font-black')
                                                    : 'bg-ui-accent/20 text-ui-accent'
                                            }`}>
                                                {opt.badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {groupField === 'period_split' && !isPdfMode && (
                        <div className={`p-3 rounded-xl flex flex-wrap items-center gap-4 ${subtlePanelCls}`}>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <Calendar className="w-4 h-4 text-ui-accent" />
                                <span>Fecha de corte (Antes vs Después):</span>
                            </div>
                            <div className="w-44">
                                <DateInputDDMMYYYY
                                    id="pca-cutoff-date"
                                    label=""
                                    value={effectiveCutoffIso}
                                    onChange={(iso) => setCutoffDateIso(iso)}
                                />
                            </div>
                        </div>
                    )}

                    {!isPdfMode && (
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className={`text-xs font-semibold ${mutedTextCls}`}>
                                    Filtro rápido:
                                </span>
                                {localOptions.origenes.length > 1 && groupField !== 'Origen' && (
                                    <select
                                        value={localFilterOrigen}
                                        onChange={(e) => setLocalFilterOrigen(e.target.value)}
                                        aria-label="Filtrar por Origen"
                                        className={`text-xs py-1 px-2.5 rounded-lg border outline-none cursor-pointer ${
                                            isPdfMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                                        }`}
                                    >
                                        <option value="TODOS">Todos los Orígenes</option>
                                        {localOptions.origenes.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                )}
                                {hasLocalFilters && (
                                    <button
                                        type="button"
                                        onClick={resetLocalFilters}
                                        className="text-xs text-ui-accent hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>Quitar filtro</span>
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowParamSelector(!showParamSelector)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer ${
                                    isPdfMode ? 'bg-white border-slate-300 text-slate-700' : 'bg-ui-darkest border-ui-border text-slate-300'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Parámetros de lab ({pca.variableCount})</span>
                                {showParamSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}

                    {showParamSelector && !isPdfMode && (
                        <div className={`p-4 rounded-xl space-y-3 ${subtlePanelCls}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold">Parámetros a incluir en el análisis:</span>
                                <div className="flex gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('core')}
                                        className="px-2.5 py-1 rounded border border-ui-border text-slate-300 cursor-pointer"
                                    >
                                        Nutrientes principales
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('all')}
                                        className="px-2.5 py-1 rounded border border-ui-border text-slate-300 cursor-pointer"
                                    >
                                        Todos
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {nutrientsWithData.map(nutrient => {
                                    const isSelected = selectedVarKeys.includes(nutrient.key);
                                    const color = getPrintContrastingColor(nutrient.color, isPdfMode);
                                    return (
                                        <button
                                            key={nutrient.key}
                                            type="button"
                                            onClick={() => toggleVariable(nutrient.key)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border cursor-pointer ${
                                                isSelected ? 'bg-ui-card border-ui-accent text-slate-100' : 'bg-transparent border-ui-border text-slate-500 opacity-70'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span>{nutrient.label.replace(/\s*\(.*?\)/, '')}</span>
                                            {isSelected ? <CheckSquare className="w-3.5 h-3.5 text-ui-accent" /> : <Square className="w-3.5 h-3.5" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. RESUMEN GERENCIAL PARA NUTRIÓLOGOS Y TÉCNICOS */}
            {(activeSection === 'decision' || isPdfMode) && (
                <>
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-ui-border/40">
                            <div>
                                <h3 className={`text-base font-bold ${headingTextCls}`}>
                                    {isKMeansMode ? '💡 Conclusiones de los Perfiles Automáticos (K-means)' : `💡 Conclusiones del análisis por ${activeGroupOptionLabel}`}
                                </h3>
                                <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                    Resumen práctico para formulación y control de calidad.
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg border text-xs font-bold ${sepBadgeStyle}`}>
                                {pca.decisionSummary.separationTitle}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-xs leading-relaxed">
                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-sky-800' : 'text-sky-400'}`}>
                                    1. Hallazgo Principal
                                </div>
                                <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                    {pca.decisionSummary.mainFinding}
                                </p>
                            </div>

                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-emerald-800' : 'text-emerald-400'}`}>
                                    2. Consistencia y Estabilidad
                                </div>
                                <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                    {pca.decisionSummary.stabilityFinding}
                                </p>
                            </div>

                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-amber-800' : 'text-amber-400'}`}>
                                    3. Correlación Química
                                </div>
                                <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                    {pca.decisionSummary.nutrientFinding}
                                </p>
                            </div>
                        </div>

                        <div className={`mt-4 pt-3 border-t border-ui-border/40 flex items-start gap-2 text-xs ${
                            isPdfMode ? 'text-slate-700' : 'text-slate-300'
                        }`}>
                            <ArrowRight className={`w-4 h-4 shrink-0 mt-0.5 ${isPdfMode ? 'text-sky-700' : 'text-ui-accent'}`} />
                            <span><strong>Recomendación técnica:</strong> {pca.decisionSummary.recommendation}</span>
                        </div>
                    </div>

                    {/* 3. MAPA VISUAL Y LISTADO DE GRUPOS */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                        <div className={`xl:col-span-8 p-5 rounded-2xl flex flex-col ${cardCls}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-ui-border/40 mb-4">
                                <div>
                                    <h3 className={`text-base font-bold ${headingTextCls}`}>
                                        Mapa Biplot de Calidad
                                    </h3>
                                    <p className={`text-xs ${mutedTextCls}`}>
                                        {isKMeansMode
                                            ? 'Cada color representa un perfil de calidad detectado por similitud matemática.'
                                            : 'Cada punto es un lote. Las flechas muestran hacia dónde aumenta cada nutriente.'}
                                    </p>
                                </div>

                                {!isPdfMode && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <div className="flex p-0.5 rounded-lg bg-ui-darkest border border-ui-border">
                                            <button
                                                type="button"
                                                onClick={() => setMapDensity('all')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                                                    mapDensity === 'all' ? 'bg-ui-accent text-[#040d1a] font-bold' : 'text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Lotes + Zonas
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMapDensity('zones')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer ${
                                                    mapDensity === 'zones' ? 'bg-ui-accent text-[#040d1a] font-bold' : 'text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Solo Zonas
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowVectors(!showVectors)}
                                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                                                showVectors ? 'border-ui-accent text-ui-accent bg-ui-accent/10' : 'border-ui-border text-slate-400 bg-ui-darkest'
                                            }`}
                                        >
                                            {showVectors ? 'Nutrientes: Sí' : 'Nutrientes: No'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* SVG */}
                            <div className="relative w-full flex-1 flex flex-col justify-center">
                                <div className="w-full aspect-[820/520] relative">
                                    <svg
                                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                                        className="w-full h-full select-none"
                                        style={{
                                            backgroundColor: isPdfMode ? '#ffffff' : '#040d1a',
                                            borderRadius: '12px',
                                            border: isPdfMode ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.08)'
                                        }}
                                    >
                                        <line x1={marginX} y1={centerY} x2={svgWidth - marginX} y2={centerY} stroke={isPdfMode ? '#cbd5e1' : '#334155'} strokeWidth="1.25" strokeDasharray="4 4" />
                                        <line x1={centerX} y1={marginY} x2={centerX} y2={svgHeight - marginY} stroke={isPdfMode ? '#cbd5e1' : '#334155'} strokeWidth="1.25" strokeDasharray="4 4" />

                                        <text x={svgWidth - 16} y={centerY - 8} textAnchor="end" fill={isPdfMode ? '#0369a1' : '#38bdf8'} fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                                            {pca.axisLabels.pc1Positive} →
                                        </text>
                                        <text x={16} y={centerY - 8} textAnchor="start" fill={isPdfMode ? '#475569' : '#94a3b8'} fontSize="10.5" fontWeight="bold" fontFamily="sans-serif">
                                            ← {pca.axisLabels.pc1Negative}
                                        </text>
                                        <text x={centerX} y={22} textAnchor="middle" fill={isPdfMode ? '#047857' : '#34d399'} fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                                            ↑ {pca.axisLabels.pc2Positive}
                                        </text>
                                        <text x={centerX} y={svgHeight - 16} textAnchor="middle" fill={isPdfMode ? '#475569' : '#94a3b8'} fontSize="10.5" fontWeight="bold" fontFamily="sans-serif">
                                            ↓ {pca.axisLabels.pc2Negative}
                                        </text>

                                        {visibleGroups.map(group => {
                                            const cX = scaleX(group.centroidPc1Scaled);
                                            const cY = scaleY(group.centroidPc2Scaled);
                                            const radPx = scaleRadius(group.radiusScaled);
                                            const gColor = getPrintContrastingColor(group.color, isPdfMode);

                                            return (
                                                <g key={`zone-${group.groupName}`}>
                                                    <circle
                                                        cx={cX}
                                                        cy={cY}
                                                        r={radPx}
                                                        fill={gColor}
                                                        fillOpacity={mapDensity === 'zones' ? 0.16 : 0.08}
                                                        stroke={gColor}
                                                        strokeWidth={mapDensity === 'zones' ? 2 : 1.3}
                                                        strokeDasharray="4 3"
                                                    />
                                                </g>
                                            );
                                        })}

                                        {mapDensity === 'all' && visibleSamples.map(sample => {
                                            const cx = scaleX(sample.pc1Scaled);
                                            const cy = scaleY(sample.pc2Scaled);
                                            const grp = pca.groups.find(g => g.groupName === sample.group);
                                            const ptColor = getPrintContrastingColor(grp?.color || '#0284c7', isPdfMode);
                                            const isHovered = hoveredSample?.id === sample.id;

                                            return (
                                                <g
                                                    key={sample.id}
                                                    onMouseEnter={() => setHoveredSample(sample)}
                                                    onMouseLeave={() => setHoveredSample(null)}
                                                    className="cursor-pointer"
                                                >
                                                    <circle
                                                        cx={cx}
                                                        cy={cy}
                                                        r={isHovered ? 7.5 : 4.2}
                                                        fill={ptColor}
                                                        fillOpacity={isHovered ? 1 : 0.72}
                                                        stroke={isHovered ? (isPdfMode ? '#0f172a' : '#ffffff') : (isPdfMode ? '#ffffff' : '#040d1a')}
                                                        strokeWidth={isHovered ? 2 : 0.9}
                                                    />
                                                </g>
                                            );
                                        })}

                                        {showVectors && pca.loadings.map(loading => {
                                            const targetX = scaleX(loading.pc1Loading * 0.9);
                                            const targetY = scaleY(loading.pc2Loading * 0.9);
                                            const vectorColor = getPrintContrastingColor(loading.color, isPdfMode);
                                            const isRightSide = loading.pc1Loading >= 0;
                                            const labelText = loading.label;
                                            const boxWidth = labelText.length * 6.4 + 14;
                                            const boxX = isRightSide
                                                ? Math.min(svgWidth - marginX - boxWidth + 20, targetX + 8)
                                                : Math.max(marginX - 20, targetX - boxWidth - 8);
                                            const boxY = Math.max(marginY - 6, Math.min(svgHeight - marginY - 18, targetY - 10));

                                            return (
                                                <g key={`vector-${loading.key}`} className="cursor-pointer">
                                                    <line x1={centerX} y1={centerY} x2={targetX} y2={targetY} stroke={vectorColor} strokeWidth="1.9" strokeOpacity={0.85} strokeLinecap="round" />
                                                    <circle cx={targetX} cy={targetY} r="3.2" fill={vectorColor} stroke={isPdfMode ? '#ffffff' : '#040d1a'} strokeWidth="1.2" />
                                                    <rect x={boxX} y={boxY} width={boxWidth} height="19" rx="4" fill={isPdfMode ? '#ffffff' : '#091528'} fillOpacity="0.92" stroke={vectorColor} strokeWidth="1" />
                                                    <text x={boxX + 7} y={boxY + 13} fill={isPdfMode ? '#0f172a' : '#f8fafc'} fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                                                        {labelText}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {visibleGroups.map(group => {
                                            const cX = scaleX(group.centroidPc1Scaled);
                                            const cY = scaleY(group.centroidPc2Scaled);
                                            const gColor = getPrintContrastingColor(group.color, isPdfMode);
                                            const labelText = `${group.groupName} (${group.sampleCount})`;
                                            const boxW = Math.min(200, labelText.length * 6.2 + 14);
                                            const boxX = Math.max(marginX, Math.min(svgWidth - marginX - boxW, cX + 10));
                                            const boxY = Math.max(marginY, Math.min(svgHeight - marginY - 22, cY - 12));

                                            return (
                                                <g key={`centroid-${group.groupName}`}>
                                                    <polygon points={`${cX},${cY - 8} ${cX + 7},${cY + 5} ${cX - 7},${cY + 5}`} fill={gColor} stroke="#ffffff" strokeWidth="1.5" />
                                                    <rect x={boxX} y={boxY} width={boxW} height="20" rx="5" fill={isPdfMode ? '#ffffff' : '#0f172a'} fillOpacity="0.95" stroke={gColor} strokeWidth="1.4" />
                                                    <text x={boxX + 7} y={boxY + 13.5} fill={isPdfMode ? '#0f172a' : '#ffffff'} fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                                                        {labelText.length > 28 ? `${labelText.slice(0, 26)}…` : labelText}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {hoveredSample && (
                                        <div
                                            className={`absolute z-30 pointer-events-none p-3 rounded-xl shadow-xl border text-xs w-64 ${
                                                isPdfMode ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900/95 text-slate-100 border-ui-border'
                                            }`}
                                            style={{
                                                top: '12px',
                                                left: hoveredSample.pc1Scaled > 0 ? '12px' : undefined,
                                                right: hoveredSample.pc1Scaled <= 0 ? '12px' : undefined
                                            }}
                                        >
                                            <div className="flex items-center justify-between border-b border-ui-border/40 pb-1.5 mb-2">
                                                <span className="font-bold text-ui-accent truncate">
                                                    {hoveredSample.lote || hoveredSample.noId || 'Lote'}
                                                </span>
                                                <span className={`text-[11px] font-mono tabular-nums ${mutedTextCls}`}>
                                                    {hoveredSample.formattedDate}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5 text-[11px] mb-2">
                                                <div><strong>Grupo:</strong> {hoveredSample.group}</div>
                                                {hoveredSample.origen && <div><strong>Origen:</strong> {hoveredSample.origen}</div>}
                                                {hoveredSample.proveedor && <div><strong>Proveedor:</strong> {hoveredSample.proveedor}</div>}
                                            </div>
                                            <div className="pt-1.5 border-t border-ui-border/40 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                                {Object.entries(hoveredSample.values).slice(0, 6).map(([k, v]) => {
                                                    const vConf = pca.variables.find(x => x.key === k);
                                                    return (
                                                        <div key={k} className="flex justify-between gap-1">
                                                            <span className={mutedTextCls}>{vConf?.label || k}:</span>
                                                            <span className="font-mono tabular-nums font-semibold">{formatMetric(Number(v))}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Listado lateral de grupos */}
                        <div className={`xl:col-span-4 p-5 rounded-2xl flex flex-col justify-between gap-4 ${cardCls}`}>
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-ui-border/40 mb-3">
                                    <h3 className={`text-sm font-bold ${headingTextCls}`}>
                                        Perfiles / Grupos Detectados ({pca.groups.length})
                                    </h3>
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                    {pca.groups.map(group => {
                                        const isHidden = hiddenGroups.includes(group.groupName);
                                        const gColor = getPrintContrastingColor(group.color, isPdfMode);

                                        return (
                                            <div
                                                key={group.groupName}
                                                className={`p-3 rounded-xl border transition-opacity ${isHidden ? 'opacity-45' : 'opacity-100'} ${
                                                    isPdfMode ? 'bg-slate-50 border-slate-200' : 'bg-ui-darkest/60 border-ui-border'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: gColor }} />
                                                        <span className={`text-xs font-bold truncate ${headingTextCls}`}>{group.groupName}</span>
                                                    </div>
                                                    {!isPdfMode && (
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleGroupVisibility(group.groupName)}
                                                            className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                                        >
                                                            {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-2 text-[11px] mt-1 ${mutedTextCls}`}>
                                                    <span className="font-mono tabular-nums">{group.sampleCount} lotes</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className={group.stabilityLabel === 'Muy Estable' ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                                                        {group.stabilityLabel}
                                                    </span>
                                                </div>
                                                <p className={`text-[11px] mt-1.5 leading-snug ${isPdfMode ? 'text-slate-700' : 'text-slate-300'}`}>
                                                    {group.description}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={`p-3.5 rounded-xl text-[11px] space-y-1 ${subtlePanelCls}`}>
                                <div className="font-bold flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-ui-accent" />
                                    <span>Guía Rápida para Laboratorio</span>
                                </div>
                                <p className={mutedTextCls}>• Puntos juntos = Lotes con calidad química idéntica.</p>
                                <p className={mutedTextCls}>• Flechas = Dirección en la que crece cada nutriente analizado.</p>
                            </div>
                        </div>
                    </div>

                    {/* 4. TABLA DE PROMEDIOS REALES */}
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="flex items-center justify-between pb-4 border-b border-ui-border/40 mb-4">
                            <div>
                                <h3 className={`text-base font-bold ${headingTextCls}`}>
                                    Promedios Reales de Laboratorio por Grupo
                                </h3>
                                <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                    Comparativa directa de los parámetros analíticos entre cada perfil detectado frente a la referencia general.
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className={`border-b ${isPdfMode ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-ui-border bg-ui-darkest/70 text-slate-300'}`}>
                                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">Grupo / Perfil</th>
                                        <th className="py-2.5 px-3 font-bold text-right whitespace-nowrap">Lotes</th>
                                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">Consistencia</th>
                                        {pca.variables.map(v => (
                                            <th key={v.key} className="py-2.5 px-3 font-bold text-right whitespace-nowrap">
                                                {v.label} {v.unit ? `(${v.unit})` : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border/30">
                                    <tr className={isPdfMode ? 'bg-sky-50/50 font-semibold' : 'bg-ui-darkest/40 font-semibold'}>
                                        <td className={`py-2.5 px-3 whitespace-nowrap ${isPdfMode ? 'text-sky-900' : 'text-ui-accent'}`}>
                                            Promedio General ({selectedMaterial})
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">{pca.sampleCount}</td>
                                        <td className={`py-2.5 px-3 ${mutedTextCls}`}>Base</td>
                                        {pca.variables.map(v => (
                                            <td key={v.key} className="py-2.5 px-3 text-right font-mono tabular-nums">{formatMetric(v.mean)}</td>
                                        ))}
                                    </tr>

                                    {visibleGroups.map(group => {
                                        const gColor = getPrintContrastingColor(group.color, isPdfMode);
                                        return (
                                            <tr key={group.groupName} className={isPdfMode ? 'hover:bg-slate-50' : 'hover:bg-ui-darkest/30'}>
                                                <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: gColor }} />
                                                        <span className={headingTextCls}>{group.groupName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono tabular-nums">{group.sampleCount}</td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className={`font-semibold ${group.stabilityLabel === 'Muy Estable' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                        {group.stabilityLabel}
                                                    </span>
                                                </td>
                                                {pca.variables.map(v => {
                                                    const stat = group.variableStats[v.key];
                                                    if (!stat || stat.mean === null) return <td key={v.key} className="py-2.5 px-3 text-right font-mono text-slate-500">—</td>;
                                                    const isNotable = Math.abs(stat.diffVsGlobalPct) >= 3;
                                                    const diffCol = stat.diffVsGlobalPct > 0 ? 'text-emerald-400' : 'text-rose-400';
                                                    return (
                                                        <td key={v.key} className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                                            <span className="font-bold">{formatMetric(stat.mean)}</span>
                                                            {isNotable && (
                                                                <span className={`ml-1.5 text-[10px] ${diffCol}`}>
                                                                    ({stat.diffVsGlobalPct > 0 ? `+${stat.diffVsGlobalPct}%` : `${stat.diffVsGlobalPct}%`})
                                                                </span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* 5. RELACIONES */}
            {(activeSection === 'relations' || isPdfMode) && (
                <div className={`p-5 md:p-6 rounded-2xl space-y-6 ${cardCls}`}>
                    <div className="border-b border-ui-border/40 pb-4">
                        <h3 className={`text-base font-bold flex items-center gap-2 ${headingTextCls}`}>
                            <Layers className="w-5 h-5 text-ui-accent" />
                            <span>Correlaciones entre Parámetros de Laboratorio</span>
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {pca.topCorrelations.slice(0, 6).map((c, idx) => {
                            const absR = Math.abs(c.correlation);
                            const isPos = c.correlation > 0;
                            return (
                                <div key={idx} className={`p-3.5 rounded-xl flex items-center justify-between gap-3 ${subtlePanelCls}`}>
                                    <div>
                                        <div className={`font-bold ${headingTextCls}`}>{c.var1Label} ↔ {c.var2Label}</div>
                                        <div className={`text-[11px] mt-0.5 ${mutedTextCls}`}>
                                            {isPos ? 'Aumentan o disminuyen juntos' : 'Comportamiento inverso'}
                                        </div>
                                    </div>
                                    <span className={`font-mono tabular-nums font-bold px-2.5 py-1 rounded-lg border ${
                                        isPos ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300' : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
                                    }`}>
                                        r = {c.correlation > 0 ? `+${c.correlation.toFixed(2)}` : c.correlation.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 6. DETALLE TÉCNICO */}
            {activeSection === 'technical' && !isPdfMode && (
                <div className="space-y-6">
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="pb-4 border-b border-ui-border/40 mb-4">
                            <h3 className={`text-base font-bold flex items-center gap-2 ${headingTextCls}`}>
                                <Table className="w-5 h-5 text-ui-accent" />
                                <span>Cargas Factoriales Detalladas</span>
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-ui-border/60 text-slate-400 bg-ui-darkest/60">
                                        <th className="py-2.5 px-3 font-bold">Parámetro</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Eje 1</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Eje 2</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Calidad (r²)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border/30">
                                    {pca.loadings.map(loading => (
                                        <tr key={loading.key} className="hover:bg-ui-darkest/40">
                                            <td className="py-2.5 px-3 font-bold flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: loading.color }} />
                                                <span>{loading.label}</span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-400 font-bold">{loading.pc1Loading}</td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400 font-bold">{loading.pc2Loading}</td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-200">{(loading.magnitude * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
