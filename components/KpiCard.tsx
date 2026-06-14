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
            className="bg-ui-card border border-ui-border rounded-xl p-5 shadow-lg hover:border-ui-accent/50 transition-all duration-300 flex flex-col justify-between cursor-pointer group h-full relative"
        >
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                <div 
                    className="w-8 h-8 rounded-md flex items-center justify-center text-white shadow-md"
                    style={{ backgroundColor: color }}
                >
                    {icon}
                </div>
            </div>
            
            <div>
                {value ? (
                    <div className="flex flex-col">
                        <span className="text-3xl font-bold text-slate-100 tracking-tight leading-loose -mt-2">{value}</span>
                        <div className="flex items-center justify-between mt-1">
                            {subValue && (
                                <span className="text-xs text-slate-500 font-mono">{subValue}</span>
                            )}
                            {rejectionRate !== undefined && rejectionRate > 0 && (
                                <span className="text-[10px] font-medium bg-red-500/20 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/30 ml-auto">
                                    Rechazos: {rejectionRate.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col">
                        <span className="text-2xl font-semibold text-slate-500 italic">Sin datos</span>
                    </div>
                )}
            </div>
        </div>
    );
};
