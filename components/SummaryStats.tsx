import React from 'react';

// --- Icons ---
const AverageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>; // Plus symbol for mean
const MaxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>; // Arrow up
const MinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>; // Arrow down
const StdDevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5" /></svg>; // ~ symbol, approximation
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>; // List icon for count


interface Stats {
    count: number;
    mean: string;
    min: string;
    max: string;
    stdDev: string;
}

interface SummaryStatsProps {
    stats: Stats | null;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
    <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center text-center h-full">
        <div className="text-cyan-500 mb-2">{icon}</div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
);

export const SummaryStats: React.FC<SummaryStatsProps> = ({ stats }) => {

    if (!stats) {
        return <div className="flex items-center justify-center h-full text-gray-500">No hay datos para calcular estadísticas.</div>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 h-full content-center">
            <StatCard title="Promedio" value={stats.mean} icon={<AverageIcon />} />
            <StatCard title="Máximo" value={stats.max} icon={<MaxIcon />} />
            <StatCard title="Mínimo" value={stats.min} icon={<MinIcon />} />
            <StatCard title="Desv. Estándar" value={stats.stdDev} icon={<StdDevIcon />} />
            <StatCard title="# de Datos" value={stats.count} icon={<CountIcon />} />
        </div>
    );
};