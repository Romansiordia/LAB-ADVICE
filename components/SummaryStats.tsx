import React from 'react';

// --- Icons ---
const AverageIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-ui-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-6m-3 6v-6m7-3a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2h10z" /></svg>;
const MaxIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>;
const MinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
const StdDevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 4.5h16.5" /></svg>;
const CountIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>;


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
    <div className="bg-ui-card border-2 border-ui-border p-3 rounded-xl flex items-center space-x-3 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className={`flex-shrink-0 ${iconBgColor} p-2 rounded-full`}>
            {icon}
        </div>
        <div>
            <p className="text-xs text-slate-400 font-medium truncate">{title}</p>
            <p className="text-base font-bold text-slate-100">{value}</p>
        </div>
    </div>
);

export const SummaryStats: React.FC<SummaryStatsProps> = ({ stats, nutrientLabel }) => {

    if (!stats) {
        return (
             <div className="mb-6">
                <h3 className="text-base font-semibold text-slate-300 mb-3">
                    Resumen Estadístico: <span className="font-normal text-ui-accent">{nutrientLabel}</span>
                </h3>
                <div className="bg-ui-card border-2 border-ui-border p-4 rounded-xl shadow-md text-center">
                    <p className="text-slate-400">No hay datos para calcular estadísticas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <h3 className="text-base font-semibold text-slate-300 mb-3">
                Resumen Estadístico: <span className="font-normal text-ui-accent">{nutrientLabel}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                <StatCard title="Promedio" value={stats.mean} icon={<AverageIcon />} iconBgColor="bg-ui-accent/10 text-ui-accent" />
                <StatCard title="Máximo" value={stats.max} icon={<MaxIcon />} iconBgColor="bg-emerald-50" />
                <StatCard title="Mínimo" value={stats.min} icon={<MinIcon />} iconBgColor="bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]/20" />
                <StatCard title="Desv. Estándar" value={stats.stdDev} icon={<StdDevIcon />} iconBgColor="bg-ui-accent/10 text-ui-accent" />
                <StatCard title="# de Muestras" value={stats.count} icon={<CountIcon />} iconBgColor="bg-sky-50" />
            </div>
        </div>
    );
};