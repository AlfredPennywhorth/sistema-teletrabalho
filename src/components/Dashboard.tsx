import { useMemo } from 'react';
import {
  Users,
  Briefcase,
  Home,
  Calendar,
  Palmtree,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { STATUS_CONFIG, type StatusType } from '../types';
import { cn } from '../utils/cn';

export function Dashboard() {
  const { colaboradores, statusDiarios, feriados } = useStore();
  const today = new Date();
  const currentMonth = format(today, 'MMMM yyyy', { locale: ptBR });

  const stats = useMemo(() => {
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    const todayStr = format(today, 'yyyy-MM-dd');

    // Today's statuses
    const todayStatuses = statusDiarios.filter((s) => s.data === todayStr);
    const statusCounts: Record<StatusType, number> = {
      presencial: 0,
      teletrabalho: 0,
      folga: 0,
      ferias: 0,
      atestado: 0,
      licenca: 0,
      outro: 0,
    };
    todayStatuses.forEach((s) => {
      statusCounts[s.status]++;
    });

    // Active collaborators
    const activeColaboradores = colaboradores.filter((c) => c.situacao === 'ativo');

    // Monthly stats
    const monthlyStatuses = statusDiarios.filter((s) => {
      const date = parseISO(s.data);
      return isWithinInterval(date, { start, end });
    });

    const monthlyByStatus: Record<StatusType, number> = {
      presencial: 0,
      teletrabalho: 0,
      folga: 0,
      ferias: 0,
      atestado: 0,
      licenca: 0,
      outro: 0,
    };
    monthlyStatuses.forEach((s) => {
      monthlyByStatus[s.status]++;
    });

    // Upcoming vacations (next 30 days)
    const next30Days = addDays(today, 30);
    const upcomingVacations = statusDiarios.filter((s) => {
      if (s.status !== 'ferias') return false;
      const date = parseISO(s.data);
      return isWithinInterval(date, { start: today, end: next30Days });
    });

    // Upcoming holidays
    const upcomingHolidays = feriados.filter((f) => {
      const date = parseISO(f.data);
      return isWithinInterval(date, { start: today, end: next30Days });
    }).sort((a, b) => a.data.localeCompare(b.data));

    return {
      total: activeColaboradores.length,
      todayStatuses: statusCounts,
      monthlyByStatus,
      upcomingVacations,
      upcomingHolidays,
      departments: [...new Set(colaboradores.map((c) => c.departamento))],
    };
  }, [colaboradores, statusDiarios, feriados, today]);

  const mainCards = [
    {
      title: 'Colaboradores Ativos',
      value: stats.total,
      icon: Users,
      color: 'bg-blue-500',
      lightColor: 'bg-blue-50',
    },
    {
      title: 'Presencial Hoje',
      value: stats.todayStatuses.presencial,
      icon: Briefcase,
      color: 'bg-emerald-500',
      lightColor: 'bg-emerald-50',
    },
    {
      title: 'Teletrabalho Hoje',
      value: stats.todayStatuses.teletrabalho,
      icon: Home,
      color: 'bg-indigo-500',
      lightColor: 'bg-indigo-50',
    },
    {
      title: 'Férias Hoje',
      value: stats.todayStatuses.ferias,
      icon: Palmtree,
      color: 'bg-purple-500',
      lightColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1 capitalize">
          Resumo de {currentMonth}
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                </div>
                <div className={cn('p-3 rounded-xl', card.lightColor)}>
                  <Icon className={cn('w-6 h-6', card.color.replace('bg-', 'text-'))} />
                </div>
              </div>
            </div>
          );
        })}

        {/* Current Week Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Semana Vigente</p>
              <p className="text-lg font-bold text-slate-900 mt-2 capitalize">
                {format(startOfWeek(today, { weekStartsOn: 0 }), 'dd/MMM', { locale: ptBR })} - {format(endOfWeek(today, { weekStartsOn: 0 }), 'dd/MMM', { locale: ptBR })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Semana {format(today, 'w')}</p>
            </div>
            <div className="p-3 rounded-xl bg-orange-50">
              <Calendar className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Distribuição do Mês</h2>
          </div>
          <div className="space-y-3">
            {(Object.entries(stats.monthlyByStatus) as [StatusType, number][])
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => {
                const config = STATUS_CONFIG[status];
                const total = Object.values(stats.monthlyByStatus).reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{config.label}</span>
                      <span className="text-slate-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', config.bgColor.replace('100', '400'))}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900">Próximos Feriados</h2>
          </div>
          {stats.upcomingHolidays.length > 0 ? (
            <div className="space-y-3">
              {stats.upcomingHolidays.slice(0, 5).map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-slate-900">{holiday.nome}</p>
                    <p className="text-sm text-slate-500 capitalize">
                      {format(parseISO(holiday.data), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 text-xs font-medium rounded-full',
                    holiday.tipo === 'nacional' ? 'bg-red-100 text-red-700' :
                      holiday.tipo === 'municipal' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                  )}>
                    {holiday.tipo}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <Calendar className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>Nenhum feriado nos próximos 30 dias</p>
            </div>
          )}
        </div>
      </div>

      {/* Today's Status by Department */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Status de Hoje por Departamento</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Departamento</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-emerald-600">Presencial</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-blue-600">Teletrabalho</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-purple-600">Férias</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-amber-600">Folga</th>
              </tr>
            </thead>
            <tbody>
              {stats.departments.map((dept) => {
                const deptColabs = colaboradores.filter(
                  (c) => c.departamento === dept && c.situacao === 'ativo'
                );
                const todayStr = format(today, 'yyyy-MM-dd');
                const deptStatuses = statusDiarios.filter(
                  (s) => s.data === todayStr && deptColabs.some((c) => c.id === s.colaboradorId)
                );
                return (
                  <tr key={dept} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-900">{dept}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{deptColabs.length}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'presencial').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'teletrabalho').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'ferias').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'folga').length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts Section */}
      {(stats.todayStatuses.atestado > 0 || stats.todayStatuses.licenca > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-800">Atenção</h3>
              <p className="text-amber-700 text-sm mt-1">
                {stats.todayStatuses.atestado > 0 && (
                  <span>{stats.todayStatuses.atestado} colaborador(es) em atestado. </span>
                )}
                {stats.todayStatuses.licenca > 0 && (
                  <span>{stats.todayStatuses.licenca} colaborador(es) em licença.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
