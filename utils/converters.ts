import { StaffMember, RouteRecord, TransferRecord, TransferUnit } from '../types';
import { RouteRecordDTO, TransferRecordDTO, TransferUnitDTO, DayDataDTO } from '../dtos/RouteDTO';

/**
 * Busca un miembro del personal por ID o Nombre de forma segura
 */
export const findStaffById = (id: any, staffList: StaffMember[]): StaffMember | null => {
  if (!id) return null;
  const query = String(id).trim().toUpperCase();
  return staffList.find(s => String(s.id).trim().toUpperCase() === query) || 
         staffList.find(s => s.name.toUpperCase().includes(query)) || null;
};

/**
 * UI -> DTO
 */
export const toRouteRecordDTO = (r: RouteRecord): RouteRecordDTO => ({
  ...r,
  driver: r.driver?.id || null,
  aux1: r.aux1?.id || null,
  aux2: r.aux2?.id || null,
  aux3: r.aux3?.id || null,
  aux4: r.aux4?.id || null,
  replacementDriver: r.replacementDriver?.id || null,
  replacementAux1: r.replacementAux1?.id || null,
  replacementAux2: r.replacementAux2?.id || null,
  zoneStatus: r.zoneStatus || (null as any),
  category: r.category || 'RECOLECCIÓN'
});

const toTransferUnitDTO = (u: TransferUnit): TransferUnitDTO => ({
  ...u,
  driver: u.driver?.id || null,
});

export const toTransferRecordDTO = (tr: TransferRecord): TransferRecordDTO => ({
  ...tr,
  units: tr.units.map(toTransferUnitDTO) as [TransferUnitDTO, TransferUnitDTO, TransferUnitDTO],
  maquinista: tr.maquinista?.id || null,
  encargado: tr.encargado?.id || null,
  balancero1: tr.balancero1?.id || null,
  auxTolva1: tr.auxTolva1?.id || null,
  auxTolva2: tr.auxTolva2?.id || null,
  auxTolva3: tr.auxTolva3?.id || null,
} as any);

/**
 * DTO -> UI (Aquí es donde recuperamos las rutas "perdidas")
 */
export const fromRouteRecordDTO = (dto: RouteRecordDTO, staffList: StaffMember[]): RouteRecord => ({
  ...dto,
  category: dto.category || 'RECOLECCIÓN', // Si no tiene categoría, es Recolección
  driver: findStaffById(dto.driver, staffList),
  aux1: findStaffById(dto.aux1, staffList),
  aux2: findStaffById(dto.aux2, staffList),
  aux3: findStaffById(dto.aux3, staffList),
  aux4: findStaffById(dto.aux4, staffList),
  replacementDriver: findStaffById(dto.replacementDriver, staffList),
  replacementAux1: findStaffById(dto.replacementAux1, staffList),
  replacementAux2: findStaffById(dto.replacementAux2, staffList),
});

const fromTransferUnitDTO = (dto: TransferUnitDTO, staffList: StaffMember[]): TransferUnit => ({
  ...dto,
  driver: findStaffById(dto.driver, staffList),
});

export const fromTransferRecordDTO = (dto: TransferRecordDTO, staffList: StaffMember[]): TransferRecord => ({
  ...dto,
  units: dto.units.map(u => fromTransferUnitDTO(u, staffList)) as [TransferUnit, TransferUnit, TransferUnit],
  maquinista: findStaffById(dto.maquinista, staffList),
  encargado: findStaffById(dto.encargado, staffList),
  balancero1: findStaffById(dto.balancero1, staffList),
  auxTolva1: findStaffById(dto.auxTolva1, staffList),
  auxTolva2: findStaffById(dto.auxTolva2, staffList),
  auxTolva3: findStaffById(dto.auxTolva3, staffList),
  auxTransferencia1: findStaffById(dto.auxTransferencia1, staffList),
  auxTransferencia2: findStaffById(dto.auxTransferencia2, staffList),
  balancero2: findStaffById(dto.balancero2, staffList),
  lonero: findStaffById(dto.lonero, staffList),
  suplenciaLona: findStaffById(dto.suplenciaLona, staffList),
});
