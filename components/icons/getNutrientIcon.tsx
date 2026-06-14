import React from 'react';
import { 
    ChevronsRight, 
    Droplets, 
    Utensils, 
    Sprout, 
    TestTube, 
    Wheat, 
    Bone, 
    Atom,
    Activity
} from 'lucide-react';

export const getNutrientIcon = (key: string, className?: string) => {
    switch (key.toLowerCase()) {
        case 'protein': 
        case 'proteina': 
        case 'proteína': 
            return <ChevronsRight className={className} />;
        case 'moisture': 
        case 'humedad': 
            return <Droplets className={className} />;
        case 'fat': 
        case 'grasa': 
            return <Utensils className={className} />;
        case 'fiber': 
        case 'fibra': 
            return <Sprout className={className} />;
        case 'ash': 
        case 'ceniza': 
            return <TestTube className={className} />;
        case 'almidon':
        case 'almidón':
            return <Wheat className={className} />;
        case 'calcium':
        case 'calcio':
            return <Bone className={className} />;
        case 'phosphorus':
        case 'fosforo':
        case 'fósforo':
            return <Atom className={className} />;
        default: 
            return <Activity className={className} />;
    }
};
