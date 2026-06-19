
export const MATERIALS = ['Soya', 'Maiz', 'Canola', 'DDGS', 'Sorgo', 'Alimento Aves', 'Alimento Cerdos', 'Alimento Pollo', 'Alimento Ganado'];

export const NUTRIENTS = [
    { key: 'proteina', label: 'Proteína (%)', color: '#06b6d4', category: 'nutrients' }, // Cyan
    { key: 'humedad', label: 'Humedad (%)', color: '#3b82f6', category: 'nutrients' }, // Blue
    { key: 'grasa', label: 'Grasa (%)', color: '#10b981', category: 'nutrients' }, // Emerald
    { key: 'fibra', label: 'Fibra (%)', color: '#f59e0b', category: 'nutrients' }, // Amber
    { key: 'ceniza', label: 'Ceniza (%)', color: '#64748b', category: 'nutrients' }, // Slate
    { key: 'almidon', label: 'Almidón (%)', color: '#8b5cf6', category: 'nutrients' }, // Violet
    { key: 'calcio', label: 'Calcio (%)', color: '#ef4444', category: 'nutrients' }, // Red
    { key: 'fosforo', label: 'Fósforo (%)', color: '#ec4899', category: 'nutrients' }, // Pink
    { key: 'fda', label: 'FDA (%)', color: '#f97316', category: 'nutrients' }, // Orange
    { key: 'fdn', label: 'FDN (%)', color: '#14b8a6', category: 'nutrients' }, // Teal
    { key: 'pdi', label: 'PDI (%)', color: '#84cc16', category: 'nutrients' }, // Lime
    { key: 'tamano_particula', label: 'Tamaño de Partícula (µm)', color: '#a855f7', category: 'nutrients' }, // Purple
    
    // Mycotoxins
    { key: 'aflatoxina', label: 'Aflatoxina (ppb)', color: '#f43f5e', category: 'mycotoxins' }, // Rose
    { key: 'ocratoxina', label: 'Ocratoxina (ppb)', color: '#ec4899', category: 'mycotoxins' }, // Pink
    { key: 'zearalenona', label: 'Zearalenona (ppb)', color: '#f59e0b', category: 'mycotoxins' }, // Amber
    { key: 'fumonisina', label: 'Fumonisina (ppm)', color: '#8b5cf6', category: 'mycotoxins' }, // Violet
    { key: 'vomitoxina', label: 'Vomitoxina (ppm)', color: '#6366f1', category: 'mycotoxins' }, // Indigo
    { key: 'toxina_t2', label: 'Toxina T2 (ppb)', color: '#3c82f6', category: 'mycotoxins' } // Blue
];

export interface ThresholdRange {
    min: number;
    max: number;
    part1_max: number; // safe up to here
    part2_max: number; // moderate up to here
}

export interface SpeciesThresholds {
    [mycotoxinKey: string]: ThresholdRange;
}

export const MYCOTOXIN_THRESHOLDS: Record<string, SpeciesThresholds> = {
    betail: {
        aflatoxina: { min: 0, part1_max: 30, part2_max: 100, max: 220 },
        fumonisina: { min: 0, part1_max: 1.4, part2_max: 4.2, max: 9 },
        ocratoxina: { min: 0, part1_max: 60, part2_max: 130, max: 250 },
        toxina_t2: { min: 0, part1_max: 50, part2_max: 150, max: 300 },
        vomitoxina: { min: 0, part1_max: 0.5, part2_max: 1.2, max: 2.5 },
        zearalenona: { min: 0, part1_max: 35, part2_max: 140, max: 320 }
    },
    chicken: {
        aflatoxina: { min: 0, part1_max: 24, part2_max: 130, max: 310 },
        fumonisina: { min: 0, part1_max: 3, part2_max: 6.5, max: 12.5 },
        ocratoxina: { min: 0, part1_max: 65, part2_max: 170, max: 350 },
        toxina_t2: { min: 0, part1_max: 50, part2_max: 150, max: 300 },
        vomitoxina: { min: 0, part1_max: 0.7, part2_max: 2.1, max: 4.5 },
        zearalenona: { min: 0, part1_max: 700, part2_max: 1400, max: 2600 }
    },
    hen: {
        aflatoxina: { min: 0, part1_max: 20, part2_max: 125, max: 305 },
        fumonisina: { min: 0, part1_max: 2.5, part2_max: 6, max: 12 },
        ocratoxina: { min: 0, part1_max: 35, part2_max: 140, max: 320 },
        toxina_t2: { min: 0, part1_max: 50, part2_max: 150, max: 300 },
        vomitoxina: { min: 0, part1_max: 0.65, part2_max: 1.7, max: 3.5 },
        zearalenona: { min: 0, part1_max: 498, part2_max: 501, max: 2400 }
    },
    pigs: {
        aflatoxina: { min: 0, part1_max: 30, part2_max: 170, max: 410 },
        fumonisina: { min: 0, part1_max: 1.4, part2_max: 4.2, max: 9 },
        ocratoxina: { min: 0, part1_max: 40, part2_max: 180, max: 420 },
        toxina_t2: { min: 0, part1_max: 50, part2_max: 150, max: 300 },
        vomitoxina: { min: 0, part1_max: 0.3, part2_max: 1, max: 2.2 },
        zearalenona: { min: 0, part1_max: 80, part2_max: 290, max: 650 }
    }
};

export const SPECIES_LABELS = [
    { key: 'betail', label: 'Ganado Vacuno (Bétail)' },
    { key: 'chicken', label: 'Pollo de Engorde (Chicken)' },
    { key: 'hen', label: 'Gallina Ponedora (Hen)' },
    { key: 'pigs', label: 'Cerdos / Porcinos (Pigs)' }
];
