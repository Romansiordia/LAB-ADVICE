import React from 'react';

interface LogoProps {
    showMaterial?: string;
    as?: React.ElementType;
}

export const Logo: React.FC<LogoProps> = ({ showMaterial, as: Component = 'span' }) => {
    return (
        <div className="flex items-center">
            <svg 
                className="h-10 w-10 mr-3" 
                viewBox="0 0 32 32" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* Lupa outline */}
                <circle cx="14" cy="14" r="8" stroke="#334155" strokeWidth="2.5" />
                <line x1="20.5" y1="20.5" x2="26" y2="26" stroke="#334155" strokeWidth="2.5" strokeLinecap="round" />
                
                {/* Gráfico de barras con colores de los gráficos */}
                <rect x="9.5" y="14" width="3" height="5" fill="#3b82f6" /> {/* Blue */}
                <rect x="13.5" y="10" width="3" height="9" fill="#10b981" /> {/* Green */}
                <rect x="17.5" y="12" width="3" height="7" fill="#06b6d4" /> {/* Cyan */}
            </svg>
            <Component className="text-3xl">
                <span className="font-bold text-slate-900">LAB</span>
                <span className="font-semibold text-cyan-600">ADVICE</span>
                {showMaterial && (
                    <>
                        <span className="font-bold text-slate-900">: </span>
                        <span className="font-bold text-cyan-600">{showMaterial}</span>
                    </>
                )}
            </Component>
        </div>
    );
};