import React, { useEffect, useRef } from 'react';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';

declare const marked: any;

interface AiAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    result: string | null;
    error: string | null;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({ isOpen, onClose, isLoading, result, error }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (result && contentRef.current && typeof marked !== 'undefined') {
            contentRef.current.innerHTML = marked.parse(result);
        }
    }, [result]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full text-gray-700 relative transform transition-all flex flex-col"
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '80vh' }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Cerrar modal"
                >
                    <XIcon />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                    <SparklesIcon />
                    <span className="ml-2">Análisis con IA</span>
                </h2>

                <div className="overflow-y-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center p-8">
                            <svg className="animate-spin h-10 w-10 text-cyan-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-gray-600">Generando interpretación de los datos...</p>
                            <p className="text-sm text-gray-400 mt-1">Esto puede tardar unos segundos.</p>
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && result && (
                         <div ref={contentRef} className="prose prose-sm max-w-none text-gray-800"></div>
                    )}
                </div>

                <div className="mt-6 text-right border-t pt-4">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};
