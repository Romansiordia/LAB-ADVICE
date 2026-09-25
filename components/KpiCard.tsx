import React from 'react';
import { ZoomInIcon } from './icons/ZoomInIcon';
import { getPrintContrastingColor } from '../constants';

interface KpiCardProps {
    title: string;
    value?: string;
    subValue?: string;
    rejectionRate?: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
    isPdfMode?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({ 
    title, 
    value, 
    subValue, 
    rejectionRate, 
    icon, 
    color, 
    onClick,
    isPdfMode = false 
}) => {
    const badgeColor = getPrintContrastingColor(color, isPdfMode);

    return (
        <div 
            onClick={onClick}
            className={`${
                isPdfMode 
                    ? 'bg-white border-slate-200 shadow-sm text-slate-800' 
                    : 'bg-ui-card border-ui-border shadow-lg hover:border-ui-accent/50'
            } border rounded-xl px-4 py-3 transition-all duration-300 flex flex-col justify-between cursor-pointer group h-full relative`}
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className={`text-xs font-bold uppercase tracking-wide break-words pr-2 max-w-[80%] ${
                    isPdfMode ? 'text-slate-600' : 'text-slate-400'
                }`}>
                    {title}
                </h3>
                <div 
                    className="w-7 h-7 rounded flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: badgeColor }}
                >
                    {icon}
                </div>
            </div>
            
            <div>
                {value ? (
                    <div className="flex flex-col">
                        <span className={`text-2xl font-black tracking-tight ${
                            isPdfMode ? 'text-slate-900' : 'text-slate-100'
                        }`}>
                            {value}
                        </span>
                        <div className="flex items-center justify-between mt-2">
                            {subValue && (
                                <span className={`text-xs font-mono font-semibold ${
                                    isPdfMode ? 'text-slate-500' : 'text-slate-400'
                                }`}>
                                    {subValue}
                                </span>
                            )}
                            {rejectionRate !== undefined && rejectionRate > 0 && (
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ml-auto whitespace-nowrap ${
                                    isPdfMode 
                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                                }`}>
                                    Rechazos: {rejectionRate.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className={`text-lg font-medium italic mt-1 ${
                            isPdfMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                            Sin datos
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

