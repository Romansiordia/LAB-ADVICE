
import React, { useState, useMemo, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sidebar } from './components/Sidebar';
import { MultiTrendChart } from './components/MultiTrendChart';
import { TrendChart } from './components/TrendChart';
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
import { ParameterMonthlyTrends, getMonthlyData } from './components/ParameterMonthlyTrends';
import { NutrientStatsTable } from './components/NutrientStatsTable';
import { TableIcon } from './components/icons/TableIcon';
import { ChartZoomModal } from './components/ChartZoomModal';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
// Added missing ChevronLeftIcon import
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';


declare const Papa: any;
declare const XLSX: any;

const ALL_FILTER = 'Todos';
type ViewMode = 'general' | 'histograms' | 'monthly_trends' | 'statistics';
type ZoomType = 'daily' | 'histogram' | 'monthly';

interface ZoomConfig {
    type: ZoomType;
    key: string;
}

const excelSerialDateToJSDate = (serial: number): Date => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400; 
    const date_info = new Date(utc_value * 1000);
    return new Date(date_info.getUTCFullYear(), date_info.getUTCMonth(), date_info.getUTCDate());
};

const parseDateDDMMYYYY = (dateInput: any): Date | null => {
    if (dateInput === null || dateInput === undefined) return null;
    if (typeof dateInput === 'number' && dateInput > 1) {
        return excelSerialDateToJSDate(dateInput);
    }
    const dateStr = String(dateInput).trim();
    if (dateStr === '') return null;
    const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
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

    const [zoomConfig, setZoomConfig] = useState<ZoomConfig | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

    const firstSampleMaterial = SAMPLE_DATA.length > 0 ? SAMPLE_DATA[0].material : '';
    const [selectedMaterial, setSelectedMaterial] = useState<string>(firstSampleMaterial);
    const [currentView, setCurrentView] = useState<ViewMode>('general');
    
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
                    throw new Error('Formato de archivo no soportado.');
                }
                const normalizedData = parsedData.map(row => {
                    const newRow: {[key: string]: any} = {};
                    for (const key in row) { newRow[key.toLowerCase()] = row[key]; }
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
                            if (!isNaN(value)) { newRow[nutrient.key] = value; }
                        });
                        return newRow;
                    })
                    .filter((row): row is RawMaterialData => row !== null && !!row.date && !!row.material)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                if(formattedData.length === 0) throw new Error('No se encontraron datos válidos.');
                setRawData(formattedData);
                setSelectedMaterial(formattedData[0].material);
            } catch (e: any) {
                setError(`Error: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        if (fileExtension === 'csv') reader.readAsText(file);
        else reader.readAsBinaryString(file);
    };

    const multiTrendData = useMemo(() => {
        return rawData.filter(d => {
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

    const availableMaterials = useMemo(() => [...new Set(rawData.map(d => d.material))], [rawData]);
    const availableNutrients = useMemo(() => {
        if (rawData.length === 0) return [];
        const materialSample = rawData.find(d => d.material === selectedMaterial) || rawData[0];
        return materialSample ? NUTRIENTS.filter(n => materialSample[n.key] !== undefined) : [];
    }, [rawData, selectedMaterial]);
    
    const createFilterOptions = (key: keyof RawMaterialData) => useMemo(() => {
        const values = new Set(rawData.filter(d => d.material === selectedMaterial && d[key]).map(d => d[key] as string));
        return [ALL_FILTER, ...Array.from(values)];
    }, [rawData, selectedMaterial]);
    
    const availableSubtipos = createFilterOptions('subtipo');
    const availableClientes = createFilterOptions('Cliente');
    const availableProveedores = createFilterOptions('Proveedor');
    const availableOrigenes = createFilterOptions('Origen');
    
    const handleAiAnalysis = async () => {
        if (multiTrendData.length === 0) {
            setAiError("No hay suficientes datos.");
            setIsAiModalOpen(true);
            return;
        }
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Actúa como un experto nutricionista animal. Analiza la calidad de ${selectedMaterial} con estos datos...`;
        try {
            const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
            setAiAnalysisResult(response.text);
        } catch (e: any) {
            setAiError(`Error: ${e.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    const activeZoomedData = useMemo(() => {
        if (!zoomConfig) return null;
        const config = NUTRIENTS.find(n => n.key === zoomConfig.key);
        if (!config) return null;

        if (zoomConfig.type === 'daily' || zoomConfig.type === 'histogram') {
            const data = multiTrendData
                .filter(d => d[zoomConfig.key] !== undefined && d[zoomConfig.key] !== null)
                .map(d => ({ date: d.date, value: Number(d[zoomConfig.key]) }));
            return { config, data };
        } else {
            const data = getMonthlyData(multiTrendData, zoomConfig.key);
            return { config, data };
        }
    }, [zoomConfig, multiTrendData]);

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row overflow-hidden">
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
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto relative h-screen">
                {isSidebarCollapsed && (
                    <button 
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="hidden md:flex absolute top-4 left-4 z-40 p-2 bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 rounded-lg shadow-md transition-all hover:scale-105"
                        title="Expandir menú"
                    >
                        <ChevronRightIcon />
                    </button>
                )}

                {/* Mobile Toggle (Simple visible version) */}
                {!isSidebarCollapsed && (
                    <button 
                        onClick={() => setIsSidebarCollapsed(true)}
                        className="md:hidden mb-4 p-2 bg-white border border-slate-200 text-slate-400 rounded-lg flex items-center justify-center w-full shadow-sm"
                    >
                        <span className="text-sm font-semibold mr-2">Ocultar Filtros</span>
                        <ChevronLeftIcon />
                    </button>
                )}
                {isSidebarCollapsed && (
                    <button 
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="md:hidden mb-4 p-2 bg-white border border-slate-200 text-cyan-600 rounded-lg flex items-center justify-center w-full shadow-sm"
                    >
                        <span className="text-sm font-semibold mr-2">Mostrar Filtros</span>
                        <ChevronRightIcon />
                    </button>
                )}

                {isLoading && !isAiLoading ? (
                     <div className="flex items-center justify-center h-full">
                        <div className="animate-spin h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : rawData.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8 bg-white border border-slate-200 rounded-lg max-w-md w-full shadow-lg">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Hay Datos Para Mostrar</h2>
                            <p className="text-slate-500">Sube un archivo para visualizar tus datos y empezar el análisis pecuario.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-6">
                           <div className="grid md:grid-cols-3 items-center gap-y-4 gap-x-2">
                                <div className="md:col-start-2 text-center">
                                    <Logo as="h1" showMaterial={selectedMaterial} />
                                    <p className="text-slate-500 mt-1">Análisis de <span className='font-semibold text-slate-700'>{selectedMaterial}</span></p>
                                </div>
                                <div className="md:col-start-3 justify-self-end">
                                    <button 
                                        onClick={handleAiAnalysis}
                                        className="flex items-center bg-cyan-600 text-white font-semibold py-2.5 px-5 rounded-xl shadow-lg hover:bg-cyan-700 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                                        disabled={multiTrendData.length === 0 || isLoading}
                                    >
                                        <SparklesIcon />
                                        <span className="ml-2">Analizar con IA</span>
                                    </button>
                                </div>
                            </div>
                        </header>

                        <div className="flex justify-center mb-8">
                            <div className="bg-white p-1.5 rounded-xl shadow-sm border border-slate-200 flex space-x-1 overflow-x-auto max-w-full">
                                {[
                                    { id: 'general', label: 'Tendencias Diarias' },
                                    { id: 'histograms', label: 'Distribuciones' },
                                    { id: 'monthly_trends', label: 'Promedios Mensuales' },
                                    { id: 'statistics', label: 'Ficha Técnica' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setCurrentView(tab.id as ViewMode)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                                            currentView === tab.id
                                                ? 'bg-cyan-600 text-white shadow-md'
                                                : 'text-slate-500 hover:bg-slate-50'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="max-w-[1600px] mx-auto">
                            {currentView === 'general' && (
                                <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {availableNutrients.map((nutrient) => {
                                        const chartData = multiTrendData
                                            .filter(d => d[nutrient.key] !== undefined && d[nutrient.key] !== null)
                                            .map(d => ({ date: d.date, value: Number(d[nutrient.key]) }));
                                        if (chartData.length === 0) return null;
                                        return (
                                            <ChartCard 
                                                key={nutrient.key} 
                                                title={`Tendencia: ${nutrient.label}`} 
                                                icon={<TrendingUpIcon />}
                                                onExpand={() => setZoomConfig({ type: 'daily', key: nutrient.key })}
                                            >
                                                <TrendChart 
                                                    data={chartData} 
                                                    nutrient={nutrient.label} 
                                                    color={nutrient.color}
                                                />
                                            </ChartCard>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {currentView === 'histograms' && (
                                <div className="animate-fade-in">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 px-1 flex items-center">
                                        <ChartBarIcon />
                                        <span className="ml-2">Histogramas de Frecuencia</span>
                                    </h2>
                                    <ParameterHistograms 
                                        data={multiTrendData} 
                                        onExpand={(key) => setZoomConfig({ type: 'histogram', key })}
                                    />
                                </div>
                            )}

                            {currentView === 'monthly_trends' && (
                                <div className="animate-fade-in">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 px-1 flex items-center">
                                        <CalendarIcon />
                                        <span className="ml-2">Promedios Mensuales Consolidados</span>
                                    </h2>
                                    <ParameterMonthlyTrends 
                                        data={multiTrendData} 
                                        onExpand={(key) => setZoomConfig({ type: 'monthly', key })}
                                    />
                                </div>
                            )}
                            
                            {currentView === 'statistics' && (
                                <div className="animate-fade-in">
                                    <h2 className="text-xl font-bold text-slate-800 mb-6 px-1 flex items-center">
                                        <TableIcon />
                                        <span className="ml-2">Estadísticas Descriptivas</span>
                                    </h2>
                                    <ChartCard title={`Tabla de Calidad: ${selectedMaterial}`} icon={<TableIcon />}>
                                        <NutrientStatsTable data={multiTrendData} material={selectedMaterial} />
                                    </ChartCard>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            <ChartZoomModal 
                isOpen={!!zoomConfig} 
                onClose={() => setZoomConfig(null)}
                title={activeZoomedData ? (zoomConfig?.type === 'histogram' ? `Distribución: ${activeZoomedData.config.label}` : activeZoomedData.config.label) : ''}
            >
                {activeZoomedData && zoomConfig && (
                    <div className="h-full w-full">
                        {zoomConfig.type === 'daily' && (
                             <TrendChart 
                                data={activeZoomedData.data} 
                                nutrient={activeZoomedData.config.label} 
                                color={activeZoomedData.config.color}
                            />
                        )}
                        {zoomConfig.type === 'histogram' && (
                             <HistogramChart 
                                data={activeZoomedData.data} 
                                nutrient={activeZoomedData.config.label} 
                                color={activeZoomedData.config.color}
                            />
                        )}
                        {zoomConfig.type === 'monthly' && (
                             <MonthlyTrendChart 
                                data={activeZoomedData.data} 
                                nutrient={activeZoomedData.config.label} 
                            />
                        )}
                    </div>
                )}
            </ChartZoomModal>

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
