
// Fix: Use lowercase import to avoid casing conflict with hybriddataservice.ts which exists in the project
import { HybridDataService } from './hybriddataservice';
import { StaffMember } from '../types';
import { DayDataDTO } from '../dtos/RouteDTO';

// URL de la API centralizada
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.1.0.250:8080';

// Instancia ÚNICA para todo el ecosistema (Partes y Sistema General)
export const dataService = new HybridDataService(API_URL);

/**
 * ApiService: Interfaz simplificada para el consumo de componentes.
 * Mantiene la compatibilidad con el sistema de partes y el sistema general.
 */
export const ApiService = {
  // Estado de conexión (reactivo)
  get isOnline() { return dataService.isOnline; },

  // Gestión de Personal
  loadStaff: () => dataService.loadStaff(),
  saveStaff: (staff: StaffMember[]) => dataService.saveStaff(staff),

  // Gestión de Partes Diarios
  loadDay: (date: string) => dataService.loadDay(date),
  saveDay: (date: string, data: DayDataDTO) => dataService.saveDay(date, data),

  // Gestión de Plantilla (ADN Maestro)
  loadMaster: () => dataService.loadMaster(),
  saveMaster: (data: DayDataDTO) => dataService.saveMaster(data)
};

export default ApiService;
