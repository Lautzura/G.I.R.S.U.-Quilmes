import { IDataService } from './DataService';
import { StaffMember } from '../types';
import { DayDataDTO } from '../dtos/RouteDTO';
import { LocalStorageDataService } from './LocalStorageDataService';
import { RemoteApiDataService } from './RemoteApiDataService';

/**
 * HybridDataService: Implementación que combina almacenamiento local con persistencia remota.
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
