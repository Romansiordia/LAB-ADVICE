/**
 * Servicio para transformar y sincronizar hojas de Google Sheets directamente
 * sin necesidad de credenciales complejas o API keys de Google Cloud.
 */

/**
 * Convierte cualquier enlace estándar de Google Sheets a la URL directa de exportación CSV.
 * Soporta:
 * - Enlaces normales de edición: https://docs.google.com/spreadsheets/d/{ID}/edit...
 * - Enlaces compartidos: https://docs.google.com/spreadsheets/d/{ID}/edit?usp=sharing
 * - Enlaces con pestaña específica: https://docs.google.com/spreadsheets/d/{ID}/edit#gid=123456
 * - Enlaces publicados en la web: https://docs.google.com/spreadsheets/d/e/{ID}/pubhtml o /pub?output=csv
 * - Enlaces que ya son CSV directo
 */
export function convertGoogleSheetUrlToCsv(rawUrl: string): string {
    const url = (rawUrl || '').trim();
    if (!url) return '';

    // Si ya es un endpoint de exportación CSV directo
    if (url.includes('output=csv') || url.includes('export?format=csv') || url.includes('/gviz/tq?tqx=out:csv')) {
        return url;
    }

    // Enlace publicado en la web (docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml)
    if (url.includes('/d/e/2PACX-')) {
        const base = url.split('/pub')[0];
        // Conservar gid si está presente
        const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        return `${base}/pub?output=csv${gidParam}`;
    }

    // Enlace estándar de Google Sheets (/spreadsheets/d/{SPREADSHEET_ID}/...)
    const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) {
        const sheetId = idMatch[1];
        // Extraer pestaña específica (gid) si fue seleccionada
        const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
        const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
    }

    // Si no coincide con un formato conocido pero es una URL, intentar devolverla
    return url;
}

/**
 * Descarga el contenido CSV de la hoja de Google Sheets.
 * Primero intenta conexión directa. Si el navegador bloquea por CORS o política de red,
 * recurre al proxy seguro (/api/proxy-sheet) garantizando que funcione en Vercel, Cloud Run y local.
 */
export async function fetchGoogleSheetCsv(rawUrl: string): Promise<string> {
    const csvUrl = convertGoogleSheetUrlToCsv(rawUrl);
    if (!csvUrl) {
        throw new Error('La URL proporcionada no es un enlace válido de Google Sheets.');
    }

    let directError: any = null;

    // 1. Intento directo con el endpoint gviz de Google (permite CORS público)
    try {
        const response = await fetch(csvUrl, {
            method: 'GET',
            headers: {
                'Accept': 'text/csv, text/plain, */*'
            }
        });

        if (response.ok) {
            const text = await response.text();
            // Verificar que no sea una página de error o HTML de login de Google
            if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
                return text;
            }
            // Si devolvió HTML es porque la hoja es privada y Google pide inicio de sesión
            throw new Error('La hoja de Google Sheets parece ser privada. Asegúrate de configurarla en "Cualquier persona con el enlace puede leer".');
        } else if (response.status === 401 || response.status === 403) {
            throw new Error('Acceso denegado (403). La hoja de cálculo es privada. En Google Sheets, ve a Compartir y selecciona "Cualquier persona con el enlace puede leer".');
        } else if (response.status === 404) {
            throw new Error('Hoja no encontrada (404). Verifica que el enlace sea correcto y que el archivo exista en Google Drive.');
        } else {
            directError = new Error(`Error ${response.status} de Google Sheets.`);
        }
    } catch (err: any) {
        directError = err;
    }

    // 2. Respaldo a través del proxy del servidor (/api/proxy-sheet)
    try {
        const proxyUrl = `/api/proxy-sheet?url=${encodeURIComponent(csvUrl)}`;
        const proxyResponse = await fetch(proxyUrl);

        if (proxyResponse.ok) {
            const text = await proxyResponse.text();
            if (text && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
                return text;
            }
            throw new Error('La hoja respondió con una página web en vez de datos CSV. Comprueba los permisos de lectura en Google Sheets.');
        } else {
            const errData = await proxyResponse.json().catch(() => ({}));
            throw new Error(errData.error || `Error ${proxyResponse.status} en la conexión con Google Sheets.`);
        }
    } catch (proxyErr: any) {
        // Reportar el mensaje más descriptivo posible
        if (directError && directError.message && directError.message.includes('Cualquier persona con el enlace')) {
            throw directError;
        }
        throw new Error(proxyErr.message || directError?.message || 'No fue posible descargar los datos de Google Sheets.');
    }
}
