import React, { useCallback, useState } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface FileUploadProps {
    onFileParse: (file: File) => void;
    isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileParse, isLoading }) => {
    const [dragging, setDragging] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            onFileParse(event.target.files[0]);
        }
    };
    
    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            onFileParse(event.dataTransfer.files[0]);
            event.dataTransfer.clearData();
        }
    }, [onFileParse]);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);
    
    const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(true);
    }, []);

    const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(false);
    }, []);

    return (
        <div 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            className={`w-full relative transition-all duration-300 rounded-xl ${dragging ? 'scale-[1.02] shadow-md ring-2 ring-cyan-400' : ''}`}
        >
            <label htmlFor="file-upload" className={`flex items-center justify-center w-full px-4 py-3 border border-ui-border rounded-xl cursor-pointer bg-ui-card hover:bg-ui-darkest hover:border-cyan-300 transition-colors shadow-sm`}>
                {isLoading ? (
                    <div className="flex items-center space-x-3">
                        <svg className="animate-spin h-5 w-5 text-ui-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm font-medium text-slate-400">Procesando archivo...</span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-3">
                        <div className="p-2 bg-ui-accent/10 text-ui-accent rounded-lg text-ui-accent">
                            <UploadIcon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-300">Subir nuevos datos</span>
                            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">CSV o Excel</span>
                        </div>
                    </div>
                )}
                <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
            </label>
        </div>
    );
};