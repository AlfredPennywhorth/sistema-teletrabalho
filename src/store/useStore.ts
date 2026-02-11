import { create } from 'zustand';

import data2026 from '../data/data_2026.json';
import type { Colaborador, StatusDiario, Feriado, User } from '../types';
import { calculateRotationMatrix } from '../services/rotationService';
import { parseISO, endOfYear } from 'date-fns';

interface AppState {
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Colaboradores
  colaboradores: Colaborador[];
  addColaborador: (colaborador: Colaborador) => void;
  setColaboradores: (colaboradores: Colaborador[]) => void;
  updateColaborador: (id: string, colaborador: Partial<Colaborador>) => void;
  deleteColaborador: (id: string) => void;

  // Status Diário
  statusDiarios: StatusDiario[];
  setStatusDiarios: (status: StatusDiario[]) => void;
  addStatusDiario: (status: StatusDiario) => void;
  updateStatusDiario: (id: string, status: Partial<StatusDiario>) => void;
  deleteStatusDiario: (id: string) => void;
  getStatusByColaboradorAndDate: (colaboradorId: string, data: string) => StatusDiario | undefined;

  // Feriados
  feriados: Feriado[];
  setFeriados: (feriados: Feriado[]) => void;
  addFeriado: (feriado: Feriado) => void;
  addFeriados: (feriados: Feriado[]) => void;
  updateFeriado: (id: string, feriado: Partial<Feriado>) => void;
  deleteFeriado: (id: string) => void;

  // UI State
  selectedDepartamento: string;
  setSelectedDepartamento: (departamento: string) => void;

  // Rotation
  recalculateRotation: (startDate: string) => void;
}

// Real initial data
const initialColaboradores: Colaborador[] = [
  { id: 'andre', nome: 'André William de Souza', matricula: '101', email: 'andre@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'virginia', nome: 'Virginia L. da Silva Borba', matricula: '102', email: 'virginia@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'carol', nome: 'Ana Carolina Viana', matricula: '103', email: 'carol@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'william', nome: 'William de Barros', matricula: '104', email: 'william@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'iuri', nome: 'Iuri Artur Miranda de Andrade', matricula: '105', email: 'iuri@empresa.com', cargo: 'Chefe', departamento: 'TI', situacao: 'ativo' },
];

const initialFeriados: Feriado[] = [
  // 2025
  { id: '2025-01-01', data: '2025-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { id: '2025-04-21', data: '2025-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { id: '2025-05-01', data: '2025-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { id: '2025-09-07', data: '2025-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { id: '2025-10-12', data: '2025-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { id: '2025-11-02', data: '2025-11-02', nome: 'Finados', tipo: 'nacional' },
  { id: '2025-11-15', data: '2025-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { id: '2025-12-25', data: '2025-12-25', nome: 'Natal', tipo: 'nacional' },

  // 2026
  { id: '2026-01-01', data: '2026-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { id: '2026-04-21', data: '2026-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { id: '2026-05-01', data: '2026-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { id: '2026-09-07', data: '2026-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { id: '2026-10-12', data: '2026-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { id: '2026-11-02', data: '2026-11-02', nome: 'Finados', tipo: 'nacional' },
  { id: '2026-11-15', data: '2026-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { id: '2026-12-25', data: '2026-12-25', nome: 'Natal', tipo: 'nacional' },

  // 2027
  { id: '2027-01-01', data: '2027-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { id: '2027-04-21', data: '2027-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { id: '2027-05-01', data: '2027-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { id: '2027-09-07', data: '2027-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { id: '2027-10-12', data: '2027-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { id: '2027-11-02', data: '2027-11-02', nome: 'Finados', tipo: 'nacional' },
  { id: '2027-11-15', data: '2027-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { id: '2027-12-25', data: '2027-12-25', nome: 'Natal', tipo: 'nacional' },
];

// Generate some sample status data


export const useStore = create<AppState>()((set, get) => ({
  // User
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Colaboradores
  colaboradores: initialColaboradores,
  addColaborador: (colaborador) =>
    set((state) => ({ colaboradores: [...state.colaboradores, colaborador] })),
  setColaboradores: (colaboradores) => set({ colaboradores }),
  updateColaborador: (id, colaborador) =>
    set((state) => ({
      colaboradores: state.colaboradores.map((c) =>
        c.id === id ? { ...c, ...colaborador } : c
      ),
    })),
  deleteColaborador: (id) =>
    set((state) => ({
      colaboradores: state.colaboradores.filter((c) => c.id !== id),
    })),

  // Status Diário
  statusDiarios: data2026 as StatusDiario[],
  setStatusDiarios: (statusDiarios) => set({ statusDiarios }),
  addStatusDiario: (status) =>
    set((state) => {
      // Remove existing status for same colaborador and date
      const filtered = state.statusDiarios.filter(
        (s) => !(s.colaboradorId === status.colaboradorId && s.data === status.data)
      );
      return { statusDiarios: [...filtered, status] };
    }),
  updateStatusDiario: (id, status) =>
    set((state) => ({
      statusDiarios: state.statusDiarios.map((s) =>
        s.id === id ? { ...s, ...status } : s
      ),
    })),
  deleteStatusDiario: (id) =>
    set((state) => ({
      statusDiarios: state.statusDiarios.filter((s) => s.id !== id),
    })),
  getStatusByColaboradorAndDate: (colaboradorId, data) => {
    return get().statusDiarios.find(
      (s) => s.colaboradorId === colaboradorId && s.data === data
    );
  },

  // Feriados
  feriados: initialFeriados,
  setFeriados: (feriados) => set({ feriados }),
  addFeriado: (feriado) =>
    set((state) => ({ feriados: [...state.feriados, feriado] })),
  addFeriados: (newFeriados) =>
    set((state) => {
      // Filter out duplicates based on date
      const existingDates = new Set(state.feriados.map((f) => f.data));
      const uniqueNewFeriados = newFeriados.filter((f) => !existingDates.has(f.data));
      return { feriados: [...state.feriados, ...uniqueNewFeriados] };
    }),
  updateFeriado: (id, feriado) =>
    set((state) => ({
      feriados: state.feriados.map((f) =>
        f.id === id ? { ...f, ...feriado } : f
      ),
    })),
  deleteFeriado: (id) =>
    set((state) => ({
      feriados: state.feriados.filter((f) => f.id !== id),
    })),

  // UI State
  selectedDepartamento: '',
  setSelectedDepartamento: (departamento) => set({ selectedDepartamento: departamento }),

  // Rotation Logic
  recalculateRotation: (startDate: string) =>
    set((state) => {
      const start = parseISO(startDate);
      const end = endOfYear(start); // Recalculate until end of that year

      const newStatuses = calculateRotationMatrix(
        state.statusDiarios,
        state.feriados,
        state.colaboradores,
        start,
        end
      );

      // Merge: Remove old entries overlapping with new ones, then add new ones
      // Actually, calculateRotationMatrix returns ALL statuses for the valid days in range.
      // But it only returns generated ones.
      // The strategy in the service was: 
      // "newStatuses.push(existingStatus)" for blocking statuses.
      // So newStatuses contains EVERYTHING for that range for the pool.
      // We should filter out existing statuses for the pool in that range and replace with newStatuses.

      const poolIds = ['andre', 'virginia', 'carol', 'william', 'iuri']; // Fixed + Pool
      const rangeDates = new Set(newStatuses.map(s => s.data));

      const keptStatuses = state.statusDiarios.filter(s => {
        // Keep if NOT in the pool OR NOT in the date range calculated
        const isInPool = poolIds.includes(s.colaboradorId);
        const isInRange = rangeDates.has(s.data);
        return !(isInPool && isInRange);
      });

      return { statusDiarios: [...keptStatuses, ...newStatuses] };
    }),
}));
