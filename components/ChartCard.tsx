
import React from 'react';
import { ZoomInIcon } from './icons/ZoomInIcon';

interface ChartCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    onExpand?: () => void;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, onExpand }) => {
    return (
        <div className="bg-white border-2 border-slate-200 p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <div className="flex items-center justify-between text-slate-700 mb-4">
                <div className="flex items-center">
                    <span className="mr-2">{icon}</span>
                    <h3 className="text-lg font-semibold truncate max-w-[200px] md:max-w-none">{title}</h3>
                </div>
                {onExpand && (
                    <button 
                        onClick={onExpand}
                        className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Ampliar gráfico"
                    >
                        <ZoomInIcon />
                    </button>
                )}
            </div>
            <div className="flex-1 h-80 w-full min-h-0">
                {children}
            </div>
        </div>
    );
};
