import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { GoogleGenAI } from '@google/genai';

function apiPlugin(apiKey: string) {
  return {
    name: 'api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/analyze', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { prompt, material, dataSummary, chatHistory } = JSON.parse(body);
            if (!prompt) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: "El prompt es requerido." }));
              return;
            }

            if (!apiKey) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: "Clave de API no configurada",
                details: "Falta la configuración de la clave API de Gemini. Por favor, añada GEMINI_API_KEY en la sección 'Secrets' de AI Studio (menú superior derecho) y reinicie el servidor de desarrollo."
              }));
              return;
            }

            const ai = new GoogleGenAI({
              apiKey: apiKey,
              httpOptions: {
                headers: {
                  'User-Agent': 'aistudio-build',
                }
              }
            });

            const systemInstruction = `
Eres un asistente de Inteligencia Artificial experto en nutrición animal, control de calidad pecuaria y análisis de materias primas de laboratorio.
El usuario está interactuando con un Dashboard interactivo de calidad de materias primas (como Soya, Maíz, Canola, DDGS, etc.).
Tu objetivo es analizar los datos provistos y responder las preguntas del usuario de forma profesional, clara, accionable y con precisión científica.

Contexto actual:
- Material seleccionado actualmente: ${material || 'Ninguno'}
- Resumen estadístico de los datos actuales del material:
${JSON.stringify(dataSummary, null, 2)}

Instrucciones para las respuestas:
1. Sé conciso pero sumamente profesional y técnico cuando se requiera. Usa un lenguaje claro y en español.
2. Si te preguntan sobre anomalías o riesgos de micotoxinas, compáralos con los límites comunes en la industria o los datos de referencia provistos.
3. Puedes sugerir ajustes en la formulación de alimentos o recomendar auditorías a proveedores si detectas problemas de calidad recurrentes.
4. Si el usuario te pide que hagas cálculos complicados, explícales paso a paso el resultado de tu análisis.
5. Formatea tus respuestas usando Markdown limpio (listas, negritas, tablas simples si es necesario) para que sea agradable de leer.
6. Nunca menciones la clave de API de Gemini ni detalles de infraestructura de servidores.
7. Trata de mantener tus respuestas enfocadas en los datos reales mostrados en el resumen estadístico siempre que sea posible.
            `;

            const contents = [];
            if (chatHistory && Array.isArray(chatHistory)) {
              for (const msg of chatHistory) {
                contents.push({
                  role: msg.role === 'user' ? 'user' : 'model',
                  parts: [{ text: msg.content }]
                });
              }
            }

            contents.push({
              role: 'user',
              parts: [{ text: prompt }]
            });

            const response = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: contents,
              config: {
                systemInstruction: systemInstruction,
                temperature: 0.7,
              }
            });

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ text: response.text }));
          } catch (error: any) {
            console.error("Error calling Gemini API in dev plugin:", error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: "Ocurrió un error al procesar tu solicitud con el asistente de IA.",
              details: error?.message || String(error)
            }));
          }
        });
      });

      server.middlewares.use('/api/login', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: any) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const { username, password } = JSON.parse(body || '{}');
            if (!username || !password) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Usuario y contraseña son requeridos.' }));
              return;
            }

            const cleanUsername = username.trim().toLowerCase();
            const cleanPassword = password.trim();

            const fallbackUsers = [
              { usuario: 'admin', contrasena: 'admin123', nombre: 'Administrador' },
              { usuario: 'romansiordias@gmail.com', contrasena: 'lab123', nombre: 'Román Siordia' }
            ];

            const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL || process.env.GOOGLE_SHEETS_CSV_URL;

            if (!sheetUrl) {
              const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
              if (found) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  user: { nombre: found.nombre, usuario: found.usuario },
                  message: 'Autenticado con credenciales de prueba (GOOGLE_SHEET_CSV_URL no configurado).'
                }));
                return;
              }
              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'Credenciales incorrectas (modo de prueba activo).' }));
              return;
            }

            let csvText = '';
            try {
              const fetchResponse = await fetch(sheetUrl);
              if (!fetchResponse.ok) {
                throw new Error(`Google Sheets respondió con código ${fetchResponse.status}`);
              }
              csvText = await fetchResponse.text();
            } catch (fetchErr: any) {
              console.error('Error al descargar Google Sheet CSV:', fetchErr);
              const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
              if (found) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  user: { nombre: found.nombre, usuario: found.usuario },
                  message: 'Autenticado con credenciales de prueba (Fallo al descargar la hoja de cálculo).'
                }));
                return;
              }
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'No se pudo conectar con la base de datos de Google Sheets.',
                details: fetchErr.message
              }));
              return;
            }

            const lines = csvText.split(/\r?\n/);
            if (lines.length === 0 || !lines[0]) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'La hoja de cálculo está vacía o es inválida.' }));
              return;
            }

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

            const normalizeKey = (key: string): string => {
              return key
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');
            };

            const headers = parseCSVLine(lines[0]).map(normalizeKey);
            const userIdx = headers.findIndex(h => h.includes('usuario') || h.includes('user') || h.includes('email'));
            const passIdx = headers.findIndex(h => h.includes('contrasena') || h.includes('password') || h.includes('pass'));
            const nameIdx = headers.findIndex(h => h.includes('nombre') || h.includes('name'));

            if (userIdx === -1 || passIdx === -1) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                error: 'Formato de Google Sheet incorrecto.',
                details: 'La hoja debe contener al menos las columnas: "usuario" y "contraseña".'
              }));
              return;
            }

            let authenticatedUser = null;

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cols = parseCSVLine(line);
              const rowUser = (cols[userIdx] || '').toLowerCase().trim();
              const rowPass = (cols[passIdx] || '').trim();
              const rowName = nameIdx !== -1 ? (cols[nameIdx] || '').trim() : '';

              if (rowUser === cleanUsername && rowPass === cleanPassword) {
                authenticatedUser = {
                  usuario: rowUser,
                  nombre: rowName || rowUser
                };
                break;
              }
            }

            if (authenticatedUser) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                user: authenticatedUser
              }));
            } else {
              const found = fallbackUsers.find(u => u.usuario === cleanUsername && u.contrasena === cleanPassword);
              if (found) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  user: { nombre: found.nombre, usuario: found.usuario },
                  message: 'Autenticado con credenciales de prueba.'
                }));
                return;
              }

              res.statusCode = 401;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                error: 'Usuario o contraseña incorrectos.'
              }));
            }
          } catch (error: any) {
            console.error('Error in local login route:', error);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: 'Error interno del servidor.',
              details: error?.message || String(error)
            }));
          }
        });
      });
    }
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const geminiKey = env.GEMINI_API_KEY || '';
    
    // Propagate sheet url to process.env in development server context
    const sheetUrl = env.GOOGLE_SHEET_CSV_URL || env.GOOGLE_SHEETS_CSV_URL || '';
    process.env.GOOGLE_SHEET_CSV_URL = sheetUrl;
    process.env.GOOGLE_SHEETS_CSV_URL = sheetUrl;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), apiPlugin(geminiKey)],
      define: {
        'process.env.API_KEY': JSON.stringify(geminiKey),
        'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
