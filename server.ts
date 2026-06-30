import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsers with limits
  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini API with named parameter and proper User-Agent header
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route: AI analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt, material, dataSummary, chatHistory } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "El prompt es requerido." });
      }

      // Format the system instruction with rich context about the materials data
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

      // Formulate the conversation history
      const contents = [];
      
      if (chatHistory && Array.isArray(chatHistory)) {
        for (const msg of chatHistory) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          });
        }
      }
      
      // Add current user prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Error calling Gemini API:", error);
      res.status(500).json({ 
        error: "Ocurrió un error al procesar tu solicitud con el asistente de IA.",
        details: error?.message || String(error)
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch(console.error);
