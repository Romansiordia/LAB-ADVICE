/**
 * Utilidades matemáticas y estadísticas para Análisis de Componentes Principales (PCA),
 * descomposición espectral (Jacobi), biplots 2D, matriz de correlación e interpretación analítica.
 */

import { RawMaterialData } from './types';
import { NUTRIENTS } from './constants';

export interface PcaVariableConfig {
    key: string;
    label: string;
    color: string;
    mean: number;
    stdDev: number;
}

export interface PcaSamplePoint {
    id: string;
    noId?: string;
    lote?: string;
    date: string;
    material: string;
    subtipo?: string;
    group: string; // Cliente, Proveedor, Mes, etc.
    pc1: number;
    pc2: number;
    pc1Scaled: number;
    pc2Scaled: number;
    values: Record<string, number>;
}

export interface PcaLoading {
    key: string;
    label: string;
    color: string;
    pc1Loading: number; // Correlación con PC1 [-1, 1]
    pc2Loading: number; // Correlación con PC2 [-1, 1]
    magnitude: number;  // Calidad de representación en 2D (r2)
    angleDegrees: number;
    contributionPc1: number; // % contribución a PC1
    contributionPc2: number; // % contribución a PC2
}

export interface PcaComponentInfo {
    component: number;
    eigenvalue: number;
    varianceExplainedPct: number;
    cumulativeVariancePct: number;
}

export interface PcaGroupCluster {
    groupName: string;
    color: string;
    sampleCount: number;
    centroidPc1: number;
    centroidPc2: number;
    radius: number; // Desviación estándar promedio del centroide
    description: string;
}

export interface PcaCorrelationItem {
    var1: string;
    var1Label: string;
    var2: string;
    var2Label: string;
    correlation: number;
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
    groupField: string;
    interpretation: {
        summary: string;
        pc1Drivers: { positive: string[]; negative: string[] };
        pc2Drivers: { positive: string[]; negative: string[] };
        strongestRelations: string[];
        groupInsights: string[];
    };
}

// Paleta de colores distintivos y accesibles para grupos (Clientes, etc.)
export const GROUP_PALETTE = [
    '#0284c7', // Sky Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#14b8a6', // Teal
    '#84cc16', // Lime
    '#a855f7', // Purple
    '#ef4444', // Red
    '#64748b'  // Slate
];

/**
 * Algoritmo de rotación de Jacobi para matrices simétricas reales.
 * Encuentra de forma exacta y numéricamente estable todos los autovalores y autovectores.
 */
function jacobiEigenvalues(matrix: number[][], maxIter = 100, tolerance = 1e-10) {
    const n = matrix.length;
    // Copia de la matriz simétrica A
    const A: number[][] = matrix.map(row => [...row]);
    // Matriz de autovectores V inicializada como identidad
    const V: number[][] = Array.from({ length: n }, (_, i) =>
        Array.from({ length: n }, (_, j) => (i === j ? 1.0 : 0.0))
    );

    for (let iter = 0; iter < maxIter; iter++) {
        // Encontrar el elemento fuera de la diagonal con mayor valor absoluto
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

        if (maxVal < tolerance) {
            break;
        }

        const app = A[p][p];
        const aqq = A[q][q];
        const apq = A[p][q];

        const tau = (aqq - app) / (2.0 * apq);
        const t = (tau >= 0 ? 1.0 : -1.0) / (Math.abs(tau) + Math.sqrt(1.0 + tau * tau));
        const c = 1.0 / Math.sqrt(1.0 + t * t);
        const s = t * c;

        // Actualizar A
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

        // Actualizar matriz de autovectores V
        for (let k = 0; k < n; k++) {
            const vkp = V[k][p];
            const vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
        }
    }

    // Extraer autovalores de la diagonal
    const rawEigenvalues = A.map((row, i) => Math.max(0, row[i]));

    // Emparejar y ordenar de mayor a menor autovalor
    const eigenPairs = rawEigenvalues.map((lambda, idx) => ({
        eigenvalue: lambda,
        vector: V.map(row => row[idx])
    }));

    eigenPairs.sort((a, b) => b.eigenvalue - a.eigenvalue);

    return {
        eigenvalues: eigenPairs.map(p => p.eigenvalue),
        eigenvectors: eigenPairs.map(p => p.vector) // cada elemento es el vector para ese autovalor
    };
}

/**
 * Ejecuta el Análisis de Componentes Principales (PCA) completo sobre los datos de muestras.
 */
export function calculatePca(
    data: RawMaterialData[],
    selectedVariableKeys: string[],
    groupField: 'Cliente' | 'Proveedor' | 'subtipo' | 'material' | 'month' = 'Cliente'
): PcaResult {
    // 1. Validaciones básicas
    if (!data || data.length < 3) {
        return {
            isValid: false,
            errorMessage: 'Se requieren al menos 3 muestras para realizar el análisis de PCA.',
            sampleCount: 0,
            variableCount: 0,
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
            interpretation: {
                summary: 'Insuficientes datos para calcular componentes.',
                pc1Drivers: { positive: [], negative: [] },
                pc2Drivers: { positive: [], negative: [] },
                strongestRelations: [],
                groupInsights: []
            }
        };
    }

    // 2. Filtrar variables que existan en NUTRIENTS y tengan datos numéricos
    const candidateConfigs = selectedVariableKeys
        .map(key => NUTRIENTS.find(n => n.key === key))
        .filter((n): n is typeof NUTRIENTS[0] => !!n);

    if (candidateConfigs.length < 2) {
        return {
            isValid: false,
            errorMessage: 'Selecciona al menos 2 variables analíticas para calcular el PCA.',
            sampleCount: 0,
            variableCount: 0,
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
            interpretation: {
                summary: 'Selecciona más variables para el modelo.',
                pc1Drivers: { positive: [], negative: [] },
                pc2Drivers: { positive: [], negative: [] },
                strongestRelations: [],
                groupInsights: []
            }
        };
    }

    // 3. Extraer valores y filtrar muestras que tengan al menos una variable numérica
    // Calcular medias preliminares por variable para imputar valores faltantes sin perder la muestra
    const validVariables: PcaVariableConfig[] = [];
    const varIndices: number[] = [];

    candidateConfigs.forEach((config, idx) => {
        const values = data
            .map(d => Number(d[config.key]))
            .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));

        if (values.length >= 3) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (values.length - 1);
            const stdDev = Math.sqrt(variance);

            // Sólo incluir variables con varianza no nula
            if (stdDev > 1e-6) {
                validVariables.push({
                    key: config.key,
                    label: config.label.replace(/\s*\(.*?\)/, ''), // Nombre limpio
                    color: config.color,
                    mean,
                    stdDev
                });
                varIndices.push(idx);
            }
        }
    });

    if (validVariables.length < 2) {
        return {
            isValid: false,
            errorMessage: 'Las variables seleccionadas no tienen suficiente variabilidad o registros válidos.',
            sampleCount: 0,
            variableCount: 0,
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
            interpretation: {
                summary: 'No hay variabilidad suficiente.',
                pc1Drivers: { positive: [], negative: [] },
                pc2Drivers: { positive: [], negative: [] },
                strongestRelations: [],
                groupInsights: []
            }
        };
    }

    const P = validVariables.length;

    // 4. Construir matriz estandarizada Z (N x P)
    // Descartar muestras que no tengan ningún dato en las variables seleccionadas
    interface RowWithData {
        raw: RawMaterialData;
        rawValues: Record<string, number>;
        zRow: number[];
        group: string;
    }

    const rowsWithData: RowWithData[] = [];

    data.forEach(d => {
        let hasAnyValue = false;
        const rawVals: Record<string, number> = {};
        const zRow: number[] = [];

        validVariables.forEach(v => {
            const rawVal = Number(d[v.key]);
            if (typeof rawVal === 'number' && !isNaN(rawVal) && isFinite(rawVal)) {
                hasAnyValue = true;
                rawVals[v.key] = rawVal;
                zRow.push((rawVal - v.mean) / v.stdDev);
            } else {
                // Imputación con la media estandarizada (0)
                rawVals[v.key] = v.mean;
                zRow.push(0.0);
            }
        });

        if (hasAnyValue) {
            let grp = 'General';
            if (groupField === 'Cliente') {
                grp = String(d.Cliente || 'Sin Cliente').trim() || 'Sin Cliente';
            } else if (groupField === 'Proveedor') {
                grp = String(d.Proveedor || 'Sin Proveedor').trim() || 'Sin Proveedor';
            } else if (groupField === 'subtipo') {
                grp = String(d.subtipo || 'Estándar').trim() || 'Estándar';
            } else if (groupField === 'material') {
                grp = String(d.material || 'General').trim() || 'General';
            } else if (groupField === 'month') {
                try {
                    const dt = new Date(d.date);
                    grp = dt.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
                } catch {
                    grp = 'General';
                }
            }

            rowsWithData.push({
                raw: d,
                rawValues: rawVals,
                zRow,
                group: grp
            });
        }
    });

    const N = rowsWithData.length;
    if (N < 3) {
        return {
            isValid: false,
            errorMessage: 'Se necesitan al menos 3 muestras válidas con los parámetros elegidos.',
            sampleCount: N,
            variableCount: P,
            variables: validVariables,
            components: [],
            totalVarianceExplained2D: 0,
            samples: [],
            loadings: [],
            correlationMatrix: [],
            variableLabels: validVariables.map(v => v.label),
            topCorrelations: [],
            groups: [],
            groupField,
            interpretation: {
                summary: 'Muestras insuficientes.',
                pc1Drivers: { positive: [], negative: [] },
                pc2Drivers: { positive: [], negative: [] },
                strongestRelations: [],
                groupInsights: []
            }
        };
    }

    // 5. Matriz de Correlación R (P x P)
    // R_jk = 1 / (N - 1) * sum(Z_ij * Z_ik)
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

    // Extraer correlaciones más destacadas
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
    // Ordenar por magnitud de correlación absoluta
    topCorrelations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));

    // 6. Descomposición Espectral (Jacobi)
    const { eigenvalues, eigenvectors } = jacobiEigenvalues(R);

    // Suma de autovalores = traza de R = P
    const totalVariance = eigenvalues.reduce((a, b) => a + b, 0);

    let cumulative = 0;
    const components: PcaComponentInfo[] = eigenvalues.map((ev, idx) => {
        const pct = (ev / totalVariance) * 100;
        cumulative += pct;
        return {
            component: idx + 1,
            eigenvalue: ev,
            varianceExplainedPct: parseFloat(pct.toFixed(2)),
            cumulativeVariancePct: parseFloat(cumulative.toFixed(2))
        };
    });

    const totalVarianceExplained2D = parseFloat(
        ((components[0]?.varianceExplainedPct || 0) + (components[1]?.varianceExplainedPct || 0)).toFixed(1)
    );

    // 7. Cargas Factoriales (Loadings) en PC1 y PC2
    // Loading_j,k = eigenvector_j,k * sqrt(lambda_k)
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

        // Contribución a PC1: (v1[j]^2 / sum(v1^2)) * 100
        const contrib1 = Math.pow(v1[j] || 0, 2) * 100;
        const contrib2 = Math.pow(v2[j] || 0, 2) * 100;

        return {
            key: v.key,
            label: v.label,
            color: v.color,
            pc1Loading: parseFloat(l1.toFixed(3)),
            pc2Loading: parseFloat(l2.toFixed(3)),
            magnitude: parseFloat(mag.toFixed(3)),
            angleDegrees: parseFloat(angle.toFixed(1)),
            contributionPc1: parseFloat(contrib1.toFixed(1)),
            contributionPc2: parseFloat(contrib2.toFixed(1))
        };
    });

    // 8. Puntuaciones de Muestras (Scores) en PC1 y PC2
    // Score_i,k = sum_j (Z_ij * v_k[j])
    let maxAbsScore1 = 0;
    let maxAbsScore2 = 0;

    const rawScores = rowsWithData.map((row, i) => {
        let sc1 = 0;
        let sc2 = 0;
        for (let j = 0; j < P; j++) {
            sc1 += row.zRow[j] * (v1[j] || 0);
            sc2 += row.zRow[j] * (v2[j] || 0);
        }
        if (Math.abs(sc1) > maxAbsScore1) maxAbsScore1 = Math.abs(sc1);
        if (Math.abs(sc2) > maxAbsScore2) maxAbsScore2 = Math.abs(sc2);

        return {
            row,
            sc1,
            sc2
        };
    });

    if (maxAbsScore1 === 0) maxAbsScore1 = 1;
    if (maxAbsScore2 === 0) maxAbsScore2 = 1;

    // Escalamiento del Biplot: Normalizar scores a una ventana visual adecuada [-1.1, 1.1]
    const samples: PcaSamplePoint[] = rawScores.map((item, idx) => {
        const { row, sc1, sc2 } = item;
        return {
            id: `sample-${idx}`,
            noId: row.raw.noId,
            lote: row.raw.lote,
            date: row.raw.date,
            material: row.raw.material,
            subtipo: row.raw.subtipo,
            group: row.group,
            pc1: parseFloat(sc1.toFixed(3)),
            pc2: parseFloat(sc2.toFixed(3)),
            pc1Scaled: parseFloat(((sc1 / maxAbsScore1) * 0.95).toFixed(3)),
            pc2Scaled: parseFloat(((sc2 / maxAbsScore2) * 0.95).toFixed(3)),
            values: row.rawValues
        };
    });

    // 9. Agrupación por Clusters (Cliente, etc.)
    const uniqueGroups = Array.from(new Set(samples.map(s => s.group)));
    const groupColorMap: Record<string, string> = {};
    uniqueGroups.forEach((g, idx) => {
        groupColorMap[g] = GROUP_PALETTE[idx % GROUP_PALETTE.length];
    });

    const groups: PcaGroupCluster[] = uniqueGroups.map(g => {
        const gSamples = samples.filter(s => s.group === g);
        const meanPc1 = gSamples.reduce((sum, s) => sum + s.pc1, 0) / gSamples.length;
        const meanPc2 = gSamples.reduce((sum, s) => sum + s.pc2, 0) / gSamples.length;

        // Dispersión / Radio medio
        const dists = gSamples.map(s => Math.sqrt(Math.pow(s.pc1 - meanPc1, 2) + Math.pow(s.pc2 - meanPc2, 2)));
        const radius = dists.reduce((a, b) => a + b, 0) / Math.max(1, dists.length);

        // Descripción cualitativa del perfil
        let desc = 'Perfil nutricional promedio equilibrado.';
        const pos1 = meanPc1 > 0.5;
        const neg1 = meanPc1 < -0.5;
        const pos2 = meanPc2 > 0.5;
        const neg2 = meanPc2 < -0.5;

        // Variables dominantes en el cuadrante del centroide
        const drivingVars = loadings
            .filter(l => (pos1 ? l.pc1Loading > 0.3 : neg1 ? l.pc1Loading < -0.3 : true))
            .filter(l => (pos2 ? l.pc2Loading > 0.3 : neg2 ? l.pc2Loading < -0.3 : true))
            .map(l => l.label);

        if (drivingVars.length > 0) {
            desc = `Mayor tendencia hacia: ${drivingVars.slice(0, 3).join(', ')}.`;
        } else if (pos1) {
            desc = 'Valores por encima de la media en el Componente 1.';
        } else if (neg1) {
            desc = 'Valores por debajo de la media en el Componente 1.';
        }

        return {
            groupName: g,
            color: groupColorMap[g],
            sampleCount: gSamples.length,
            centroidPc1: parseFloat(meanPc1.toFixed(3)),
            centroidPc2: parseFloat(meanPc2.toFixed(3)),
            radius: parseFloat(radius.toFixed(2)),
            description: desc
        };
    });

    // 10. Interpretación Estadística en Español
    // Identificar variables clave para PC1 y PC2
    const pc1Pos = loadings.filter(l => l.pc1Loading >= 0.4).sort((a, b) => b.pc1Loading - a.pc1Loading).map(l => `${l.label} (+${l.pc1Loading})`);
    const pc1Neg = loadings.filter(l => l.pc1Loading <= -0.4).sort((a, b) => a.pc1Loading - b.pc1Loading).map(l => `${l.label} (${l.pc1Loading})`);

    const pc2Pos = loadings.filter(l => l.pc2Loading >= 0.35).sort((a, b) => b.pc2Loading - a.pc2Loading).map(l => `${l.label} (+${l.pc2Loading})`);
    const pc2Neg = loadings.filter(l => l.pc2Loading <= -0.35).sort((a, b) => a.pc2Loading - b.pc2Loading).map(l => `${l.label} (${l.pc2Loading})`);

    const strongestRelations = topCorrelations.slice(0, 4).map(c => {
        const type = c.correlation > 0 ? 'positiva directa' : 'inversa';
        const strength = Math.abs(c.correlation) > 0.7 ? 'muy fuerte' : 'moderada';
        return `${c.var1Label} y ${c.var2Label} tienen correlación ${strength} ${type} (r = ${c.correlation.toFixed(2)}).`;
    });

    const groupInsights: string[] = [];
    if (groups.length > 1) {
        // Encontrar los 2 grupos más distantes entre sí
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
        if (maxDist > 1.0) {
            groupInsights.push(
                `Diferenciación clara detectada entre "${gA.groupName}" y "${gB.groupName}" (distancia euclídea = ${maxDist.toFixed(2)}). ${gA.groupName} presenta ${gA.description.toLowerCase()}`
            );
        } else {
            groupInsights.push(
                'Los clientes/grupos presentan perfiles nutricionales bastante homogéneos sin segregaciones drásticas.'
            );
        }
    }

    const summary = `El plano factorial (PC1 + PC2) retiene el ${totalVarianceExplained2D}% de la información contenida en las ${P} variables de ${N} muestras analizadas. Permite visualizar correlaciones entre nutrientes y diferencias de composición sin pérdida sustancial de precisión.`;

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
        interpretation: {
            summary,
            pc1Drivers: { positive: pc1Pos, negative: pc1Neg },
            pc2Drivers: { positive: pc2Pos, negative: pc2Neg },
            strongestRelations,
            groupInsights
        }
    };
}
