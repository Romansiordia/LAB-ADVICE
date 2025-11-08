
import React from 'react';

// --- Icons ---
const AverageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-6m-3 6v-6m7-3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2h10z" /></svg>;
const MaxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const MinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
const StdDevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5" /></svg>;
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;


interface Stats {
    count: number;
    mean: string;
    min: string;
    max: string;
    stdDev: string;
}

interface SummaryStatsProps {
    stats: Stats | null;
    nutrientLabel: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    iconBgColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, iconBgColor }) => (
    <div className="bg-white border border-gray-200 p-3 rounded-lg flex items-center space-x-3 shadow-sm hover:shadow-md transition-shadow">
        <div className={`flex-shrink-0 ${iconBgColor} p-2 rounded-full`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium truncate">{title}</p>
            <p className="text-base font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

export const SummaryStats: React.FC<SummaryStatsProps> = ({ stats, nutrientLabel }) => {

    if (!stats) {
        return (
             <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                    Resumen Estadístico: <span className="font-normal text-cyan-700">{nutrientLabel}</span>
                </h3>
                <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm text-center">
                    <p className="text-gray-500">No hay datos para calcular estadísticas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <h3 className="text-base font-semibold text-gray-700 mb-3">
                Resumen Estadístico: <span className="font-normal text-cyan-700">{nutrientLabel}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <StatCard title="Promedio" value={stats.mean} icon={<AverageIcon />} iconBgColor="bg-cyan-50" />
                <StatCard title="Máximo" value={stats.max} icon={<MaxIcon />} iconBgColor="bg-green-50" />
                <StatCard title="Mínimo" value={stats.min} icon={<MinIcon />} iconBgColor="bg-red-50" />
                <StatCard title="Desv. Estándar" value={stats.stdDev} icon={<StdDevIcon />} iconBgColor="bg-purple-50" />
                <StatCard title="# de Muestras" value={stats.count} icon={<CountIcon />} iconBgColor="bg-blue-50" />
            </div>
        </div>
    );
};
