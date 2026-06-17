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
    Activity,
    Skull,
    ShieldAlert,
    AlertTriangle,
    Biohazard,
    Flame
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
        case 'aflatoxina':
            return <Skull className={className} />;
        case 'ocratoxina':
            return <ShieldAlert className={className} />;
        case 'zearalenona':
            return <AlertTriangle className={className} />;
        case 'fumonisina':
            return <Biohazard className={className} />;
        case 'vomitoxina':
            return <Flame className={className} />;
        case 'toxina_t2':
        case 'toxina t2':
            return <ShieldAlert className={className} />;
        default: 
            return <Activity className={className} />;
    }
};
