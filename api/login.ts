export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Fallback credentials for testing/out-of-the-box experience
    const fallbackUsers = [
      { usuario: 'admin', contrasena: 'admin123', nombre: 'Administrador', allowedClients: ['TODOS'] },
      { usuario: 'romansiordias@gmail.com', contrasena: 'lab123', nombre: 'Román Siordia', allowedClients: ['TODOS'] },
      { usuario: 'salvador@empresa.com', contrasena: 'salvador123', nombre: 'Salvador Aldrete', allowedClients: ['SALVADOR ALDRETE IBARRA'] }
    ];

    const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL || process.env.GOOGLE_SHEETS_CSV_URL;

    if (!sheetUrl) {
      // If no Google Sheet URL is configured, use fallback credentials
      const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
      if (found) {
        return res.status(200).json({
          success: true,
          user: { 
            nombre: found.nombre, 
            usuario: found.usuario,
            allowedClients: found.allowedClients 
          },
          message: 'Autenticado con credenciales de prueba (GOOGLE_SHEET_CSV_URL no configurado).'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Credenciales incorrectas (modo de prueba activo).'
      });
    }

    // Fetch the published Google Sheets CSV
    let csvText = '';
    try {
      const response = await fetch(sheetUrl);
      if (!response.ok) {
        throw new Error(`Google Sheets respondió con código ${response.status}`);
      }
      csvText = await response.text();
    } catch (fetchErr: any) {
      console.error('Error al descargar Google Sheet CSV:', fetchErr);
      // Fallback if sheet download fails
      const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
      if (found) {
        return res.status(200).json({
          success: true,
          user: { 
            nombre: found.nombre, 
            usuario: found.usuario,
            allowedClients: found.allowedClients 
          },
          message: 'Autenticado con credenciales de prueba (Fallo al descargar la hoja de cálculo).'
        });
      }
      return res.status(500).json({
        error: 'No se pudo conectar con la base de datos de Google Sheets.',
        details: fetchErr.message
      });
    }

    // Simple and robust CSV Parser
    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0 || !lines[0]) {
      return res.status(500).json({ error: 'La hoja de cálculo está vacía o es inválida.' });
    }

    // Helper to split CSV line respecting quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current);
      return result.map(val => val.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    };

    // Normalize header names to avoid issues with spacing, cases or accents
    const normalizeKey = (key: string): string => {
      return key
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Removes accents: 'contraseña' -> 'contrasena'
    };

    const headers = parseCSVLine(lines[0]).map(normalizeKey);

    // Identify indexes for username, password, name, and allowed clients columns
    // Support Spanish and English headers
    const userIdx = headers.findIndex(h => h.includes('usuario') || h.includes('user') || h.includes('email'));
    const passIdx = headers.findIndex(h => h.includes('contrasena') || h.includes('password') || h.includes('pass'));
    const nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'));
    const clientsIdx = headers.findIndex(h => 
      h.includes('cliente') || 
      h.includes('client') || 
      h.includes('empresa') || 
      h.includes('allowed') || 
      h.includes('acceso')
    );

    if (userIdx === -1 || passIdx === -1) {
      return res.status(500).json({
        error: 'Formato de Google Sheet incorrecto.',
        details: 'La hoja debe contener al menos las columnas: "usuario" y "contraseña".'
      });
    }

    // Helper to parse allowed clients string
    const parseAllowedClients = (raw: string): string[] => {
      if (!raw || !raw.trim()) return ['TODOS'];
      const trimmed = raw.trim();
      const lower = trimmed.toLowerCase();
      if (['todos', 'all', '*', 'admin', 'completo'].includes(lower)) {
        return ['TODOS'];
      }
      const parts = trimmed.split(/[,;|]+/).map(p => p.trim()).filter(Boolean);
      return parts.length > 0 ? parts : ['TODOS'];
    };

    let authenticatedUser: { nombre: string; usuario: string; allowedClients: string[] } | null = null;

    // Iterate over rows to find a matching user
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = parseCSVLine(line);
      const rowUser = (cols[userIdx] || '').toLowerCase().trim();
      const rowPass = (cols[passIdx] || '').trim();
      const rowName = nameIdx !== -1 ? (cols[nameIdx] || '').trim() : '';
      const rawClients = clientsIdx !== -1 ? (cols[clientsIdx] || '').trim() : '';

      if (rowUser === cleanUsername && rowPass === cleanPassword) {
        authenticatedUser = {
          usuario: rowUser,
          nombre: rowName || rowUser,
          allowedClients: parseAllowedClients(rawClients)
        };
        break;
      }
    }

    if (authenticatedUser) {
      return res.status(200).json({
        success: true,
        user: authenticatedUser
      });
    } else {
      // Also try fallback users just in case the Sheet is configured but the owner is testing their account
      const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
      if (found) {
        return res.status(200).json({
          success: true,
          user: { 
            nombre: found.nombre, 
            usuario: found.usuario,
            allowedClients: found.allowedClients 
          },
          message: 'Autenticado con credenciales de prueba.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Usuario o contraseña incorrectos.'
      });
    }

  } catch (error: any) {
    console.error('Error in login endpoint:', error);
    return res.status(500).json({
      error: 'Error interno del servidor.',
      details: error?.message || String(error)
    });
  }
}
