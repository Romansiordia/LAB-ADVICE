import React from 'react';
import { ZoomInIcon } from './icons/ZoomInIcon';

interface KpiCardProps {
    title: string;
    value?: string;
    subValue?: string;
    rejectionRate?: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, subValue, rejectionRate, icon, color, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className="bg-ui-card border border-ui-border rounded-xl px-4 py-3 shadow-lg hover:border-ui-accent/50 transition-all duration-300 flex flex-col justify-between cursor-pointer group h-full relative"
        >
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide break-words pr-2 max-w-[80%]">{title}</h3>
                <div 
                    className="w-7 h-7 rounded flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: color }}
                >
                    {icon}
                </div>
            </div>
            
            <div>
                {value ? (
                    <div className="flex flex-col">
                        <span className="text-2xl font-bold text-slate-100 tracking-tight">{value}</span>
                        <div className="flex items-center justify-between mt-2">
                            {subValue && (
                                <span className="text-xs text-slate-500 font-mono">{subValue}</span>
                            )}
                            {rejectionRate !== undefined && rejectionRate > 0 && (
                                <span className="text-[10px] font-medium bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded border border-red-500/20 ml-auto whitespace-nowrap">
                                    Rechazos: {rejectionRate.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-lg font-medium text-slate-500 italic mt-1">Sin datos</span>
                    </div>
                )}
            </div>
        </div>
    );
};
