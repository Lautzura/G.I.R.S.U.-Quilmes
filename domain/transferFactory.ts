import { TransferRecord, TransferUnit, TransferTrip } from '../types';

/**
 * Crea un viaje vacío para la planta de transferencia
 */
export const createEmptyTrip = (): TransferTrip => ({
  hora: '',
  ton: '',
});

/**
 * Crea una unidad vacía para la planta de transferencia
 */
export const createEmptyUnit = (id: string): TransferUnit => ({
  id,
  driver: null,
  domain1: '',
  domain2: '',
  trips: [createEmptyTrip(), createEmptyTrip(), createEmptyTrip()],
});

/**
 * Crea un registro completo de transferencia para un turno específico
 */
export const createEmptyTransfer = (shift: 'MAÑANA' | 'TARDE' | 'NOCHE'): TransferRecord => ({
  id: `TR-${shift}-${Date.now()}`,
  shift,
  units: [
    createEmptyUnit('U1'),
    createEmptyUnit('U2'),
    createEmptyUnit('U3'),
  ],
  maquinista: null,
  maquinistaDomain: '',
  auxTolva1: null,
  auxTolva2: null,
  auxTolva3: null,
  auxTransferencia1: null,
  auxTransferencia2: null,
  encargado: null,
  balancero1: null,
  balancero2: null,
  lonero: null,
  suplenciaLona: null,
  observaciones: '',
});
