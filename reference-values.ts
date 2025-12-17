
// Diccionario de valores de referencia estándar (min/max) para validación de calidad.
// Estructura: 'Materia Prima': { 'nutriente': { min: number, max: number } }

export const REFERENCE_VALUES: Record<string, Record<string, { min: number; max: number }>> = {
    'Soya': {
        'proteina': { min: 45.0, max: 48.0 },
        'humedad': { min: 10.5, max: 12.5 },
        'grasa': { min: 1.0, max: 2.5 },
        'fibra': { min: 3.0, max: 4.0 },
        'ceniza': { min: 5.0, max: 6.5 },
    },
    'Maiz': {
        'proteina': { min: 7.5, max: 9.0 },
        'humedad': { min: 13.0, max: 15.0 },
        'grasa': { min: 3.0, max: 4.5 },
        'fibra': { min: 1.8, max: 2.5 },
        'ceniza': { min: 1.0, max: 2.0 },
        'almidon': { min: 68.0, max: 74.0 },
    },
    'Canola': {
        'proteina': { min: 35.0, max: 38.0 },
        'humedad': { min: 9.0, max: 11.0 },
        'grasa': { min: 2.0, max: 4.0 },
        'fibra': { min: 10.0, max: 13.0 },
    },
    'DDGS': {
        'proteina': { min: 26.0, max: 29.0 },
        'humedad': { min: 9.0, max: 12.0 },
        'grasa': { min: 8.0, max: 11.0 },
        'fibra': { min: 6.0, max: 8.0 },
    },
    'Sorgo': {
        'proteina': { min: 8.5, max: 10.5 },
        'humedad': { min: 12.0, max: 14.0 },
    }
};
