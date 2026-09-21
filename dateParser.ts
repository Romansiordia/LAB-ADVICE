/**
 * Parser de fechas flexible y universal para archivos CSV y Excel.
 * Soporta formatos de fecha en español e inglés:
 * - DD/MM/YYYY, D/M/YYYY (ej. 26/10/2023, 1/8/2026)
 * - MM/DD/YYYY, M/D/YYYY (ej. 8/1/2026 como Agosto 1)
 * - YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
 * - DD-MM-YYYY, D-M-YYYY
 * - Nombres de meses en español e inglés (ej. 1-ago-2026, 01/Aug/2026, 1 de agosto de 2026)
 * - Seriales numéricos de Excel (números o texto, ej. 46235)
 * - Años de 2 y 4 dígitos (ej. 8/1/26 -> 2026)
 * - Fechas con horas/minutos adjuntos (ej. 8/1/2026 14:30:00 o ISO con T)
 */

export const SPANISH_ENGLISH_MONTHS: Record<string, number> = {
    ene: 0, enero: 0, jan: 0, january: 0,
    feb: 1, febrero: 1, february: 1,
    mar: 2, marzo: 2, march: 2,
    abr: 3, abril: 3, apr: 3, april: 3,
    may: 4, mayo: 4,
    jun: 5, junio: 5, june: 5,
    jul: 6, julio: 6, july: 6,
    ago: 7, agosto: 7, aug: 7, august: 7,
    sep: 8, sept: 8, set: 8, septiembre: 8, september: 8,
    oct: 9, octubre: 9, october: 9,
    nov: 10, noviembre: 10, november: 10,
    dic: 11, diciembre: 11, dec: 11, december: 11
};

export const excelSerialDateToJSDate = (serial: number): Date => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; 
    const date_info = new Date(utc_value * 1000);
    return new Date(Date.UTC(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate()));
};

/**
 * Inspecciona un lote de fechas del archivo para inferir de manera inteligente
 * si el formato ambiguo (ej. 8/1/2026 vs 8/4/2026) corresponde a Mes/Día o Día/Mes.
 */
export const detectDateFormat = (rawDates: (string | number | null | undefined)[]): 'DMY' | 'MDY' => {
    let hasPart1Over12 = false;
    let hasPart2Over12 = false;
    const p1Values = new Set<number>();
    const p2Values = new Set<number>();

    for (const item of rawDates) {
        if (!item) continue;
        const str = String(item).trim().split(/[ T]/)[0];
        const m = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
        if (m) {
            const p1 = parseInt(m[1], 10);
            const p2 = parseInt(m[2], 10);
            if (p1 > 12) hasPart1Over12 = true;
            if (p2 > 12) hasPart2Over12 = true;
            p1Values.add(p1);
            p2Values.add(p2);
        }
    }

    if (hasPart1Over12) return 'DMY'; // ej. 26/10/2023 -> primer número > 12 es Día
    if (hasPart2Over12) return 'MDY'; // ej. 10/26/2023 -> segundo número > 12 es Día

    // Si ambos son <= 12 (ej. 8/1/2026 y 8/4/2026):
    // Si p1 es constante (8 en todas) y p2 varía (1, 4, etc.), p1 es el Mes (Agosto) y p2 es el Día.
    if (p1Values.size === 1 && p2Values.size > 1) return 'MDY';
    if (p2Values.size === 1 && p1Values.size > 1) return 'DMY';

    // Por defecto en entornos de habla hispana: Día/Mes/Año
    return 'DMY';
};

/**
 * Parsea una fecha en cualquier formato común y devuelve un Date UTC normalizado.
 */
export const parseFlexibleDate = (
    dateInput: any, 
    preferredOrder: 'DMY' | 'MDY' | 'AUTO' = 'AUTO'
): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;

    // 1. Número serial de Excel (ej. 46235)
    if (typeof dateInput === 'number' && dateInput > 1) {
        return excelSerialDateToJSDate(dateInput);
    }

    let str = String(dateInput).trim();
    if (!str) return null;

    // 2. Serial de Excel representado como texto (ej. "46235")
    if (/^\d{4,5}(\.\d+)?$/.test(str)) {
        const num = parseFloat(str);
        if (num > 1000 && num < 100000) {
            return excelSerialDateToJSDate(num);
        }
    }

    // Remover hora si está presente al final (ej. "8/1/2026 14:30:00" o "2026-08-01T14:30:00")
    const cleanStr = str.replace(/T\d{2}:\d{2}(?::\d{2})?.*$/, '').replace(/\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s*m\.?)?$/i, '').trim();

    // 3. Formato ISO estándar: YYYY-MM-DD o YYYY/MM/DD o YYYY.MM.DD
    const isoMatch = cleanStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-](\d{1,2})$/);
    if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        const month = parseInt(isoMatch[2], 10) - 1;
        const day = parseInt(isoMatch[3], 10);
        if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return new Date(Date.UTC(year, month, day));
        }
    }

    // 4. Con nombre de mes en texto: ej. "1-ago-2026", "01/Aug/2026", "1 de agosto de 2026", "Ago-01-2026"
    const textMonthMatch = cleanStr.match(/^(\d{1,2})(?:[\s\/\-\.]+|(?:\s+de\s+))([a-záéíóú]+)(?:[\s\/\-\.]+|(?:\s+(?:del?\s+)?))(\d{2,4})$/i);
    if (textMonthMatch) {
        const day = parseInt(textMonthMatch[1], 10);
        const monthKey = textMonthMatch[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let year = parseInt(textMonthMatch[3], 10);
        if (year < 100) year += (year > 50 ? 1900 : 2000);
        if (monthKey in SPANISH_ENGLISH_MONTHS && day >= 1 && day <= 31) {
            return new Date(Date.UTC(year, SPANISH_ENGLISH_MONTHS[monthKey], day));
        }
    }

    // 5. Formato delimitado por barras, guiones o puntos: p1 / p2 / p3
    const slashMatch = cleanStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
        const p1 = parseInt(slashMatch[1], 10);
        const p2 = parseInt(slashMatch[2], 10);
        let year = parseInt(slashMatch[3], 10);
        if (year < 100) year += (year > 50 ? 1900 : 2000);

        let day = p1;
        let month = p2 - 1;

        if (p1 > 12) {
            // Primer número no puede ser mes -> DD/MM/YYYY
            day = p1;
            month = p2 - 1;
        } else if (p2 > 12) {
            // Segundo número no puede ser mes -> MM/DD/YYYY
            day = p2;
            month = p1 - 1;
        } else if (preferredOrder === 'MDY') {
            day = p2;
            month = p1 - 1;
        } else {
            // Por defecto en DMY
            day = p1;
            month = p2 - 1;
        }

        if (year >= 1900 && year <= 2100 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const date = new Date(Date.UTC(year, month, day));
            if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                return date;
            }
        }
    }

    // 6. Intento de respaldo con Date nativo
    const fallback = new Date(cleanStr);
    if (!isNaN(fallback.getTime())) {
        return fallback;
    }

    return null;
};
