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
  Coffee,
  FileText,
  HelpCircle,
  Baby
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, addDays, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1 capitalize">
          Resumo de {currentMonth}
        </p>
      </div>



      {/* Main Stats (Compact) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Current Week Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <Calendar className="w-12 h-12 text-slate-900" />
          </div>
          <div className="relative">
            <p className="text-xs font-semibold text-slate-500 uppercase">Semana {format(today, 'w')}</p>
            <p className="text-sm font-bold text-slate-900 mt-1 capitalize leading-tight">
              {format(startOfWeek(today, { weekStartsOn: 0 }), 'dd/MMM', { locale: ptBR })} - {format(endOfWeek(today, { weekStartsOn: 0 }), 'dd/MMM', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Active Collaborators */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Ativos</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-100">
            <Users className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { key: 'presencial', icon: Briefcase },
          { key: 'teletrabalho', icon: Home },
          { key: 'folga', icon: Coffee },
          { key: 'ferias', icon: Palmtree },
          { key: 'atestado', icon: FileText },
          { key: 'licenca', icon: Baby },
          { key: 'outro', icon: HelpCircle },
        ].map((item) => {
          const statusKey = item.key as StatusType;
          const config = STATUS_CONFIG[statusKey];
          const count = stats.todayStatuses[statusKey];
          const Icon = item.icon;

          return (
            <div
              key={statusKey}
              className="bg-white rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow flex flex-col justify-between min-w-0"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate" title={config.label}>{config.label}</span>
                <Icon className={cn('w-4 h-4', config.color)} />
              </div>
              <p className="text-2xl font-bold text-slate-900 leading-none">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Weekly Overview */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900">Visão Geral da Semana</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-slate-700 min-w-[150px] border-r border-slate-200">
                  Colaborador
                </th>
                {Array.from({ length: 7 }).map((_, idx) => {
                  const day = addDays(startOfWeek(today, { weekStartsOn: 0 }), idx);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <th key={idx} className={cn("px-2 py-2 text-center border-r border-slate-100 last:border-0", isToday && "bg-blue-50")}>
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-medium text-slate-500 uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={cn("text-xs font-bold", isToday ? "text-blue-600" : "text-slate-700")}>
                          {format(day, 'dd/MM')}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {colaboradores.filter(c => c.situacao === 'ativo').map((col) => (
                <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                    {col.nome}
                  </td>
                  {Array.from({ length: 7 }).map((_, idx) => {
                    const day = addDays(startOfWeek(today, { weekStartsOn: 0 }), idx);
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const status = statusDiarios.find(s => s.colaboradorId === col.id && s.data === dateStr);
                    const holiday = feriados.find(f => f.data === dateStr);
                    const isToday = isSameDay(day, new Date());

                    let bg = "";
                    let text = "-";
                    let title = "";

                    if (holiday) {
                      bg = "bg-red-50 text-red-600";
                      text = "Feriado";
                      title = holiday.nome;
                    } else if (status) {
                      const config = STATUS_CONFIG[status.status];
                      bg = config.bgColor + " " + config.color;
                      text = config.label;
                    }

                    return (
                      <td key={idx} className={cn("px-2 py-2 text-center border-r border-slate-100 last:border-0", isToday && !bg && "bg-blue-50/30")}>
                        {text !== "-" && (
                          <span className={cn("inline-block px-2 py-1 rounded text-xs font-medium truncate max-w-[100px]", bg)} title={title || text}>
                            {text}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
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
                <th className="text-center py-3 px-4 text-sm font-semibold text-teal-800">Presencial</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-orange-700">Teletrabalho</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-purple-700">Férias</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Folga</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-rose-700">Atestado</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-indigo-700">Licença</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Outro</th>
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
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-medium">
                        {deptStatuses.filter((s) => s.status === 'presencial').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'teletrabalho').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'ferias').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {deptStatuses.filter((s) => s.status === 'folga').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'atestado').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'licenca').length}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-medium">
                        {deptStatuses.filter((s) => s.status === 'outro').length}
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
