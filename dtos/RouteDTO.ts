import { ZoneStatus, ShiftMetadata } from '../types';

export interface RouteRecordDTO {
  id: string;
  zone: string;
  internalId: string;
  domain: string;
  reinforcement: string;
  departureTime: string;
  driver: string | null;
  aux1: string | null;
  aux2: string | null;
  aux3: string | null;
  aux4: string | null;
  replacementDriver: string | null;
  replacementAux1: string | null;
  replacementAux2: string | null;
  supervisionReport: string;
  tonnage: string;
  dumpTime: string;
  order: number;
  zoneStatus: ZoneStatus;
  shift: 'MAÑANA' | 'TARDE' | 'NOCHE';
  category?: 'AMBIENTE' | 'CARGA LATERAL' | 'RECOLECCIÓN' | 'REPASO_LATERAL';
}

export interface TransferTripDTO {
  hora: string;
  ton: string;
}

export interface TransferUnitDTO {
  id: string;
  driver: string | null;
  domain1: string;
  domain2: string;
  trips: [TransferTripDTO, TransferTripDTO, TransferTripDTO];
}

export interface TransferRecordDTO {
  id: string;
  shift: 'MAÑANA' | 'TARDE' | 'NOCHE';
  units: [TransferUnitDTO, TransferUnitDTO, TransferUnitDTO];
  maquinista: string | null;
  maquinistaDomain: string;
  auxTolva1: string | null;
  auxTolva2: string | null;
  auxTolva3: string | null;
  auxTransferencia1: string | null;
  auxTransferencia2: string | null;
  encargado: string | null;
  balancero1: string | null;
  balancero2: string | null;
  lonero: string | null;
  suplenciaLona: string | null;
  observaciones: string;
}

export interface DayDataDTO {
  records: RouteRecordDTO[];
  transfers: TransferRecordDTO[];
  managers: Record<string, ShiftMetadata>;
}
