
import { RouteRecord, StaffMember } from '../types';

// URL base para el servidor (puedes cambiarla después si tienes un backend real)
const BASE_URL = 'https://tu-api-ejemplo.com/api'; 

export const ApiService = {
  async fetchRecords(): Promise<RouteRecord[]> {
    try {
      const res = await fetch(`${BASE_URL}/records`);
      if (!res.ok) throw new Error('Error al cargar registros');
      return await res.json();
    } catch (e) {
      console.warn("ApiService: El servidor no está configurado. Se usarán datos locales (localStorage).");
      return [];
    }
  },

  async updateRecord(id: string, data: Partial<RouteRecord>) {
    try {
      return await fetch(`${BASE_URL}/records/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      return null;
    }
  },

  async fetchStaff(): Promise<StaffMember[]> {
    try {
      const res = await fetch(`${BASE_URL}/staff`);
      if (!res.ok) throw new Error('Error al cargar personal');
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async updateStaffMember(member: StaffMember) {
    try {
      return await fetch(`${BASE_URL}/staff/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member)
      });
    } catch (e) {
      return null;
    }
  }
};
