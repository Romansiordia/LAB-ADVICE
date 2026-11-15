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
    Info
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

const GROUP_OPTIONS: { id: PcaGroupField; label: string }[] = [
    { id: 'Origen', label: 'Origen' },
    { id: 'Cliente', label: 'Cliente' },
    { id: 'Proveedor', label: 'Proveedor' },
    { id: 'period_split', label: 'Antes vs Después' },
    { id: 'quarter', label: 'Trimestre' },
    { id: 'month', label: 'Mes' },
    { id: 'year', label: 'Año' },
    { id: 'subtipo', label: 'Subtipo' },
    { id: 'material', label: 'Materia Prima' }
];

export const PcaAnalysisView: React.FC<PcaAnalysisViewProps> = ({
    data,
    selectedMaterial,
    isPdfMode = false
}) => {
    // Detectar qué dimensiones tienen múltiples valores en los datos actuales
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

    // Elegir por defecto la dimensión más informativa disponible
    const getDefaultGroupField = (): PcaGroupField => {
        if (dimensionCounts.Origen >= 2) return 'Origen';
        if (dimensionCounts.Cliente >= 2) return 'Cliente';
        if (dimensionCounts.Proveedor >= 2) return 'Proveedor';
        if (dimensionCounts.subtipo >= 2) return 'subtipo';
        return 'period_split';
    };

    const [groupField, setGroupField] = useState<PcaGroupField>(getDefaultGroupField);
    const [cutoffDateIso, setCutoffDateIso] = useState<string | null>(null);

    // Filtros cruzados locales dentro de PCA para segregar fácilmente (ej. ver Origen dentro de un Cliente específico)
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

    // Opciones para los filtros cruzados locales
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

    // Aplicar filtros cruzados locales sin afectar al resto de la aplicación
    const scopedData = useMemo(() => {
        return data.filter(d => {
            if (localFilterCliente !== 'TODOS' && String(d.Cliente || '').trim() !== localFilterCliente) return false;
            if (localFilterOrigen !== 'TODOS' && String(d.Origen || '').trim() !== localFilterOrigen) return false;
            if (localFilterProveedor !== 'TODOS' && String(d.Proveedor || '').trim() !== localFilterProveedor) return false;
            return true;
        });
    }, [data, localFilterCliente, localFilterOrigen, localFilterProveedor]);

    // Nutrientes con datos presentes en el conjunto actual (ignorando ceros vacíos)
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

    // Sincronizar si cambia la materia prima o el dataset
    useEffect(() => {
        const available = nutrientsWithData.map(n => n.key);
        const validSelected = selectedVarKeys.filter(k => available.includes(k));
        if (validSelected.length < 2 && available.length >= 2) {
            const preferred = CORE_NUTRIENT_KEYS.filter(k => available.includes(k));
            setSelectedVarKeys(preferred.length >= 2 ? preferred : available.slice(0, 7));
        }
    }, [nutrientsWithData]);

    // Limpiar grupos ocultos al cambiar el criterio de agrupación
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

    // Cálculo del PCA
    const pca: PcaResult = useMemo(() => {
        return calculatePca(scopedData, selectedVarKeys, groupField, {
            cutoffDateIso
        });
    }, [scopedData, selectedVarKeys, groupField, cutoffDateIso]);

    // Inicializar fecha de corte sugerida si está vacía
    const effectiveCutoffIso = cutoffDateIso || pca.suggestedCutoffIso;

    // Grupos visibles
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
            // Evitar ocultar absolutamente todos
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

    // Coordenadas SVG del mapa
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

    // Clases base adaptativas (Dark vs White/PDF)
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
                        No hay datos suficientes para generar el mapa comparativo (PCA)
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
                            Quitar filtros internos de PCA
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
            return isPdfMode
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/50';
        }
        if (pca.decisionSummary.separationLevel === 'Moderada') {
            return isPdfMode
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-amber-950/60 text-amber-300 border-amber-700/50';
        }
        return isPdfMode
            ? 'bg-slate-100 text-slate-700 border-slate-300'
            : 'bg-ui-darkest text-slate-300 border-ui-border';
    })();

    return (
        <div className="space-y-6 animate-fade-in">
            {/* 1. ENCABEZADO Y CONTROLES DE SEGREGACIÓN */}
            <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-ui-border/40">
                    <div>
                        <div className={`flex flex-wrap items-center gap-2 text-xs ${mutedTextCls}`}>
                            <span className="font-semibold">Análisis Multivariado (PCA)</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{pca.sampleCount} muestras</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{pca.variableCount} parámetros</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                                Fidelidad del mapa: {pca.totalVarianceExplained2D}%
                            </span>
                        </div>
                        <h2 className={`text-xl md:text-2xl font-bold tracking-tight mt-1 ${headingTextCls}`}>
                            Comparador de Perfiles por {activeGroupOptionLabel}
                        </h2>
                        <p className={`text-xs mt-1 max-w-3xl ${mutedTextCls}`}>
                            Agrupa tus muestras automáticamente por calidad nutricional para detectar qué orígenes, clientes, proveedores o fechas tienen diferencias reales.
                        </p>
                    </div>

                    {/* Navegación simple de profundidad */}
                    {!isPdfMode && (
                        <div className="flex items-center gap-1 p-1 rounded-xl bg-ui-darkest border border-ui-border self-start lg:self-center">
                            {[
                                { id: 'decision', label: 'Mapa y Decisiones' },
                                { id: 'relations', label: 'Relación entre Nutrientes' },
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

                {/* Selector directo: ¿Cómo quieres segregar/agrupar tus datos? */}
                <div className="pt-5 space-y-4">
                    <div>
                        <div className={`text-xs font-semibold mb-2 ${isPdfMode ? 'text-slate-700' : 'text-slate-300'}`}>
                            1. Elige cómo agrupar y comparar las muestras:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {GROUP_OPTIONS.map(opt => {
                                const isActive = groupField === opt.id;
                                const countBadge =
                                    opt.id === 'Origen' ? dimensionCounts.Origen :
                                    opt.id === 'Cliente' ? dimensionCounts.Cliente :
                                    opt.id === 'Proveedor' ? dimensionCounts.Proveedor :
                                    opt.id === 'subtipo' ? dimensionCounts.subtipo :
                                    opt.id === 'material' ? dimensionCounts.material : null;

                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setGroupField(opt.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
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
                                        {countBadge !== null && (
                                            <span className={`ml-1.5 text-[10px] font-mono tabular-nums ${
                                                isActive
                                                    ? (isPdfMode ? 'text-sky-100' : 'text-[#040d1a]/80')
                                                    : mutedTextCls
                                            }`}>
                                                ({countBadge})
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Control de fecha de corte cuando está activo "Antes vs Después" */}
                    {groupField === 'period_split' && !isPdfMode && (
                        <div className={`p-3 rounded-xl flex flex-wrap items-center gap-4 ${subtlePanelCls}`}>
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <Calendar className="w-4 h-4 text-ui-accent" />
                                <span>Dividir historial en dos periodos (Antes vs Desde):</span>
                            </div>
                            <div className="w-44">
                                <DateInputDDMMYYYY
                                    id="pca-cutoff-date"
                                    label=""
                                    value={effectiveCutoffIso}
                                    onChange={(iso) => setCutoffDateIso(iso)}
                                />
                            </div>
                            {cutoffDateIso && (
                                <button
                                    type="button"
                                    onClick={() => setCutoffDateIso(null)}
                                    className="text-xs text-ui-accent hover:underline cursor-pointer"
                                >
                                    Usar punto medio automático
                                </button>
                            )}
                        </div>
                    )}

                    {/* Barra de sub-filtros cruzados (para combinar p. ej. Origen dentro de un Cliente, o Fechas dentro de un Origen) */}
                    {!isPdfMode && (localOptions.origenes.length > 1 || localOptions.clientes.length > 1 || localOptions.proveedores.length > 1) && (
                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <span className={`text-xs font-semibold ${mutedTextCls}`}>
                                2. Enfocar en un subgrupo (opcional):
                            </span>

                            {localOptions.origenes.length > 1 && groupField !== 'Origen' && (
                                <select
                                    value={localFilterOrigen}
                                    onChange={(e) => setLocalFilterOrigen(e.target.value)}
                                    aria-label="Filtrar por Origen"
                                    className={`text-xs py-1.5 px-2.5 rounded-lg border outline-none cursor-pointer ${
                                        isPdfMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                                    }`}
                                >
                                    <option value="TODOS">Todos los Orígenes</option>
                                    {localOptions.origenes.map(o => (
                                        <option key={o} value={o}>Origen: {o}</option>
                                    ))}
                                </select>
                            )}

                            {localOptions.clientes.length > 1 && groupField !== 'Cliente' && (
                                <select
                                    value={localFilterCliente}
                                    onChange={(e) => setLocalFilterCliente(e.target.value)}
                                    aria-label="Filtrar por Cliente"
                                    className={`text-xs py-1.5 px-2.5 rounded-lg border outline-none cursor-pointer ${
                                        isPdfMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                                    }`}
                                >
                                    <option value="TODOS">Todos los Clientes</option>
                                    {localOptions.clientes.map(c => (
                                        <option key={c} value={c}>Cliente: {c}</option>
                                    ))}
                                </select>
                            )}

                            {localOptions.proveedores.length > 1 && groupField !== 'Proveedor' && (
                                <select
                                    value={localFilterProveedor}
                                    onChange={(e) => setLocalFilterProveedor(e.target.value)}
                                    aria-label="Filtrar por Proveedor"
                                    className={`text-xs py-1.5 px-2.5 rounded-lg border outline-none cursor-pointer ${
                                        isPdfMode ? 'bg-white border-slate-300 text-slate-800' : 'bg-ui-darkest border-ui-border text-slate-200'
                                    }`}
                                >
                                    <option value="TODOS">Todos los Proveedores</option>
                                    {localOptions.proveedores.map(p => (
                                        <option key={p} value={p}>Proveedor: {p}</option>
                                    ))}
                                </select>
                            )}

                            {hasLocalFilters && (
                                <button
                                    type="button"
                                    onClick={resetLocalFilters}
                                    className="text-xs text-ui-accent hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Limpiar enfoque</span>
                                </button>
                            )}

                            {/* Botón discreto para ajustar qué parámetros entran al cálculo */}
                            <button
                                type="button"
                                onClick={() => setShowParamSelector(!showParamSelector)}
                                className={`ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-colors ${
                                    isPdfMode
                                        ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                                        : 'bg-ui-darkest border-ui-border text-slate-300 hover:border-ui-accent'
                                }`}
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Parámetros incluidos ({pca.variableCount})</span>
                                {showParamSelector ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}

                    {/* Selector desplegable de parámetros (oculto por defecto para mantener la vista limpia) */}
                    {showParamSelector && !isPdfMode && (
                        <div className={`p-4 rounded-xl space-y-3 ${subtlePanelCls}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold">
                                    Selecciona qué análisis intervienen en la comparación (mínimo 2):
                                </span>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => applyPreset('core')}
                                        className="px-2.5 py-1 rounded border border-ui-border hover:border-ui-accent text-slate-300 cursor-pointer"
                                    >
                                        Nutrientes principales
                                    </button>
                                    {coreNutrientsAvailable.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => applyPreset('all_nutrients')}
                                            className="px-2.5 py-1 rounded border border-ui-border hover:border-ui-accent text-slate-300 cursor-pointer"
                                        >
                                            Todos los nutrientes
                                        </button>
                                    )}
                                    {mycotoxinsAvailable.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => applyPreset('all')}
                                            className="px-2.5 py-1 rounded border border-ui-border hover:border-ui-accent text-slate-300 cursor-pointer"
                                        >
                                            Incluir micotoxinas
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {nutrientsWithData.map(nutrient => {
                                    const isSelected = selectedVarKeys.includes(nutrient.key);
                                    const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');
                                    const color = getPrintContrastingColor(nutrient.color, isPdfMode);
                                    return (
                                        <button
                                            key={nutrient.key}
                                            type="button"
                                            onClick={() => toggleVariable(nutrient.key)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                                                isSelected
                                                    ? 'bg-ui-card border-ui-accent text-slate-100'
                                                    : 'bg-transparent border-ui-border text-slate-500 opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                            <span>{cleanLabel}</span>
                                            {isSelected ? (
                                                <CheckSquare className="w-3.5 h-3.5 text-ui-accent" />
                                            ) : (
                                                <Square className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. RESUMEN EJECUTIVO PARA TOMA DE DECISIONES */}
            {(activeSection === 'decision' || isPdfMode) && (
                <>
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-ui-border/40">
                            <div>
                                <h3 className={`text-base font-bold ${headingTextCls}`}>
                                    ¿Qué muestran tus datos por {activeGroupOptionLabel}?
                                </h3>
                                <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                    Lectura automática basada en los promedios reales y separación en el mapa.
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-lg border text-xs font-bold self-start sm:self-center ${sepBadgeStyle}`}>
                                {pca.decisionSummary.separationTitle}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 text-xs leading-relaxed">
                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-sky-800' : 'text-sky-400'}`}>
                                    1. Diferencia principal entre grupos
                                </div>
                                <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                    {pca.decisionSummary.mainFinding}
                                </p>
                            </div>

                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-emerald-800' : 'text-emerald-400'}`}>
                                    2. Estabilidad y consistencia
                                </div>
                                <p className={isPdfMode ? 'text-slate-700' : 'text-slate-300'}>
                                    {pca.decisionSummary.stabilityFinding}
                                </p>
                            </div>

                            <div>
                                <div className={`font-bold mb-1 ${isPdfMode ? 'text-amber-800' : 'text-amber-400'}`}>
                                    3. Comportamiento de nutrientes
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
                            <span>
                                <strong>Sugerencia práctica:</strong> {pca.decisionSummary.recommendation}
                            </span>
                        </div>
                    </div>

                    {/* 3. PANEL PRINCIPAL: MAPA VISUAL (IZQ) + AISLAMIENTO DE GRUPOS Y GUÍA (DER) */}
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
                        {/* Mapa Visual Simplificado (8 cols) */}
                        <div className={`xl:col-span-8 p-5 rounded-2xl flex flex-col ${cardCls}`}>
                            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-ui-border/40 mb-4">
                                <div>
                                    <h3 className={`text-base font-bold ${headingTextCls}`}>
                                        Mapa de Similitud de Calidad
                                    </h3>
                                    <p className={`text-xs ${mutedTextCls}`}>
                                        Puntos cercanos = calidad similar. Los círculos punteados muestran la zona habitual de cada {activeGroupOptionLabel.toLowerCase()}.
                                    </p>
                                </div>

                                {!isPdfMode && (
                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <div className="flex p-0.5 rounded-lg bg-ui-darkest border border-ui-border">
                                            <button
                                                type="button"
                                                onClick={() => setMapDensity('all')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                                                    mapDensity === 'all'
                                                        ? 'bg-ui-accent text-[#040d1a] font-bold'
                                                        : 'text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Muestras + Zonas
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setMapDensity('zones')}
                                                className={`px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer transition-colors ${
                                                    mapDensity === 'zones'
                                                        ? 'bg-ui-accent text-[#040d1a] font-bold'
                                                        : 'text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                Solo Zonas (Limpio)
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setShowVectors(!showVectors)}
                                            className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                                                showVectors
                                                    ? 'border-ui-accent text-ui-accent bg-ui-accent/10'
                                                    : 'border-ui-border text-slate-400 bg-ui-darkest'
                                            }`}
                                        >
                                            {showVectors ? 'Flechas: Sí' : 'Flechas: No'}
                                        </button>

                                        {mapDensity === 'all' && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSampleLabels(!showSampleLabels)}
                                                className={`px-2.5 py-1 rounded-lg border text-xs font-medium cursor-pointer ${
                                                    showSampleLabels
                                                        ? 'border-ui-accent text-ui-accent bg-ui-accent/10'
                                                        : 'border-ui-border text-slate-400 bg-ui-darkest'
                                                }`}
                                            >
                                                {showSampleLabels ? 'Lotes: Sí' : 'Lotes: No'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* SVG Biplot con ejes traducidos a lenguaje real */}
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
                                        {/* Ejes de referencia */}
                                        <line
                                            x1={marginX}
                                            y1={centerY}
                                            x2={svgWidth - marginX}
                                            y2={centerY}
                                            stroke={isPdfMode ? '#cbd5e1' : '#334155'}
                                            strokeWidth="1.25"
                                            strokeDasharray="4 4"
                                        />
                                        <line
                                            x1={centerX}
                                            y1={marginY}
                                            x2={centerX}
                                            y2={svgHeight - marginY}
                                            stroke={isPdfMode ? '#cbd5e1' : '#334155'}
                                            strokeWidth="1.25"
                                            strokeDasharray="4 4"
                                        />

                                        {/* Etiquetas en lenguaje humano en los 4 bordes */}
                                        {/* Derecha (PC1+) */}
                                        <text
                                            x={svgWidth - 16}
                                            y={centerY - 8}
                                            textAnchor="end"
                                            fill={isPdfMode ? '#0369a1' : '#38bdf8'}
                                            fontSize="11.5"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            {pca.axisLabels.pc1Positive} →
                                        </text>
                                        <text
                                            x={svgWidth - 16}
                                            y={centerY + 14}
                                            textAnchor="end"
                                            fill={isPdfMode ? '#64748b' : '#64748b'}
                                            fontSize="9.5"
                                            fontFamily="monospace"
                                        >
                                            Eje 1 ({pca.components[0]?.varianceExplainedPct}%)
                                        </text>

                                        {/* Izquierda (PC1-) */}
                                        <text
                                            x={16}
                                            y={centerY - 8}
                                            textAnchor="start"
                                            fill={isPdfMode ? '#475569' : '#94a3b8'}
                                            fontSize="11"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            ← {pca.axisLabels.pc1Negative}
                                        </text>

                                        {/* Arriba (PC2+) */}
                                        <text
                                            x={centerX}
                                            y={22}
                                            textAnchor="middle"
                                            fill={isPdfMode ? '#047857' : '#34d399'}
                                            fontSize="11.5"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            ↑ {pca.axisLabels.pc2Positive}
                                        </text>
                                        <text
                                            x={centerX}
                                            y={36}
                                            textAnchor="middle"
                                            fill={isPdfMode ? '#64748b' : '#64748b'}
                                            fontSize="9.5"
                                            fontFamily="monospace"
                                        >
                                            Eje 2 ({pca.components[1]?.varianceExplainedPct}%)
                                        </text>

                                        {/* Abajo (PC2-) */}
                                        <text
                                            x={centerX}
                                            y={svgHeight - 16}
                                            textAnchor="middle"
                                            fill={isPdfMode ? '#475569' : '#94a3b8'}
                                            fontSize="11"
                                            fontWeight="bold"
                                            fontFamily="sans-serif"
                                        >
                                            ↓ {pca.axisLabels.pc2Negative}
                                        </text>

                                        {/* Centro promedio */}
                                        <circle cx={centerX} cy={centerY} r="3.5" fill={isPdfMode ? '#64748b' : '#94a3b8'} />
                                        <text
                                            x={centerX + 6}
                                            y={centerY + 13}
                                            fill={isPdfMode ? '#64748b' : '#64748b'}
                                            fontSize="9"
                                            fontFamily="sans-serif"
                                        >
                                            Promedio General
                                        </text>

                                        {/* ZONAS DE GRUPO (Halos) */}
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

                                        {/* MUESTRAS INDIVIDUALES */}
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
                                                    {showSampleLabels && (sample.lote || sample.noId) && (
                                                        <text
                                                            x={cx + 6}
                                                            y={cy + 3}
                                                            fontSize="8.5"
                                                            fontFamily="monospace"
                                                            fill={isPdfMode ? '#334155' : '#cbd5e1'}
                                                        >
                                                            {sample.lote || sample.noId}
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        })}

                                        {/* VECTORES DE NUTRIENTES (Flechas) */}
                                        {showVectors && pca.loadings.map(loading => {
                                            // Escalar flecha hasta ~0.88 del dominio para mantenerse dentro de las etiquetas
                                            const targetX = scaleX(loading.pc1Loading * 0.9);
                                            const targetY = scaleY(loading.pc2Loading * 0.9);
                                            const vectorColor = getPrintContrastingColor(loading.color, isPdfMode);
                                            const isHovered = hoveredLoading?.key === loading.key;
                                            const isRightSide = loading.pc1Loading >= 0;
                                            const labelText = loading.label;
                                            const boxWidth = labelText.length * 6.4 + 14;
                                            const boxX = isRightSide
                                                ? Math.min(svgWidth - marginX - boxWidth + 20, targetX + 8)
                                                : Math.max(marginX - 20, targetX - boxWidth - 8);
                                            const boxY = Math.max(marginY - 6, Math.min(svgHeight - marginY - 18, targetY - 10));

                                            return (
                                                <g
                                                    key={`vector-${loading.key}`}
                                                    onMouseEnter={() => setHoveredLoading(loading)}
                                                    onMouseLeave={() => setHoveredLoading(null)}
                                                    className="cursor-pointer"
                                                >
                                                    <line
                                                        x1={centerX}
                                                        y1={centerY}
                                                        x2={targetX}
                                                        y2={targetY}
                                                        stroke={vectorColor}
                                                        strokeWidth={isHovered ? 3.2 : 1.9}
                                                        strokeOpacity={0.85}
                                                        strokeLinecap="round"
                                                    />
                                                    <circle
                                                        cx={targetX}
                                                        cy={targetY}
                                                        r={isHovered ? 4.8 : 3.2}
                                                        fill={vectorColor}
                                                        stroke={isPdfMode ? '#ffffff' : '#040d1a'}
                                                        strokeWidth="1.2"
                                                    />
                                                    <rect
                                                        x={boxX}
                                                        y={boxY}
                                                        width={boxWidth}
                                                        height="19"
                                                        rx="4"
                                                        fill={isPdfMode ? '#ffffff' : '#091528'}
                                                        fillOpacity="0.92"
                                                        stroke={vectorColor}
                                                        strokeWidth="1"
                                                    />
                                                    <text
                                                        x={boxX + 7}
                                                        y={boxY + 13}
                                                        fill={isPdfMode ? '#0f172a' : '#f8fafc'}
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="sans-serif"
                                                    >
                                                        {labelText}
                                                    </text>
                                                </g>
                                            );
                                        })}

                                        {/* CENTROIDES Y ETIQUETAS DE GRUPO (encima para máxima claridad) */}
                                        {visibleGroups.map(group => {
                                            const cX = scaleX(group.centroidPc1Scaled);
                                            const cY = scaleY(group.centroidPc2Scaled);
                                            const gColor = getPrintContrastingColor(group.color, isPdfMode);
                                            const labelText = `${group.groupName} (${group.sampleCount})`;
                                            const boxW = Math.min(180, labelText.length * 6.3 + 14);
                                            const boxX = Math.max(marginX, Math.min(svgWidth - marginX - boxW, cX + 10));
                                            const boxY = Math.max(marginY, Math.min(svgHeight - marginY - 22, cY - 12));

                                            return (
                                                <g key={`centroid-${group.groupName}`}>
                                                    <polygon
                                                        points={`${cX},${cY - 8} ${cX + 7},${cY + 5} ${cX - 7},${cY + 5}`}
                                                        fill={gColor}
                                                        stroke="#ffffff"
                                                        strokeWidth="1.5"
                                                    />
                                                    <rect
                                                        x={boxX}
                                                        y={boxY}
                                                        width={boxW}
                                                        height="20"
                                                        rx="5"
                                                        fill={isPdfMode ? '#ffffff' : '#0f172a'}
                                                        fillOpacity="0.95"
                                                        stroke={gColor}
                                                        strokeWidth="1.4"
                                                    />
                                                    <text
                                                        x={boxX + 7}
                                                        y={boxY + 13.5}
                                                        fill={isPdfMode ? '#0f172a' : '#ffffff'}
                                                        fontSize="10"
                                                        fontWeight="bold"
                                                        fontFamily="sans-serif"
                                                    >
                                                        {labelText.length > 26 ? `${labelText.slice(0, 24)}…` : labelText}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    {/* Tooltip de Muestra */}
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
                                                    {hoveredSample.lote || hoveredSample.noId || 'Muestra'}
                                                </span>
                                                <span className={`text-[11px] font-mono tabular-nums ${mutedTextCls}`}>
                                                    {hoveredSample.formattedDate}
                                                </span>
                                            </div>
                                            <div className="space-y-0.5 text-[11px] mb-2">
                                                <div><strong>{activeGroupOptionLabel}:</strong> {hoveredSample.group}</div>
                                                {hoveredSample.origen && groupField !== 'Origen' && (
                                                    <div><strong>Origen:</strong> {hoveredSample.origen}</div>
                                                )}
                                                {hoveredSample.cliente && groupField !== 'Cliente' && (
                                                    <div><strong>Cliente:</strong> {hoveredSample.cliente}</div>
                                                )}
                                                {hoveredSample.proveedor && groupField !== 'Proveedor' && (
                                                    <div><strong>Proveedor:</strong> {hoveredSample.proveedor}</div>
                                                )}
                                            </div>
                                            <div className="pt-1.5 border-t border-ui-border/40 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                                                {Object.entries(hoveredSample.values).slice(0, 8).map(([k, v]) => {
                                                    const vConf = pca.variables.find(x => x.key === k);
                                                    return (
                                                        <div key={k} className="flex justify-between gap-1">
                                                            <span className={mutedTextCls}>{vConf?.label || k}:</span>
                                                            <span className="font-mono tabular-nums font-semibold">
                                                                {formatMetric(Number(v))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tooltip de Flecha */}
                                    {hoveredLoading && (
                                        <div
                                            className={`absolute z-30 pointer-events-none p-3 rounded-xl shadow-xl border text-xs w-60 bottom-4 left-4 ${
                                                isPdfMode ? 'bg-white text-slate-800 border-slate-300' : 'bg-slate-900/95 text-slate-100 border-ui-border'
                                            }`}
                                        >
                                            <div className="font-bold text-sm mb-1" style={{ color: getPrintContrastingColor(hoveredLoading.color, isPdfMode) }}>
                                                {hoveredLoading.label} {hoveredLoading.unit ? `(${hoveredLoading.unit})` : ''}
                                            </div>
                                            <p className={`text-[11px] leading-snug ${mutedTextCls}`}>
                                                Las muestras ubicadas en la dirección de esta flecha tienen valores más altos de <strong>{hoveredLoading.label}</strong>.
                                            </p>
                                            <div className="mt-1.5 pt-1.5 border-t border-ui-border/30 text-[11px] font-mono tabular-nums">
                                                Influencia en el mapa: {(hoveredLoading.magnitude * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Panel Derecho: Segregación Rápida por Grupos + Guía Rápida (4 cols) */}
                        <div className={`xl:col-span-4 p-5 rounded-2xl flex flex-col justify-between gap-4 ${cardCls}`}>
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-ui-border/40 mb-3">
                                    <div>
                                        <h3 className={`text-sm font-bold ${headingTextCls}`}>
                                            Grupos ({pca.groups.length})
                                        </h3>
                                        <p className={`text-[11px] ${mutedTextCls}`}>
                                            Activa o aísla grupos para comparar sin ruido.
                                        </p>
                                    </div>
                                    {hiddenGroups.length > 0 && !isPdfMode && (
                                        <button
                                            type="button"
                                            onClick={() => setHiddenGroups([])}
                                            className="text-xs font-semibold text-ui-accent hover:underline cursor-pointer"
                                        >
                                            Ver todos
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                    {pca.groups.map(group => {
                                        const isHidden = hiddenGroups.includes(group.groupName);
                                        const gColor = getPrintContrastingColor(group.color, isPdfMode);

                                        return (
                                            <div
                                                key={group.groupName}
                                                className={`p-3 rounded-xl border transition-opacity ${
                                                    isHidden ? 'opacity-45' : 'opacity-100'
                                                } ${
                                                    isPdfMode
                                                        ? 'bg-slate-50 border-slate-200'
                                                        : 'bg-ui-darkest/60 border-ui-border'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{ backgroundColor: gColor }}
                                                        />
                                                        <span className={`text-xs font-bold truncate ${headingTextCls}`}>
                                                            {group.groupName}
                                                        </span>
                                                    </div>

                                                    {!isPdfMode && (
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            {pca.groups.length > 2 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => isolateGroup(group.groupName)}
                                                                    className="text-[10px] px-1.5 py-0.5 rounded border border-ui-border text-slate-400 hover:text-ui-accent hover:border-ui-accent cursor-pointer"
                                                                    title="Ver solo este grupo"
                                                                >
                                                                    Aislar
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleGroupVisibility(group.groupName)}
                                                                className="p-1 text-slate-400 hover:text-white cursor-pointer"
                                                                title={isHidden ? 'Mostrar en mapa' : 'Ocultar del mapa'}
                                                            >
                                                                {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className={`flex items-center gap-2 text-[11px] mt-1 ${mutedTextCls}`}>
                                                    <span className="font-mono tabular-nums">{group.sampleCount} muestras</span>
                                                    <span aria-hidden="true">·</span>
                                                    <span className={
                                                        group.stabilityLabel === 'Muy Estable'
                                                            ? (isPdfMode ? 'text-emerald-700 font-semibold' : 'text-emerald-400 font-semibold')
                                                            : group.stabilityLabel === 'Estabilidad Moderada'
                                                            ? (isPdfMode ? 'text-amber-700 font-semibold' : 'text-amber-400 font-semibold')
                                                            : (isPdfMode ? 'text-rose-700 font-semibold' : 'text-rose-400 font-semibold')
                                                    }>
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

                            {/* Guía mínima de 3 reglas para leer el mapa */}
                            <div className={`p-3.5 rounded-xl text-[11px] space-y-1.5 ${subtlePanelCls}`}>
                                <div className="font-bold flex items-center gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-ui-accent" />
                                    <span>Cómo leer este mapa en 10 segundos</span>
                                </div>
                                <p className={mutedTextCls}>
                                    <strong>1. Zonas separadas:</strong> Significa que esos grupos realmente tienen composición distinta.
                                </p>
                                <p className={mutedTextCls}>
                                    <strong>2. Dirección de flechas:</strong> Grupos cargados hacia una flecha tienen más de ese nutriente.
                                </p>
                                <p className={mutedTextCls}>
                                    <strong>3. Tamaño del círculo:</strong> Círculo pequeño = lotes parejos; círculo grande = calidad irregular.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* 4. TABLA DE PROMEDIOS REALES POR GRUPO (EL PUENTE HACIA LA DECISIÓN) */}
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-ui-border/40 mb-4">
                            <div>
                                <h3 className={`text-base font-bold ${headingTextCls}`}>
                                    Valores Reales de Laboratorio por {activeGroupOptionLabel}
                                </h3>
                                <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                    Promedios reales de cada parámetro y su diferencia (%) frente al promedio general del periodo filtrado.
                                </p>
                            </div>
                            <span className={`text-xs font-mono tabular-nums ${mutedTextCls}`}>
                                Mostrando {visibleGroups.length} de {pca.groups.length} grupos
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className={`border-b ${
                                        isPdfMode ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-ui-border bg-ui-darkest/70 text-slate-300'
                                    }`}>
                                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">{activeGroupOptionLabel}</th>
                                        <th className="py-2.5 px-3 font-bold text-right whitespace-nowrap">Muestras</th>
                                        <th className="py-2.5 px-3 font-bold whitespace-nowrap">Consistencia</th>
                                        {pca.variables.map(v => (
                                            <th key={v.key} className="py-2.5 px-3 font-bold text-right whitespace-nowrap">
                                                {v.label} {v.unit ? `(${v.unit})` : ''}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border/30">
                                    {/* Fila de Promedio General de Referencia */}
                                    <tr className={isPdfMode ? 'bg-sky-50/50 font-semibold' : 'bg-ui-darkest/40 font-semibold'}>
                                        <td className={`py-2.5 px-3 whitespace-nowrap ${isPdfMode ? 'text-sky-900' : 'text-ui-accent'}`}>
                                            Promedio General ({selectedMaterial})
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                            {pca.sampleCount}
                                        </td>
                                        <td className={`py-2.5 px-3 ${mutedTextCls}`}>Referencia base</td>
                                        {pca.variables.map(v => (
                                            <td key={v.key} className="py-2.5 px-3 text-right font-mono tabular-nums">
                                                {formatMetric(v.mean)}
                                            </td>
                                        ))}
                                    </tr>

                                    {/* Filas por Grupo */}
                                    {visibleGroups.map(group => {
                                        const gColor = getPrintContrastingColor(group.color, isPdfMode);
                                        return (
                                            <tr
                                                key={group.groupName}
                                                className={isPdfMode ? 'hover:bg-slate-50' : 'hover:bg-ui-darkest/30'}
                                            >
                                                <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: gColor }} />
                                                        <span className={headingTextCls}>{group.groupName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                                                    {group.sampleCount}
                                                </td>
                                                <td className="py-2.5 px-3 whitespace-nowrap">
                                                    <span className={`font-semibold ${
                                                        group.stabilityLabel === 'Muy Estable'
                                                            ? (isPdfMode ? 'text-emerald-700' : 'text-emerald-400')
                                                            : group.stabilityLabel === 'Estabilidad Moderada'
                                                            ? (isPdfMode ? 'text-amber-700' : 'text-amber-400')
                                                            : (isPdfMode ? 'text-rose-700' : 'text-rose-400')
                                                    }`}>
                                                        {group.stabilityLabel}
                                                    </span>
                                                </td>
                                                {pca.variables.map(v => {
                                                    const stat = group.variableStats[v.key];
                                                    if (!stat || stat.mean === null) {
                                                        return (
                                                            <td key={v.key} className={`py-2.5 px-3 text-right font-mono ${mutedTextCls}`}>
                                                                —
                                                            </td>
                                                        );
                                                    }
                                                    const isDiffNotable = Math.abs(stat.diffVsGlobalPct) >= 3;
                                                    const diffColor = stat.diffVsGlobalPct > 0
                                                        ? (isPdfMode ? 'text-emerald-700' : 'text-emerald-400')
                                                        : (isPdfMode ? 'text-rose-700' : 'text-rose-400');

                                                    return (
                                                        <td key={v.key} className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                                                            <span className="font-bold">{formatMetric(stat.mean)}</span>
                                                            {isDiffNotable && (
                                                                <span className={`ml-1.5 text-[10px] ${diffColor}`}>
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

            {/* 5. RELACIONES ENTRE NUTRIENTES (CORRELACIONES EN ESPAÑOL + MATRIZ) */}
            {(activeSection === 'relations' || isPdfMode) && (
                <div className={`p-5 md:p-6 rounded-2xl space-y-6 ${cardCls}`}>
                    <div className="border-b border-ui-border/40 pb-4">
                        <h3 className={`text-base font-bold flex items-center gap-2 ${headingTextCls}`}>
                            <Layers className="w-5 h-5 text-ui-accent" />
                            <span>¿Qué nutrientes suben o bajan juntos?</span>
                        </h3>
                        <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                            Relaciones detectadas automáticamente en el historial analítico seleccionado.
                        </p>
                    </div>

                    {/* Hallazgos traducidos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {pca.topCorrelations.slice(0, 6).map((c, idx) => {
                            const absR = Math.abs(c.correlation);
                            const isPos = c.correlation > 0;
                            const strength = absR >= 0.7 ? 'Muy fuerte' : absR >= 0.45 ? 'Moderada' : 'Leve';
                            return (
                                <div key={idx} className={`p-3.5 rounded-xl flex items-center justify-between gap-3 ${subtlePanelCls}`}>
                                    <div>
                                        <div className={`font-bold ${headingTextCls}`}>
                                            {c.var1Label} y {c.var2Label}
                                        </div>
                                        <div className={`text-[11px] mt-0.5 ${mutedTextCls}`}>
                                            {absR < 0.25
                                                ? 'Comportamiento independiente entre sí'
                                                : isPos
                                                ? `Relación directa (${strength}): suben juntas`
                                                : `Relación inversa (${strength}): cuando una sube, la otra baja`}
                                        </div>
                                    </div>
                                    <span className={`font-mono tabular-nums font-bold px-2.5 py-1 rounded-lg border shrink-0 ${
                                        absR < 0.25
                                            ? (isPdfMode ? 'bg-white border-slate-300 text-slate-600' : 'bg-ui-card border-ui-border text-slate-400')
                                            : isPos
                                            ? (isPdfMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300')
                                            : (isPdfMode ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-rose-950/60 border-rose-700/50 text-rose-300')
                                    }`}>
                                        r = {c.correlation > 0 ? `+${c.correlation.toFixed(2)}` : c.correlation.toFixed(2)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Matriz de Correlación de Pearson */}
                    <div className="overflow-x-auto pt-2">
                        <table className="text-xs border-collapse mx-auto">
                            <thead>
                                <tr>
                                    <th className="p-2"></th>
                                    {pca.variableLabels.map(label => (
                                        <th key={label} className={`p-2 font-bold text-center text-[11px] ${mutedTextCls}`}>
                                            {label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pca.variableLabels.map((rowLabel, rIdx) => (
                                    <tr key={rowLabel}>
                                        <td className={`p-2 font-bold text-right text-[11px] whitespace-nowrap ${mutedTextCls}`}>
                                            {rowLabel}
                                        </td>
                                        {pca.variableLabels.map((colLabel, cIdx) => {
                                            const corr = pca.correlationMatrix[rIdx]?.[cIdx] ?? 0;
                                            const isDiag = rIdx === cIdx;

                                            let bgColor = 'transparent';
                                            let textColor = isPdfMode ? '#334155' : '#cbd5e1';

                                            if (isDiag) {
                                                bgColor = isPdfMode ? '#f1f5f9' : '#1e293b';
                                                textColor = isPdfMode ? '#64748b' : '#94a3b8';
                                            } else if (corr > 0.6) {
                                                bgColor = isPdfMode ? '#dcfce7' : 'rgba(16, 185, 129, 0.35)';
                                                textColor = isPdfMode ? '#166534' : '#6ee7b7';
                                            } else if (corr > 0.25) {
                                                bgColor = isPdfMode ? '#e0f2fe' : 'rgba(2, 132, 199, 0.28)';
                                                textColor = isPdfMode ? '#075985' : '#7dd3fc';
                                            } else if (corr < -0.6) {
                                                bgColor = isPdfMode ? '#ffe4e6' : 'rgba(244, 63, 94, 0.35)';
                                                textColor = isPdfMode ? '#9f1239' : '#fda4af';
                                            } else if (corr < -0.25) {
                                                bgColor = isPdfMode ? '#ffedd5' : 'rgba(249, 115, 22, 0.28)';
                                                textColor = isPdfMode ? '#9a3412' : '#fdba74';
                                            }

                                            return (
                                                <td
                                                    key={`${rowLabel}-${colLabel}`}
                                                    className={`p-2.5 text-center font-mono tabular-nums font-bold text-[11px] border ${
                                                        isPdfMode ? 'border-slate-200' : 'border-ui-border/40'
                                                    }`}
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
                </div>
            )}

            {/* 6. DETALLE ESTADÍSTICO AVANZADO (SOLO EN PESTAÑA TÉCNICA) */}
            {activeSection === 'technical' && !isPdfMode && (
                <div className="space-y-6">
                    {/* Cargas factoriales */}
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="pb-4 border-b border-ui-border/40 mb-4">
                            <h3 className={`text-base font-bold flex items-center gap-2 ${headingTextCls}`}>
                                <Table className="w-5 h-5 text-ui-accent" />
                                <span>Peso de cada parámetro en los ejes (Cargas Factoriales)</span>
                            </h3>
                            <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                Indica cuánto influye cada nutriente en la separación horizontal (Eje 1) y vertical (Eje 2).
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-ui-border/60 text-slate-400 bg-ui-darkest/60">
                                        <th className="py-2.5 px-3 font-bold">Parámetro</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Carga Eje 1</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Peso Eje 1 (%)</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Carga Eje 2</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Peso Eje 2 (%)</th>
                                        <th className="py-2.5 px-3 font-bold text-right">Calidad en Mapa (r²)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ui-border/30">
                                    {pca.loadings.map(loading => (
                                        <tr key={loading.key} className="hover:bg-ui-darkest/40">
                                            <td className="py-2.5 px-3 font-bold flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: loading.color }} />
                                                <span>{loading.label}</span>
                                            </td>
                                            <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                                                loading.pc1Loading > 0.4 ? 'text-sky-400' : loading.pc1Loading < -0.4 ? 'text-rose-400' : 'text-slate-400'
                                            }`}>
                                                {loading.pc1Loading > 0 ? `+${loading.pc1Loading}` : loading.pc1Loading}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                                                {loading.contributionPc1}%
                                            </td>
                                            <td className={`py-2.5 px-3 text-right font-mono tabular-nums font-bold ${
                                                loading.pc2Loading > 0.4 ? 'text-emerald-400' : loading.pc2Loading < -0.4 ? 'text-amber-400' : 'text-slate-400'
                                            }`}>
                                                {loading.pc2Loading > 0 ? `+${loading.pc2Loading}` : loading.pc2Loading}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                                                {loading.contributionPc2}%
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-slate-200">
                                                {(loading.magnitude * 100).toFixed(1)}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Scree Plot */}
                    <div className={`p-5 md:p-6 rounded-2xl ${cardCls}`}>
                        <div className="pb-4 border-b border-ui-border/40 mb-4">
                            <h3 className={`text-base font-bold flex items-center gap-2 ${headingTextCls}`}>
                                <BarChart3 className="w-5 h-5 text-ui-accent" />
                                <span>Información retenida por componente (Scree Plot)</span>
                            </h3>
                            <p className={`text-xs mt-0.5 ${mutedTextCls}`}>
                                Mientras más alta la suma de PC1 + PC2, más fiel es el mapa 2D respecto al total de variables.
                            </p>
                        </div>

                        <div className="h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart
                                    data={pca.components.map(c => ({
                                        name: `Eje ${c.component}`,
                                        varianza: c.varianceExplainedPct,
                                        acumulada: c.cumulativeVariancePct
                                    }))}
                                    margin={{ top: 16, right: 24, left: 8, bottom: 16 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight="bold" />
                                    <YAxis stroke="#94a3b8" fontSize={11} unit="%" domain={[0, 100]} />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: '#0f172a',
                                            borderColor: '#334155',
                                            borderRadius: '8px',
                                            color: '#f8fafc',
                                            fontSize: '12px'
                                        }}
                                    />
                                    <Bar dataKey="varianza" name="Varianza Individual (%)" radius={[6, 6, 0, 0]}>
                                        {pca.components.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === 0 ? '#0284c7' : index === 1 ? '#10b981' : '#64748b'}
                                            />
                                        ))}
                                    </Bar>
                                    <Line
                                        type="monotone"
                                        dataKey="acumulada"
                                        name="Acumulada (%)"
                                        stroke="#f59e0b"
                                        strokeWidth={2.5}
                                        dot={{ fill: '#f59e0b', r: 4 }}
                                    />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
