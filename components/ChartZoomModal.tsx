
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
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[60] p-4 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-6xl h-full max-h-[90vh] flex flex-col relative transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                    <button 
                        onClick={onClose} 
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                        aria-label="Cerrar ampliación"
                    >
                        <XIcon />
                    </button>
                </div>
                <div className="flex-1 w-full min-h-0">
                    {children}
                </div>
                <div className="mt-4 text-center text-slate-500 text-sm italic">
                    Utiliza la barra inferior del gráfico para navegar por el tiempo
                </div>
            </div>
        </div>
    );
};
