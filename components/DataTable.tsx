import React from 'react';
import { RawMaterialData } from '../types';

interface DataTableProps {
    data: (RawMaterialData & { value: number })[];
    nutrient: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, nutrient }) => {
    if (!data || data.length === 0) {
        return null;
    }
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        // Usamos UTC para evitar desajustes por zona horaria
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Los meses son 0-indexados
        const year = date.getUTCFullYear();
        return `${day}-${month}-${year}`;
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-300 mb-4">Datos Crudos (primeras 50 filas)</h3>
            <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700 sticky top-0">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Fecha</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Subtipo</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Materia Prima</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Cliente</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Proveedor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Origen</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{nutrient}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {data.slice(0, 50).map((item, index) => (
                            <tr key={index} className="hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{formatDate(item.date)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.subtipo || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.material}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.Cliente || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.Proveedor || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.Origen || '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-cyan-400">{item.value.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};