import React, { useState, useEffect } from 'react';
import { RefreshCw, Link2, HelpCircle, CheckCircle2, AlertCircle, X, Cloud, ExternalLink } from 'lucide-react';
import { fetchGoogleSheetCsv } from '../googleSheetsService';

interface GoogleSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCsvDataLoaded: (csvText: string, sourceName?: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onError: (err: string | null) => void;
    onSuccess: (msg: string | null) => void;
}

const STORAGE_KEY_URL = 'labadvice_google_sheet_url';
const STORAGE_KEY_LAST_SYNC = 'labadvice_last_sync_time';

export const GoogleSheetModal: React.FC<GoogleSheetModalProps> = ({
    isOpen,
    onClose,
    onCsvDataLoaded,
    isLoading,
    setIsLoading,
    onError,
    onSuccess
}) => {
    const [sheetUrl, setSheetUrl] = useState<string>('');
    const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
    const [localStatus, setLocalStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [localMessage, setLocalMessage] = useState<string>('');
    const [showHelp, setShowHelp] = useState<boolean>(false);

    useEffect(() => {
        if (isOpen) {
            try {
                const saved = localStorage.getItem(STORAGE_KEY_URL) || '';
                setSheetUrl(saved);
                const savedTime = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
                setLastSyncTime(savedTime);
                setLocalStatus('idle');
                setLocalMessage('');
            } catch (e) {
                console.error(e);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSync = async () => {
        const trimmed = sheetUrl.trim();
        if (!trimmed) {
            setLocalStatus('error');
            setLocalMessage('Por favor pega el enlace de tu Google Sheet (ej. pestaña LABADVICE).');
            return;
        }

        try {
            localStorage.setItem(STORAGE_KEY_URL, trimmed);
        } catch {}

        setIsLoading(true);
        onError(null);
        setLocalStatus('idle');
        setLocalMessage('');

        try {
            const csvText = await fetchGoogleSheetCsv(trimmed);
            
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + 
                            now.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
            
            setLastSyncTime(timeStr);
            try {
                localStorage.setItem(STORAGE_KEY_LAST_SYNC, timeStr);
            } catch {}

            setLocalStatus('success');
            setLocalMessage('¡Datos sincronizados exitosamente desde Google Sheets!');
            
            onCsvDataLoaded(csvText, 'Google Sheets');
            
            // Cerrar automáticamente la ventana después de 1 segundo de éxito
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            console.error('Error al sincronizar Google Sheet:', err);
            const msg = err.message || 'Error al conectar con Google Sheets.';
            onError(msg);
            setLocalStatus('error');
            setLocalMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-ui-card border border-ui-border rounded-2xl max-w-lg w-full p-6 shadow-2xl relative flex flex-col gap-4 max-h-[90vh] overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-ui-border">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Cloud className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                                Sincronizar con Google Sheets
                                <span className="text-[10px] uppercase font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                    Google Drive
                                </span>
                            </h3>
                            <p className="text-xs text-slate-400">
                                Enlaza tus datos de materias primas en tiempo real
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-ui-darkest rounded-lg transition-colors"
                        title="Cerrar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Input de la URL */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                        <span>URL de tu Google Sheet (Pestaña LABADVICE)</span>
                        <button
                            type="button"
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] font-normal underline"
                        >
                            <HelpCircle className="w-3.5 h-3.5" />
                            {showHelp ? 'Ocultar guía' : '¿Cómo obtener este enlace?'}
                        </button>
                    </label>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                            <Link2 className="w-4 h-4" />
                        </div>
                        <input
                            type="url"
                            value={sheetUrl}
                            onChange={(e) => {
                                setSheetUrl(e.target.value);
                                setLocalStatus('idle');
                            }}
                            placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=..."
                            disabled={isLoading}
                            className="w-full bg-ui-darkest border border-ui-border rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 font-mono transition-all"
                        />
                        {sheetUrl && !isLoading && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSheetUrl('');
                                    setLocalStatus('idle');
                                }}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                                title="Borrar enlace"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                        Copia la URL directamente de la barra de direcciones de tu navegador mientras estás ubicado en la pestaña <strong className="text-slate-200">LABADVICE</strong>.
                    </p>
                </div>

                {/* Guía desplegable de ayuda */}
                {showHelp && (
                    <div className="p-3.5 bg-ui-darkest/90 border border-emerald-500/30 rounded-xl flex flex-col gap-2.5 text-xs text-slate-300">
                        <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                            <span>Pasos para compartir tu hoja en Google Drive:</span>
                        </div>
                        <ol className="space-y-2 pl-4 list-decimal text-[11px] leading-relaxed text-slate-300">
                            <li>
                                En tu archivo de Google Sheets, haz clic en el botón verde <strong className="text-emerald-400">Compartir</strong> (arriba a la derecha).
                            </li>
                            <li>
                                En <em>Acceso general</em>, cámbialo a <strong className="text-slate-100">"Cualquier persona con el enlace"</strong> con rol de <strong className="text-slate-100">Lector</strong>.
                            </li>
                            <li>
                                Haz clic en la pestaña <strong className="text-slate-100">LABADVICE</strong> abajo y copia la URL completa de tu navegador. Debe terminar en <code className="text-cyan-300 font-mono">#gid=...</code>.
                            </li>
                        </ol>
                    </div>
                )}

                {/* Mensaje de estado */}
                {localStatus === 'error' && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{localMessage}</span>
                    </div>
                )}

                {localStatus === 'success' && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{localMessage}</span>
                    </div>
                )}

                {/* Información de última sincronización */}
                {lastSyncTime && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between px-1">
                        <span className="flex items-center gap-1 text-slate-400">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Última sincronización exitosa:
                        </span>
                        <span className="font-mono text-slate-300">{lastSyncTime}</span>
                    </div>
                )}

                {/* Botones de acción */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-ui-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-ui-darkest border border-ui-border transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={handleSync}
                        disabled={isLoading || !sheetUrl.trim()}
                        className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                            isLoading || !sheetUrl.trim()
                                ? 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-900/40 hover:shadow-emerald-600/30'
                        }`}
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        <span>{isLoading ? 'Conectando...' : 'Sincronizar Datos'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
