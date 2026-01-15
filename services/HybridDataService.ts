
import { IDataService, DayData } from './DataService';
import { RemoteApiDataService } from './RemoteApiDataService';
import { LocalStorageDataService } from './LocalStorageDataService';
import { StaffMember } from '../types';

/**
 * Servicio inteligente: Gestiona el failover entre remoto y local.
 * Implementa IDataService para permitir inyección de dependencias.
 */
// Fix: Moved class implementation here to resolve casing conflict with index.tsx and compiler root files.
export class HybridDataService implements IDataService {
  private remote: RemoteApiDataService;
  private local: LocalStorageDataService;
  public isOnline: boolean = true;

  constructor(baseURL: string) {
    this.remote = new RemoteApiDataService(baseURL);
    this.local = new LocalStorageDataService();
  }

  async loadStaff(): Promise<StaffMember[]> {
    try {
      const data = await this.remote.loadStaff();
      if (data && data.length > 0) {
        this.isOnline = true;
        await this.local.saveStaff(data);
        return data;
      }
      throw new Error("Offline or Empty");
    } catch (e) {
      this.isOnline = false;
      return await this.local.loadStaff();
    }
  }

  async saveStaff(staff: StaffMember[]): Promise<void> {
    await this.local.saveStaff(staff);
    this.remote.saveStaff(staff).then(() => {
      this.isOnline = true;
    }).catch(() => {
      this.isOnline = false;
    });
  }

  async loadDay(date: string): Promise<DayData | null> {
    try {
      const data = await this.remote.loadDay(date);
      if (data) {
        this.isOnline = true;
        await this.local.saveDay(date, data);
        return data;
      }
      return await this.local.loadDay(date);
    } catch (e) {
      this.isOnline = false;
      return await this.local.loadDay(date);
    }
  }

  async saveDay(date: string, data: DayData): Promise<void> {
    await this.local.saveDay(date, data);
    this.remote.saveDay(date, data).then(() => {
      this.isOnline = true;
    }).catch(() => {
      this.isOnline = false;
    });
  }

  async loadMaster(): Promise<DayData | null> {
    try {
      const data = await this.remote.loadMaster();
      if (data) {
        this.isOnline = true;
        await this.local.saveMaster(data);
        return data;
      }
      return await this.local.loadMaster();
    } catch (e) {
      this.isOnline = false;
      return await this.local.loadMaster();
    }
  }

  async saveMaster(data: DayData): Promise<void> {
    await this.local.saveMaster(data);
    this.remote.saveMaster(data).then(() => {
      this.isOnline = true;
    }).catch(() => {
      this.isOnline = false;
    });
  }
}
