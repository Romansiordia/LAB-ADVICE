/**
 * Vercel Serverless Function: Proxy para descargar Google Sheets
 * Evita bloqueos de CORS y permite que Vercel descargue la hoja de cálculo
 * de forma confiable directamente desde los servidores de Google.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'El parámetro "url" es requerido.' });
  }

  // Validar que la URL apunte a dominios oficiales de Google Sheets
  if (!url.includes('docs.google.com/spreadsheets') && !url.includes('googleusercontent.com')) {
    return res.status(400).json({ error: 'URL no permitida. Solo se admiten enlaces de Google Sheets.' });
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (compatible; LabQualityDashboard/1.0)'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return res.status(403).json({
          error: 'Acceso denegado (403). La hoja de cálculo es privada. En Google Sheets, ve a Compartir y selecciona "Cualquier persona con el enlace puede ser lector".'
        });
      }
      return res.status(response.status).json({
        error: `Google Sheets respondió con código de estado ${response.status}.`
      });
    }

    const text = await response.text();

    if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
      return res.status(400).json({
        error: 'Google devolvió una página HTML en vez de datos CSV. Verifica que la hoja tenga permisos de lectura públicos ("Cualquier persona con el enlace").'
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.status(200).send(text);
  } catch (error: any) {
    console.error('Error en proxy-sheet de Vercel:', error);
    return res.status(500).json({
      error: 'Error de conexión al descargar la hoja de Google Sheets.',
      details: error?.message || String(error)
    });
  }
}
