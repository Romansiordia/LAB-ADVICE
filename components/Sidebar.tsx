import React from 'react';
import { FileUpload } from './FileUpload';
import { InfoIcon } from './icons/InfoIcon';

interface FilterSelectProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: string[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({ id, label, value, onChange, options }) => {
    if (options.length <= 1) return null;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <select
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-900"
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
    selectedNutrient: string;
    setSelectedNutrient: (nutrient: string) => void;
    materials: string[];
    nutrients: { key: string; label: string; }[];
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
}

export const Sidebar: React.FC<SidebarProps> = ({
    onFileParse,
    selectedMaterial,
    setSelectedMaterial,
    selectedNutrient,
    setSelectedNutrient,
    materials,
    nutrients,
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
}) => {
    const handleClearDates = () => {
        setStartDate(null);
        setEndDate(null);
    };

    return (
        <aside className="w-full md:w-80 bg-white p-6 flex-shrink-0 flex flex-col space-y-6 border-r border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Panel de Control</h2>
            
            {isSampleData && (
                <div className="text-cyan-800 bg-cyan-100 p-3 rounded-md text-sm" role="alert">
                    <p className="font-semibold">Modo de Demostración</p>
                    <p className="text-xs mt-1">Se muestran datos de prueba. Sube tu propio archivo para analizarlo.</p>
                </div>
            )}

            <div>
                <FileUpload onFileParse={onFileParse} isLoading={isLoading} />
                <button 
                    onClick={onShowFormatHelp} 
                    className="mt-2 text-sm text-cyan-600 hover:text-cyan-700 transition-colors flex items-center justify-center w-full"
                >
                    <InfoIcon />
                    <span className="ml-1 underline">Ver formato de archivo requerido</span>
                </button>
            </div>
            
            {error && <div className="text-red-700 bg-red-100 p-3 rounded-md text-sm">{error}</div>}

            {hasData && (
                 <div className="flex flex-col space-y-4">
                    <FilterSelect 
                        id="material-select"
                        label="Materia Prima"
                        value={selectedMaterial}
                        onChange={setSelectedMaterial}
                        options={materials}
                    />
                    <div>
                         <label htmlFor="nutrient-select" className="block text-sm font-medium text-gray-700 mb-2">Nutriente / Analito</label>
                        <select
                            id="nutrient-select"
                            value={selectedNutrient}
                            onChange={(e) => setSelectedNutrient(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-900"
                        >
                            {nutrients.map(nutrient => (
                                <option key={nutrient.key} value={nutrient.key}>{nutrient.label}</option>
                            ))}
                        </select>
                    </div>
                    
                    <hr className="border-gray-200" />

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-sm font-medium text-gray-700">Rango de Fechas</label>
                            <button
                                onClick={handleClearDates}
                                className="text-xs text-cyan-600 hover:text-cyan-800 underline"
                            >
                                Limpiar
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="start-date" className="block text-xs text-gray-500 mb-1">Inicio</label>
                                <input
                                    type="date"
                                    id="start-date"
                                    value={startDate || ''}
                                    onChange={(e) => setStartDate(e.target.value || null)}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm pl-3 pr-2 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-900"
                                />
                            </div>
                            <div>
                                <label htmlFor="end-date" className="block text-xs text-gray-500 mb-1">Fin</label>
                                <input
                                    type="date"
                                    id="end-date"
                                    value={endDate || ''}
                                    onChange={(e) => setEndDate(e.target.value || null)}
                                    min={startDate || undefined}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-md shadow-sm pl-3 pr-2 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-gray-900"
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
        </aside>
    );
};