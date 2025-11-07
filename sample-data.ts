import { RawMaterialData } from './types';

// Helper function to generate sample data
const generateData = (): RawMaterialData[] => {
    const materials = ['Soya', 'Maiz', 'Canola', 'DDGS'];
    const data: RawMaterialData[] = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 90); // 90 days of data

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        for (const material of materials) {
            let baseProteina, baseHumedad, baseGrasa, baseFibra, subtipo, cliente, proveedor, origen;

            switch (material) {
                case 'Soya':
                    baseProteina = 46;
                    baseHumedad = 12;
                    baseGrasa = 1.5;
                    baseFibra = 3.5;
                    subtipo = 'Harina';
                    cliente = 'Cliente A';
                    proveedor = 'Cargill';
                    origen = 'Argentina';
                    break;
                case 'Maiz':
                    baseProteina = 8.5;
                    baseHumedad = 14;
                    baseGrasa = 4;
                    baseFibra = 2;
                    subtipo = 'Grano Entero';
                    cliente = 'Cliente B';
                    proveedor = 'ADM';
                    origen = 'USA';
                    break;
                case 'Canola':
                    baseProteina = 36;
                    baseHumedad = 10;
                    baseGrasa = 3;
                    baseFibra = 12;
                    subtipo = 'Pasta';
                    cliente = 'Cliente A';
                    proveedor = 'Viterra';
                    origen = 'Canadá';
                    break;
                case 'DDGS':
                    baseProteina = 27;
                    baseHumedad = 11;
                    baseGrasa = 9;
                    baseFibra = 7;
                    subtipo = 'Maíz';
                    cliente = 'Cliente C';
                    proveedor = 'Valero';
                    origen = 'USA';
                    break;
                default:
                    baseProteina = 20;
                    baseHumedad = 10;
                    baseGrasa = 5;
                    baseFibra = 5;
                    subtipo = 'N/A';
                    cliente = 'N/A';
                    proveedor = 'N/A';
                    origen = 'N/A';
            }

            data.push({
                date: new Date(d).toISOString(),
                material: material,
                subtipo: subtipo,
                Cliente: cliente,
                Proveedor: proveedor,
                Origen: origen,
                proteina: parseFloat((baseProteina + (Math.random() - 0.5) * 2).toFixed(2)),
                humedad: parseFloat((baseHumedad + (Math.random() - 0.5)).toFixed(2)),
                grasa: parseFloat((baseGrasa + (Math.random() - 0.5) * 0.5).toFixed(2)),
                fibra: parseFloat((baseFibra + (Math.random() - 0.5)).toFixed(2)),
                ceniza: parseFloat((5 + Math.random()).toFixed(2)),
                almidon: material === 'Maiz' ? parseFloat((65 + (Math.random() - 0.5) * 5).toFixed(2)) : undefined,
            });
        }
    }
    return data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const SAMPLE_DATA: RawMaterialData[] = generateData();