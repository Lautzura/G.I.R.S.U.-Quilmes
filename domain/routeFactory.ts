import { RouteRecord, StaffMember, ZoneStatus } from '../types';
import { findStaffById } from '../utils/converters';
import { 
  MANANA_MASTER_DATA, TARDE_MASTER_DATA, NOCHE_MASTER_DATA,
  MANANA_REPASO_DATA, TARDE_REPASO_DATA, NOCHE_REPASO_DATA 
} from '../constants';

/**
 * Crea un registro de ruta base
 */
export const createRouteRecord = (params: Partial<RouteRecord>): RouteRecord => ({
  id: params.id || `R-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  zone: params.zone || '',
  internalId: params.internalId || '',
  domain: params.domain || '',
  reinforcement: params.reinforcement || 'EXTRA',
  shift: params.shift || 'MAÑANA',
  departureTime: params.departureTime || '',
  dumpTime: params.dumpTime || '',
  tonnage: params.tonnage || '',
  category: params.category || 'RECOLECCIÓN',
  zoneStatus: params.zoneStatus || ZoneStatus.PENDING,
  order: params.order || 0,
  driver: params.driver || null,
  aux1: params.aux1 || null,
  aux2: params.aux2 || null,
  aux3: params.aux3 || null,
  aux4: params.aux4 || null,
  replacementDriver: params.replacementDriver || null,
  replacementAux1: params.replacementAux1 || null,
  replacementAux2: params.replacementAux2 || null,
  supervisionReport: params.supervisionReport || '',
});

/**
 * Genera el listado inicial de rutas basado en los datos maestros (ADN)
 */
export const createInitialRouteRecords = (staffList: StaffMember[]): RouteRecord[] => {
  const mapMasterToRecord = (master: any[], shift: string, cat: string): RouteRecord[] => 
    master.map((m, idx) => createRouteRecord({
      zone: m.zone,
      internalId: m.interno || '',
      domain: m.domain || '',
      reinforcement: 'MASTER',
      shift: shift as any,
      category: cat as any,
      order: idx,
      driver: findStaffById(m.driver, staffList),
      aux1: findStaffById(m.aux1, staffList),
      aux2: findStaffById(m.aux2, staffList),
      aux3: findStaffById(m.aux3, staffList),
      aux4: findStaffById(m.aux4, staffList),
    }));

  return [
    ...mapMasterToRecord(MANANA_MASTER_DATA, 'MAÑANA', 'RECOLECCIÓN'),
    ...mapMasterToRecord(TARDE_MASTER_DATA, 'TARDE', 'RECOLECCIÓN'),
    ...mapMasterToRecord(NOCHE_MASTER_DATA, 'NOCHE', 'RECOLECCIÓN'),
    ...mapMasterToRecord(MANANA_REPASO_DATA, 'MAÑANA', 'REPASO_LATERAL'),
    ...mapMasterToRecord(TARDE_REPASO_DATA, 'TARDE', 'REPASO_LATERAL'),
    ...mapMasterToRecord(NOCHE_REPASO_DATA, 'NOCHE', 'REPASO_LATERAL'),
  ];
};
