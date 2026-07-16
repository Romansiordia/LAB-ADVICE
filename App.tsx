
import React, { useState, useMemo, useEffect, startTransition } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sidebar } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { MultiTrendChart } from './components/MultiTrendChart';
import { TrendChart } from './components/TrendChart';
import { HistogramChart } from './components/HistogramChart';
import { TrendingUpIcon } from './components/icons/TrendingUpIcon';
import { ChartBarIcon } from './components/icons/ChartBarIcon';
import { DataFormatModal } from './components/DataFormatModal';
import { RawMaterialData } from './types';
import { NUTRIENTS, MYCOTOXIN_THRESHOLDS, SPECIES_LABELS } from './constants';
import { MycotoxinGauge } from './components/MycotoxinGauge';
import { SAMPLE_DATA } from './sample-data';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { AiChatbot } from './components/AiChatbot';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { MonthlyTrendChart } from './components/MonthlyTrendChart';
import { CalendarIcon } from './components/icons/CalendarIcon';
import { Logo } from './components/Logo';
import { ParameterMonthlyTrends, getMonthlyData } from './components/ParameterMonthlyTrends';
import { NutrientStatsTable } from './components/NutrientStatsTable';
import { TableIcon } from './components/icons/TableIcon';
import { ChartZoomModal } from './components/ChartZoomModal';
import { ChevronRightIcon } from './components/icons/ChevronRightIcon';
import { ChevronLeftIcon } from './components/icons/ChevronLeftIcon';
import { FileUpload } from './components/FileUpload';
import { UploadIcon } from './components/icons/UploadIcon';
import { InfoIcon } from './components/icons/InfoIcon';
import { KpiCard } from './components/KpiCard';
import { getNutrientIcon } from './components/icons/getNutrientIcon';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { ShieldCheckIcon } from './components/icons/ShieldCheckIcon';
import { SupplierAnalysis } from './components/SupplierAnalysis';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

declare const Papa: any;
declare const XLSX: any;

const ALL_FILTER = 'Todos';
type ViewMode = 'general' | 'histograms' | 'monthly_trends' | 'statistics' | 'supplier_quality';
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
        if (year >= 1000 && year <= 3000 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            const date = new Date(Date.UTC(year, month, day));
            if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                return date;
            }
        }
    }
    // Fallback to standard JS parsing (handles YYYY-MM-DD, MM/DD/YYYY, etc.)
    const fallbackDate = new Date(dateStr);
    if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate;
    }
    return null;
};

const App: React.FC = () => {
    const [user, setUser] = useState<{ nombre: string; usuario: string } | null>(() => {
        try {
            const saved = localStorage.getItem('authenticated_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const handleLogout = () => {
        localStorage.removeItem('authenticated_user');
        setUser(null);
    };

    const handleLoginSuccess = (userData: { nombre: string; usuario: string }) => {
        localStorage.setItem('authenticated_user', JSON.stringify(userData));
        setUser(userData);
    };

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
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
    
    const handleGeneratePdf = async () => {
        setIsGeneratingPdf(true);
        // Wait for React to render the full report view and charts to resize
        await new Promise(resolve => setTimeout(resolve, 800));
        
        try {
            const element = document.getElementById('report-content');
            if (element) {
                // Force scroll to top to avoid cut off
                window.scrollTo(0, 0);
                
                const canvas = await html2canvas(element, { 
                    scale: 2, 
                    useCORS: true, 
                    backgroundColor: '#163c65', // Match background color for better look
                    windowWidth: 1200, // Force desktop width for PDF rendering to avoid dozens of mobile pages
                    onclone: (document) => {
                        const el = document.getElementById('report-content');
                        if (el) {
                           // Force specific styles for PDF
                           el.style.width = '1200px';
                           el.style.maxWidth = '1200px';
                           el.style.margin = '0';
                        }
                    }
                });
                const imgData = canvas.toDataURL('image/png');
                
                // Generar un PDF continuo (una sola página) con altura adaptada para evitar saltos de página que corten elementos
                const pdfWidth = 210; // Ancho estándar A4 en mm
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                
                pdf.save(`Reporte_Calidad_${selectedMaterial}_${new Date().toISOString().split('T')[0]}.pdf`);
            }
        } catch (error) {
            console.error('Error al generar PDF:', error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const [selectedMaterial, setSelectedMaterial] = useState<string>(ALL_FILTER);
    const [currentView, setCurrentView] = useState<ViewMode>('general');
    const [selectedCategory, setSelectedCategory] = useState<'nutrients' | 'mycotoxins'>('nutrients');
    const [selectedSpecies, setSelectedSpecies] = useState<string>('betail');
    
    const [selectedSubtipo, setSelectedSubtipo] = useState<string>(ALL_FILTER);
    const [selectedLote, setSelectedLote] = useState<string>(ALL_FILTER);
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
                    for (const key in row) { 
                        const cleanKey = key.trim().replace(/^\uFEFF/, '').toLowerCase();
                        newRow[cleanKey] = row[key]; 
                    }
                    return newRow;
                });
                const formattedData: RawMaterialData[] = normalizedData
                    .map((row: any) => {
                        const dateObj = parseDateDDMMYYYY(row.date || row.fecha);
                        if (!dateObj) return null;
                        const newRow: RawMaterialData = {
                            noId: row['no id'] || row['noid'] || row['no_id'] || row['no. id'] || row['no.id'] || row['id'] || row['no_ id'] || row['id muestra'] || row['id_muestra'],
                            date: dateObj.toISOString(),
                            material: row.material || 'Desconocido',
                            subtipo: row.subtipo,
                            lote: row.lote || row.batch,
                            Cliente: row.cliente,
                            Proveedor: row.proveedor,
                            Origen: row.origen,
                        };
                        NUTRIENTS.forEach(nutrient => {
                            const rawValue = row[nutrient.key];
                            if (rawValue !== undefined && rawValue !== null) {
                                const strVal = String(rawValue).trim();
                                if (strVal !== '' && !strVal.includes('<') && !strVal.includes('>') && !strVal.includes('...') && !strVal.includes('…')) {
                                    const cleaned = strVal.replace(/(?:%|ppm|ppb)\s*$/i, '').replace(',', '.').trim();
                                    const parsed = parseFloat(cleaned);
                                    if (!isNaN(parsed) && isFinite(parsed) && /^-?\d*\.?\d+$/.test(cleaned)) {
                                        newRow[nutrient.key] = parsed;
                                    }
                                }
                            }
                        });
                        return newRow;
                    })
                    .filter((row): row is RawMaterialData => row !== null && !!row.date && !!row.material)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                if(formattedData.length === 0) throw new Error('No se encontraron datos válidos. Revisa el formato de fecha (DD/MM/AAAA) y las columnas requeridas (date, material).');
                setRawData(formattedData);
                setSelectedMaterial(ALL_FILTER);
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
            return (selectedMaterial === ALL_FILTER || d.material === selectedMaterial) && 
                (selectedSubtipo === ALL_FILTER || d.subtipo === selectedSubtipo) &&
                (selectedLote === ALL_FILTER || d.lote === selectedLote) &&
                (selectedCliente === ALL_FILTER || d.Cliente === selectedCliente) &&
                (selectedProveedor === ALL_FILTER || d.Proveedor === selectedProveedor) &&
                (selectedOrigen === ALL_FILTER || d.Origen === selectedOrigen) &&
                (!startDate || itemDateStr >= startDate) &&
                (!endDate || itemDateStr <= endDate)
        });
    }, [rawData, selectedMaterial, selectedSubtipo, selectedLote, selectedCliente, selectedProveedor, selectedOrigen, startDate, endDate]);

    const availableMaterials = useMemo(() => {
        if (rawData.length === 0) return [];
        return [ALL_FILTER, ...new Set(rawData.map(d => d.material))];
    }, [rawData]);

    const availableNutrientsFull = useMemo(() => {
        if (rawData.length === 0) return [];
        return NUTRIENTS.filter(n => rawData.some(d => (selectedMaterial === ALL_FILTER || d.material === selectedMaterial) && d[n.key] !== undefined));
    }, [rawData, selectedMaterial]);

    const availableNutrients = useMemo(() => {
        if (isGeneratingPdf) return availableNutrientsFull;
        return availableNutrientsFull.filter(n => (n.category || 'nutrients') === selectedCategory);
    }, [availableNutrientsFull, selectedCategory, isGeneratingPdf]);

    const activeCategoryNutrients = availableNutrients;
    
    const createFilterOptions = (key: keyof RawMaterialData) => useMemo(() => {
        const values = new Set(rawData.filter(d => (selectedMaterial === ALL_FILTER || d.material === selectedMaterial) && d[key]).map(d => d[key] as string));
        return [ALL_FILTER, ...Array.from(values)];
    }, [rawData, selectedMaterial]);
    
    const availableSubtipos = createFilterOptions('subtipo');
    const availableLotes = createFilterOptions('lote');
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
                .filter(d => d[zoomConfig.key] !== undefined && d[zoomConfig.key] !== null && d[zoomConfig.key] !== '' && Number(d[zoomConfig.key]) !== 0)
                .map(d => ({ date: d.date, value: Number(d[zoomConfig.key]), noId: d.noId, lote: d.lote }));
            return { config, data };
        } else {
            const data = getMonthlyData(multiTrendData, zoomConfig.key);
            return { config, data };
        }
    }, [zoomConfig, multiTrendData]);

    if (!user) {
        return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
    }

    return (
        <div className="min-h-screen bg-transparent text-slate-100 flex flex-col md:flex-row overflow-hidden">
            <Sidebar
                user={user}
                onLogout={handleLogout}
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
                selectedLote={selectedLote}
                setSelectedLote={setSelectedLote}
                availableLotes={availableLotes}
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
                        className="hidden md:flex absolute top-4 left-4 z-40 p-2 bg-ui-card border border-ui-border text-slate-400 hover:text-ui-accent rounded-lg shadow-md transition-all hover:scale-105"
                        title="Expandir menú"
                    >
                        <ChevronRightIcon />
                    </button>
                )}

                {/* Mobile Toggle (Simple visible version) */}
                {!isSidebarCollapsed && (
                    <button 
                        onClick={() => setIsSidebarCollapsed(true)}
                        className="md:hidden mb-4 p-2 bg-ui-card border border-ui-border text-slate-400 rounded-lg flex items-center justify-center w-full shadow-sm"
                    >
                        <span className="text-sm font-semibold mr-2">Ocultar Filtros</span>
                        <ChevronLeftIcon />
                    </button>
                )}
                {isSidebarCollapsed && (
                    <button 
                        onClick={() => setIsSidebarCollapsed(false)}
                        className="md:hidden mb-4 p-2 bg-ui-card border border-ui-border text-ui-accent rounded-lg flex items-center justify-center w-full shadow-sm"
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
                        <div className="text-center p-8 bg-ui-card border border-ui-border rounded-lg max-w-md w-full shadow-lg flex flex-col items-center">
                            <h2 className="text-2xl font-bold text-slate-100 mb-2">No Hay Datos Para Mostrar</h2>
                            <p className="text-slate-400 mb-6">Sube un archivo para visualizar tus datos y empezar el análisis pecuario.</p>
                            <div className="w-full h-32 flex items-center justify-center">
                                <FileUpload onFileParse={handleFileParse} isLoading={isLoading} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <header className="mb-6">
                            <div className="bg-ui-card rounded-xl border border-ui-border p-4 md:p-6 flex flex-col xl:flex-row items-center justify-between gap-4">
                                <div className="flex flex-wrap gap-2 w-full xl:w-auto">
                                    {[
                                        { id: 'general', label: 'Tendencias' },
                                        { id: 'monthly_trends', label: 'Tendencias Mensuales' },
                                        { id: 'histograms', label: 'Distribución' },
                                        { id: 'statistics', label: 'Estadísticas' },
                                        { id: 'supplier_quality', label: 'Proveedores' }
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                startTransition(() => {
                                                    setCurrentView(tab.id as ViewMode);
                                                });
                                            }}
                                            className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap border ${
                                                currentView === tab.id
                                                    ? 'bg-ui-accent text-[#040d1a] border-ui-accent shadow-[0_0_15px_rgba(0,222,255,0.3)]'
                                                    : 'bg-ui-card border-ui-border text-slate-300 hover:bg-ui-darkest'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto md:justify-end">
                                    <div>
                                        <label className="px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap text-slate-300 bg-ui-card border border-ui-border shadow-sm hover:bg-transparentest cursor-pointer flex items-center group">
                                            {isLoading ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-slate-400 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span>Subiendo...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <UploadIcon className="w-4 h-4 mr-2" />
                                                    <span>Subir Datos</span>
                                                </>
                                            )}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        handleFileParse(e.target.files[0]);
                                                    }
                                                }} 
                                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                                                disabled={isLoading}
                                            />
                                        </label>
                                    </div>
                                    <select
                                           value={selectedMaterial}
                                           onChange={(e) => setSelectedMaterial(e.target.value)}
                                           className="bg-ui-darkest border border-ui-border text-slate-100 font-bold rounded-lg px-4 py-2.5 uppercase w-full md:w-48 appearance-none focus:ring-1 focus:ring-ui-accent outline-none"
                                    >
                                        {availableMaterials.map(mat => (
                                            <option key={mat} value={mat}>{mat}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            startTransition(() => {
                                                setCurrentView('statistics');
                                            });
                                            setTimeout(() => {
                                                document.getElementById('ai-report-section')?.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        }}
                                        className="flex items-center justify-center bg-ui-darkest border border-ui-accent/50 text-ui-accent py-2.5 px-4 rounded-lg hover:bg-ui-accent/10 transition-all shrink-0 font-semibold"
                                        title="Ver Asistente IA"
                                    >
                                        <SparklesIcon />
                                        <span className="ml-2 hidden sm:inline">Reporte IA</span>
                                    </button>
                                    <button
                                        onClick={handleGeneratePdf}
                                        className="flex items-center justify-center bg-ui-darkest border border-ui-border text-slate-300 py-2.5 px-4 rounded-lg hover:border-ui-accent hover:text-ui-accent transition-all shrink-0"
                                        disabled={multiTrendData.length === 0 || isLoading || isGeneratingPdf}
                                        title="Generar PDF"
                                    >
                                        {isGeneratingPdf ? (
                                            <div className="animate-spin h-5 w-5 border-2 border-slate-500 border-t-transparent rounded-full" />
                                        ) : (
                                            <DownloadIcon />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </header>
                        
                        <div className="max-w-[1600px] mx-auto p-4 bg-transparent" id="report-content">
                            {isGeneratingPdf && (
                                <div className="mb-8 bg-ui-card p-6 rounded-xl shadow-sm border border-ui-border">
                                    <h1 className="text-2xl md:text-3xl font-bold text-slate-100 mb-2">
                                        Reporte de Calidad: <span className="text-ui-accent">{selectedMaterial}</span>
                                    </h1>
                                    <p className="text-slate-400 mb-6 text-sm">Generado el {new Date().toLocaleDateString()}</p>
                                    <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center">
                                        <TableIcon />
                                        <span className="ml-2">Resumen Estadístico Completo</span>
                                    </h2>
                                    <div className="border text-sm max-w-full overflow-auto border-ui-border rounded-xl p-4">
                                        <NutrientStatsTable data={multiTrendData} material={selectedMaterial} />
                                    </div>
                                </div>
                            )}

                            {(isGeneratingPdf || ['general', 'histograms', 'monthly_trends'].includes(currentView)) && (
                                <div className="space-y-8">
                                    {!isGeneratingPdf && (
                                        <div className="flex bg-ui-card shrink-0 p-1 rounded-xl border border-ui-border max-w-sm sm:max-w-md">
                                            <button
                                                onClick={() => setSelectedCategory('nutrients')}
                                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center uppercase tracking-wider ${
                                                    selectedCategory === 'nutrients'
                                                        ? 'bg-ui-accent text-[#040d1a] shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Calidad Nutricional
                                            </button>
                                            <button
                                                onClick={() => setSelectedCategory('mycotoxins')}
                                                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center uppercase tracking-wider ${
                                                    selectedCategory === 'mycotoxins'
                                                        ? 'bg-ui-accent text-[#040d1a] shadow-sm'
                                                        : 'text-slate-400 hover:text-slate-200'
                                                }`}
                                            >
                                                Micotoxinas
                                            </button>
                                        </div>
                                    )}

                                    {selectedCategory === 'mycotoxins' && (
                                        <div className="animate-fade-in space-y-6">
                                            {/* Species Selector Card */}
                                            {!isGeneratingPdf && (
                                                <div className="bg-ui-card rounded-xl border border-ui-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="flex h-2 w-2 rounded-full bg-ui-accent animate-pulse" />
                                                            <h3 className="font-bold text-slate-100 text-sm">Monitoreo de Límites por Especie Destino</h3>
                                                        </div>
                                                        <p className="text-xs text-slate-400">
                                                            Configura los límites máximos y transiciones de riesgo específicos de micotoxinas según la clasificación zootécnica de la imagen de control brindada.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-slate-400">Especie:</span>
                                                        <select
                                                            id="species-select"
                                                            value={selectedSpecies}
                                                            onChange={(e) => setSelectedSpecies(e.target.value)}
                                                            className="bg-ui-darkest border border-ui-border rounded-lg shadow-sm px-3 py-2 text-xs focus:ring-1 focus:ring-ui-accent focus:border-ui-accent text-slate-100 font-semibold min-w-[200px]"
                                                        >
                                                            {SPECIES_LABELS.map(lbl => (
                                                                <option key={lbl.key} value={lbl.key}>{lbl.label}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Speedometer Gauges Grid */}
                                            <div className="space-y-3">
                                                <div className="px-1 flex justify-between items-center">
                                                    <div>
                                                        <h4 className="text-sm font-semibold uppercase tracking-wider text-ui-accent">Monitoreo y Control de Riesgos por Micotoxinas</h4>
                                                        <p className="text-xs text-slate-400">Indicadores de riesgo integrados con análisis estadístico de promedio, desviación estándar y tasa de rechazo.</p>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-[10px] font-semibold text-slate-400">
                                                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" /> Seguro</div>
                                                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500/40" /> Límite</div>
                                                        <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500/20 border border-red-500/40" /> Crítico</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                                    {activeCategoryNutrients.map((nutrient) => {
                                                        const chartData = multiTrendData
                                                            .filter(d => d[nutrient.key] !== undefined && d[nutrient.key] !== null && d[nutrient.key] !== '' && Number(d[nutrient.key]) !== 0)
                                                            .map(d => ({ date: d.date, value: Number(d[nutrient.key]), noId: d.noId, lote: d.lote }));
                                                        
                                                        const values = chartData.map(d => d.value);
                                                        if (values.length === 0) return null;
                                                        
                                                        const mean = values.reduce((a, b) => a + b, 0) / values.length;
                                                        const maxObserved = Math.max(...values);

                                                        const variance = values.length > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1) : 0;
                                                        const stdDev = Math.sqrt(variance);

                                                        const thresholds = MYCOTOXIN_THRESHOLDS[selectedSpecies]?.[nutrient.key];
                                                        if (!thresholds) return null;

                                                        const rejectedCount = values.filter(v => v > thresholds.part2_max).length;
                                                        const rejectionRate = values.length > 0 ? (rejectedCount / values.length) * 100 : 0;

                                                        const unit = nutrient.label.includes('ppb') ? 'ppb' : 'ppm';
                                                        const cleanLabel = nutrient.label.replace(' (ppb)', '').replace(' (ppm)', '');

                                                        return (
                                                            <MycotoxinGauge
                                                                key={`gauge-${nutrient.key}`}
                                                                value={mean}
                                                                maxObserved={maxObserved}
                                                                thresholds={thresholds}
                                                                label={cleanLabel}
                                                                unit={unit}
                                                                stdDev={stdDev}
                                                                rejectionRate={rejectionRate}
                                                                onClick={() => startTransition(() => setZoomConfig({ type: currentView === 'histograms' ? 'histogram' : currentView === 'monthly_trends' ? 'monthly' : 'daily', key: nutrient.key }))}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {selectedCategory === 'nutrients' && currentView !== 'monthly_trends' && (
                                        <div className="animate-fade-in grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                            {activeCategoryNutrients.map((nutrient) => {
                                                const chartData = multiTrendData
                                                    .filter(d => d[nutrient.key] !== undefined && d[nutrient.key] !== null && d[nutrient.key] !== '' && Number(d[nutrient.key]) !== 0)
                                                    .map(d => ({ date: d.date, value: Number(d[nutrient.key]), noId: d.noId, lote: d.lote }));
                                                
                                                const values = chartData.map(d => d.value);
                                                const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                                                const variance = values.length > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1) : 0;
                                                const stdDev = Math.sqrt(variance);

                                                const lcl = mean - stdDev;
                                                const ucl = mean + stdDev;
                                                const rejectedCount = values.filter(v => v < lcl || v > ucl).length;
                                                const rejectionRate = values.length > 0 ? (rejectedCount / values.length) * 100 : 0;

                                                const unit = nutrient.label.includes('%') 
                                                    ? '%' 
                                                    : nutrient.label.includes('ppb') 
                                                    ? ' ppb' 
                                                    : nutrient.label.includes('ppm') 
                                                    ? ' ppm' 
                                                    : nutrient.label.includes('µm') 
                                                    ? ' µm' 
                                                    : '';

                                                const formattedMean = chartData.length > 0 ? `${mean.toFixed(2)}${unit}` : undefined;
                                                const formattedSub = chartData.length > 0 ? `DE: ${stdDev.toFixed(2)}${unit}` : undefined;
                                                const cleanLabel = nutrient.label
                                                    .replace(' (%)', '')
                                                    .replace(' (ppb)', '')
                                                    .replace(' (ppm)', '')
                                                    .replace(' (µm)', '');
                                                
                                                return (
                                                    <KpiCard
                                                        key={`kpi-${nutrient.key}`}
                                                        title={`Prom. ${cleanLabel}`}
                                                        value={formattedMean}
                                                        subValue={formattedSub}
                                                        rejectionRate={rejectionRate}
                                                        icon={getNutrientIcon(nutrient.key, "w-4 h-4 text-white stroke-[2]")}
                                                        color={nutrient.color || '#0ea5e9'}
                                                        onClick={() => startTransition(() => setZoomConfig({ type: currentView === 'histograms' ? 'histogram' : currentView === 'monthly_trends' ? 'monthly' : 'daily', key: nutrient.key }))}
                                                    />
                                                );
                                            })}
                                        </div>
                                    )}

                                    {(!isGeneratingPdf && currentView === 'general') && (
                                        <div className="animate-fade-in mt-8">
                                            <div className="mb-6 px-1">
                                                <h2 className="text-xl font-bold text-slate-100">Tendencias de Parámetros</h2>
                                                <p className="text-slate-400 text-sm mt-1">Valor promedio de cada parámetro a lo largo del tiempo según los filtros actuales.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {availableNutrients.map((nutrient) => {
                                                    const chartData = multiTrendData
                                                        .filter(d => d[nutrient.key] !== undefined && d[nutrient.key] !== null && d[nutrient.key] !== '' && Number(d[nutrient.key]) !== 0)
                                                        .map(d => ({ date: d.date, value: Number(d[nutrient.key]), noId: d.noId, lote: d.lote }));
                                                    
                                                    if (chartData.length === 0) return null;
                                                    const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');

                                                    return (
                                                        <div key={`trend-${nutrient.key}`} className="relative bg-ui-card border border-ui-border rounded-xl p-5 shadow-lg">
                                                            <div className="flex items-center space-x-2 border-b border-ui-border/50 pb-3 mb-4">
                                                                <div className="text-slate-400">
                                                                    {getNutrientIcon(nutrient.key, "w-5 h-5")}
                                                                </div>
                                                                <h3 className="text-[14px] font-bold text-slate-200">Tendencia de {cleanLabel}</h3>
                                                            </div>
                                                            <div className="h-[220px]" onClick={() => setZoomConfig({ type: 'daily', key: nutrient.key })}>
                                                                <TrendChart 
                                                                    data={chartData} 
                                                                    nutrient={nutrient.label} 
                                                                    color={nutrient.color || '#0ea5e9'}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {(!isGeneratingPdf && currentView === 'histograms') && (
                                        <div className="animate-fade-in mt-8">
                                            <div className="mb-6 px-1">
                                                <h2 className="text-xl font-bold text-slate-100">Distribución de Parámetros</h2>
                                                <p className="text-slate-400 text-sm mt-1">Histograma de cada parámetro en todas las muestras según los filtros actuales.</p>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {availableNutrients.map((nutrient) => {
                                                    const chartData = multiTrendData
                                                        .filter(d => d[nutrient.key] !== undefined && d[nutrient.key] !== null && d[nutrient.key] !== '' && Number(d[nutrient.key]) !== 0)
                                                        .map(d => ({ date: d.date, value: Number(d[nutrient.key]), noId: d.noId, lote: d.lote }));
                                                    
                                                    if (chartData.length === 0) return null;
                                                    const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');

                                                    return (
                                                        <div key={`hist-${nutrient.key}`} className="relative bg-ui-card border border-ui-border rounded-xl p-5 shadow-lg">
                                                            <div className="flex items-center space-x-2 border-b border-ui-border/50 pb-3 mb-4">
                                                                <div className="text-slate-400">
                                                                    {getNutrientIcon(nutrient.key, "w-5 h-5")}
                                                                </div>
                                                                <h3 className="text-[14px] font-bold text-slate-200">Distribución de {cleanLabel}</h3>
                                                            </div>
                                                            <div className="h-[220px]" onClick={() => setZoomConfig({ type: 'histogram', key: nutrient.key })}>
                                                                <HistogramChart 
                                                                    data={chartData} 
                                                                    nutrient={nutrient.label} 
                                                                    color={nutrient.color || '#f97316'}
                                                                    isCompact={false}
                                                                />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}                                </div>
                            )}

                            {(!isGeneratingPdf && currentView === 'monthly_trends') && (
                                <div className="animate-fade-in mt-8">
                                    <h2 className="text-xl font-bold text-slate-100 mb-2 px-1 flex items-center">
                                        <CalendarIcon />
                                        <span className="ml-2">Promedios Mensuales Consolidados</span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mb-6 px-1 ml-7 max-w-4xl leading-relaxed">
                                        Estas tarjetas muestran el promedio consolidado correspondiente al <span className="text-slate-200 font-semibold">último mes con datos registrados</span> en su secuencia. Los indicadores visuales superiores muestran el <span className="text-slate-200 font-semibold">promedio general acumulado</span> de todos los registros en el periodo seleccionado.
                                    </p>
                                    <ParameterMonthlyTrends 
                                        data={multiTrendData} 
                                        onExpand={(key) => setZoomConfig({ type: 'monthly', key })}
                                        category={selectedCategory}
                                    />
                                </div>
                            )}
                            
                            {(isGeneratingPdf || currentView === 'statistics') && (
                                <div className="animate-fade-in mt-8 space-y-8">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-100 mb-6 px-1 flex items-center">
                                            <TableIcon />
                                            <span className="ml-2">Estadísticas Descriptivas</span>
                                        </h2>
                                        <div className="bg-ui-card border text-sm max-w-full overflow-auto border-ui-border rounded-2xl p-6 shadow-sm">
                                            <h3 className="text-slate-300 font-semibold mb-4 text-sm uppercase tracking-widest flex items-center">
                                                <span className="mr-2"><TableIcon /></span> 
                                                Tabla de Calidad: {selectedMaterial}
                                            </h3>
                                            <NutrientStatsTable data={multiTrendData} material={selectedMaterial} category={selectedCategory} />
                                        </div>
                                    </div>

                                    {/* AI Chatbot - Excluido del PDF para ahorrar espacio y mejorar formato */}
                                    {rawData.length > 0 && !isGeneratingPdf && (
                                        <AiChatbot 
                                            material={selectedMaterial} 
                                            data={multiTrendData} 
                                            category={selectedCategory} 
                                            user={user}
                                        />
                                    )}
                                </div>
                            )}

                            {(isGeneratingPdf || currentView === 'supplier_quality') && (
                                <div className="animate-fade-in mt-8">
                                    <h2 className="text-xl font-bold text-slate-100 mb-6 px-1 flex items-center">
                                        <ShieldCheckIcon />
                                        <span className="ml-2">Evaluación de Proveedores</span>
                                    </h2>
                                    <SupplierAnalysis data={multiTrendData} material={selectedMaterial} category={selectedCategory} />
                                </div>
                            )}

                            {isGeneratingPdf && (
                                <div className="mt-8 space-y-8">
                                    <div className="border-t border-ui-border/50 pt-8">
                                        <h2 className="text-xl font-bold text-slate-100 mb-2 px-1 flex items-center">
                                            <CalendarIcon />
                                            <span className="ml-2">Tendencias Mensuales: Parámetros Nutricionales</span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mb-6 px-1 ml-7">
                                            Historial consolidado mes a mes de los componentes nutricionales del material actual.
                                        </p>
                                        <div className="grid grid-cols-2 gap-6">
                                            {NUTRIENTS.filter(n => (n.category || 'nutrients') === 'nutrients').map((nutrient) => {
                                                const chartData = getMonthlyData(multiTrendData, nutrient.key);
                                                if (chartData.length === 0) return null;
                                                const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');
                                                return (
                                                    <div key={`pdf-monthly-${nutrient.key}`} className="bg-ui-card border border-ui-border rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
                                                        <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center">
                                                            <span className="mr-1.5">{getNutrientIcon(nutrient.key, "w-3.5 h-3.5 text-ui-accent")}</span>
                                                            {cleanLabel} ({nutrient.label.includes('%') ? '%' : nutrient.label.includes('ppm') ? 'ppm' : 'ppb'})
                                                        </h3>
                                                        <div className="flex-1 min-h-0">
                                                            <MonthlyTrendChart 
                                                                data={chartData} 
                                                                nutrient={cleanLabel} 
                                                                isCompact={true}
                                                                showAxes={true}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="border-t border-ui-border/50 pt-8">
                                        <h2 className="text-xl font-bold text-slate-100 mb-2 px-1 flex items-center">
                                            <CalendarIcon />
                                            <span className="ml-2">Tendencias Mensuales: Micotoxinas</span>
                                        </h2>
                                        <p className="text-xs text-slate-400 mb-6 px-1 ml-7">
                                            Historial consolidado mes a mes del nivel de micotoxinas detectado en las muestras.
                                        </p>
                                        <div className="grid grid-cols-2 gap-6">
                                            {NUTRIENTS.filter(n => (n.category || 'nutrients') === 'mycotoxins').map((nutrient) => {
                                                const chartData = getMonthlyData(multiTrendData, nutrient.key);
                                                if (chartData.length === 0) return null;
                                                const cleanLabel = nutrient.label.replace(/\s*\(.*?\)/, '');
                                                return (
                                                    <div key={`pdf-monthly-myco-${nutrient.key}`} className="bg-ui-card border border-ui-border rounded-xl p-4 shadow-sm flex flex-col h-[260px]">
                                                        <h3 className="text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center">
                                                            <span className="mr-1.5">{getNutrientIcon(nutrient.key, "w-3.5 h-3.5 text-ui-accent")}</span>
                                                            {cleanLabel} ({nutrient.label.includes('ppb') ? 'ppb' : 'ppm'})
                                                        </h3>
                                                        <div className="flex-1 min-h-0">
                                                            <MonthlyTrendChart 
                                                                data={chartData} 
                                                                nutrient={cleanLabel} 
                                                                isCompact={true}
                                                                showAxes={true}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
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
        </div>
    );
};

export default App;
