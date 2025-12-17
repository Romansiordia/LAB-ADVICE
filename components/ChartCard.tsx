import React from 'react';

interface ChartCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children }) => {
    return (
        <div className="bg-white border-2 border-slate-200 p-4 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center text-slate-700 mb-4">
                <span className="mr-2">{icon}</span>
                <h3 className="text-lg font-semibold">{title}</h3>
            </div>
            <div className="h-80 w-full">
                {children}
            </div>
        </div>
    );
};