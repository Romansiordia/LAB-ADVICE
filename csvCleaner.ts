/**
 * Utilidades para decodificación, limpieza de cabeceras y detección de desfasamientos en CSV/Excel.
 */

/**
 * Decodifica un buffer binario detectando automáticamente si viene en UTF-8 o Windows-1252 (ANSI/Latin1).
 * Esto evita que caracteres como "Maíz" se conviertan en "Maz".
 */
export const decodeFileBuffer = (buffer: ArrayBuffer): string => {
    try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
        const text = utf8Decoder.decode(buffer);
        // Si contiene el carácter de reemplazo  (\uFFFD), es altamente probable que sea Windows-1252 o ISO-8859-1
        if (text.includes('\uFFFD')) {
            try {
                const winDecoder = new TextDecoder('windows-1252', { fatal: false });
                return winDecoder.decode(buffer);
            } catch {
                const latinDecoder = new TextDecoder('iso-8859-1', { fatal: false });
                return latinDecoder.decode(buffer);
            }
        }
        return text;
    } catch {
        return '';
    }
};

/**
 * Normaliza nombres de cabeceras eliminando tildes, caracteres raros, mayúsculas y espacios.
 * Ejemplo: "Proteína (%)" -> "proteina", "ID Muestra" -> "id_muestra", "Almidón" -> "almidon"
 */
export const normalizeHeaderKey = (key: string): string => {
    return String(key || '')
        .trim()
        .replace(/^\uFEFF/, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita tildes
        .replace(/[\s_\.\-\(\)\%\/]+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .replace(/^_+|_+$/g, '');
};

/**
 * Mapeo de alias comunes de cabeceras en español e inglés
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
    date: ['date', 'fecha', 'fec', 'dia', 'time', 'timestamp'],
    material: ['material', 'materia_prima', 'materiaprima', 'producto', 'item', 'ingrediente', 'commodity'],
    subtipo: ['subtipo', 'sub_tipo', 'sub_type', 'tipo', 'type', 'presentacion'],
    lote: ['lote', 'batch', 'lot', 'no_lote', 'numero_lote', 'num_lote'],
    Cliente: ['cliente', 'client', 'customer'],
    Proveedor: ['proveedor', 'supplier', 'vendor', 'prov'],
    Origen: ['origen', 'origin', 'procedencia', 'pais'],
    noId: ['no_id', 'noid', 'id', 'id_muestra', 'muestra', 'sample_id', 'codigo', 'no'],
    
    // Nutrientes
    proteina: ['proteina', 'protein', 'cp', 'pb', 'prot'],
    humedad: ['humedad', 'moisture', 'hum', 'hmd'],
    grasa: ['grasa', 'fat', 'ee', 'grasas', 'extracto_etereo'],
    fibra: ['fibra', 'fiber', 'fc', 'fb', 'fibra_cruda'],
    ceniza: ['ceniza', 'cenizas', 'ash', 'cz'],
    almidon: ['almidon', 'starch'],
    calcio: ['calcio', 'ca', 'calcium'],
    fosforo: ['fosforo', 'p', 'phosphorus'],
    fda: ['fda', 'adf'],
    fdn: ['fdn', 'ndf'],
    pdi: ['pdi'],
    tamano_particula: ['tamano_particula', 'tamano_de_particula', 'particle_size', 'granulometria'],

    // Micotoxinas
    aflatoxina: ['aflatoxina', 'aflatoxin', 'afla', 'afb1'],
    ocratoxina: ['ocratoxina', 'ochratoxin', 'ocra', 'ota'],
    zearalenona: ['zearalenona', 'zearalenone', 'zea', 'zen'],
    fumonisina: ['fumonisina', 'fumonisin', 'fumo', 'fb1'],
    vomitoxina: ['vomitoxina', 'vomitoxin', 'don'],
    toxina_t2: ['toxina_t2', 'toxinat2', 't2', 't2_toxin', 't_2']
};

/**
 * Normaliza nombres de materiales (ej. "Maíz" o "Maz" -> "Maiz")
 */
export const normalizeMaterialName = (name: string): string => {
    if (!name) return 'Desconocido';
    const clean = String(name).trim();
    if (/ma[ií\uFFFD]z/i.test(clean)) return 'Maiz';
    if (/soya|soja/i.test(clean)) return 'Soya';
    if (/canola/i.test(clean)) return 'Canola';
    if (/ddgs/i.test(clean)) return 'DDGS';
    if (/sorgo/i.test(clean)) return 'Sorgo';
    return clean;
};

/**
 * Detecta si una fila tiene desfasamiento de 1 columna:
 * Proteína quedó vacía (porque tomó una celda vacía de Origen/Proveedor),
 * Humedad tomó el valor de Proteína (~7-9),
 * Grasa tomó el valor de Humedad (~12-15),
 * Fibra tomó el valor de Grasa (~3-5),
 * Ceniza tomó el valor de Fibra (~2).
 */
export const fixPotentialColumnShift = (newRow: Record<string, any>): boolean => {
    const hasNoProtein = newRow.proteina === undefined || newRow.proteina === null;
    const hasMoisture = typeof newRow.humedad === 'number' && !isNaN(newRow.humedad);
    const hasFat = typeof newRow.grasa === 'number' && !isNaN(newRow.grasa);

    // Si proteína está vacía pero humedad tiene valor de proteína (ej. 7.88)
    // y grasa tiene un valor típico de humedad (ej. 13.36 en granos/alimentos donde humedad > 9 y grasa > 9):
    if (hasNoProtein && hasMoisture && hasFat && newRow.grasa > newRow.humedad && newRow.grasa >= 9) {
        const valProteina = newRow.humedad;
        const valHumedad = newRow.grasa;
        const valGrasa = newRow.fibra !== undefined ? newRow.fibra : undefined;
        const valFibra = newRow.ceniza !== undefined ? newRow.ceniza : undefined;
        const valCeniza = newRow.almidon !== undefined ? newRow.almidon : undefined;

        newRow.proteina = valProteina;
        newRow.humedad = valHumedad;
        if (valGrasa !== undefined) newRow.grasa = valGrasa;
        if (valFibra !== undefined) newRow.fibra = valFibra;
        if (valCeniza !== undefined) newRow.ceniza = valCeniza;
        return true;
    }
    return false;
};
