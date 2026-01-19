import { DayDataDTO } from '../dtos/RouteDTO';
import { RouteRecord, TransferRecord, StaffMember, ShiftMetadata } from '../types';
import { 
  toRouteRecordDTO, 
  toTransferRecordDTO, 
  fromRouteRecordDTO, 
  fromTransferRecordDTO 
} from '../utils/converters';

/**
 * Traduce el estado actual de la UI a un DTO de persistencia
 */
export function stateToDayDataDTO(
  records: RouteRecord[],
  transfers: TransferRecord[],
  managers: Record<string, ShiftMetadata>
): DayDataDTO {
  return {
    records: records.map(toRouteRecordDTO),
    transfers: transfers.map(toTransferRecordDTO),
    managers
  };
}

/**
 * Traduce un DTO de persistencia a objetos listos para la UI
 */
export function dayDataDTOToState(
  data: DayDataDTO,
  staffList: StaffMember[]
) {
  return {
    records: data.records.map(r => fromRouteRecordDTO(r, staffList)),
    transfers: data.transfers.map(tr => fromTransferRecordDTO(tr, staffList)),
    managers: data.managers
  };
}
