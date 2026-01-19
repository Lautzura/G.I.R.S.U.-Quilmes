
import { HybridDataService } from './HybridDataService';
import { PartsDataService } from './PartsDataService';
import { StaffMember } from '../types';
import { DayDataDTO } from '../dtos/RouteDTO';

// URL de la API centralizada
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.1.0.250:8080';

// 1. Instancia base híbrida (Failover Remoto/Local)
export const hybridDataService = new HybridDataService(API_URL);

// 2. Instancia específica para Partes (Pegamento solicitado)
export const partsService = new PartsDataService(hybridDataService);

// Alias para compatibilidad con index.tsx
export const dataService = partsService;

/**
 * ApiService: Interfaz simplificada
 */
export const ApiService = {
  get isOnline() { return partsService.isOnline; },
  loadStaff: () => partsService.loadStaff(),
  saveStaff: (staff: StaffMember[]) => partsService.saveStaff(staff),
  loadDay: (date: string) => partsService.loadDay(date),
  saveDay: (date: string, data: DayDataDTO) => partsService.saveDay(date, data),
  loadMaster: () => partsService.loadMaster(),
  saveMaster: (data: DayDataDTO) => partsService.saveMaster(data)
};

export default ApiService;
