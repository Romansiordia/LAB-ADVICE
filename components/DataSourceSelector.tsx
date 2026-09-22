import React, { useState } from 'react';
import { FileSpreadsheet, Cloud, RefreshCw } from 'lucide-react';
import { FileUpload } from './FileUpload';
import { GoogleSheetSync } from './GoogleSheetSync';

interface DataSourceSelectorProps {
    onFileParse: (file: File) => void;
    onGoogleSheetLoaded: (csvText: string, sourceName?: string) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    onError: (err: string | null) => void;
    onSuccess: (msg: string | null) => void;
    defaultTab?: 'local' | 'sheets';
    compact?: boolean;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({
    onFileParse,
    onGoogleSheetLoaded,
    isLoading,
    setIsLoading,
    onError,
    onSuccess,
    defaultTab = 'local',
    compact = false
}) => {
    // Verificar si el usuario ya tiene una URL de Google Sheets guardada
    const hasSavedSheet = typeof window !== 'undefined' && !!localStorage.getItem('labadvice_google_sheet_url');
    const [activeTab, setActiveTab] = useState<'local' | 'sheets'>(hasSavedSheet && defaultTab === 'sheets' ? 'sheets' : defaultTab);

    return (
        <div className="w-full flex flex-col gap-2.5">
            {/* Selector de pestañas */}
            <div className="grid grid-cols-2 p-1 bg-ui-darkest/90 border border-ui-border rounded-xl">
                <button
                    type="button"
                    onClick={() => setActiveTab('local')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'local'
                            ? 'bg-ui-accent text-[#040d1a] shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Archivo Local</span>
                </button>

                <button
                    type="button"
                    onClick={() => setActiveTab('sheets')}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'sheets'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    <Cloud className="w-3.5 h-3.5" />
                    <span>Google Sheets</span>
                </button>
            </div>

            {/* Contenido según la pestaña activa */}
            {activeTab === 'local' ? (
                <div>
                    <FileUpload onFileParse={onFileParse} isLoading={isLoading} />
                    {!compact && (
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">
                            Admite libros de Excel <span className="text-emerald-400 font-mono">.xlsx</span>, <span className="text-emerald-400 font-mono">.xls</span> y archivos <span className="text-cyan-400 font-mono">.csv</span>
                        </p>
                    )}
                </div>
            ) : (
                <GoogleSheetSync
                    onCsvDataLoaded={onGoogleSheetLoaded}
                    isLoading={isLoading}
                    setIsLoading={setIsLoading}
                    onError={onError}
                    onSuccess={onSuccess}
                />
            )}
        </div>
    );
};
