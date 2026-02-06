export type StatusType =
  | 'presencial'
  | 'teletrabalho'
  | 'folga'
  | 'ferias'
  | 'atestado'
  | 'licenca'
  | 'outro';

export type SituationType = 'ativo' | 'inativo';

export type HolidayType = 'nacional' | 'municipal' | 'empresa';

export type UserRole = 'admin' | 'gestor' | 'usuario';

export interface Colaborador {
  id: string;
  nome: string;
  matricula: string;
  email: string;
  cargo: string;
  departamento: string;
  situacao: SituationType;
  jornada?: string;
}

export interface StatusDiario {
  id: string;
  colaboradorId: string;
  data: string; // YYYY-MM-DD
  status: StatusType;
  observacao?: string;
}

export interface Feriado {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string;
  tipo: HolidayType;
}

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  colaboradorId?: string;
}

export const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bgColor: string }> = {
  presencial: { label: 'Presencial', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  teletrabalho: { label: 'Teletrabalho', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  folga: { label: 'Folga', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  ferias: { label: 'Férias', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  atestado: { label: 'Atestado', color: 'text-rose-700', bgColor: 'bg-rose-100' },
  licenca: { label: 'Licença', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  outro: { label: 'Outro', color: 'text-gray-700', bgColor: 'bg-gray-100' },
};

export const HOLIDAY_TYPE_CONFIG: Record<HolidayType, { label: string; color: string }> = {
  nacional: { label: 'Nacional', color: 'bg-red-500' },
  municipal: { label: 'Municipal', color: 'bg-blue-500' },
  empresa: { label: 'Empresa', color: 'bg-green-500' },
};
