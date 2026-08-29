export interface UserProfile {
  nombre: string;
  usuario: string;
  allowedClients?: string[];
}

export interface RawMaterialData {
  noId?: string;
  date: string;
  material: string;
  subtipo?: string;
  lote?: string;
  Cliente?: string;
  Proveedor?: string;
  Origen?: string;
  [key: string]: string | number | undefined; // For dynamic nutrient properties
}

export interface ChartDataPoint {
    date: string;
    value: number;
    noId?: string;
    lote?: string;
}

export interface HistogramBin {
    range: string;
    count: number;
}