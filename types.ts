export interface RawMaterialData {
  date: string;
  material: string;
  subtipo?: string;
  Cliente?: string;
  Proveedor?: string;
  Origen?: string;
  [key: string]: string | number | undefined; // For dynamic nutrient properties
}

export interface ChartDataPoint {
    date: string;
    value: number;
}

export interface HistogramBin {
    range: string;
    count: number;
}