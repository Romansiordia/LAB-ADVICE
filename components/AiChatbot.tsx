import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, X, Trash2, Download, Bot, User, ArrowRightLeft } from 'lucide-react';
import { RawMaterialData } from '../types';
import { NUTRIENTS } from '../constants';
import { REFERENCE_VALUES } from '../reference-values';

declare const marked: any;

interface AiChatbotProps {
  material: string;
  data: RawMaterialData[];
  category: 'nutrients' | 'mycotoxins';
  isGeneratingPdf?: boolean;
  user?: { nombre: string; usuario: string } | null;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AiChatbot: React.FC<AiChatbotProps> = ({ material, data, category, isGeneratingPdf, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUser = user || (() => {
    try {
      const saved = localStorage.getItem('authenticated_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  const userKey = currentUser ? currentUser.usuario : 'anonymous';

  const [queriesUsed, setQueriesUsed] = useState<number>(() => {
    try {
      const savedUser = localStorage.getItem('authenticated_user');
      const usr = savedUser ? JSON.parse(savedUser).usuario : 'anonymous';
      const stored = localStorage.getItem(`ai_queries_user_${usr}`);
      return stored ? parseInt(stored, 10) : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    const usr = user ? user.usuario : 'anonymous';
    const stored = localStorage.getItem(`ai_queries_user_${usr}`);
    setQueriesUsed(stored ? parseInt(stored, 10) : 0);
  }, [user]);

  // Generate dynamic stats summary for the AI context
  const getStatsSummary = () => {
    if (!data || data.length === 0) return { material, totalRecords: 0, parameters: [] };

    const refValues = REFERENCE_VALUES[material] || null;
    const filteredNutrients = NUTRIENTS.filter(n => (n.category || 'nutrients') === category);

    const parameters = filteredNutrients.map(nutrient => {
      const values = data
        .map(d => d[nutrient.key])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v) && v !== 0);

      if (values.length === 0) return null;

      const count = values.length;
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / count;
      const min = Math.min(...values);
      const max = Math.max(...values);

      // Variance & StdDev
      const squaredDiffs = values.map(val => (val - mean) ** 2);
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (count > 1 ? count - 1 : 1);
      const stdDev = Math.sqrt(variance);

      let status = 'normal';
      if (refValues && refValues[nutrient.key]) {
        const range = refValues[nutrient.key];
        if (mean < range.min) status = 'bajo';
        else if (mean > range.max) status = 'alto';
      }

      return {
        label: nutrient.label.replace(' (%)', ''),
        key: nutrient.key,
        promedio: mean.toFixed(2),
        minimo: min.toFixed(2),
        maximo: max.toFixed(2),
        desvEstandar: stdDev.toFixed(2),
        muestras: count,
        estado: status,
      };
    }).filter(p => p !== null);

    // Also extract some high-level info on suppliers if available
    const suppliers: Record<string, { count: number; avgValue: number }> = {};
    data.forEach(d => {
      if (d.Proveedor && typeof d.Proveedor === 'string') {
        if (!suppliers[d.Proveedor]) {
          suppliers[d.Proveedor] = { count: 0, avgValue: 0 };
        }
        suppliers[d.Proveedor].count++;
      }
    });

    return {
      material,
      registrosTotales: data.length,
      categoriaAnalizada: category === 'nutrients' ? 'Nutrientes' : 'Micotoxinas',
      proveedoresIdentificados: Object.keys(suppliers),
      parametros: parameters,
    };
  };

  // Add a welcoming message when the chat starts or material changes
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `¡Hola! Soy tu **Asistente de IA de Control de Calidad**. 🌾🧪\n\nVeo que tienes seleccionado **${material}** con **${data.length}** registros. He analizado el resumen de calidad de la categoría **${category === 'nutrients' ? 'Nutrientes' : 'Micotoxinas'}**.\n\n¿En qué puedo ayudarte hoy? Puedes hacerme preguntas como:\n- *¿Ves alguna anomalía o riesgo en las micotoxinas?*\n- *¿Cuáles son los parámetros nutricionales con mayor desviación?*\n- *¿Qué lote o proveedor muestra el mejor comportamiento de calidad?*`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [material, category, data.length, messages.length]);

  // Reset chat when material or category changes, to provide fresh analysis
  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset-' + Date.now(),
        role: 'assistant',
        content: `He reiniciado el contexto de análisis para **${material}** (${category === 'nutrients' ? 'Nutrientes' : 'Micotoxinas'}).\n\n¿Qué te gustaría analizar de este material?`,
        timestamp: new Date(),
      },
    ]);
    setError(null);
  };

  // Scroll to bottom on new message
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = textToSend || inputValue;
    if (!promptText.trim() || isLoading) return;

    if (queriesUsed >= 3) {
      setError("Has alcanzado el límite de 3 consultas permitidas de IA para tu usuario.");
      return;
    }

    const userMessage: Message = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: promptText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const summary = getStatsSummary();
      const chatHistoryForBackend = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: promptText,
          material: material,
          dataSummary: summary,
          chatHistory: chatHistoryForBackend,
        }),
      });

      if (!response.ok) {
        let errMsg = `Error del servidor (${response.status} ${response.statusText})`;
        try {
          const text = await response.text();
          try {
            const errData = JSON.parse(text);
            if (errData.error) {
              errMsg = `${errData.error}${errData.details ? `: ${errData.details}` : ''}`;
            }
          } catch (_) {
            if (text) {
              errMsg += `: ${text.slice(0, 150)}`;
            }
          }
        } catch (_) {}
        throw new Error(errMsg);
      }

      const resultData = await response.json();

      if (resultData.error) {
        throw new Error(resultData.error);
      }

      // Increment queriesUsed count and persist
      const newCount = queriesUsed + 1;
      setQueriesUsed(newCount);
      localStorage.setItem(`ai_queries_user_${userKey}`, newCount.toString());

      const assistantMessage: Message = {
        id: 'msg-' + (Date.now() + 1),
        role: 'assistant',
        content: resultData.text || 'No pude generar una respuesta clara. Intenta reformular tu pregunta.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (e: any) {
      setError(e.message || 'Error desconocido.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;

    let exportText = `REPORTE DE ASISTENCIA IA - ANÁLISIS DE ${material.toUpperCase()}\n`;
    exportText += `Fecha de generación: ${new Date().toLocaleString()}\n`;
    exportText += `==================================================\n\n`;

    messages.forEach(msg => {
      const roleStr = msg.role === 'user' ? 'USUARIO' : 'ASISTENTE IA';
      exportText += `[${msg.timestamp.toLocaleTimeString()}] ${roleStr}:\n`;
      exportText += `${msg.content.replace(/\*\*/g, '')}\n`;
      exportText += `--------------------------------------------------\n\n`;
    });

    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analisis_ia_${material.toLowerCase()}_${Date.now()}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderMarkdown = (text: string) => {
    if (typeof marked !== 'undefined') {
      try {
        return { __html: marked.parse(text) };
      } catch (e) {
        console.error(e);
      }
    }
    return { __html: text.replace(/\n/g, '<br />') };
  };

  const suggestionChips = [
    { label: '🔍 Analizar micotoxinas', text: 'Haz un diagnóstico detallado de las micotoxinas de este material y detecta posibles niveles críticos.' },
    { label: '📈 Tendencias de Calidad', text: 'Analiza los promedios nutricionales frente a sus referencias e identifícame parámetros con mayor desviación.' },
    { label: '⚠️ Detectar anomalías', text: 'Revisa los datos en busca de valores atípicos, lotes sospechosos o desviaciones fuera de rango.' },
    { label: '⚖️ Comparar proveedores', text: 'Dime cuál proveedor tiene la calidad más homogénea o consistente según los datos cargados.' },
  ];

  return (
    <div className={`bg-ui-card border border-ui-border rounded-2xl shadow-sm overflow-hidden flex flex-col ${isGeneratingPdf ? 'h-auto' : 'h-[600px]'} mt-8`} id="ai-report-section">
      {/* Chat Header */}
      <div className="p-4 border-b border-ui-border bg-[#0c1626] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-ui-accent/10 p-2 rounded-lg border border-ui-accent/20">
            <Sparkles className="w-5 h-5 text-ui-accent" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 flex flex-wrap items-center gap-1.5 text-sm uppercase tracking-wider">
              Análisis de IA & Reporte General
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-ui-accent/20 text-ui-accent font-semibold">
                GEMINI
              </span>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${queriesUsed >= 3 ? 'bg-red-500/10 text-red-400 border-red-500/25' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'}`}>
                {Math.max(0, 3 - queriesUsed)} / 3 consultas libres
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Analizando {material} • {category === 'nutrients' ? 'Nutrientes' : 'Micotoxinas'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetChat}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-ui-darkest transition-colors flex items-center space-x-1"
            title="Reiniciar análisis"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-xs hidden md:inline">Reiniciar</span>
          </button>
          <button
            onClick={handleExportChat}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-ui-darkest transition-colors flex items-center space-x-1"
            title="Exportar conversación"
          >
            <Download className="w-4 h-4" />
            <span className="text-xs hidden md:inline">Exportar Chat</span>
          </button>
        </div>
      </div>

      {/* Message Panel */}
      <div className={`flex-1 ${isGeneratingPdf ? 'overflow-visible' : 'overflow-y-auto'} p-4 space-y-4 custom-scrollbar bg-[#070e1a]/50`}>
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            {/* Avatar Icon */}
            <div
              className={`p-2 rounded-lg text-xs shrink-0 ${
                msg.role === 'user'
                  ? 'bg-ui-accent/20 border border-ui-accent/40 text-ui-accent'
                  : 'bg-ui-dark border border-ui-border text-slate-300'
              }`}
            >
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            {/* Chat Bubble */}
            <div className="max-w-[85%] flex flex-col">
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-ui-accent/10 border border-ui-accent/30 text-slate-100 rounded-tr-none'
                    : 'bg-ui-card border border-ui-border text-slate-200 rounded-tl-none prose prose-invert max-w-none'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div dangerouslySetInnerHTML={renderMarkdown(msg.content)} />
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 self-end px-1">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-ui-dark border border-ui-border text-slate-300 shrink-0">
              <Bot className="w-4 h-4 animate-bounce" />
            </div>
            <div className="bg-ui-card border border-ui-border p-4 rounded-2xl rounded-tl-none flex items-center space-x-2">
              <div className="w-2 h-2 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-ui-accent rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-ui-accent rounded-full animate-bounce"></div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-sm text-red-400 max-w-[85%] ml-11">
            <p className="font-semibold">Error al conectar con la IA:</p>
            <p className="mt-1">{error}</p>
            <button
              onClick={() => handleSendMessage()}
              className="mt-2 text-ui-accent underline hover:text-cyan-400 font-medium"
            >
              Reintentar
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Action Suggestion Chips */}
      {messages.length > 0 && !isLoading && queriesUsed < 3 && (
        <div className="p-3 border-t border-ui-border bg-[#0c1626] flex flex-col space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-slate-500 px-1 font-semibold">
            Análisis sugeridos rápidos:
          </span>
          <div className="flex flex-wrap gap-2 overflow-x-auto py-1">
            {suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(chip.text)}
                className="px-3 py-1.5 text-xs text-slate-300 bg-ui-card border border-ui-border rounded-lg hover:border-ui-accent hover:text-ui-accent transition-all whitespace-nowrap text-left"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      {!isGeneratingPdf && (
        queriesUsed < 3 ? (
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-4 border-t border-ui-border bg-ui-card flex items-center space-x-3"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="Pregunta algo sobre los datos de calidad o pide un reporte general..."
              className="flex-1 bg-ui-darkest border border-ui-border text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 outline-none focus:ring-1 focus:ring-ui-accent transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-ui-accent hover:bg-cyan-400 text-slate-900 font-semibold p-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center space-x-2"
            >
              <span className="hidden sm:inline">Enviar</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="p-4 border-t border-ui-border bg-[#180f15]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-400 font-medium">
            <div className="flex items-center space-x-2.5 text-sm">
              <span className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 shrink-0">
                <Bot className="w-4 h-4" />
              </span>
              <span>Has alcanzado el límite máximo de 3 consultas de IA permitidas para tu usuario ({currentUser?.nombre || 'Usuario'}).</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-400 font-bold uppercase tracking-wider shrink-0">
              Límite alcanzado
            </span>
          </div>
        )
      )}
    </div>
  );
};
