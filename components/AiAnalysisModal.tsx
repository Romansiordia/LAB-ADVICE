import React, { useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DownloadIcon } from './icons/DownloadIcon';

declare const marked: any;

interface AiAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: string | null;
    error: string | null;
    material: string;
    nutrient: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, isLoading, result, error, material, nutrient }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (result && contentRef.current && typeof marked !== 'undefined') {
            contentRef.current.innerHTML = marked.parse(result);
        }
    }, [result]);

    const handleDownload = () => {
        if (!result) return;
    
        const sanitizeFilename = (name: string) => name.replace(/[^a-z0-9_ -]/gi, '_').replace(/\s+/g, '_').toLowerCase();
        
        const filename = `reporte_ia_${sanitizeFilename(material)}_${sanitizeFilename(nutrient)}.txt`;
        
        // Basic conversion from Markdown to plain text
        const plainTextResult = result
            .replace(/###\s/g, '')
            .replace(/##\s/g, '')
            .replace(/#\s/g, '')
            .replace(/\*\*(.*?)\*\*/g, '$1') // bold
            .replace(/\*/g, '  -'); // list items

        const blob = new Blob([plainTextResult], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-ui-card rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full text-slate-300 relative transform transition-all flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '80vh' }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-400"
                    aria-label="Cerrar modal"
                >
                    <XIcon />
                </button>
                <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center">
                    <SparklesIcon />
                    <span className="ml-2">Análisis con IA</span>
                </h2>

                <div className="overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <svg className="animate-spin h-10 w-10 text-ui-accent mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-slate-400">Generando interpretación de los datos...</p>
                            <p className="text-sm text-slate-400 mt-1">Esto puede tardar unos segundos.</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && result && (
                         <div ref={contentRef} className="prose prose-sm max-w-none text-slate-100"></div>
                    )}
                </div>

                <div className="mt-6 flex justify-end items-center border-t border-ui-border pt-4 space-x-3">
                    {result && !isLoading && (
                        <button
                            onClick={handleDownload}
                            className="flex items-center bg-ui-accent hover:shadow-[0_0_15px_rgba(0,210,255,0.3)] text-[#040d1a] hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors"
                        >
                            <DownloadIcon />
                            <span className="ml-2">Descargar Reporte</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-100 font-bold py-2 px-4 rounded transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};