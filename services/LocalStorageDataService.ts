import { DataService, DayData } from './DataService';
import {
  StaffMember,
  RouteRecord,
  TransferRecord,
  ShiftMetadata
} from '../types';

const DB_PREFIX = 'girsu_v27_';

const STAFF_KEY = `${DB_PREFIX}staff`;

const ADN_ROUTES_KEY = `${DB_PREFIX}adn_routes`;
const ADN_TRANS_KEY  = `${DB_PREFIX}adn_trans`;
const ADN_MGRS_KEY   = `${DB_PREFIX}adn_mgrs`;

const DAILY_DATA_KEY  = `${DB_PREFIX}day_`;
const DAILY_TRANS_KEY = `${DB_PREFIX}trans_`;
const DAILY_MGRS_KEY  = `${DB_PREFIX}mgrs_`;

export class LocalStorageDataService implements DataService {

  async loadStaff(): Promise<StaffMember[]> {
    const raw = localStorage.getItem(STAFF_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  async saveStaff(staff: StaffMember[]): Promise<void> {
    localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
  }

  async loadDay(date: string): Promise<DayData | null> {
    const rawRoutes = localStorage.getItem(`${DAILY_DATA_KEY}${date}`);
    if (!rawRoutes) return null;

    return {
      records: JSON.parse(rawRoutes) as RouteRecord[],
      transfers: JSON.parse(
        localStorage.getItem(`${DAILY_TRANS_KEY}${date}`) || '[]'
      ) as TransferRecord[],
      managers: JSON.parse(
        localStorage.getItem(`${DAILY_MGRS_KEY}${date}`) || '{}'
      ) as Record<string, ShiftMetadata>,
    };
  }

  async saveDay(date: string, data: DayData): Promise<void> {
    localStorage.setItem(
      `${DAILY_DATA_KEY}${date}`,
      JSON.stringify(data.records)
    );
    localStorage.setItem(
      `${DAILY_TRANS_KEY}${date}`,
      JSON.stringify(data.transfers)
    );
    localStorage.setItem(
      `${DAILY_MGRS_KEY}${date}`,
      JSON.stringify(data.managers)
    );
  }

  async loadMaster(): Promise<DayData | null> {
    const rawRoutes = localStorage.getItem(ADN_ROUTES_KEY);
    if (!rawRoutes) return null;

    return {
      records: JSON.parse(rawRoutes) as RouteRecord[],
      transfers: JSON.parse(
        localStorage.getItem(ADN_TRANS_KEY) || '[]'
      ) as TransferRecord[],
      managers: JSON.parse(
        localStorage.getItem(ADN_MGRS_KEY) || '{}'
      ) as Record<string, ShiftMetadata>,
    };
  }

  async saveMaster(data: DayData): Promise<void> {
    localStorage.setItem(ADN_ROUTES_KEY, JSON.stringify(data.records));
    localStorage.setItem(ADN_TRANS_KEY, JSON.stringify(data.transfers));
    localStorage.setItem(ADN_MGRS_KEY, JSON.stringify(data.managers));
  }
}
