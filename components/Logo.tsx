import React from 'react';

interface LogoProps {
    showMaterial?: string;
    as?: React.ElementType;
}

export const Logo: React.FC<LogoProps> = ({ showMaterial, as: Component = 'span' }) => {
    return (
        <div className="flex items-center w-full">
            <img 
                src="/logo-spectrametrics.png" 
                alt="SpectraMetrics Logo" 
                className="h-16 md:h-20 w-auto object-contain max-w-[250px]"
            />
            {showMaterial ? (
                <Component className="text-2xl md:text-3xl ml-3">
                    <span className="font-bold text-slate-100 border-l-2 border-slate-300 pl-3">{showMaterial}</span>
                </Component>
            ) : null}
        </div>
    );
};