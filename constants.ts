
import { RouteRecord, StaffMember, StaffStatus, ZoneStatus } from './types';

// --- BASE DE DATOS MAESTRA DE PERSONAL (VACIADA PARA PASO SIGUIENTE) ---
export const STAFF_DB: { [key: string]: StaffMember } = {};

// --- RUTAS MAÑANA (ESTRUCTURA PRESERVADA, PERSONAL LIMPIO) ---
export const MANANA_MASTER_DATA: any[] = [
  { zone: 'RN 31A/B', interno: '352', domain: 'AF349UD', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 31', interno: '155', domain: 'NJL635', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 40', interno: '343', domain: 'AF169DM', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 41', interno: '342', domain: 'AF169DP', driver: '', aux1: '', aux2: '' },
  { zone: 'RN 43', interno: '347', domain: 'AF169DN', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 44', interno: '341', domain: 'AF169DH', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 46', interno: '18', domain: 'NHR395', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 47B', interno: '340', domain: 'AF169DJ', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 47', interno: '354', domain: 'AF349UG', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 48', interno: '146', domain: 'NJL617', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 49', interno: '154', domain: 'NJL634', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 50', interno: '322', domain: 'AE242HN', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 51', interno: '332', domain: 'AE738OI', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 52', interno: '349', domain: 'AF169DL', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 53', interno: '351', domain: 'AF349UF', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 54', interno: '353', domain: 'AF349UE', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 55', interno: '145', domain: 'NJL615', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 57', interno: '321', domain: 'AE242HH', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 58', interno: '346', domain: 'AF169DI', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 60', interno: '149', domain: 'NJL620', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 61', interno: '7', domain: 'NHR382', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 64', interno: '333', domain: 'AE783OH', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 65', interno: '158', domain: 'NJL633', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 66', interno: '329', domain: 'AE242HI', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 69', interno: '165', domain: 'ONE629', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 70', interno: '335', domain: 'AE738OG', driver: '', aux1: '', aux2: '', aux3: '' }
];

// --- RUTAS TARDE (ESTRUCTURA PRESERVADA, PERSONAL LIMPIO) ---
export const TARDE_MASTER_DATA: any[] = [
  { zone: 'RN 1', interno: '332', domain: 'AE738OI', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 4', interno: '340', domain: 'AF169DJ', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 6', interno: '343', domain: 'AF169DM', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 7', interno: '351', domain: 'AF349UF', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 13', interno: '349', domain: 'AF169DL', driver: '', aux1: '' },
  { zone: 'RN 14', interno: '145', domain: 'NJL615', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 15', interno: '158', domain: 'NJL633', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 17', interno: '347', domain: 'AF169DN', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 20', interno: '350', domain: 'AF169DO', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 21', interno: '354', domain: 'AF349UG', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 23', interno: '353', domain: 'AF349UE', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 27 BIS', interno: '342', domain: 'AF169DP', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 25', interno: '155', domain: 'NJL635', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 26', interno: '348', domain: 'AF169DK', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 28', interno: '165', domain: 'ONE629', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 32B', interno: '327', domain: 'AE242HK', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 37', interno: '330', domain: 'AE242HO', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 42', interno: '341', domain: 'AF169DH', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 59', interno: '333', domain: 'AE783OH', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 59 BIS', interno: '7', domain: 'NHR382', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' },
  { zone: 'RN 62', interno: '352', domain: 'AF349UD', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: 'RN 67', interno: '335', domain: 'AE738OG', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: '18A-18B-14A', interno: '329', domain: 'AE242HI', driver: '', aux1: '', aux2: '', aux3: '' },
  { zone: '7A-22A-25A', interno: '146', domain: 'NJL617', driver: '', aux1: '', aux2: '', aux3: '', aux4: '' }
];

// --- REPASO Y CARGA LATERAL ---
export const MANANA_REPASO_DATA: any[] = [
  { zone: 'REPASO 1', interno: '11', domain: 'NHR386' },
  { zone: 'REPASO 2', interno: '166', domain: 'ONE632' },
  { zone: 'REPASO 3', interno: '334', domain: 'AE738OH' },
  { zone: 'REPASO 4', interno: '160', domain: 'NJL604' },
  { zone: 'REPASO 5', interno: '35', domain: 'NHR466' },
  { zone: 'MONTE DON BOSCO', interno: '136', domain: 'AG989QO' },
  { zone: 'CARGA LATERAL RN 1', interno: '135', domain: 'AG989QO' },
  { zone: 'CARGA LATERAL RN 2', interno: '135', domain: 'AG989QO' },
  { zone: 'CARGA LATERAL RN 3', interno: '137' }
];

export const TARDE_REPASO_DATA: any[] = [
  { zone: 'REGIONAL OESTE', driver: '' },
  { zone: 'CARGA LATERAL RN', interno: '133', domain: 'AE836YZ', driver: '' },
  { zone: 'CARGA LATERAL RN', interno: '160', domain: 'NJL604', driver: '' },
  { zone: 'CARGA LATERAL RN', interno: '166', domain: 'ONE632' },
  { zone: 'CARGA LATERAL RN 4', interno: '334', domain: 'AE738OH' }
];

export const NOCHE_REPASO_DATA: any[] = [
  { zone: 'CARGA LATERAL RN 8', interno: '137', domain: 'AG989QO', driver: '' },
  { zone: 'CARGA LATERAL RN 9', interno: '134', domain: 'AF930EP', driver: '' },
  { zone: 'CARGA LATERAL RN 10', interno: '135', domain: 'AG989QO', driver: '' },
  { zone: 'RECOLECCION CARGA TRASERA', interno: '334', domain: 'AE738OH', driver: '' }
];

export const NOCHE_MASTER_DATA: any[] = [
  { zone: 'RN 0', interno: '347' }, { zone: 'RN 2', interno: '340' }, { zone: 'RN 3', interno: '352' },
  { zone: 'RN 5', interno: '341' }, { zone: 'RN 8', interno: '351' }, { zone: 'RN 9', interno: '32' },
  { zone: 'RN 12', interno: '340' }, { zone: 'RN 16', interno: '18' }, { zone: 'RN 18', interno: '350' },
  { zone: 'RN 19', interno: '165' }, { zone: 'RN 24', interno: '342' }, { zone: 'RN 26A', interno: '327' },
  { zone: 'RN 27', interno: '328' }, { zone: 'RN 29', interno: '330' }, { zone: 'RN 29A', interno: '321' },
  { zone: 'RN 30', interno: '346' }, { zone: 'RN 32', border: '328' }, { zone: 'RN 33', interno: '353' },
  { zone: 'RN 34', interno: '155' }, { zone: 'RN 35', interno: '335' }, { zone: 'RN 36', interno: '332' },
  { zone: 'RN 38', interno: '354' }, { zone: 'RN 39', interno: '348' }, { zone: 'RN 45', interno: '333' },
  { zone: 'RN 63', interno: '154' }
];

export const EXTRA_STAFF: StaffMember[] = [];
export const MOCK_RECORDS: RouteRecord[] = [];
export const FLEET_MASTER_DATA = [];
