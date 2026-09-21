import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputDDMMYYYYProps {
    id: string;
    label: string;
    value: string | null; // ISO YYYY-MM-DD
    onChange: (isoDate: string | null) => void;
    min?: string | null;  // ISO YYYY-MM-DD
    max?: string | null;  // ISO YYYY-MM-DD
}

/**
 * Convierte fecha ISO YYYY-MM-DD a formato visible DD/MM/AAAA
 */
const toDisplayFormat = (iso: string | null | undefined): string => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length === 3) {
        const [year, month, day] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
    }
    return '';
};

/**
 * Convierte formato visible DD/MM/AAAA (o D/M/AAAA) a formato ISO YYYY-MM-DD
 */
const toIsoFormat = (display: string): string | null => {
    const clean = display.trim();
    if (!clean) return null;
    const match = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > 2100) {
        return null;
    }

    const testDate = new Date(year, month - 1, day);
    if (testDate.getFullYear() === year && testDate.getMonth() === month - 1 && testDate.getDate() === day) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
};

export const DateInputDDMMYYYY: React.FC<DateInputDDMMYYYYProps> = ({
    id,
    label,
    value,
    onChange,
    min,
    max,
}) => {
    const [textValue, setTextValue] = useState<string>(toDisplayFormat(value));
    const hiddenDateInputRef = useRef<HTMLInputElement>(null);

    // Sincronizar texto cuando el valor externo cambie (ej. al presionar Limpiar o cargar datos)
    useEffect(() => {
        setTextValue(toDisplayFormat(value));
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setTextValue(raw);

        const iso = toIsoFormat(raw);
        if (iso) {
            onChange(iso);
        } else if (raw.trim() === '') {
            onChange(null);
        }
    };

    const handleBlur = () => {
        // Al salir del campo, si es una fecha válida, normalizarla visualmente a DD/MM/AAAA con ceros a la izquierda
        const iso = toIsoFormat(textValue);
        if (iso) {
            setTextValue(toDisplayFormat(iso));
            onChange(iso);
        } else if (textValue.trim() !== '') {
            // Si lo escrito no fue una fecha válida, restaurar al valor anterior válido o limpiar
            setTextValue(toDisplayFormat(value));
        }
    };

    const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newIso = e.target.value;
        if (newIso) {
            setTextValue(toDisplayFormat(newIso));
            onChange(newIso);
        } else {
            setTextValue('');
            onChange(null);
        }
    };

    const openCalendarPicker = () => {
        if (hiddenDateInputRef.current) {
            if ('showPicker' in HTMLInputElement.prototype) {
                try {
                    hiddenDateInputRef.current.showPicker();
                } catch {
                    hiddenDateInputRef.current.focus();
                }
            } else {
                hiddenDateInputRef.current.focus();
            }
        }
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-xs text-slate-400 mb-1">
                {label}
            </label>
            <div className="relative flex items-center">
                <input
                    type="text"
                    id={id}
                    value={textValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    placeholder="dd/mm/aaaa"
                    maxLength={10}
                    className="w-full bg-ui-darkest border border-ui-border rounded-md shadow-sm pl-2.5 pr-8 py-1.5 text-xs focus:ring-1 focus:ring-ui-accent text-slate-100 placeholder:text-slate-500 font-mono tracking-wide"
                />
                
                {/* Botón de ícono de calendario que abre el selector gráfico */}
                <button
                    type="button"
                    onClick={openCalendarPicker}
                    tabIndex={-1}
                    title="Abrir calendario interactivo"
                    className="absolute right-1.5 p-1 text-slate-400 hover:text-ui-accent hover:bg-slate-700/50 rounded transition-colors"
                >
                    <Calendar className="w-3.5 h-3.5" />
                </button>

                {/* Input nativo oculto utilizado para invocar el calendario del navegador */}
                <input
                    ref={hiddenDateInputRef}
                    type="date"
                    tabIndex={-1}
                    value={value || ''}
                    min={min || undefined}
                    max={max || undefined}
                    onChange={handleNativeDateChange}
                    className="sr-only"
                    aria-hidden="true"
                />
            </div>
        </div>
    );
};
