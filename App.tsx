
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sidebar } from './components/Sidebar';
import { MultiTrendChart } from './components/MultiTrendChart';
import { HistogramChart } from './components/HistogramChart';
import { ChartCard } from './components/ChartCard';
import { TrendingUpIcon } from './components/icons/TrendingUpIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { DataFormatModal } from './components/DataFormatModal';
import { RawMaterialData } from './types';
import { NUTRIENTS } from './constants';
import { SAMPLE_DATA } from './sample-data';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { Logo } from './components/Logo';
import { ParameterHistograms } from './components/ParameterHistograms';
import { ParameterMonthlyTrends } from './components/ParameterMonthlyTrends';
import { NutrientStatsTable } from './components/NutrientStatsTable';
import { TableIcon } from './components/icons/TableIcon';


declare const Papa: any;
declare const XLSX: any;

const ALL_FILTER = 'Todos';
type ViewMode = 'general' | 'histograms' | 'monthly_trends' | 'statistics';

const excelSerialDateToJSDate = (serial: number): Date => {
    // Excel's epoch starts on 1900-01-01, but it incorrectly assumes 1900 was a leap year.
    // JS's epoch is 1970-01-01. The difference is 25569 days.
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; // 86400 seconds in a day
    const date_info = new Date(utc_value * 1000);

    return new Date(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate());
};


const parseDateDDMMYYYY = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;

    // Handle Excel serial dates (which are numbers)
    if (typeof dateInput === 'number' && dateInput > 1) {
        return excelSerialDateToJSDate(dateInput);
    }
    
    const dateStr = String(dateInput).trim();
    if (dateStr === '') return null;

    // Handle string dates like 'dd/mm/yyyy' or 'dd-mm-yyyy'
    const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (parts) {
        const day = parseInt(parts[1], 10);
        const month = parseInt(parts[2], 10) - 1; // Month is 0-indexed in JS
        const year = parseInt(parts[3], 10);
        
        // Basic validation for sanity
        if (year < 1000 || year > 3000 || month < 0 || month > 11 || day < 1 || day > 31) {
            return null;
        }
        
        const date = new Date(Date.UTC(year, month, day));
        
        // Final check if the date is valid (e.g., avoids Feb 30th)
        if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
            return date;
        }
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

    const [selectedMaterial, setSelectedMaterial] = useState<string>(firstSampleMaterial);
    
    // View Mode State
    const [currentView, setCurrentView] = useState<ViewMode>('general');
    
    // State for Multi-Chart
    const [comparisonNutrients, setComparisonNutrients] = useState<string[]>(['proteina', 'humedad', 'grasa']);

    const [selectedSubtipo, setSelectedSubtipo] = useState<string>(ALL_FILTER);
    const [selectedCliente, setSelectedCliente] = useState<string>(ALL_FILTER);
    const [selectedProveedor, setSelectedProveedor] = useState<string>(ALL_FILTER);
    const [selectedOrigen, setSelectedOrigen] = useState<string>(ALL_FILTER);
    const [startDate, setStartDate] = useState<string | null>(null);
    const [endDate, setEndDate] = useState<string | null>(null);
    
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
                     throw new Error('No se encontraron datos válidos en el archivo. Asegúrate de que las columnas "date" y "material" existan y que las fechas tengan un formato reconocible (ej. dd/mm/yyyy).');
                }
                
                setRawData(formattedData);
                setSelectedMaterial(formattedData[0].material);
                setSelectedSubtipo(ALL_FILTER);
                setSelectedCliente(ALL_FILTER);
                setSelectedProveedor(ALL_FILTER);
                setSelectedOrigen(ALL_FILTER);
                setStartDate(null);
                setEndDate(null);


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

    // Filter used for the multi-nutrient chart and Histograms (preserves all keys)
    const multiTrendData = useMemo(() => {
        return rawData
        .filter(d => {
            const itemDateStr = d.date.substring(0, 10);
            return d.material === selectedMaterial && 
                (selectedSubtipo === ALL_FILTER || d.subtipo === selectedSubtipo) &&
                (selectedCliente === ALL_FILTER || d.Cliente === selectedCliente) &&
                (selectedProveedor === ALL_FILTER || d.Proveedor === selectedProveedor) &&
                (selectedOrigen === ALL_FILTER || d.Origen === selectedOrigen) &&
                (!startDate || itemDateStr >= startDate) &&
                (!endDate || itemDateStr <= endDate)
        });
    }, [rawData, selectedMaterial, selectedSubtipo, selectedCliente, selectedProveedor, selectedOrigen, startDate, endDate]);

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
    
    const handleAiAnalysis = async () => {
        if (multiTrendData.length === 0) {
            setAiError("No hay suficientes datos para realizar un análisis.");
            setIsAiModalOpen(true);
            return;
        }

        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiAnalysisResult(null);
        setAiError(null);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const dateRange = `${new Date(multiTrendData[0].date).toLocaleDateString('es-ES')} a ${new Date(multiTrendData[multiTrendData.length - 1].date).toLocaleDateString('es-ES')}`;
            
        const activeFilters: string[] = [];
        if (selectedSubtipo !== ALL_FILTER) activeFilters.push(`Subtipo: ${selectedSubtipo}`);
        if (selectedCliente !== ALL_FILTER) activeFilters.push(`Cliente: ${selectedCliente}`);
        if (selectedProveedor !== ALL_FILTER) activeFilters.push(`Proveedor: ${selectedProveedor}`);
        if (selectedOrigen !== ALL_FILTER) activeFilters.push(`Origen: ${selectedOrigen}`);
        const filtersString = activeFilters.length > 0 ? activeFilters.join(', ') : 'Ninguno';

        // Calculate stats for all nutrients dynamically
        const nutrientStats = availableNutrients.map(n => {
             const values = multiTrendData.map(d => d[n.key] as number).filter(v => typeof v === 'number' && !isNaN(v));
             if (values.length === 0) return null;
             
             const count = values.length;
             const sum = values.reduce((acc, val) => acc + val, 0);
             const mean = sum / count;
             const min = Math.min(...values);
             const max = Math.max(...values);
             const squaredDiffs = values.map(val => (val - mean) ** 2);
             const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / (count > 1 ? count - 1 : 1);
             const stdDev = Math.sqrt(variance);
             
             return ` - **${n.label}**: Promedio ${mean.toFixed(2)}, DE ${stdDev.toFixed(2)}, Mín ${min.toFixed(2)}, Máx ${max.toFixed(2)} (${count} muestras)`;
        }).filter(Boolean).join('\n');

        const prompt = `
            Actúa como un nutricionista animal senior, especialista en formulación de piensos y control de calidad de materias primas para la industria pecuaria.
            Basado en los siguientes datos consolidados para la materia prima '${selectedMaterial}', proporciona un análisis exhaustivo y profesional sobre la calidad general del ingrediente en formato Markdown.

            **Resumen del Contexto:**
            - **Rango de Fechas:** ${dateRange}
            - **Filtros Aplicados:** ${filtersString}
            
            **Estadísticas Generales por Nutriente:**
            ${nutrientStats}

            **Tu análisis debe cubrir los siguientes puntos:**
            1.  **Evaluación de Calidad General:** Basado en los promedios y desviaciones estándar, califica la calidad general de esta materia prima. ¿Cumple con lo esperado para un ingrediente de su tipo?
            2.  **Identificación de Puntos Críticos:** Señala si algún nutriente específico muestra una variabilidad preocupante (Alta DE) o valores fuera de lo común (Mínimos/Máximos extremos).
            3.  **Impacto en Formulación:** ¿Cómo afectan estos resultados a la formulación de raciones? Menciona si se deben ajustar matrices nutricionales o aplicar márgenes de seguridad específicos para ciertos nutrientes.
            4.  **Recomendaciones:** Ofrece consejos prácticos (ej. aumentar muestreo de ciertos parámetros, contactar al proveedor, etc.).

            Utiliza un lenguaje técnico pero claro. Estructura tu respuesta con encabezados en negrita y listas para facilitar la lectura.
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

    const toggleComparisonNutrient = (key: string) => {
        setComparisonNutrients(prev => 
            prev.includes(key) 
                ? prev.filter(k => k !== key) 
                : [...prev, key]
        );
    };

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row">
            <Sidebar
                onFileParse={handleFileParse}
                selectedMaterial={selectedMaterial}
                setSelectedMaterial={setSelectedMaterial}
                materials={availableMaterials}
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

                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
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
                        <div className="text-center p-8 bg-white border border-slate-200 rounded-lg">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Hay Datos Para Mostrar</h2>
                            <p className="text-slate-500">{error ? error : 'Sube un archivo para visualizar tus datos.'}</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-6">
                           <div className="grid md:grid-cols-3 items-center gap-y-4 gap-x-2">
                                <div className="md:col-start-2 text-center">
                                    <div className="flex justify-center">
                                        <Logo as="h1" showMaterial={selectedMaterial} />
                                    </div>
                                    <p className="text-slate-500 mt-1">Análisis de <span className='font-semibold text-slate-700'>{selectedMaterial}</span></p>
                                </div>
                                <div className="justify-self-center md:col-start-3 md:justify-self-end">
                                    <button 
                                        onClick={handleAiAnalysis}
                                        className="flex items-center bg-cyan-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={multiTrendData.length === 0 || isLoading}
                                    >
                                        <SparklesIcon />
                                        <span className="ml-2">Analizar con IA</span>
                                    </button>
                                </div>
                            </div>
                        </header>

                        {/* Navigation Tabs */}
                        <div className="flex justify-center mb-6">
                            <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex space-x-1 overflow-x-auto max-w-full">
                                <button
                                    onClick={() => setCurrentView('general')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                        currentView === 'general'
                                            ? 'bg-cyan-100 text-cyan-800'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Resumen General
                                </button>
                                <button
                                    onClick={() => setCurrentView('histograms')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                        currentView === 'histograms'
                                            ? 'bg-cyan-100 text-cyan-800'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Histogramas por Parámetro
                                </button>
                                <button
                                    onClick={() => setCurrentView('monthly_trends')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                        currentView === 'monthly_trends'
                                            ? 'bg-cyan-100 text-cyan-800'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Tendencias Mensuales
                                </button>
                                <button
                                    onClick={() => setCurrentView('statistics')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                                        currentView === 'statistics'
                                            ? 'bg-cyan-100 text-cyan-800'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    Estadísticas Detalladas
                                </button>
                            </div>
                        </div>
                        
                        {currentView === 'general' && (
                            <>
                                <div className="mb-6">
                                    <ChartCard title="Comparativa de Tendencias Multi-Nutriente" icon={<TrendingUpIcon />}>
                                        <div className="flex flex-col h-full">
                                            <div className="flex flex-wrap gap-2 mb-4 max-h-24 overflow-y-auto p-1">
                                                {availableNutrients.map(n => {
                                                    const isActive = comparisonNutrients.includes(n.key);
                                                    return (
                                                        <button
                                                            key={n.key}
                                                            onClick={() => toggleComparisonNutrient(n.key)}
                                                            className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                                                                isActive 
                                                                    ? 'bg-slate-800 text-white border-slate-800 shadow-sm' 
                                                                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                            style={isActive ? { backgroundColor: n.color, borderColor: n.color } : {}}
                                                        >
                                                            {n.label.replace(' (%)', '')}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            <div className="flex-1 min-h-0">
                                                <MultiTrendChart data={multiTrendData} activeNutrients={comparisonNutrients} />
                                            </div>
                                        </div>
                                    </ChartCard>
                                </div>
                            </>
                        )}
                        
                        {currentView === 'histograms' && (
                            <div className="animate-fade-in">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4 px-1">Histogramas de Calidad por Parámetro</h2>
                                <ParameterHistograms data={multiTrendData} />
                            </div>
                        )}

                        {currentView === 'monthly_trends' && (
                             <div className="animate-fade-in">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4 px-1">Tendencias Mensuales por Parámetro</h2>
                                <ParameterMonthlyTrends data={multiTrendData} />
                            </div>
                        )}
                        
                        {currentView === 'statistics' && (
                            <div className="animate-fade-in h-[calc(100vh-250px)] min-h-[500px]">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4 px-1">Estadísticas Detalladas</h2>
                                <ChartCard title={`Estadísticas Detalladas para ${selectedMaterial}`} icon={<TableIcon />}>
                                     <NutrientStatsTable data={multiTrendData} material={selectedMaterial} />
                                </ChartCard>
                            </div>
                        )}
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
                material={selectedMaterial}
                nutrient="General"
            />
        </div>
    );
};

export default App;
