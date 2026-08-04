import { create } from 'zustand';
import type { Colaborador, StatusDiario, Feriado, User } from '../types';
import { 
  addColaborador as fsAddColaborador, updateColaborador as fsUpdateColaborador, deleteColaborador as fsDeleteColaborador,
  addFeriado as fsAddFeriado, setFeriadosBatch as fsAddFeriadosBatch, updateFeriado as fsUpdateFeriado, deleteFeriado as fsDeleteFeriado,
  updateStatusDiario as fsUpdateStatus, deleteStatusDiario as fsDeleteStatus, setRegistrosBatch as fsSetRegistrosBatch,
  purgeObsoleteVacationRecords, getRegistros
} from '../services/firestoreService';
import { calculateRotationMatrix } from '../services/rotationService';
import { getFerias } from '../services/feriasService';
import { parseISO, endOfYear } from 'date-fns';

interface AppState {
  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Colaboradores
  colaboradores: Colaborador[];
  addColaborador: (colaborador: Colaborador) => Promise<void>;
  setColaboradores: (colaboradores: Colaborador[]) => void;
  updateColaborador: (id: string, colaborador: Partial<Colaborador>) => Promise<void>;
  deleteColaborador: (id: string) => Promise<void>;

  // Status Diário
  statusDiarios: StatusDiario[];
  setStatusDiarios: (status: StatusDiario[]) => void;
  addStatusDiario: (status: StatusDiario) => Promise<void>;
  updateStatusDiario: (id: string, status: Partial<StatusDiario>) => Promise<void>;
  deleteStatusDiario: (id: string) => Promise<void>;
  getStatusByColaboradorAndDate: (colaboradorId: string, data: string) => StatusDiario | undefined;
  syncStatusDiarios: (firestoreStatus: StatusDiario[]) => void;

  // Feriados
  feriados: Feriado[];
  setFeriados: (feriados: Feriado[]) => void;
  addFeriado: (feriado: Feriado) => Promise<void>;
  addFeriados: (feriados: Feriado[]) => Promise<void>;
  updateFeriado: (id: string, feriado: Partial<Feriado>) => Promise<void>;
  deleteFeriado: (id: string) => Promise<void>;

  // UI State
  selectedDepartamento: string;
  setSelectedDepartamento: (departamento: string) => void;

  // Rotation
  recalculateRotation: (startDate: string, maxTeletrabalho?: number, sobrescreverManual?: boolean) => Promise<void>;
  
  // Sync State
  isSyncing: boolean;
  setIsSyncing: (syncing: boolean) => void;
}

export const initialColaboradores: Colaborador[] = [
  { id: 'andre', nome: 'André William de Souza', matricula: '11.393-0', email: 'andres@cetsp.com.br', cargo: 'Analista de Gestão', departamento: 'Ouvidoria', situacao: 'ativo' },
  { id: 'virginia', nome: 'Virginia L. da Silva Borba', matricula: '12.824-4', email: 'virginiab@cetsp.com.br', cargo: 'Assistente Administrativo', departamento: 'Ouvidoria', situacao: 'ativo' },
  { id: 'carol', nome: 'Ana Carolina Viana', matricula: '12.800-7', email: 'anacv@cetsp.com.br', cargo: 'Assistente Administrativo', departamento: 'Ouvidoria', situacao: 'ativo' },
  { id: 'william', nome: 'William de Barros', matricula: '12.490-7', email: 'williambarros@cetsp.com.br', cargo: 'Assistente Administrativo', departamento: 'Ouvidoria', situacao: 'ativo' },
  { id: 'iuri', nome: 'Iuri Artur Miranda de Andrade', matricula: '13.864-9', email: 'iuri.andrade@cetsp.com.br', cargo: 'Ouvidor', departamento: 'Ouvidoria', situacao: 'ativo' },
];

export const initialFeriados: Feriado[] = [
  { id: '2025-01-01', data: '2025-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { id: '2025-04-21', data: '2025-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { id: '2025-05-01', data: '2025-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { id: '2025-09-07', data: '2025-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { id: '2025-10-12', data: '2025-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { id: '2025-11-02', data: '2025-11-02', nome: 'Finados', tipo: 'nacional' },
  { id: '2025-11-15', data: '2025-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { id: '2025-12-25', data: '2025-12-25', nome: 'Natal', tipo: 'nacional' },
  { id: '2026-01-01', data: '2026-01-01', nome: 'Confraternização Universal', tipo: 'nacional' },
  { id: '2026-04-03', data: '2026-04-03', nome: 'Paixão de Cristo', tipo: 'nacional' },
  { id: '2026-04-21', data: '2026-04-21', nome: 'Tiradentes', tipo: 'nacional' },
  { id: '2026-05-01', data: '2026-05-01', nome: 'Dia do Trabalho', tipo: 'nacional' },
  { id: '2026-09-07', data: '2026-09-07', nome: 'Independência do Brasil', tipo: 'nacional' },
  { id: '2026-10-12', data: '2026-10-12', nome: 'Nossa Senhora Aparecida', tipo: 'nacional' },
  { id: '2026-11-02', data: '2026-11-02', nome: 'Finados', tipo: 'nacional' },
  { id: '2026-11-15', data: '2026-11-15', nome: 'Proclamação da República', tipo: 'nacional' },
  { id: '2026-12-25', data: '2026-12-25', nome: 'Natal', tipo: 'nacional' },
];

export const useStore = create<AppState>()((set, get) => ({
  // User
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  // Colaboradores
  colaboradores: initialColaboradores,
  addColaborador: async (colaborador) => {
    set({ isSyncing: true });
    try {
      await fsAddColaborador(colaborador);
      set((state) => ({ colaboradores: [...state.colaboradores, colaborador] }));
    } catch (error) {
      console.error('Erro ao adicionar colaborador:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },
  setColaboradores: (colaboradores) => set({ colaboradores }),
  updateColaborador: async (id, colaborador) => {
    const updated = get().colaboradores.map((c) =>
      c.id === id ? { ...c, ...colaborador } : c
    );
    const target = updated.find(c => c.id === id);
    if (target) {
      set({ isSyncing: true });
      try {
        await fsUpdateColaborador(target);
        set({ colaboradores: updated });
      } catch (error) {
        console.error('Erro ao atualizar colaborador:', error);
        alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
      } finally {
        set({ isSyncing: false });
      }
    }
  },
  deleteColaborador: async (id) => {
    set({ isSyncing: true });
    try {
      await fsDeleteColaborador(id);
      set((state) => ({
        colaboradores: state.colaboradores.filter((c) => c.id !== id),
      }));
    } catch (error) {
      console.error('Erro ao deletar colaborador:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },

  // Status Diário
  statusDiarios: [],
  setStatusDiarios: (statusDiarios) => set({ statusDiarios }),
  addStatusDiario: async (status) => {
    set({ isSyncing: true });
    try {
      await fsUpdateStatus(status);
      set((state) => {
        const filtered = state.statusDiarios.filter(
          (s) => !(s.colaboradorId === status.colaboradorId && s.data === status.data)
        );
        return { statusDiarios: [...filtered, status] };
      });
    } catch (error) {
      console.error('Erro ao adicionar status diário:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },
  updateStatusDiario: async (id, status) => {
    const current = get().statusDiarios.find(s => s.id === id);
    if (!current) return;
    const updated = { ...current, ...status };
    
    set({ isSyncing: true });
    try {
      await fsUpdateStatus(updated);
      set((state) => ({
        statusDiarios: state.statusDiarios.map((s) =>
          s.id === id ? updated : s
        ),
      }));
    } catch (error) {
      console.error('Erro ao atualizar status diário:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      setTimeout(() => set({ isSyncing: false }), 800);
    }
  },
  deleteStatusDiario: async (id) => {
    set({ isSyncing: true });
    try {
      await fsDeleteStatus(id);
      set((state) => ({
        statusDiarios: state.statusDiarios.filter((s) => s.id !== id),
      }));
    } catch (error) {
      console.error('Erro ao deletar status diário:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      setTimeout(() => set({ isSyncing: false }), 800);
    }
  },
  getStatusByColaboradorAndDate: (colaboradorId, data) => {
    return get().statusDiarios.find(
      (s) => s.colaboradorId === colaboradorId && s.data === data
    );
  },
  syncStatusDiarios: (firestoreStatus) => {
    set({ statusDiarios: firestoreStatus });
  },

  // Feriados
  feriados: initialFeriados,
  setFeriados: (feriados) => set({ feriados }),
  addFeriado: async (feriado) => {
    set({ isSyncing: true });
    try {
      await fsAddFeriado(feriado);
      set((state) => ({ feriados: [...state.feriados, feriado] }));
    } catch (error) {
      console.error('Erro ao adicionar feriado:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },
  addFeriados: async (newFeriados) => {
    set({ isSyncing: true });
    try {
      await fsAddFeriadosBatch(newFeriados);
      set((state) => {
        const existingDates = new Set(state.feriados.map((f) => f.data));
        const uniqueNewFeriados = newFeriados.filter((f) => !existingDates.has(f.data));
        return { feriados: [...state.feriados, ...uniqueNewFeriados] };
      });
    } catch (error) {
      console.error('Erro ao adicionar feriados em lote:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },
  updateFeriado: async (id, feriado) => {
    const current = get().feriados.find(f => f.id === id);
    if (!current) return;
    const updated = { ...current, ...feriado };
    set({ isSyncing: true });
    try {
      await fsUpdateFeriado(updated);
      set((state) => ({
        feriados: state.feriados.map((f) =>
          f.id === id ? updated : f
        ),
      }));
    } catch (error) {
      console.error('Erro ao atualizar feriado:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },
  deleteFeriado: async (id) => {
    set({ isSyncing: true });
    try {
      await fsDeleteFeriado(id);
      set((state) => ({
        feriados: state.feriados.filter((f) => f.id !== id),
      }));
    } catch (error) {
      console.error('Erro ao deletar feriado:', error);
      alert('Não foi possível salvar as alterações. Verifique sua conexão e tente novamente.');
    } finally {
      set({ isSyncing: false });
    }
  },

  // UI State
  selectedDepartamento: '',
  setSelectedDepartamento: (departamento) => set({ selectedDepartamento: departamento }),

  // Rotation Logic
  recalculateRotation: async (startDate: string, maxTeletrabalho: number = 1, sobrescreverManual: boolean = false) => {
    const start = parseISO(startDate);
    const end = endOfYear(start);

    set({ isSyncing: true });
    try {
      // 0. Purga todos os registros obsoletos de férias (incluindo fins de semana e feriados) do Firestore
      await purgeObsoleteVacationRecords();

      // 1. Fetch vacations from Firestore
      const allFerias = await getFerias();
      
      // 2. Filter active vacations (programado or aprovado)
      const activeFerias = allFerias.filter(f => f.status === 'programado' || f.status === 'aprovado');

      // 3. Limit telework count to maximum 1
      const finalMaxTeletrabalho = Math.min(maxTeletrabalho, 1);

      const newStatuses = calculateRotationMatrix(
        get().statusDiarios,
        get().feriados,
        get().colaboradores,
        start,
        end,
        activeFerias,
        finalMaxTeletrabalho,
        sobrescreverManual
      );

      await fsSetRegistrosBatch(newStatuses);

      // Recarrega todos os registros limpos do Firestore para garantir 100% de sincronismo sem lixo em memória
      const updatedRegistros = await getRegistros();
      get().syncStatusDiarios(updatedRegistros);
    } catch (error) {
      console.error('Erro ao recalcular rodízio:', error);
      alert('A escala não foi recalculada. Nenhum dado foi alterado.');
    } finally {
      setTimeout(() => set({ isSyncing: false }), 800);
    }
  },

  // Sync State
  isSyncing: false,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
}));
