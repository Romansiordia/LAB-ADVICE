
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
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-900 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
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
    onToggleCollapse
}) => {
    const handleClearDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <aside 
            className={`bg-white h-screen flex-shrink-0 flex flex-col border-r border-slate-200 transition-all duration-300 ease-in-out relative ${
                isCollapsed ? 'w-0 overflow-hidden md:w-0' : 'w-full md:w-80 p-6'
            }`}
        >
            <div className={`flex flex-col space-y-6 ${isCollapsed ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                <div className="flex items-center justify-between">
                    <Logo />
                    <button 
                        onClick={onToggleCollapse}
                        className="hidden md:flex p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                        title="Contraer menú"
                    >
                        <ChevronLeftIcon />
                    </button>
                </div>
                
                {isSampleData && (
                    <div className="text-cyan-800 bg-cyan-100 p-3 rounded-md text-sm" role="alert">
                        <p className="font-semibold">Modo de Demostración</p>
                        <p className="text-xs mt-1">Se muestran datos de prueba. Sube tu propio archivo para analizarlo.</p>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <FileUpload onFileParse={onFileParse} isLoading={isLoading} />
                        <button 
                            onClick={onShowFormatHelp} 
                            className="mt-2 text-sm text-cyan-600 hover:text-cyan-700 transition-colors flex items-center justify-center w-full"
                        >
                            <InfoIcon />
                            <span className="ml-1 underline">Formato de archivo</span>
                        </button>
                    </div>
                    
                    {error && <div className="text-red-700 bg-red-100 p-3 rounded-md text-sm">{error}</div>}

                    {hasData && (
                        <div className="flex flex-col space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
                            <FilterSelect 
                                id="material-select"
                                label="Materia Prima"
                                value={selectedMaterial}
                                onChange={setSelectedMaterial}
                                options={materials}
                            />
                            
                            <hr className="border-slate-200" />

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-slate-700">Rango de Fechas</label>
                                    <button
                                        onClick={handleClearDates}
                                        className="text-xs text-cyan-600 hover:text-cyan-800 underline"
                                    >
                                        Limpiar
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label htmlFor="start-date" className="block text-xs text-slate-500 mb-1">Inicio</label>
                                        <input
                                            type="date"
                                            id="start-date"
                                            value={startDate || ''}
                                            onChange={(e) => setStartDate(e.target.value || null)}
                                            className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm px-2 py-1.5 text-xs focus:ring-1 focus:ring-cyan-500 text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="end-date" className="block text-xs text-slate-500 mb-1">Fin</label>
                                        <input
                                            type="date"
                                            id="end-date"
                                            value={endDate || ''}
                                            onChange={(e) => setEndDate(e.target.value || null)}
                                            min={startDate || undefined}
                                            className="w-full bg-slate-50 border border-slate-300 rounded-md shadow-sm px-2 py-1.5 text-xs focus:ring-1 focus:ring-cyan-500 text-slate-900"
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
            </div>
        </aside>
    );
};
