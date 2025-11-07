import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sidebar } from './components/Sidebar';
import { TrendChart } from './components/TrendChart';
import { HistogramChart } from './components/HistogramChart';
import { ChartCard } from './components/ChartCard';
import { TrendingUpIcon } from './components/icons/TrendingUpIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { DataFormatModal } from './components/DataFormatModal';
import { RawMaterialData } from './types';
import { NUTRIENTS } from './constants';
import { SAMPLE_DATA } from './sample-data';
import { SummaryStats } from './components/SummaryStats';
import { AverageNutrientChart } from './components/AverageNutrientChart';
import { CalculatorIcon } from './components/icons/CalculatorIcon';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { SparklesIcon } from './components/icons/SparklesIcon';


declare const Papa: any;
declare const XLSX: any;

const ALL_FILTER = 'Todos';

const parseDateDDMMYYYY = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    
    const dateStr = String(dateInput).trim();
    if (dateStr === '') return null;

    const parts = dateStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1;
        const year = parseInt(parts[3], 10);

        if (year < 1000 || year > 3000 || month < 0 || month > 11 || day < 1 || day > 31) {
            return null;
        }

        const date = new Date(Date.UTC(year, month, day));
        
        if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return d;
    }

    return null;
};


const App: React.FC = () => {
    const [rawData, setRawData] = useState<RawMaterialData[]>(SAMPLE_DATA);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isSampleData, setIsSampleData] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    
    const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);

    const firstSampleMaterial = SAMPLE_DATA.length > 0 ? SAMPLE_DATA[0].material : '';
    const firstSampleNutrient = SAMPLE_DATA.length > 0 
        ? (NUTRIENTS.find(n => SAMPLE_DATA[0][n.key] !== undefined)?.key || NUTRIENTS[0].key) 
        : NUTRIENTS[0].key;

    const [selectedMaterial, setSelectedMaterial] = useState<string>(firstSampleMaterial);
    const [selectedNutrient, setSelectedNutrient] = useState<string>(firstSampleNutrient);
    const [selectedSubtipo, setSelectedSubtipo] = useState<string>(ALL_FILTER);
    const [selectedCliente, setSelectedCliente] = useState<string>(ALL_FILTER);
    const [selectedProveedor, setSelectedProveedor] = useState<string>(ALL_FILTER);
    const [selectedOrigen, setSelectedOrigen] = useState<string>(ALL_FILTER);

    useEffect(() => {
        setSelectedSubtipo(ALL_FILTER);
        setSelectedCliente(ALL_FILTER);
        setSelectedProveedor(ALL_FILTER);
        setSelectedOrigen(ALL_FILTER);
    }, [selectedMaterial]);

    
    const handleFileParse = (file: File) => {
        setIsLoading(true);
        setError(null);
        setRawData([]);
        setIsSampleData(false);

        const reader = new FileReader();
        const fileExtension = file.name.split('.').pop()?.toLowerCase();

        reader.onload = (event) => {
            try {
                const data = event.target?.result;
                let parsedData: any[] = [];

                if (fileExtension === 'csv') {
                    parsedData = Papa.parse(data, { header: true, skipEmptyLines: true }).data;
                } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });
                } else {
                    throw new Error('Formato de archivo no soportado. Por favor, sube un archivo CSV o Excel.');
                }
                
                const normalizedData = parsedData.map(row => {
                    const newRow: {[key: string]: any} = {};
                    for (const key in row) {
                        newRow[key.toLowerCase()] = row[key];
                    }
                    return newRow;
                });

                const formattedData: RawMaterialData[] = normalizedData
                    .map((row: any) => {
                        const dateObj = parseDateDDMMYYYY(row.date || row.fecha);
                        if (!dateObj) return null;

                        const newRow: RawMaterialData = {
                            date: dateObj.toISOString(),
                            material: row.material,
                            subtipo: row.subtipo,
                            Cliente: row.cliente,
                            Proveedor: row.proveedor,
                            Origen: row.origen,
                        };
                        NUTRIENTS.forEach(nutrient => {
                            const value = parseFloat(row[nutrient.key]);
                            if (!isNaN(value)) {
                                newRow[nutrient.key] = value;
                            }
                        });
                        return newRow;
                    })
                    .filter((row): row is RawMaterialData => row !== null && !!row.date && !!row.material && Object.keys(row).length > 2)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                if(formattedData.length === 0) {
                     throw new Error('No se encontraron datos válidos en el archivo. Asegúrate de que las columnas "date" (con formato dd-mm-yyyy) y "material" existan.');
                }
                
                setRawData(formattedData);
                setSelectedMaterial(formattedData[0].material);
                const firstAvailableNutrient = NUTRIENTS.find(n => formattedData[0][n.key] !== undefined)?.key || NUTRIENTS[0].key;
                setSelectedNutrient(firstAvailableNutrient);
                setSelectedSubtipo(ALL_FILTER);
                setSelectedCliente(ALL_FILTER);
                setSelectedProveedor(ALL_FILTER);
                setSelectedOrigen(ALL_FILTER);


            } catch (e: any) {
                setError(`Error al procesar el archivo: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        if (fileExtension === 'csv') {
             reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const filteredData = useMemo(() => {
        return rawData
        .filter(d => 
            d.material === selectedMaterial && 
            d[selectedNutrient] !== undefined &&
            (selectedSubtipo === ALL_FILTER || d.subtipo === selectedSubtipo) &&
            (selectedCliente === ALL_FILTER || d.Cliente === selectedCliente) &&
            (selectedProveedor === ALL_FILTER || d.Proveedor === selectedProveedor) &&
            (selectedOrigen === ALL_FILTER || d.Origen === selectedOrigen)
        )
        .map(d => ({...d, value: d[selectedNutrient] as number}));
    }, [rawData, selectedMaterial, selectedNutrient, selectedSubtipo, selectedCliente, selectedProveedor, selectedOrigen]);
    
    const availableMaterials = useMemo(() => {
        const materials = new Set(rawData.map(d => d.material));
        return [...materials];
    }, [rawData]);

    const availableNutrients = useMemo(() => {
        if (rawData.length === 0) return [];
        const materialSample = rawData.find(d => d.material === selectedMaterial) || rawData[0];
        if (materialSample) {
            return NUTRIENTS.filter(n => materialSample[n.key] !== undefined);
        }
        return [];
    }, [rawData, selectedMaterial]);
    
    const averageNutrientData = useMemo(() => {
        if (!selectedMaterial) return [];
        const materialData = rawData.filter(d => d.material === selectedMaterial);
        if (materialData.length === 0) return [];

        return availableNutrients.map(nutrient => {
            const values = materialData
                .map(d => d[nutrient.key])
                .filter((v): v is number => typeof v === 'number' && !isNaN(v));
            
            if (values.length === 0) {
                return { name: nutrient.label.replace(' (%)', ''), value: 0 };
            }

            const sum = values.reduce((acc, v) => acc + v, 0);
            return {
                name: nutrient.label.replace(' (%)', ''),
                value: parseFloat((sum / values.length).toFixed(2))
            };
        }).filter(item => item.value > 0);

    }, [rawData, selectedMaterial, availableNutrients]);

    const createFilterOptions = (key: keyof RawMaterialData) => useMemo(() => {
        const values = new Set(
            rawData
                .filter(d => d.material === selectedMaterial && d[key])
                .map(d => d[key] as string)
        );
        return [ALL_FILTER, ...Array.from(values)];
    }, [rawData, selectedMaterial]);
    
    const availableSubtipos = createFilterOptions('subtipo');
    const availableClientes = createFilterOptions('Cliente');
    const availableProveedores = createFilterOptions('Proveedor');
    const availableOrigenes = createFilterOptions('Origen');
    
    const stats = useMemo(() => {
        if (!filteredData || filteredData.length === 0) {
            return null;
        }

        const values = filteredData.map(d => d.value);
        const count = values.length;
        const sum = values.reduce((acc, val) => acc + val, 0);
        const mean = sum / count;
        const min = Math.min(...values);
        const max = Math.max(...values);

        const squaredDiffs = values.map(val => (val - mean) ** 2);
        const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (count > 1 ? count - 1 : 1);
        const stdDev = Math.sqrt(variance);

        return {
            count,
            mean: mean.toFixed(2),
            min: min.toFixed(2),
            max: max.toFixed(2),
            stdDev: stdDev.toFixed(2),
        };
    }, [filteredData]);

    const nutrientLabel = NUTRIENTS.find(n => n.key === selectedNutrient)?.label || selectedNutrient;
    
    const handleAiAnalysis = async () => {
        if (!stats) {
            setAiError("No hay suficientes datos para realizar un análisis.");
            setIsAiModalOpen(true);
            return;
        }

        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiAnalysisResult(null);
        setAiError(null);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const dateRange = filteredData.length > 0
            ? `${new Date(filteredData[0].date).toLocaleDateString('es-ES')} a ${new Date(filteredData[filteredData.length - 1].date).toLocaleDateString('es-ES')}`
            : 'N/A';
            
        const activeFilters: string[] = [];
        if (selectedSubtipo !== ALL_FILTER) activeFilters.push(`Subtipo: ${selectedSubtipo}`);
        if (selectedCliente !== ALL_FILTER) activeFilters.push(`Cliente: ${selectedCliente}`);
        if (selectedProveedor !== ALL_FILTER) activeFilters.push(`Proveedor: ${selectedProveedor}`);
        if (selectedOrigen !== ALL_FILTER) activeFilters.push(`Origen: ${selectedOrigen}`);
        const filtersString = activeFilters.length > 0 ? activeFilters.join(', ') : 'Ninguno';

        const prompt = `
            Actúa como un experto en nutrición animal y análisis de materias primas para la industria pecuaria. 
            Basado en los siguientes datos para la materia prima '${selectedMaterial}' y el nutriente '${nutrientLabel}', 
            proporciona una breve interpretación profesional de los resultados en formato Markdown.

            **Datos Clave:**
            - **Rango de Fechas:** ${dateRange}
            - **Número de Muestras:** ${stats.count}
            - **Promedio:** ${stats.mean}
            - **Mínimo:** ${stats.min}
            - **Máximo:** ${stats.max}
            - **Desviación Estándar:** ${stats.stdDev}
            - **Filtros Aplicados:** ${filtersString}

            **Tu análisis debe incluir:**
            1.  **Interpretación General:** Comenta sobre la consistencia y estabilidad del nutriente en la materia prima, usando la desviación estándar como indicador principal. Una desviación estándar baja sugiere consistencia.
            2.  **Rango de Valores:** Evalúa el rango entre el valor mínimo y máximo. ¿Es muy amplio? ¿Qué podría significar esta variabilidad?
            3.  **Implicaciones Prácticas:** Discute las posibles consecuencias de estos resultados para un nutricionista al formular dietas. Por ejemplo, ¿la variabilidad requiere un margen de seguridad mayor? ¿El promedio es adecuado?
            4.  **Conclusión y Recomendación:** Ofrece una conclusión concisa y, si es posible, una recomendación simple, como "la materia prima parece estable" o "se recomienda monitorear la variabilidad de este proveedor".

            Utiliza encabezados en negrita para cada sección y listas para los puntos. Sé claro y directo en tu explicación.
        `;

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
            setAiAnalysisResult(response.text);
        } catch (e: any) {
            console.error("Error calling Gemini API:", e);
            setAiError(`Hubo un error al contactar al asistente de IA. ${e.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col md:flex-row">
            <Sidebar
                onFileParse={handleFileParse}
                selectedMaterial={selectedMaterial}
                setSelectedMaterial={setSelectedMaterial}
                selectedNutrient={selectedNutrient}
                setSelectedNutrient={setSelectedNutrient}
                materials={availableMaterials}
                nutrients={availableNutrients}
                isLoading={isLoading}
                error={error}
                hasData={rawData.length > 0}
                isSampleData={isSampleData}
                onShowFormatHelp={() => setIsModalOpen(true)}
                
                selectedSubtipo={selectedSubtipo}
                setSelectedSubtipo={setSelectedSubtipo}
                availableSubtipos={availableSubtipos}

                selectedCliente={selectedCliente}
                setSelectedCliente={setSelectedCliente}
                availableClientes={availableClientes}

                selectedProveedor={selectedProveedor}
                setSelectedProveedor={setSelectedProveedor}
                availableProveedores={availableProveedores}

                selectedOrigen={selectedOrigen}
                setSelectedOrigen={setSelectedOrigen}
                availableOrigenes={availableOrigenes}
            />

            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {isLoading && !isAiLoading ? (
                     <div className="flex items-center justify-center h-full">
                        <svg className="animate-spin h-10 w-10 text-cyan-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : rawData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white border border-gray-200 rounded-lg">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Hay Datos Para Mostrar</h2>
                            <p className="text-gray-500">{error ? error : 'Sube un archivo para visualizar tus datos.'}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-6">
                           <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">Dashboard de Materia Prima: <span className="text-cyan-600">{selectedMaterial}</span></h1>
                                    <p className="text-gray-500 mt-1">Análisis de <span className='font-semibold text-gray-700'>{nutrientLabel}</span></p>
                                </div>
                                <button 
                                    onClick={handleAiAnalysis}
                                    className="flex items-center bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={filteredData.length === 0 || isLoading}
                                >
                                    <SparklesIcon />
                                    <span className="ml-2">Analizar con IA</span>
                                </button>
                            </div>
                        </header>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <ChartCard title="Tendencia a lo Largo del Tiempo" icon={<TrendingUpIcon />}>
                                <TrendChart data={filteredData} nutrient={nutrientLabel} />
                            </ChartCard>
                            <ChartCard title="Distribución de Frecuencia" icon={<ChartBarIcon />}>
                                <HistogramChart data={filteredData} nutrient={nutrientLabel} />
                            </ChartCard>
                        </div>
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <ChartCard title={`Promedio de Nutrientes para ${selectedMaterial}`} icon={<ChartBarIcon />}>
                                <AverageNutrientChart data={averageNutrientData} />
                            </ChartCard>
                            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-lg flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                                    <CalculatorIcon />
                                    <span className="ml-2">Resumen Estadístico ({nutrientLabel})</span>
                                </h3>
                                <div className="flex-grow">
                                    <SummaryStats stats={stats} />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </main>
            <DataFormatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <AiAnalysisModal 
                isOpen={isAiModalOpen} 
                onClose={() => setIsAiModalOpen(false)} 
                isLoading={isAiLoading}
                result={aiAnalysisResult}
                error={aiError}
            />
        </div>
    );
};

export default App;