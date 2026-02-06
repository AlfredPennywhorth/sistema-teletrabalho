import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import data2026 from '../data/data_2026.json';
import type { Colaborador, StatusDiario, Feriado, User } from '../types';

interface AppState {
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Colaboradores
  colaboradores: Colaborador[];
  addColaborador: (colaborador: Colaborador) => void;
  updateColaborador: (id: string, colaborador: Partial<Colaborador>) => void;
  deleteColaborador: (id: string) => void;

  // Status Diário
  statusDiarios: StatusDiario[];
  addStatusDiario: (status: StatusDiario) => void;
  updateStatusDiario: (id: string, status: Partial<StatusDiario>) => void;
  deleteStatusDiario: (id: string) => void;
  getStatusByColaboradorAndDate: (colaboradorId: string, data: string) => StatusDiario | undefined;

  // Feriados
  feriados: Feriado[];
  addFeriado: (feriado: Feriado) => void;
  updateFeriado: (id: string, feriado: Partial<Feriado>) => void;
  deleteFeriado: (id: string) => void;

  // UI State
  selectedDepartamento: string;
  setSelectedDepartamento: (departamento: string) => void;
}

// Real initial data
const initialColaboradores: Colaborador[] = [
  { id: 'andre', nome: 'André', matricula: '101', email: 'andre@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'virginia', nome: 'Virgínia', matricula: '102', email: 'virginia@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'carol', nome: 'Ana Carolina', matricula: '103', email: 'carol@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'william', nome: 'William', matricula: '104', email: 'william@empresa.com', cargo: 'Colaborador', departamento: 'TI', situacao: 'ativo' },
  { id: 'iuri', nome: 'Iuri', matricula: '105', email: 'iuri@empresa.com', cargo: 'Chefe', departamento: 'TI', situacao: 'ativo' },
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
const generateSampleStatus = (): StatusDiario[] => {
  const statuses: StatusDiario[] = [];
  const statusTypes = ['presencial', 'teletrabalho', 'folga', 'ferias', 'atestado'] as const;
  const today = new Date();

  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    initialColaboradores.forEach((col, idx) => {
      if (Math.random() > 0.3) {
        const statusIndex = (i + idx) % statusTypes.length;
        statuses.push({
          id: `status-${col.id}-${dateStr}`,
          colaboradorId: col.id,
          data: dateStr,
          status: statusTypes[statusIndex],
        });
      }
    });
  }

  return statuses;
};

const initialUser: User = {
  id: 'admin-1',
  nome: 'Administrador',
  email: 'admin@empresa.com',
  role: 'admin',
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User
      currentUser: initialUser,
      setCurrentUser: (user) => set({ currentUser: user }),

      // Colaboradores
      colaboradores: initialColaboradores,
      addColaborador: (colaborador) =>
        set((state) => ({ colaboradores: [...state.colaboradores, colaborador] })),
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
      statusDiarios: generateSampleStatus(),
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
      addFeriado: (feriado) =>
        set((state) => ({ feriados: [...state.feriados, feriado] })),
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
    }),
    {
      name: 'teletrabalho-storage',
      version: 2,
      migrate: (persistedState: any, version) => {
        let state = persistedState;

        if (version === 0) {
          // Migration from version 0 (no version) to 1
          const existingFeriados = state.feriados || [];
          const existingIds = new Set(existingFeriados.map((f: any) => f.id));

          const newFeriados = initialFeriados.filter(f => !existingIds.has(f.id));

          state = {
            ...state,
            feriados: [...existingFeriados, ...newFeriados],
          };
          version = 1;
        }

        if (version === 1) {
          // Migration from version 1 to 2 (Rotation 2026)
          const existingStatus = state.statusDiarios || [];
          const statusMap = new Map(existingStatus.map((s: any) => [s.id, s]));

          // Apply new data (upsert)
          (data2026 as any).forEach((item: any) => {
            statusMap.set(item.id, item);
          });

          state = {
            ...state,
            statusDiarios: Array.from(statusMap.values()),
          };
          version = 2;
        }

        return state;
      },
    }
  )
);
