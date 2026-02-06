import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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

// Mock initial data
const initialColaboradores: Colaborador[] = [
  { id: '1', nome: 'Ana Silva', matricula: '001', email: 'ana.silva@empresa.com', cargo: 'Desenvolvedora', departamento: 'TI', situacao: 'ativo' },
  { id: '2', nome: 'Carlos Santos', matricula: '002', email: 'carlos.santos@empresa.com', cargo: 'Analista', departamento: 'TI', situacao: 'ativo' },
  { id: '3', nome: 'Maria Oliveira', matricula: '003', email: 'maria.oliveira@empresa.com', cargo: 'Gerente', departamento: 'RH', situacao: 'ativo' },
  { id: '4', nome: 'João Costa', matricula: '004', email: 'joao.costa@empresa.com', cargo: 'Coordenador', departamento: 'Financeiro', situacao: 'ativo' },
  { id: '5', nome: 'Fernanda Lima', matricula: '005', email: 'fernanda.lima@empresa.com', cargo: 'Assistente', departamento: 'RH', situacao: 'ativo' },
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
    }
  )
);
