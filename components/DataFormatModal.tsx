
import React from 'react';
import { NUTRIENTS } from '../constants';
import { XIcon } from './icons/XIcon';

interface DataFormatModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DataFormatModal: React.FC<DataFormatModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const nutrientHeaders = NUTRIENTS.map(n => n.key);
    const otherHeaders = ['subtipo', 'Cliente', 'Proveedor', 'Origen'];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 transition-opacity"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-5xl w-full text-gray-700 relative transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    aria-label="Cerrar modal"
                >
                    <XIcon />
                </button>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Formato de Archivo Requerido</h2>
                <p className="mb-4">
                    Para asegurar una correcta visualización, tu archivo (CSV o Excel) debe contener las siguientes columnas en la primera fila (cabeceras). El orden no es estricto, pero los nombres deben coincidir.
                </p>

                <div className="mb-6 p-4 bg-gray-50 rounded-md">
                    <h3 className="font-semibold text-cyan-600 mb-2">Notas Importantes:</h3>
                    <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Las columnas <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">date</code> y <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">material</code> son <span className="font-bold">obligatorias</span>.</li>
                         <li>Las columnas <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">subtipo</code>, <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">Cliente</code>, <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">Proveedor</code>, y <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">Origen</code> son <span className="font-bold">opcionales</span>.</li>
                        <li>El formato de fecha debe ser <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">dd/mm/yyyy</code>. Se aceptan barras (<code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">/</code>) o guiones (<code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">-</code>) como separadores. También se leen correctamente los números de serie de fecha de Excel.</li>
                        <li>Los nombres de las columnas (cabeceras) no distinguen entre mayúsculas y minúsculas (ej. <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">cliente</code> es igual que <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">Cliente</code>).</li>
                        <li>Los nombres de las columnas de nutrientes deben coincidir con los "keys" de la tabla de abajo (ej. <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">proteina</code>, <code className="bg-gray-200 text-gray-800 p-1 rounded text-xs">humedad</code>).</li>
                        <li>Solo necesitas incluir las columnas de los nutrientes que deseas analizar.</li>
                        <li>Las celdas sin valor numérico serán ignoradas.</li>
                    </ul>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2">Tabla de Ejemplo:</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-300">
                    <table className="min-w-full divide-y divide-gray-300 text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-2 text-left font-semibold">date</th>
                                <th className="px-4 py-2 text-left font-semibold">material</th>
                                {otherHeaders.map(key => (
                                     <th key={key} className="px-4 py-2 text-left font-semibold">{key}</th>
                                ))}
                                {nutrientHeaders.slice(0, 4).map(key => (
                                    <th key={key} className="px-4 py-2 text-left font-semibold">{key}</th>
                                ))}
                                <th className="px-4 py-2 text-left font-semibold">...</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                            <tr>
                                <td className="px-4 py-2 whitespace-nowrap">26/10/2023</td>
                                <td className="px-4 py-2 whitespace-nowrap">Soya</td>
                                <td className="px-4 py-2 whitespace-nowrap">Harina</td>
                                <td className="px-4 py-2 whitespace-nowrap">Cliente A</td>
                                <td className="px-4 py-2 whitespace-nowrap">Cargill</td>
                                <td className="px-4 py-2 whitespace-nowrap">Argentina</td>
                                <td className="px-4 py-2 whitespace-nowrap">46.5</td>
                                <td className="px-4 py-2 whitespace-nowrap">12.1</td>
                                <td className="px-4 py-2 whitespace-nowrap">1.8</td>
                                <td className="px-4 py-2 whitespace-nowrap">3.2</td>
                                <td className="px-4 py-2 whitespace-nowrap">...</td>
                            </tr>
                            <tr>
                                <td className="px-4 py-2 whitespace-nowrap">26/10/2023</td>
                                <td className="px-4 py-2 whitespace-nowrap">Maiz</td>
                                <td className="px-4 py-2 whitespace-nowrap">Grano Entero</td>
                                <td className="px-4 py-2 whitespace-nowrap">Cliente B</td>
                                <td className="px-4 py-2 whitespace-nowrap">ADM</td>
                                <td className="px-4 py-2 whitespace-nowrap">USA</td>
                                <td className="px-4 py-2 whitespace-nowrap">8.8</td>
                                <td className="px-4 py-2 whitespace-nowrap">14.5</td>
                                <td className="px-4 py-2 whitespace-nowrap">4.2</td>
                                <td className="px-4 py-2 whitespace-nowrap">2.1</td>
                                <td className="px-4 py-2 whitespace-nowrap">...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                 <div className="mt-6 text-right">
                    <button 
                        onClick={onClose} 
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};
