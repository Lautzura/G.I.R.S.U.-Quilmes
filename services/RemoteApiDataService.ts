import { DataService, DayData } from './DataService';
import { StaffMember } from '../types';

/**
 * Servicio que conecta con una API real mediante HTTP.
 * Incluye protección por Timeout para evitar que la app se tilde.
 */
export class RemoteApiDataService implements DataService {
  private baseURL: string;
  private timeout: number = 3000; // 3 segundos máximo de espera

  constructor(baseURL: string = 'http://10.1.0.250:8080') {
    this.baseURL = baseURL;
  }

  private async fetchWithTimeout(url: string, options: any = {}): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (e) {
      clearTimeout(id);
      throw new Error("Network Error or Timeout");
    }
  }

  async loadStaff(): Promise<StaffMember[]> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/staff`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      return [];
    }
  }

  async saveStaff(staff: StaffMember[]): Promise<void> {
    try {
      await this.fetchWithTimeout(`${this.baseURL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staff),
      });
    } catch (e) { }
  }

  async loadDay(date: string): Promise<DayData | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/day/${date}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async saveDay(date: string, data: DayData): Promise<void> {
    try {
      await this.fetchWithTimeout(`${this.baseURL}/day/${date}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) { }
  }

  async loadMaster(): Promise<DayData | null> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseURL}/master`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async saveMaster(data: DayData): Promise<void> {
    try {
      await this.fetchWithTimeout(`${this.baseURL}/master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) { }
  }
}
