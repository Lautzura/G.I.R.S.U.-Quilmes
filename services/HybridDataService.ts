import { IDataService } from './DataService';
import { StaffMember } from '../types';
import { DayDataDTO } from '../dtos/RouteDTO';
import { LocalStorageDataService } from './LocalStorageDataService';
import { RemoteApiDataService } from './RemoteApiDataService';

/**
 * HybridDataService: Implementation combining local storage with remote persistence.
 */
export class HybridDataService implements IDataService {
  private local: LocalStorageDataService;
  private remote: RemoteApiDataService;

  constructor(baseURL: string) {
    this.local = new LocalStorageDataService();
    this.remote = new RemoteApiDataService(baseURL);
  }

  get isOnline() {
    return this.remote.isOnline;
  }

  async loadStaff(): Promise<StaffMember[]> {
    try {
      const staff = await this.remote.loadStaff();
      if (staff && staff.length > 0) {
        await this.local.saveStaff(staff);
        return staff;
      }
    } catch (e) {}
    return this.local.loadStaff();
  }

  async saveStaff(staff: StaffMember[]): Promise<void> {
    await this.local.saveStaff(staff);
    try {
      await this.remote.saveStaff(staff);
    } catch (e) {}
  }

  async loadDay(date: string): Promise<DayDataDTO | null> {
    try {
      const data = await this.remote.loadDay(date);
      if (data) {
        await this.local.saveDay(date, data);
        return data;
      }
    } catch (e) {}
    return this.local.loadDay(date);
  }

  async saveDay(date: string, data: DayDataDTO): Promise<void> {
    await this.local.saveDay(date, data);
    try {
      await this.remote.saveDay(date, data);
    } catch (e) {}
  }

  async loadMaster(): Promise<DayDataDTO | null> {
    try {
      const data = await this.remote.loadMaster();
      if (data) {
        await this.local.saveMaster(data);
        return data;
      }
    } catch (e) {}
    return this.local.loadMaster();
  }

  async saveMaster(data: DayDataDTO): Promise<void> {
    await this.local.saveMaster(data);
    try {
      await this.remote.saveMaster(data);
    } catch (e) {}
  }
}

// URL de la API centralizada
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://10.1.0.250:8080';

// Instancia ÚNICA para todo el ecosistema (Partes y Sistema General)
export const dataService = new HybridDataService(API_URL);

/**
 * ApiService: Interfaz simplificada para el consumo de componentes.
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
