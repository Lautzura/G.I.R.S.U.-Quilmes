
import { RouteRecord, StaffMember } from '../types';

// CAMBIA ESTA URL POR LA DE TU SERVIDOR EN LA RED
const BASE_URL = 'http://TU-IP-SERVIDOR:3000/api'; 

export const ApiService = {
  async fetchRecords(): Promise<RouteRecord[]> {
    try {
      const res = await fetch(`${BASE_URL}/records`);
      if (!res.ok) throw new Error('Error al cargar registros');
      return await res.json();
    } catch (e) {
      console.warn("Usando datos locales: Servidor de red no disponible.");
      return []; // Retorna vacio para usar mocks si falla
    }
  },

  async updateRecord(id: string, data: Partial<RouteRecord>) {
    return fetch(`${BASE_URL}/records/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  async fetchStaff(): Promise<StaffMember[]> {
    try {
      const res = await fetch(`${BASE_URL}/staff`);
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async updateStaffMember(member: StaffMember) {
    return fetch(`${BASE_URL}/staff/${member.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(member)
    });
  }
};
