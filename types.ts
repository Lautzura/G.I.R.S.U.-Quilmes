
export enum ZoneStatus {
  PENDING = 'PENDIENTE',
  COMPLETE = 'COMPLETA',
  INCOMPLETE = 'INCOMPLETA'
}

export enum StaffStatus {
  PRESENT = 'PRESENTE',
  ABSENT = 'FALTA',
  RESERVA = 'RESERVA'
}

export enum AbsenceReason {
  ART = 'ART',
  VACACIONES = 'VACACIONES',
  LICENCIA_MEDICA = 'LICENCIA MEDICA',
  SUSPENSION = 'SUSPENSION',
  RESERVA = 'RESERVA',
  ARTICULO_95 = 'ARTICULO 95',
  DIA_EXAMEN = 'DIA DE EXAMEN',
  DIA_PREEXAMEN = 'DIA PREEXAMEN',
  DIA_FEMENINO = 'DIA FEMENINO',
  NACIMIENTO = 'NACIMIENTO',
  CASAMIENTO = 'CASAMIENTO',
  DUELO = 'DUELO',
  DONACION_SANGRE = 'DONACION DE SANGRE',
  MATERNIDAD = 'MATERNIDAD',
  LICENCIA_GREMIAL = 'LICENCIA GREMIAL',
  ASISTENCIA_FAMILIAR = 'ASISTENCIA FAMILIAR'
}

export interface StaffMember {
  id: string;
  name: string;
  status: StaffStatus;
  gender?: 'MASCULINO' | 'FEMENINO';
  role?: 'CHOFER' | 'AUXILIAR' | 'ENCARGADO' | 'BALANCERO' | 'LONERO' | 'MAQUINISTA' | 'SUPERVISOR' | 'RESERVA' | 'FRANQUERO' | 'CARGA LATERAL';
  preferredShift?: 'MAÑANA' | 'TARDE' | 'NOCHE';
  assignedZone?: string;
  address?: string; // Usado como motivo de falta principal
  absenceReturnDate?: string; // ISO string de la fecha de regreso
  isIndefiniteAbsence?: boolean;
}

export interface RouteRecord {
  id: string;
  zone: string;
  category?: 'AMBIENTE' | 'CARGA LATERAL' | 'RECOLECCIÓN' | 'REPASO_LATERAL';
  internalId: string;
  domain: string;
  reinforcement: string;
  departureTime: string;
  driver: StaffMember | null;
  aux1: StaffMember | null;
  aux2: StaffMember | null;
  aux3: StaffMember | null;
  aux4: StaffMember | null;
  replacementDriver: StaffMember | null;
  replacementAux1: StaffMember | null;
  replacementAux2: StaffMember | null;
  supervisionReport: string;
  tonnage: string;
  dumpTime: string;
  order: number;
  zoneStatus?: ZoneStatus;
  shift: 'MAÑANA' | 'TARDE' | 'NOCHE';
  zoneReason?: string;
  sharesWith?: string;
}

export interface TransferTrip {
  hora: string;
  ton: string;
}

export interface TransferUnit {
  id: string;
  driver: StaffMember | null;
  domain1: string;
  domain2: string;
  trips: [TransferTrip, TransferTrip, TransferTrip];
}

export interface TransferRecord {
  id: string;
  shift: 'MAÑANA' | 'TARDE' | 'NOCHE';
  units: [TransferUnit, TransferUnit, TransferUnit];
  maquinista: StaffMember | null;
  maquinistaDomain: string;
  auxTolva1: StaffMember | null;
  auxTolva2: StaffMember | null;
  auxTolva3: StaffMember | null;
  auxTransferencia1: StaffMember | null;
  auxTransferencia2: StaffMember | null;
  encargado: StaffMember | null;
  balancero1: StaffMember | null;
  balancero2: StaffMember | null;
  lonero: StaffMember | null;
  suplenciaLona: StaffMember | null;
  observaciones: string;
}

export interface ShiftMetadata {
  supervisor: string;
  subSupervisor: string;
  absences: {
    id: string;
    name: string;
    reason: AbsenceReason;
  }[];
}

export enum TruckStatus {
  ACTIVE = 'OPERATIVO',
  MAINTENANCE = 'TALLER',
  OUT_OF_SERVICE = 'FUERA DE SERVICIO'
}

export interface Truck {
  id: string;
  internalId: string;
  domain: string;
  model: string;
  status: TruckStatus;
  repairReason?: string;
  inactiveSince?: string;
  estimatedRepairDays?: number;
  vtvExpiry?: string;
  insuranceExpiry?: string;
}
