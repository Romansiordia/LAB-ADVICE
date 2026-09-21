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
 * Mapeo de alias comunes de cabeceras en español e inglés.
 * Se evitan intencionalmente abreviaturas ambiguas de 1 o 2 letras (como P, CA, CP, PB, EE, FC, FB, CZ)
 * para evitar que columnas de datos (como Peso Bruto, Código Postal, Factura, Fecha de Carga o Planta)
 * sean interpretadas erróneamente como nutrientes.
 */
export const COLUMN_ALIASES: Record<string, string[]> = {
    date: ['date', 'fecha', 'fec', 'dia', 'time', 'timestamp'],
    material: ['material', 'materia_prima', 'materiaprima', 'producto', 'item', 'ingrediente', 'commodity'],
    subtipo: ['subtipo', 'sub_tipo', 'sub_type', 'tipo', 'type', 'presentacion'],
    lote: ['lote', 'batch', 'lot', 'no_lote', 'numero_lote', 'num_lote'],
    Cliente: ['cliente', 'client', 'customer'],
    Proveedor: ['proveedor', 'supplier', 'vendor', 'prov'],
    Origen: ['origen', 'origin', 'procedencia', 'pais'],
    noId: ['no_id', 'noid', 'id_muestra', 'id_sample', 'muestra', 'sample_id', 'codigo_muestra', 'id'],
    
    // Nutrientes (nombres claros y unívocos)
    proteina: ['proteina', 'protein', 'proteina_cruda', 'crude_protein', 'prot'],
    humedad: ['humedad', 'moisture', 'hum', 'hmd'],
    grasa: ['grasa', 'fat', 'grasas', 'extracto_etereo', 'grasa_cruda', 'crude_fat'],
    fibra: ['fibra', 'fiber', 'fibra_cruda', 'crude_fiber'],
    ceniza: ['ceniza', 'cenizas', 'ash'],
    almidon: ['almidon', 'starch'],
    calcio: ['calcio', 'calcium'],
    fosforo: ['fosforo', 'phosphorus'],
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
 * Normaliza nombres de materiales (ej. "Maíz" -> "Maiz") SIN colapsar productos distintos
 * (ej. "Gluten de Maiz", "DDGS de Maiz", "Germen de Maiz", "Harina de Soya" deben conservar su identidad propia
 * para no mezclar materias primas con valores nutricionales drásticamente distintos en la misma gráfica).
 */
export const normalizeMaterialName = (name: string): string => {
    if (!name) return 'Desconocido';
    let clean = String(name).trim();

    // Reparar posibles caracteres corruptos por codificación ANSI/Latin
    clean = clean.replace(/ma\uFFFDz/gi, 'Maíz').replace(/so\uFFFDa/gi, 'Soya');

    // Normalizar sólo si el nombre del producto es exclusivamente el grano/materia base
    if (/^ma[ií]z$/i.test(clean)) return 'Maiz';
    if (/^so[yj]a$/i.test(clean)) return 'Soya';
    if (/^c[aá]nola$/i.test(clean)) return 'Canola';
    if (/^ddgs$/i.test(clean)) return 'DDGS';
    if (/^sorgo$/i.test(clean)) return 'Sorgo';

    // Conservar nombres compuestos intactos (ej. "Gluten de Maiz", "DDGS Maiz", "Harina de Soya", "Maiz Grano")
    return clean;
};
