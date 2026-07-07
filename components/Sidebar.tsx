
import React from 'react';
import { FileUpload } from './FileUpload';
import { InfoIcon } from './icons/InfoIcon';
import { Logo } from './Logo';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';

interface FilterSelectProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({ id, label, value, onChange, options }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-ui-darkest border border-ui-border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-ui-accent focus:border-ui-accent sm:text-sm text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                ))}
            </select>
        </div>
    );
};


interface SidebarProps {
    onFileParse: (file: File) => void;
    selectedMaterial: string;
    setSelectedMaterial: (material: string) => void;
    materials: string[];
    isLoading: boolean;
    error: string | null;
    hasData: boolean;
    isSampleData: boolean;
    onShowFormatHelp: () => void;
    
    selectedSubtipo: string;
    setSelectedSubtipo: (subtipo: string) => void;
    availableSubtipos: string[];

    selectedLote: string;
    setSelectedLote: (lote: string) => void;
    availableLotes: string[];

    selectedCliente: string;
    setSelectedCliente: (cliente: string) => void;
    availableClientes: string[];

    selectedProveedor: string;
    setSelectedProveedor: (proveedor: string) => void;
    availableProveedores: string[];

    selectedOrigen: string;
    setSelectedOrigen: (origen: string) => void;
    availableOrigenes: string[];

    startDate: string | null;
    setStartDate: (date: string | null) => void;
    endDate: string | null;
    setEndDate: (date: string | null) => void;

    isCollapsed: boolean;
    onToggleCollapse: () => void;
    user?: { nombre: string; usuario: string } | null;
    onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    onFileParse,
    selectedMaterial,
    setSelectedMaterial,
    materials,
    isLoading,
    error,
    hasData,
    isSampleData,
    onShowFormatHelp,
    selectedSubtipo,
    setSelectedSubtipo,
    availableSubtipos,
    selectedLote,
    setSelectedLote,
    availableLotes,
    selectedCliente,
    setSelectedCliente,
    availableClientes,
    selectedProveedor,
    setSelectedProveedor,
    availableProveedores,
    selectedOrigen,
    setSelectedOrigen,
    availableOrigenes,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    isCollapsed,
    onToggleCollapse,
    user = null,
    onLogout
}) => {
    const handleClearDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <aside 
            className={`bg-ui-card h-screen flex-shrink-0 flex flex-col border-r border-ui-border transition-all duration-300 ease-in-out relative ${
                isCollapsed ? 'w-0 overflow-hidden md:w-0' : 'w-full md:w-80 p-6 flex flex-col'
            }`}
        >
            <div className={`flex flex-col h-full ${isCollapsed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                <div className="flex items-center justify-between mb-6 flex-shrink-0">
                    <Logo />
                    <button 
                        onClick={onToggleCollapse}
                        className="hidden md:flex p-1.5 text-slate-400 hover:text-ui-accent hover:bg-ui-accent/10 text-ui-accent rounded-lg transition-colors"
                        title="Contraer menú"
                    >
                        <ChevronLeftIcon />
                    </button>
                </div>
                
                <div className="flex flex-col flex-1 overflow-hidden">
                    {error && <div className="text-red-700 bg-red-100 p-3 rounded-md text-sm mb-4 flex-shrink-0">{error}</div>}

                    {hasData && (
                        <div className="flex flex-col space-y-6 overflow-y-auto pr-2 pt-2 custom-scrollbar flex-1 pb-4">
                            <FilterSelect 
                                id="material-select"
                                label="Materia Prima"
                                value={selectedMaterial}
                                onChange={setSelectedMaterial}
                                options={materials}
                            />
                            
                            <hr className="border-ui-border" />

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-300">Rango de Fechas</label>
                                    <button
                                        onClick={handleClearDates}
                                        className="text-xs text-ui-accent hover:text-cyan-800 underline"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label htmlFor="start-date" className="block text-xs text-slate-400 mb-1">Inicio</label>
                                        <input
                                            type="date"
                                            id="start-date"
                                            value={startDate || ''}
                                            onChange={(e) => setStartDate(e.target.value || null)}
                                            className="w-full bg-ui-darkest border border-ui-border rounded-md shadow-sm px-2 py-1.5 text-xs focus:ring-1 focus:ring-ui-accent text-slate-100"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="end-date" className="block text-xs text-slate-400 mb-1">Fin</label>
                                        <input
                                            type="date"
                                            id="end-date"
                                            value={endDate || ''}
                                            onChange={(e) => setEndDate(e.target.value || null)}
                                            min={startDate || undefined}
                                            className="w-full bg-ui-darkest border border-ui-border rounded-md shadow-sm px-2 py-1.5 text-xs focus:ring-1 focus:ring-ui-accent text-slate-100"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <FilterSelect
                                id="subtipo-select"
                                label="Subtipo"
                                value={selectedSubtipo}
                                onChange={setSelectedSubtipo}
                                options={availableSubtipos}
                            />
                            <FilterSelect
                                id="lote-select"
                                label="Lote"
                                value={selectedLote}
                                onChange={setSelectedLote}
                                options={availableLotes}
                            />
                            <FilterSelect
                                id="cliente-select"
                                label="Cliente"
                                value={selectedCliente}
                                onChange={setSelectedCliente}
                                options={availableClientes}
                            />
                            <FilterSelect
                                id="proveedor-select"
                                label="Proveedor"
                                value={selectedProveedor}
                                onChange={setSelectedProveedor}
                                options={availableProveedores}
                            />
                            <FilterSelect
                                id="origen-select"
                                label="Origen"
                                value={selectedOrigen}
                                onChange={setSelectedOrigen}
                                options={availableOrigenes}
                            />
                        </div>
                    )}
                </div>
                
                {user && (
                    <div className="mt-auto pt-4 border-t border-ui-border/50 flex flex-col space-y-3 flex-shrink-0">
                        <div className="flex items-center space-x-3 bg-ui-darkest/40 p-2.5 rounded-xl border border-ui-border/30">
                            <div className="w-9 h-9 rounded-full bg-ui-accent/10 border border-ui-accent/20 flex items-center justify-center text-ui-accent font-bold text-sm shrink-0 uppercase">
                                {user.nombre.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-200 truncate">{user.nombre}</p>
                                <p className="text-[10px] text-slate-500 truncate">{user.usuario}</p>
                            </div>
                        </div>
                        <button
                            onClick={onLogout}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/30 font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                )}
            </div>
        </aside>
    );
};
