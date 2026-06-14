
import React from 'react';
import { XIcon } from './icons/XIcon';

interface ChartZoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const ChartZoomModal: React.FC<ChartZoomModalProps> = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4 transition-all duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-ui-card rounded-3xl shadow-2xl p-6 w-full max-w-6xl h-full max-h-[85vh] flex flex-col relative transform transition-all animate-in fade-in zoom-in duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">{title}</h2>
                        <p className="text-slate-400 text-sm mt-1">Análisis detallado del parámetro seleccionado</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-400 hover:bg-ui-dark rounded-full transition-colors"
                        aria-label="Cerrar ampliación"
                    >
                        <XIcon />
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0 bg-ui-darkest/50 rounded-2xl p-4 border border-ui-border">
                    {children}
                </div>
                <div className="mt-6 flex items-center justify-center space-x-2 text-slate-400 text-xs font-medium uppercase tracking-widest">
                    <span className="w-8 h-[1px] bg-slate-200"></span>
                    <span>Navegación Temporal Habilitada</span>
                    <span className="w-8 h-[1px] bg-slate-200"></span>
                </div>
            </div>
        </div>
    );
};
