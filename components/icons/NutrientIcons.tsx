import React from 'react';

interface IconProps {
    className?: string;
}

export const ProteinIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3"></circle>
        <circle cx="7" cy="17" r="3"></circle>
        <circle cx="17" cy="17" r="3"></circle>
        <line x1="10.5" y1="10.5" x2="8.5" y2="14.5"></line>
        <line x1="13.5" y1="10.5" x2="15.5" y2="14.5"></line>
        <line x1="9.5" y1="17" x2="14.5" y2="17"></line>
    </svg>
);

export const MoistureIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"></path>
    </svg>
);

export const FatIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="6"></circle>
        <circle cx="12" cy="12" r="2"></circle>
    </svg>
);

export const FiberIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22l10-10"></path>
        <path d="M3.4 11.6L2 22l10.4-1.4a6 6 0 0 0-7-7z"></path>
        <path d="M8.2 16.4L18 6.6"></path>
        <path d="M10.4 18.6L21 8"></path>
        <path d="M12.6 20.8L21 12.4"></path>
    </svg>
);

export const AshIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
);

export const GenericNutrientIcon: React.FC<IconProps> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);
