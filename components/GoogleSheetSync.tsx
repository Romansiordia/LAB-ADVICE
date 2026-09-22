import React, { useState, useEffect } from 'react';
import { RefreshCw, Link2, ExternalLink, HelpCircle, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { fetchGoogleSheetCsv, convertGoogleSheetUrlToCsv } from '../googleSheetsService';

interface GoogleSheetSyncProps {
    onCsvDataLoaded: (csvText: string, sourceName?: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onError: (err: string | null) => void;
    onSuccess: (msg: string | null) => void;
}

const STORAGE_KEY_URL = 'labadvice_google_sheet_url';
const STORAGE_KEY_LAST_SYNC = 'labadvice_last_sync_time';
const STORAGE_KEY_LAST_COUNT = 'labadvice_last_sync_count';

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({
    onCsvDataLoaded,
    isLoading,
    setIsLoading,
    onError,
    onSuccess,
}) => {
    const [sheetUrl, setSheetUrl] = useState<string>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_URL) || '';
        } catch {
            return '';
        }
    });

    const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
        } catch {
            return null;
        }
    });

    const [lastCount, setLastCount] = useState<string | null>(() => {
        try {
            return localStorage.getItem(STORAGE_KEY_LAST_COUNT);
        } catch {
            return null;
        }
    });

    const [showHelp, setShowHelp] = useState<boolean>(false);
    const [localStatus, setLocalStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [localMessage, setLocalMessage] = useState<string>('');

    // Guardar URL en localStorage cuando cambie
    useEffect(() => {
        try {
            if (sheetUrl.trim()) {
                localStorage.setItem(STORAGE_KEY_URL, sheetUrl.trim());
            } else {
                localStorage.removeItem(STORAGE_KEY_URL);
            }
        } catch (e) {
            console.error('No se pudo guardar la URL en localStorage', e);
        }
    }, [sheetUrl]);

    const handleSync = async () => {
        const trimmed = sheetUrl.trim();
        if (!trimmed) {
            onError('Por favor ingresa o pega el enlace de tu Google Sheet.');
            setLocalStatus('error');
            setLocalMessage('Ingresa un enlace de Google Sheets.');
            return;
        }

        setIsLoading(true);
        onError(null);
        setLocalStatus('idle');
        setLocalMessage('');

        try {
            const csvText = await fetchGoogleSheetCsv(trimmed);
            
            // Actualizar timestamp de última sincronización
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
                            now.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
            
            setLastSyncTime(timeStr);
            try {
                localStorage.setItem(STORAGE_KEY_LAST_SYNC, timeStr);
            } catch {}

            setLocalStatus('success');
            setLocalMessage('Hoja descargada correctamente.');
            onCsvDataLoaded(csvText, 'Google Sheets');
        } catch (err: any) {
            console.error('Error al sincronizar Google Sheet:', err);
            const msg = err.message || 'Error al descargar datos de Google Sheets.';
            onError(msg);
            setLocalStatus('error');
            setLocalMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearUrl = () => {
        setSheetUrl('');
        setLastSyncTime(null);
        setLastCount(null);
        try {
            localStorage.removeItem(STORAGE_KEY_URL);
            localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
            localStorage.removeItem(STORAGE_KEY_LAST_COUNT);
        } catch {}
        setLocalStatus('idle');
        setLocalMessage('');
    };

    return (
        <div className="w-full bg-ui-card border border-ui-border rounded-xl p-3 shadow-sm flex flex-col gap-2.5">
            {/* Header del módulo */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-slate-200">Google Sheets</h4>
                        <p className="text-[10px] text-slate-400">Datos en Google Drive en tiempo real</p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => setShowHelp(true)}
                    className="p-1 text-slate-400 hover:text-ui-accent hover:bg-slate-800 rounded transition-colors"
                    title="¿Cómo conectar Google Sheets?"
                >
                    <HelpCircle className="w-4 h-4" />
                </button>
            </div>

            {/* Input para la URL */}
            <div className="relative">
                <input
                    type="url"
                    value={sheetUrl}
                    onChange={(e) => {
                        setSheetUrl(e.target.value);
                        setLocalStatus('idle');
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    disabled={isLoading}
                    className="w-full bg-ui-darkest border border-ui-border rounded-lg pl-2.5 pr-7 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 font-mono"
                />
                {sheetUrl && !isLoading && (
                    <button
                        type="button"
                        onClick={handleClearUrl}
                        className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
                        title="Limpiar enlace"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Mensajes de estado locales */}
            {localStatus === 'error' && (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-md text-[11px] text-rose-300 flex items-start gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-tight">{localMessage}</span>
                </div>
            )}

            {/* Botón de Sincronizar y Estado */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={handleSync}
                    disabled={isLoading || !sheetUrl.trim()}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                        isLoading || !sheetUrl.trim()
                            ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/40 hover:shadow-emerald-500/20'
                    }`}
                >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{isLoading ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
                </button>
            </div>

            {/* Pie con última sincronización */}
            {lastSyncTime && (
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-ui-border/60">
                    <span className="flex items-center gap-1 text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Última carga:
                    </span>
                    <span className="font-mono text-slate-300">{lastSyncTime}</span>
                </div>
            )}

            {/* Modal de Ayuda / Instrucciones */}
            {showHelp && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-ui-darker border border-ui-border rounded-xl max-w-md w-full p-5 shadow-2xl relative">
                        <button
                            type="button"
                            onClick={() => setShowHelp(false)}
                            className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                                <Link2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-semibold text-slate-100">
                                ¿Cómo conectar tu Google Sheet?
                            </h3>
                        </div>

                        <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                            Para que la plataforma pueda leer tus datos de Google Drive sin requerir claves de API complejas, solo asegúrate de compartir la hoja como lectura:
                        </p>

                        <ol className="space-y-3 text-xs text-slate-300 mb-5">
                            <li className="flex items-start gap-2.5 bg-ui-card p-2.5 rounded-lg border border-ui-border">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                                <div>
                                    <strong className="text-slate-100">Abre tu Google Sheet</strong> en Google Drive y haz clic en el botón verde <strong className="text-emerald-400">"Compartir"</strong> (esquina superior derecha).
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 bg-ui-card p-2.5 rounded-lg border border-ui-border">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                                <div>
                                    En <strong className="text-slate-100">Acceso general</strong>, cámbialo de <em>"Restringido"</em> a:
                                    <div className="mt-1 px-2 py-1 bg-ui-darkest rounded border border-emerald-500/30 text-emerald-300 font-medium inline-block">
                                        "Cualquier persona con el enlace" (Rol: Lector)
                                    </div>
                                </div>
                            </li>
                            <li className="flex items-start gap-2.5 bg-ui-card p-2.5 rounded-lg border border-ui-border">
                                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                                <div>
                                    Haz clic en <strong className="text-slate-100">"Copiar enlace"</strong> y pégalo en el campo de texto.
                                </div>
                            </li>
                        </ol>

                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 text-[11px] text-slate-400 mb-4">
                            <strong className="text-slate-200">Nota:</strong> Tus columnas de fecha (<code className="text-cyan-300 font-mono">dd/mm/aaaa</code>), material y nutrientes seguirán aplicándose exactamente igual que en tus archivos Excel locales.
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowHelp(false)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
