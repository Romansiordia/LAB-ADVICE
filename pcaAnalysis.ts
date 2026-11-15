/**
 * Utilidades matemáticas y estadísticas para Análisis de Componentes Principales (PCA),
 * descomposición espectral (Jacobi), agrupación por Origen/Cliente/Proveedor/Fechas
 * y clustering automático (K-means) de perfiles de calidad para nutriólogos y laboratoristas.
 */

import { RawMaterialData } from './types';
import { NUTRIENTS } from './constants';
import { parseFlexibleDate } from './dateParser';

export type PcaGroupField =
    | 'Origen'
    | 'Cliente'
    | 'Proveedor'
    | 'kmeans_2'
    | 'kmeans_3'
    | 'kmeans_4'
    | 'quarter'
    | 'month'
    | 'year'
    | 'period_split'
    | 'subtipo'
    | 'material';

export interface PcaCalculationOptions {
    cutoffDateIso?: string | null;
}

export interface PcaVariableConfig {
    key: string;
    label: string;
    unit: string;
    color: string;
    mean: number;
    stdDev: number;
}

export interface PcaSamplePoint {
    id: string;
    noId?: string;
    lote?: string;
    date: string;
    formattedDate: string;
    timestamp: number;
    material: string;
    subtipo?: string;
    origen?: string;
    proveedor?: string;
    cliente?: string;
    group: string;
    pc1: number;
    pc2: number;
    pc1Scaled: number;
    pc2Scaled: number;
    values: Record<string, number>;
}

export interface PcaLoading {
    key: string;
    label: string;
    unit: string;
    color: string;
    pc1Loading: number;
    pc2Loading: number;
    magnitude: number;
    angleDegrees: number;
    contributionPc1: number;
    contributionPc2: number;
}

export interface PcaComponentInfo {
    component: number;
    eigenvalue: number;
    varianceExplainedPct: number;
    cumulativeVariancePct: number;
}

export interface PcaGroupVariableStat {
    mean: number | null;
    count: number;
    diffVsGlobalAbs: number;
    diffVsGlobalPct: number;
}

export interface PcaGroupCluster {
    groupName: string;
    color: string;
    sampleCount: number;
    centroidPc1: number;
    centroidPc2: number;
    centroidPc1Scaled: number;
    centroidPc2Scaled: number;
    radius: number;
    radiusScaled: number;
    stabilityLabel: 'Muy Estable' | 'Estabilidad Moderada' | 'Alta Variabilidad';
    description: string;
    highlights: {
        higher: string[];
        lower: string[];
    };
    variableStats: Record<string, PcaGroupVariableStat>;
}

export interface PcaCorrelationItem {
    var1: string;
    var1Label: string;
    var2: string;
    var2Label: string;
    correlation: number;
}

export interface PcaAxisLabels {
    pc1Positive: string;
    pc1Negative: string;
    pc2Positive: string;
    pc2Negative: string;
}

export interface PcaDecisionSummary {
    separationLevel: 'Alta' | 'Moderada' | 'Baja' | 'Único Grupo';
    separationTitle: string;
    mainFinding: string;
    stabilityFinding: string;
    nutrientFinding: string;
    recommendation: string;
}

export interface PcaResult {
    isValid: boolean;
    errorMessage?: string;
    sampleCount: number;
    variableCount: number;
    variables: PcaVariableConfig[];
    components: PcaComponentInfo[];
    totalVarianceExplained2D: number;
    samples: PcaSamplePoint[];
    loadings: PcaLoading[];
    correlationMatrix: number[][];
    variableLabels: string[];
    topCorrelations: PcaCorrelationItem[];
    groups: PcaGroupCluster[];
    groupField: PcaGroupField;
    suggestedCutoffIso: string | null;
    axisLabels: PcaAxisLabels;
    decisionSummary: PcaDecisionSummary;
    interpretation: {
        summary: string;
        pc1Drivers: { positive: string[]; negative: string[] };
        pc2Drivers: { positive: string[]; negative: string[] };
        strongestRelations: string[];
        groupInsights: string[];
    };
}

export const GROUP_PALETTE = [
    '#0284c7', // Sky Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#0ea5e9', // Light Blue
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#84cc16', // Lime
    '#a855f7', // Purple
    '#ef4444', // Red
    '#64748b'  // Slate
];

function extractUnit(label: string): string {
    const match = label.match(/\(([^)]+)\)/);
    return match ? match[1] : '';
}

function formatShortDate(dt: Date | null, fallback: string): string {
    if (!dt || isNaN(dt.getTime())) return fallback || 'Sin fecha';
    const d = String(dt.getUTCDate()).padStart(2, '0');
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const y = dt.getUTCFullYear();
    return `${d}/${m}/${y}`;
}

function toIsoDateUTC(dt: Date): string {
    const d = String(dt.getUTCDate()).padStart(2, '0');
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const y = dt.getUTCFullYear();
    return `${y}-${m}-${d}`;
}

function formatNum(val: number): string {
    if (Math.abs(val) >= 100) return val.toFixed(1);
    if (Math.abs(val) >= 10) return val.toFixed(2);
    return val.toFixed(2);
}

/**
 * Algoritmo de rotación de Jacobi para matrices simétricas reales.
 */
function jacobiEigenvalues(matrix: number[][], maxIter = 120, tolerance = 1e-10) {
    const n = matrix.length;
    const A: number[][] = matrix.map(row => [...row]);
    const V: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0.0))
    );

    for (let iter = 0; iter < maxIter; iter++) {
        let maxVal = 0;
        let p = 0;
        let q = 1;

        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const absVal = Math.abs(A[i][j]);
                if (absVal > maxVal) {
                    maxVal = absVal;
                    p = i;
                    q = j;
                }
            }
        }

        if (maxVal < tolerance) break;

        const app = A[p][p];
        const aqq = A[q][q];
        const apq = A[p][q];

        const tau = (aqq - app) / (2.0 * apq);
        const t = (tau >= 0 ? 1.0 : -1.0) / (Math.abs(tau) + Math.sqrt(1.0 + tau * tau));
        const c = 1.0 / Math.sqrt(1.0 + t * t);
        const s = t * c;

        A[p][p] = app - t * apq;
        A[q][q] = aqq + t * apq;
        A[p][q] = 0.0;
        A[q][p] = 0.0;

        for (let k = 0; k < n; k++) {
            if (k !== p && k !== q) {
                const akp = A[k][p];
                const akq = A[k][q];
                A[k][p] = c * akp - s * akq;
                A[p][k] = A[k][p];
                A[k][q] = s * akp + c * akq;
                A[q][k] = A[k][q];
            }
        }

        for (let k = 0; k < n; k++) {
            const vkp = V[k][p];
            const vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
        }
    }

    const rawEigenvalues = A.map((row, i) => Math.max(0, row[i]));
    const eigenPairs = rawEigenvalues.map((lambda, idx) => ({
        eigenvalue: lambda,
        vector: V.map(row => row[idx])
    }));

    eigenPairs.sort((a, b) => b.eigenvalue - a.eigenvalue);

    return {
        eigenvalues: eigenPairs.map(p => p.eigenvalue),
        eigenvectors: eigenPairs.map(p => p.vector)
    };
}

/**
 * Algoritmo K-means clásico (Lloyd's) para clustering automático de perfiles nutricionales.
 */
function runKMeans(vectors: number[][], k: number, maxIter = 25): number[] {
    const N = vectors.length;
    const P = vectors[0].length;
    if (N <= k) return vectors.map((_, i) => i % k);

    // Inicialización de centroides (K-means++ seed)
    const centroids: number[][] = [];
    centroids.push([...vectors[0]]);

    for (let c = 1; c < k; c++) {
        let bestIdx = 0;
        let maxDist = -1;
        for (let i = 0; i < N; i++) {
            let minDist = Infinity;
            for (const cent of centroids) {
                let dist = 0;
                for (let d = 0; d < P; d++) dist += Math.pow(vectors[i][d] - cent[d], 2);
                if (dist < minDist) minDist = dist;
            }
            if (minDist > maxDist) {
                maxDist = minDist;
                bestIdx = i;
            }
        }
        centroids.push([...vectors[bestIdx]]);
    }

    let assignments = new Array(N).fill(0);

    for (let iter = 0; iter < maxIter; iter++) {
        let changed = false;
        for (let i = 0; i < N; i++) {
            let bestCluster = 0;
            let minDist = Infinity;
            for (let c = 0; c < k; c++) {
                let dist = 0;
                for (let d = 0; d < P; d++) dist += Math.pow(vectors[i][d] - centroids[c][d], 2);
                if (dist < minDist) {
                    minDist = dist;
                    bestCluster = c;
                }
            }
            if (assignments[i] !== bestCluster) {
                assignments[i] = bestCluster;
                changed = true;
            }
        }

        if (!changed && iter > 0) break;

        const sums = Array.from({ length: k }, () => Array(P).fill(0));
        const counts = Array(k).fill(0);

        for (let i = 0; i < N; i++) {
            const cl = assignments[i];
            counts[cl]++;
            for (let d = 0; d < P; d++) sums[cl][d] += vectors[i][d];
        }

        for (let c = 0; c < k; c++) {
            if (counts[c] > 0) {
                for (let d = 0; d < P; d++) centroids[c][d] = sums[c][d] / counts[c];
            }
        }
    }

    return assignments;
}

function emptyInvalidResult(
    errorMessage: string,
    groupField: PcaGroupField,
    sampleCount = 0,
    variableCount = 0
): PcaResult {
    return {
        isValid: false,
        errorMessage,
        sampleCount,
        variableCount,
        variables: [],
        components: [],
        totalVarianceExplained2D: 0,
        samples: [],
        loadings: [],
        correlationMatrix: [],
        variableLabels: [],
        topCorrelations: [],
        groups: [],
        groupField,
        suggestedCutoffIso: null,
        axisLabels: {
            pc1Positive: 'Mayor concentración',
            pc1Negative: 'Menor concentración',
            pc2Positive: 'Perfil superior',
            pc2Negative: 'Perfil inferior'
        },
        decisionSummary: {
            separationLevel: 'Único Grupo',
            separationTitle: 'Datos insuficientes para calcular el mapa',
            mainFinding: errorMessage,
            stabilityFinding: '',
            nutrientFinding: '',
            recommendation: 'Selecciona al menos 3 muestras y 2 parámetros con valores registrados.'
        },
        interpretation: {
            summary: errorMessage,
            pc1Drivers: { positive: [], negative: [] },
            pc2Drivers: { positive: [], negative: [] },
            strongestRelations: [],
            groupInsights: []
        }
    };
}

/**
 * Ejecuta el Análisis PCA y agrupamiento K-means para nutriólogos y laboratoristas.
 */
export function calculatePca(
    data: RawMaterialData[],
    selectedVariableKeys: string[],
    groupField: PcaGroupField = 'Origen',
    options: PcaCalculationOptions = {}
): PcaResult {
    if (!data || data.length < 3) {
        return emptyInvalidResult(
            'Se requieren al menos 3 muestras para realizar el análisis comparativo.',
            groupField
        );
    }

    const candidateConfigs = selectedVariableKeys
        .map(key => NUTRIENTS.find(n => n.key === key))
        .filter((n): n is typeof NUTRIENTS[0] => !!n);

    if (candidateConfigs.length < 2) {
        return emptyInvalidResult(
            'Selecciona al menos 2 parámetros nutricionales para comparar.',
            groupField
        );
    }

    const validVariables: PcaVariableConfig[] = [];

    candidateConfigs.forEach(config => {
        const values = data
            .map(d => {
                const raw = d[config.key];
                if (raw === undefined || raw === null || raw === '') return NaN;
                return Number(raw);
            })
            .filter(v => !isNaN(v) && isFinite(v) && v !== 0);

        if (values.length >= 3) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance =
                values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
            const stdDev = Math.sqrt(variance);

            if (stdDev > 1e-6) {
                validVariables.push({
                    key: config.key,
                    label: config.label.replace(/\s*\(.*?\)/, '').trim(),
                    unit: extractUnit(config.label),
                    color: config.color,
                    mean,
                    stdDev
                });
            }
        }
    });

    if (validVariables.length < 2) {
        return emptyInvalidResult(
            'Los parámetros elegidos no tienen suficiente variabilidad o registros válidos en este filtro.',
            groupField
        );
    }

    const P = validVariables.length;

    const parsedDates = data
        .map(d => parseFlexibleDate(d.date))
        .filter((dt): dt is Date => dt !== null && !isNaN(dt.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

    let suggestedCutoffIso: string | null = null;
    if (parsedDates.length >= 2) {
        const midIdx = Math.floor(parsedDates.length / 2);
        suggestedCutoffIso = toIsoDateUTC(parsedDates[midIdx]);
    }

    const activeCutoffIso = options.cutoffDateIso || suggestedCutoffIso;
    let cutoffTimestamp = 0;
    let cutoffLabel = '';
    if (activeCutoffIso) {
        const [cy, cm, cd] = activeCutoffIso.split('-').map(Number);
        if (cy && cm && cd) {
            const cDate = new Date(Date.UTC(cy, cm - 1, cd));
            cutoffTimestamp = cDate.getTime();
            cutoffLabel = formatShortDate(cDate, activeCutoffIso);
        }
    }

    interface RowWithData {
        raw: RawMaterialData;
        rawValues: Record<string, number>;
        zRow: number[];
        group: string;
        groupSortKey: string;
        parsedDate: Date | null;
        timestamp: number;
    }

    const rowsWithData: RowWithData[] = [];
    const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    data.forEach(d => {
        let hasAnyValue = false;
        const rawVals: Record<string, number> = {};
        const zRow: number[] = [];

        validVariables.forEach(v => {
            const rawInput = d[v.key];
            const rawVal =
                rawInput === undefined || rawInput === null || rawInput === ''
                    ? NaN
                    : Number(rawInput);

            if (!isNaN(rawVal) && isFinite(rawVal) && rawVal !== 0) {
                hasAnyValue = true;
                rawVals[v.key] = rawVal;
                zRow.push((rawVal - v.mean) / v.stdDev);
            } else {
                zRow.push(0.0);
            }
        });

        if (!hasAnyValue) return;

        const dt = parseFlexibleDate(d.date);
        const ts = dt ? dt.getTime() : 0;

        let grp = 'General';
        let sortKey = 'General';

        if (groupField === 'Origen') {
            grp = String(d.Origen || 'Sin Origen').trim() || 'Sin Origen';
            sortKey = grp;
        } else if (groupField === 'Cliente') {
            grp = String(d.Cliente || 'Sin Cliente').trim() || 'Sin Cliente';
            sortKey = grp;
        } else if (groupField === 'Proveedor') {
            grp = String(d.Proveedor || 'Sin Proveedor').trim() || 'Sin Proveedor';
            sortKey = grp;
        } else if (groupField === 'subtipo') {
            grp = String(d.subtipo || 'Estándar').trim() || 'Estándar';
            sortKey = grp;
        } else if (groupField === 'material') {
            grp = String(d.material || 'General').trim() || 'General';
            sortKey = grp;
        } else if (groupField === 'month') {
            if (dt) {
                const yr = dt.getUTCFullYear();
                const mo = dt.getUTCMonth();
                grp = `${monthNamesShort[mo]} ${yr}`;
                sortKey = `${yr}-${String(mo + 1).padStart(2, '0')}`;
            } else {
                grp = 'Sin Fecha';
                sortKey = '9999-99';
            }
        } else if (groupField === 'quarter') {
            if (dt) {
                const yr = dt.getUTCFullYear();
                const q = Math.floor(dt.getUTCMonth() / 3) + 1;
                grp = `T${q} ${yr}`;
                sortKey = `${yr}-Q${q}`;
            } else {
                grp = 'Sin Fecha';
                sortKey = '9999-Q9';
            }
        } else if (groupField === 'year') {
            if (dt) {
                const yr = dt.getUTCFullYear();
                grp = `${yr}`;
                sortKey = `${yr}`;
            } else {
                grp = 'Sin Fecha';
                sortKey = '9999';
            }
        } else if (groupField === 'period_split') {
            if (dt && cutoffTimestamp > 0) {
                if (ts < cutoffTimestamp) {
                    grp = `Antes de ${cutoffLabel}`;
                    sortKey = '1';
                } else {
                    grp = `Desde ${cutoffLabel}`;
                    sortKey = '2';
                }
            } else {
                grp = 'Sin Fecha';
                sortKey = '3';
            }
        }

        rowsWithData.push({
            raw: d,
            rawValues: rawVals,
            zRow,
            group: grp,
            groupSortKey: sortKey,
            parsedDate: dt,
            timestamp: ts
        });
    });

    const N = rowsWithData.length;
    if (N < 3) {
        return emptyInvalidResult(
            'Se necesitan al menos 3 muestras válidas con los parámetros elegidos.',
            groupField,
            N,
            P
        );
    }

    // Si el usuario seleccionó K-means (kmeans_2, kmeans_3, kmeans_4), aplicamos clustering automático sobre zRow
    if (groupField.startsWith('kmeans_')) {
        const k = parseInt(groupField.split('_')[1], 10) || 3;
        const vectors = rowsWithData.map(r => r.zRow);
        const clusterAssignments = runKMeans(vectors, Math.min(k, N));

        // Asignar nombres limpios y profesionales basados en el centroide promedio (suma de Z-scores)
        const clusterSums = Array.from({ length: k }, () => 0);
        const clusterCounts = Array(k).fill(0);
        clusterAssignments.forEach((cl, idx) => {
            clusterCounts[cl]++;
            const sumZ = vectors[idx].reduce((a, b) => a + b, 0);
            clusterSums[cl] += sumZ;
        });

        const clusterAverages = clusterSums.map((sum, idx) => (clusterCounts[idx] > 0 ? sum / clusterCounts[idx] : -999));
        
        // Ordenar clusters de mayor a menor calidad/concentración global
        const sortedClusterIndices = clusterAverages
            .map((avg, idx) => ({ avg, idx }))
            .sort((a, b) => b.avg - a.avg)
            .map(x => x.idx);

        const rankMap = new Map<number, number>();
        sortedClusterIndices.forEach((origIdx, newRank) => {
            rankMap.set(origIdx, newRank);
        });

        const profileNamesK2 = ['Perfil A: Alta Concentración', 'Perfil B: Calidad Estándar / Baja'];
        const profileNamesK3 = ['Perfil 1: Alta Concentración', 'Perfil 2: Calidad Estándar', 'Perfil 3: Concentración Reducida'];
        const profileNamesK4 = ['Perfil I: Premium / Alto', 'Perfil II: Estándar Alto', 'Perfil III: Estándar Bajo', 'Perfil IV: Mínimo / Variable'];

        rowsWithData.forEach((r, idx) => {
            const rawCl = clusterAssignments[idx];
            const rank = rankMap.get(rawCl) ?? 0;
            if (k === 2) r.group = profileNamesK2[rank] || `Perfil ${rank + 1}`;
            else if (k === 3) r.group = profileNamesK3[rank] || `Perfil ${rank + 1}`;
            else r.group = profileNamesK4[rank] || `Perfil ${rank + 1}`;
            r.groupSortKey = String(rank);
        });
    }

    // Matriz de Correlación R (P x P)
    const R: number[][] = Array.from({ length: P }, () => Array(P).fill(0));
    for (let j = 0; j < P; j++) {
        for (let k = j; k < P; k++) {
            if (j === k) {
                R[j][k] = 1.0;
            } else {
                let sum = 0;
                for (let i = 0; i < N; i++) {
                    sum += rowsWithData[i].zRow[j] * rowsWithData[i].zRow[k];
                }
                const corr = Math.max(-1, Math.min(1, sum / (N - 1)));
                R[j][k] = corr;
                R[k][j] = corr;
            }
        }
    }

    const topCorrelations: PcaCorrelationItem[] = [];
    for (let j = 0; j < P; j++) {
        for (let k = j + 1; k < P; k++) {
            topCorrelations.push({
                var1: validVariables[j].key,
                var1Label: validVariables[j].label,
                var2: validVariables[k].key,
                var2Label: validVariables[k].label,
                correlation: R[j][k]
            });
        }
    }
    topCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    // Descomposición Espectral
    const { eigenvalues, eigenvectors } = jacobiEigenvalues(R);
    const totalVariance = Math.max(1e-9, eigenvalues.reduce((a, b) => a + b, 0));

    let cumulative = 0;
    const components: PcaComponentInfo[] = eigenvalues.map((ev, idx) => {
        const pct = (ev / totalVariance) * 100;
        cumulative += pct;
        return {
            component: idx + 1,
            eigenvalue: ev,
            varianceExplainedPct: parseFloat(pct.toFixed(1)),
            cumulativeVariancePct: parseFloat(cumulative.toFixed(1))
        };
    });

    const totalVarianceExplained2D = parseFloat(
        ((components[0]?.varianceExplainedPct || 0) + (components[1]?.varianceExplainedPct || 0)).toFixed(1)
    );

    const sqrtLambda1 = Math.sqrt(Math.max(0, eigenvalues[0] || 0));
    const sqrtLambda2 = Math.sqrt(Math.max(0, eigenvalues[1] || 0));
    const v1 = eigenvectors[0] || Array(P).fill(0);
    const v2 = eigenvectors[1] || Array(P).fill(0);

    const loadings: PcaLoading[] = validVariables.map((v, j) => {
        const l1 = (v1[j] || 0) * sqrtLambda1;
        const l2 = (v2[j] || 0) * sqrtLambda2;
        const mag = Math.sqrt(l1 * l1 + l2 * l2);
        let angle = (Math.atan2(l2, l1) * 180) / Math.PI;
        if (angle < 0) angle += 360;

        return {
            key: v.key,
            label: v.label,
            unit: v.unit,
            color: v.color,
            pc1Loading: parseFloat(l1.toFixed(3)),
            pc2Loading: parseFloat(l2.toFixed(3)),
            magnitude: parseFloat(mag.toFixed(3)),
            angleDegrees: parseFloat(angle.toFixed(1)),
            contributionPc1: parseFloat((Math.pow(v1[j] || 0, 2) * 100).toFixed(1)),
            contributionPc2: parseFloat((Math.pow(v2[j] || 0, 2) * 100).toFixed(1))
        };
    });

    const topPc1Pos = loadings.filter(l => l.pc1Loading > 0.28).sort((a, b) => b.pc1Loading - a.pc1Loading).slice(0, 2).map(l => l.label);
    const topPc1Neg = loadings.filter(l => l.pc1Loading < -0.28).sort((a, b) => a.pc1Loading - b.pc1Loading).slice(0, 2).map(l => l.label);
    const topPc2Pos = loadings.filter(l => l.pc2Loading > 0.25).sort((a, b) => b.pc2Loading - a.pc2Loading).slice(0, 2).map(l => l.label);
    const topPc2Neg = loadings.filter(l => l.pc2Loading < -0.25).sort((a, b) => b.pc2Loading - a.pc2Loading).slice(0, 2).map(l => l.label);

    const axisLabels: PcaAxisLabels = {
        pc1Positive: topPc1Pos.length > 0 ? `Mayor ${topPc1Pos.join(' y ')}` : 'Eje 1 Positivo',
        pc1Negative: topPc1Neg.length > 0 ? `Mayor ${topPc1Neg.join(' y ')}` : 'Valores bajos de ' + (topPc1Pos[0] || 'Eje 1'),
        pc2Positive: topPc2Pos.length > 0 ? `Mayor ${topPc2Pos.join(' y ')}` : 'Eje 2 Positivo',
        pc2Negative: topPc2Neg.length > 0 ? `Mayor ${topPc2Neg.join(' y ')}` : 'Valores bajos de ' + (topPc2Pos[0] || 'Eje 2')
    };

    let maxAbsScore1 = 0;
    let maxAbsScore2 = 0;

    const rawScores = rowsWithData.map(row => {
        let sc1 = 0;
        let sc2 = 0;
        for (let j = 0; j < P; j++) {
            sc1 += row.zRow[j] * (v1[j] || 0);
            sc2 += row.zRow[j] * (v2[j] || 0);
        }
        if (Math.abs(sc1) > maxAbsScore1) maxAbsScore1 = Math.abs(sc1);
        if (Math.abs(sc2) > maxAbsScore2) maxAbsScore2 = Math.abs(sc2);
        return { row, sc1, sc2 };
    });

    if (maxAbsScore1 < 1e-6) maxAbsScore1 = 1;
    if (maxAbsScore2 < 1e-6) maxAbsScore2 = 1;

    const samples: PcaSamplePoint[] = rawScores.map((item, idx) => {
        const { row, sc1, sc2 } = item;
        return {
            id: `sample-${idx}`,
            noId: row.raw.noId,
            lote: row.raw.lote,
            date: row.raw.date,
            formattedDate: formatShortDate(row.parsedDate, row.raw.date),
            timestamp: row.timestamp,
            material: row.raw.material,
            subtipo: row.raw.subtipo,
            origen: row.raw.Origen,
            proveedor: row.raw.Proveedor,
            cliente: row.raw.Cliente,
            group: row.group,
            pc1: parseFloat(sc1.toFixed(3)),
            pc2: parseFloat(sc2.toFixed(3)),
            pc1Scaled: parseFloat(((sc1 / maxAbsScore1) * 0.92).toFixed(3)),
            pc2Scaled: parseFloat(((sc2 / maxAbsScore2) * 0.92).toFixed(3)),
            values: row.rawValues
        };
    });

    const isTemporalField = ['month', 'quarter', 'year', 'period_split'].includes(groupField);
    const groupSortKeys = new Map<string, string>();
    const groupCounts = new Map<string, number>();

    rowsWithData.forEach(r => {
        if (!groupSortKeys.has(r.group)) groupSortKeys.set(r.group, r.groupSortKey);
        groupCounts.set(r.group, (groupCounts.get(r.group) || 0) + 1);
    });

    const uniqueGroups = Array.from(groupCounts.keys()).sort((a, b) => {
        if (isTemporalField) {
            return (groupSortKeys.get(a) || '').localeCompare(groupSortKeys.get(b) || '');
        }
        if (groupField.startsWith('kmeans_')) {
            return a.localeCompare(b);
        }
        return (groupCounts.get(b) || 0) - (groupCounts.get(a) || 0);
    });

    const groupColorMap: Record<string, string> = {};
    uniqueGroups.forEach((g, idx) => {
        groupColorMap[g] = GROUP_PALETTE[idx % GROUP_PALETTE.length];
    });

    const groups: PcaGroupCluster[] = uniqueGroups.map(g => {
        const gSamples = samples.filter(s => s.group === g);
        const meanPc1 = gSamples.reduce((sum, s) => sum + s.pc1, 0) / gSamples.length;
        const meanPc2 = gSamples.reduce((sum, s) => sum + s.pc2, 0) / gSamples.length;
        const meanPc1Scaled = gSamples.reduce((sum, s) => sum + s.pc1Scaled, 0) / gSamples.length;
        const meanPc2Scaled = gSamples.reduce((sum, s) => sum + s.pc2Scaled, 0) / gSamples.length;

        const dists = gSamples.map(s =>
            Math.sqrt(Math.pow(s.pc1 - meanPc1, 2) + Math.pow(s.pc2 - meanPc2, 2))
        );
        const radius = dists.reduce((a, b) => a + b, 0) / Math.max(1, dists.length);

        const distsScaled = gSamples.map(s =>
            Math.sqrt(Math.pow(s.pc1Scaled - meanPc1Scaled, 2) + Math.pow(s.pc2Scaled - meanPc2Scaled, 2))
        );
        const meanDistScaled = distsScaled.reduce((a, b) => a + b, 0) / Math.max(1, distsScaled.length);
        const radiusScaled = Math.max(0.08, Math.min(0.55, meanDistScaled * 1.25));

        const stabilityLabel: PcaGroupCluster['stabilityLabel'] =
            radius < 0.9 ? 'Muy Estable' : radius < 1.6 ? 'Estabilidad Moderada' : 'Alta Variabilidad';

        const variableStats: Record<string, PcaGroupVariableStat> = {};
        const higherList: { label: string; diffPct: number }[] = [];
        const lowerList: { label: string; diffPct: number }[] = [];

        validVariables.forEach(v => {
            const vals = gSamples
                .map(s => s.values[v.key])
                .filter(val => typeof val === 'number' && !isNaN(val) && val !== 0);

            if (vals.length > 0) {
                const gMean = vals.reduce((a, b) => a + b, 0) / vals.length;
                const diffAbs = gMean - v.mean;
                const diffPct = v.mean !== 0 ? (diffAbs / v.mean) * 100 : 0;

                variableStats[v.key] = {
                    mean: parseFloat(gMean.toFixed(3)),
                    count: vals.length,
                    diffVsGlobalAbs: parseFloat(diffAbs.toFixed(3)),
                    diffVsGlobalPct: parseFloat(diffPct.toFixed(1))
                };

                const zDiff = v.stdDev > 0 ? Math.abs(diffAbs) / v.stdDev : 0;
                if (zDiff >= 0.35 || Math.abs(diffPct) >= 4) {
                    const sign = diffPct > 0 ? '+' : '';
                    const tag = `${v.label} (${sign}${diffPct.toFixed(1)}%)`;
                    if (diffPct > 0) higherList.push({ label: tag, diffPct });
                    else lowerList.push({ label: tag, diffPct: Math.abs(diffPct) });
                }
            } else {
                variableStats[v.key] = {
                    mean: null,
                    count: 0,
                    diffVsGlobalAbs: 0,
                    diffVsGlobalPct: 0
                };
            }
        });

        higherList.sort((a, b) => b.diffPct - a.diffPct);
        lowerList.sort((a, b) => b.diffPct - a.diffPct);

        const higher = higherList.slice(0, 2).map(x => x.label);
        const lower = lowerList.slice(0, 2).map(x => x.label);

        let desc = 'Cerca del promedio general en casi todos los parámetros.';
        if (higher.length > 0 && lower.length > 0) {
            desc = `Más alto en ${higher[0]}; más bajo en ${lower[0]}.`;
        } else if (higher.length > 0) {
            desc = `Destaca por mayor ${higher.join(' y ')}.`;
        } else if (lower.length > 0) {
            desc = `Presenta menor ${lower.join(' y ')}.`;
        }

        return {
            groupName: g,
            color: groupColorMap[g],
            sampleCount: gSamples.length,
            centroidPc1: parseFloat(meanPc1.toFixed(3)),
            centroidPc2: parseFloat(meanPc2.toFixed(3)),
            centroidPc1Scaled: parseFloat(meanPc1Scaled.toFixed(3)),
            centroidPc2Scaled: parseFloat(meanPc2Scaled.toFixed(3)),
            radius: parseFloat(radius.toFixed(2)),
            radiusScaled: parseFloat(radiusScaled.toFixed(3)),
            stabilityLabel,
            description: desc,
            highlights: { higher, lower },
            variableStats
        };
    });

    let separationLevel: PcaDecisionSummary['separationLevel'] = 'Único Grupo';
    let separationTitle = 'Análisis de un solo grupo';
    let mainFinding = `Todas las ${N} muestras pertenecen a "${groups[0]?.groupName}". Cambia el criterio superior para comparar segmentos.`;
    let stabilityFinding = groups[0]
        ? `Dispersión interna: ${groups[0].stabilityLabel} (σ = ${groups[0].radius}).`
        : '';
    let recommendation = 'Usa K-means o compara por Origen para identificar perfiles.';

    const groupInsights: string[] = [];

    if (groups.length > 1) {
        let maxDist = -1;
        let gA = groups[0];
        let gB = groups[1];
        for (let i = 0; i < groups.length; i++) {
            for (let j = i + 1; j < groups.length; j++) {
                const d = Math.sqrt(
                    Math.pow(groups[i].centroidPc1 - groups[j].centroidPc1, 2) +
                    Math.pow(groups[i].centroidPc2 - groups[j].centroidPc2, 2)
                );
                if (d > maxDist) {
                    maxDist = d;
                    gA = groups[i];
                    gB = groups[j];
                }
            }
        }

        const avgRadius = groups.reduce((acc, g) => acc + g.radius, 0) / groups.length;
        const separationRatio = avgRadius > 0.05 ? maxDist / avgRadius : maxDist;

        if (separationRatio >= 1.8 && maxDist >= 1.1) {
            separationLevel = 'Alta';
            separationTitle = 'Diferenciación clara entre perfiles de calidad';
        } else if (separationRatio >= 1.0 && maxDist >= 0.6) {
            separationLevel = 'Moderada';
            separationTitle = 'Diferencias moderadas entre lotes';
        } else {
            separationLevel = 'Baja';
            separationTitle = 'Lotes con perfiles nutricionales muy similares';
        }

        const diffVars = validVariables
            .map(v => {
                const statA = gA.variableStats[v.key];
                const statB = gB.variableStats[v.key];
                if (!statA || !statB || statA.mean === null || statB.mean === null) return null;
                const zGap = v.stdDev > 0 ? Math.abs(statA.mean - statB.mean) / v.stdDev : 0;
                return {
                    label: v.label,
                    unit: v.unit,
                    meanA: statA.mean,
                    meanB: statB.mean,
                    zGap
                };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.zGap - a.zGap);

        const topDiff = diffVars[0];
        const secondDiff = diffVars[1];

        if (separationLevel === 'Baja') {
            mainFinding = `Los lotes tienen comportamiento muy homogéneo. La mayor diferencia leve ocurre entre "${gA.groupName}" y "${gB.groupName}"${
                topDiff ? ` en ${topDiff.label} (${formatNum(topDiff.meanA)} vs ${formatNum(topDiff.meanB)} ${topDiff.unit})` : ''
            }.`;
            recommendation = 'La calidad es uniforme; puedes confiar en el promedio general para formulación.';
        } else {
            const diffText = [topDiff, secondDiff]
                .filter(Boolean)
                .map(d => `${d!.label} (${formatNum(d!.meanA)} vs ${formatNum(d!.meanB)} ${d!.unit})`)
                .join(' y ');

            if (groupField.startsWith('kmeans_')) {
                mainFinding = `Se han clasificado automáticamente ${N} lotes en ${groups.length} calidades distintas. "${gA.groupName}" destaca frente a "${gB.groupName}" por ${diffText || 'su perfil general'}.`;
                recommendation = 'Usa esta clasificación automática para separar lotes en almacén o ajustar fórmulas según el perfil de calidad detectado.';
            } else {
                mainFinding = `La diferencia más marcada se observa entre "${gA.groupName}" y "${gB.groupName}", principalmente en ${diffText || 'su composición'}.`;
                recommendation = 'Revisa la tabla de valores reales debajo del mapa para decidir compras o ajustes de formulación.';
            }
        }

        const groupsWithMultiple = groups.filter(g => g.sampleCount >= 3);
        if (groupsWithMultiple.length >= 2) {
            const sortedByStab = [...groupsWithMultiple].sort((a, b) => a.radius - b.radius);
            const mostStable = sortedByStab[0];
            const leastStable = sortedByStab[sortedByStab.length - 1];
            stabilityFinding = `El grupo "${mostStable.groupName}" es el más constante (${mostStable.stabilityLabel}), mientras que "${leastStable.groupName}" tiene mayor dispersión.`;
        } else {
            stabilityFinding = `El grupo principal es "${groups[0].groupName}" (${groups[0].sampleCount} muestras, ${groups[0].stabilityLabel}).`;
        }

        groupInsights.push(mainFinding);
        if (stabilityFinding) groupInsights.push(stabilityFinding);
    }

    const strongestCorr = topCorrelations[0];
    let nutrientFinding = 'Parámetros con comportamiento independiente.';
    if (strongestCorr && Math.abs(strongestCorr.correlation) >= 0.35) {
        const isPos = strongestCorr.correlation > 0;
        const strengthWord = Math.abs(strongestCorr.correlation) >= 0.65 ? 'fuerte' : 'moderada';
        nutrientFinding = isPos
            ? `Correlación ${strengthWord}: al subir ${strongestCorr.var1Label}, tiende a subir ${strongestCorr.var2Label} (r = +${strongestCorr.correlation.toFixed(2)}).`
            : `Correlación inversa ${strengthWord}: al subir ${strongestCorr.var1Label}, tiende a bajar ${strongestCorr.var2Label} (r = ${strongestCorr.correlation.toFixed(2)}).`;
    }

    const pc1Pos = loadings.filter(l => l.pc1Loading >= 0.4).sort((a, b) => b.pc1Loading - a.pc1Loading).map(l => `${l.label} (+${l.pc1Loading})`);
    const pc1Neg = loadings.filter(l => l.pc1Loading <= -0.4).sort((a, b) => b.pc1Loading - a.pc1Loading).map(l => `${l.label} (${l.pc1Loading})`);
    const pc2Pos = loadings.filter(l => l.pc2Loading >= 0.35).sort((a, b) => b.pc2Loading - a.pc2Loading).map(l => `${l.label} (+${l.pc2Loading})`);
    const pc2Neg = loadings.filter(l => l.pc2Loading <= -0.35).sort((a, b) => b.pc2Loading - a.pc2Loading).map(l => `${l.label} (${l.pc2Loading})`);

    const strongestRelations = topCorrelations.slice(0, 4).map(c => {
        const type = c.correlation > 0 ? 'directa' : 'inversa';
        return `${c.var1Label} y ${c.var2Label} (${type}, r = ${c.correlation.toFixed(2)}).`;
    });

    const summary = `Mapa 2D con ${totalVarianceExplained2D}% de retención de información.`;

    return {
        isValid: true,
        sampleCount: N,
        variableCount: P,
        variables: validVariables,
        components,
        totalVarianceExplained2D,
        samples,
        loadings,
        correlationMatrix: R,
        variableLabels: validVariables.map(v => v.label),
        topCorrelations,
        groups,
        groupField,
        suggestedCutoffIso,
        axisLabels,
        decisionSummary: {
            separationLevel,
            separationTitle,
            mainFinding,
            stabilityFinding,
            nutrientFinding,
            recommendation
        },
        interpretation: {
            summary,
            pc1Drivers: { positive: pc1Pos, negative: pc1Neg },
            pc2Drivers: { positive: pc2Pos, negative: pc2Neg },
            strongestRelations,
            groupInsights
        }
    };
}
