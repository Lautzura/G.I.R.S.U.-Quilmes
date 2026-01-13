import {
  StaffMember,
  RouteRecord,
  TransferRecord,
  ShiftMetadata
} from '../types';

/**
 * Datos completos de un día o del maestro
 */
export interface DayData {
  records: RouteRecord[];
  transfers: TransferRecord[];
  managers: Record<string, ShiftMetadata>;
}

/**
 * Contrato de acceso a datos del sistema
 * (localStorage hoy, API mañana)
 */
export interface DataService {
  /** Personal */
  loadStaff(): Promise<StaffMember[]>;
  saveStaff(staff: StaffMember[]): Promise<void>;

  /** Parte diario */
  loadDay(date: string): Promise<DayData | null>;
  saveDay(date: string, data: DayData): Promise<void>;

  /** Plantilla ADN Maestro */
  loadMaster(): Promise<DayData | null>;
  saveMaster(data: DayData): Promise<void>;
}
