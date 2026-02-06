import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { parseISO, getDaysInMonth, isWeekend } from 'date-fns';
import { useStore } from '../store/useStore';
import { STATUS_CONFIG, type StatusType } from '../types';
import { cn } from '../utils/cn';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

export function AnnualPanel() {
  const { colaboradores, statusDiarios, feriados } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [viewMode, setViewMode] = useState<'heatmap' | 'status'>('heatmap');

  const departments = useMemo(
    () => [...new Set(colaboradores.map((c) => c.departamento))],
    [colaboradores]
  );

  const filteredColaboradores = useMemo(() => {
    let filtered = colaboradores.filter((c) => c.situacao === 'ativo');
    if (selectedColaborador) {
      filtered = filtered.filter((c) => c.id === selectedColaborador);
    }
    if (selectedDepartamento) {
      filtered = filtered.filter((c) => c.departamento === selectedDepartamento);
    }
    return filtered;
  }, [colaboradores, selectedColaborador, selectedDepartamento]);

  const getStatusForDay = (colaboradorId: string, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return statusDiarios.find(
      (s) => s.data === dateStr && s.colaboradorId === colaboradorId
    );
  };

  const isHoliday = (month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return feriados.some((f) => f.data === dateStr);
  };

  const getStatsForColaborador = (colaboradorId: string) => {
    const yearStatuses = statusDiarios.filter((s) => {
      const date = parseISO(s.data);
      return s.colaboradorId === colaboradorId && date.getFullYear() === year;
    });

    const stats: Record<StatusType, number> = {
      presencial: 0,
      teletrabalho: 0,
      folga: 0,
      ferias: 0,
      atestado: 0,
      licenca: 0,
      outro: 0,
    };

    yearStatuses.forEach((s) => {
      stats[s.status]++;
    });

    return stats;
  };

  const exportToCSV = () => {
    const headers = ['Colaborador', 'Departamento', ...MONTHS.map((m) => `${m}/${year}`)];
    const rows = filteredColaboradores.map((col) => {
      const monthData = MONTHS.map((_, monthIndex) => {
        const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
        let count = 0;
        for (let day = 1; day <= daysInMonth; day++) {
          const status = getStatusForDay(col.id, monthIndex, day);
          if (status) count++;
        }
        return count;
      });
      return [col.nome, col.departamento, ...monthData];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `painel-anual-${year}.csv`;
    link.click();
  };

  const renderPersonView = () => {
    const col = filteredColaboradores[0];
    if (!col) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-24 border-r border-slate-200">
                  Mês
                </th>
                {Array.from({ length: 31 }, (_, i) => (
                  <th key={i} className="w-8 h-8 text-center font-normal text-slate-500 border-r border-slate-100 last:border-r-0">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTHS.map((month, monthIndex) => {
                const daysInMonth = getDaysInMonth(new Date(year, monthIndex));

                return (
                  <tr key={month} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-700 border-r border-slate-200">
                      {month}
                    </td>
                    {Array.from({ length: 31 }, (_, dayIndex) => {
                      if (dayIndex >= daysInMonth) {
                        return <td key={dayIndex} className="bg-slate-50/[0.3]" />;
                      }

                      const status = getStatusForDay(col.id, monthIndex, dayIndex + 1);
                      const date = new Date(year, monthIndex, dayIndex + 1);
                      const isWknd = isWeekend(date);
                      const isHol = isHoliday(monthIndex, dayIndex + 1);

                      let bgColor = 'bg-white';
                      let title = '';
                      let content = '';

                      if (isHol) {
                        bgColor = 'bg-red-100 text-red-700 font-bold';
                        title = 'Feriado';
                        content = 'F';
                      } else if (isWknd) {
                        bgColor = 'bg-slate-100';
                        title = 'Fim de semana';
                      } else if (status) {
                        bgColor = STATUS_CONFIG[status.status].bgColor;
                        title = STATUS_CONFIG[status.status].label;
                      }

                      return (
                        <td
                          key={dayIndex}
                          className={cn(
                            'border-r border-slate-50 text-center relative transition-colors',
                            bgColor,
                            !isWknd && !isHol && !status && 'hover:bg-slate-50'
                          )}
                          title={`${dayIndex + 1}/${monthIndex + 1}/${year}: ${title}`}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTeamView = () => (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 min-w-[150px] border-r border-slate-200">
                Colaborador
              </th>
              {MONTHS.map((month, idx) => (
                <th
                  key={month}
                  className="px-1 py-2 text-center font-semibold text-slate-700 border-r border-slate-100"
                  colSpan={getDaysInMonth(new Date(year, idx))}
                >
                  {month}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-slate-700 min-w-[80px]">
                Total
              </th>
            </tr>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 border-r border-slate-200" />
              {MONTHS.map((_, monthIndex) => {
                const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
                return Array.from({ length: daysInMonth }, (_, dayIndex) => {
                  const date = new Date(year, monthIndex, dayIndex + 1);
                  const isWknd = isWeekend(date);
                  const isHol = isHoliday(monthIndex, dayIndex + 1);
                  return (
                    <th
                      key={`${monthIndex}-${dayIndex}`}
                      className={cn(
                        'w-5 h-6 text-center text-[10px] font-normal',
                        isHol ? 'bg-red-100 text-red-600' : isWknd ? 'bg-slate-100 text-slate-400' : 'text-slate-500'
                      )}
                    >
                      {dayIndex + 1}
                    </th>
                  );
                });
              })}
              <th className="bg-slate-50" />
            </tr>
          </thead>
          <tbody>
            {filteredColaboradores.map((col) => {
              const stats = getStatsForColaborador(col.id);
              const totalDays = Object.values(stats).reduce((a, b) => a + b, 0);

              return (
                <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{col.nome}</span>
                      <span className="text-[10px] text-slate-500">{col.departamento}</span>
                    </div>
                  </td>
                  {MONTHS.map((_, monthIndex) => {
                    const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
                    return Array.from({ length: daysInMonth }, (_, dayIndex) => {
                      const status = getStatusForDay(col.id, monthIndex, dayIndex + 1);
                      const date = new Date(year, monthIndex, dayIndex + 1);
                      const isWknd = isWeekend(date);
                      const isHol = isHoliday(monthIndex, dayIndex + 1);

                      let bgColor = 'bg-white';
                      let title = '';

                      if (isHol) {
                        bgColor = 'bg-red-100';
                        title = 'Feriado';
                      } else if (isWknd) {
                        bgColor = 'bg-slate-100';
                        title = 'Fim de semana';
                      } else if (status) {
                        bgColor = STATUS_CONFIG[status.status].bgColor;
                        title = STATUS_CONFIG[status.status].label;
                      }

                      return (
                        <td
                          key={`${monthIndex}-${dayIndex}`}
                          className={cn('w-5 h-6 border-r border-slate-50', bgColor)}
                          title={`${dayIndex + 1}/${monthIndex + 1}/${year}: ${title}`}
                        />
                      );
                    });
                  })}
                  <td className="px-3 py-2 text-center">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800">{totalDays}</span>
                      <div className="flex gap-1 justify-center">
                        <span className="text-[10px] text-emerald-600" title="Presencial">
                          P:{stats.presencial}
                        </span>
                        <span className="text-[10px] text-blue-600" title="Teletrabalho">
                          T:{stats.teletrabalho}
                        </span>
                        <span className="text-[10px] text-purple-600" title="Férias">
                          F:{stats.ferias}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel Anual</h1>
          <p className="text-slate-500 mt-1">Visualização anual de férias e ausências</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="px-4 py-2 font-semibold text-slate-900 min-w-[80px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={exportToCSV}
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedDepartamento}
            onChange={(e) => {
              setSelectedDepartamento(e.target.value);
              setSelectedColaborador('');
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={selectedColaborador}
            onChange={(e) => setSelectedColaborador(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Colaboradores</option>
            {colaboradores
              .filter((c) => c.situacao === 'ativo')
              .filter((c) => !selectedDepartamento || c.departamento === selectedDepartamento)
              .map((col) => (
                <option key={col.id} value={col.id}>{col.nome}</option>
              ))}
          </select>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'heatmap' | 'status')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="heatmap">Visualização Heatmap</option>
            <option value="status">Visualização por Status</option>
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-2">
            <div className={cn('w-4 h-4 rounded', config.bgColor)} />
            <span className="text-sm text-slate-600">{config.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
          <span className="text-sm text-slate-600">Feriado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200" />
          <span className="text-sm text-slate-600">Fim de semana</span>
        </div>
      </div>

      {/* Annual Grid */}
      {selectedColaborador ? renderPersonView() : renderTeamView()}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredColaboradores.slice(0, 3).map((col) => {
          const stats = getStatsForColaborador(col.id);
          return (
            <div key={col.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                  {col.nome.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{col.nome}</p>
                  <p className="text-sm text-slate-500">{col.departamento}</p>
                </div>
              </div>
              <div className="space-y-2">
                {(Object.entries(stats) as [StatusType, number][])
                  .filter(([, count]) => count > 0)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 4)
                  .map(([status, count]) => {
                    const config = STATUS_CONFIG[status];
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn('w-3 h-3 rounded', config.bgColor)} />
                          <span className="text-sm text-slate-600">{config.label}</span>
                        </div>
                        <span className="font-semibold text-slate-800">{count} dias</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel Anual</h1>
          <p className="text-slate-500 mt-1">Visualização anual de férias e ausências</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(year - 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="px-4 py-2 font-semibold text-slate-900 min-w-[80px] text-center">
            {year}
          </span>
          <button
            onClick={() => setYear(year + 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
          <button
            onClick={exportToCSV}
            className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>
        </div>
      </div >

  {/* Filters */ }
  < div className = "bg-white rounded-xl border border-slate-200 p-4" >
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={selectedDepartamento}
            onChange={(e) => {
              setSelectedDepartamento(e.target.value);
              setSelectedColaborador('');
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={selectedColaborador}
            onChange={(e) => setSelectedColaborador(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Colaboradores</option>
            {colaboradores
              .filter((c) => c.situacao === 'ativo')
              .filter((c) => !selectedDepartamento || c.departamento === selectedDepartamento)
              .map((col) => (
                <option key={col.id} value={col.id}>{col.nome}</option>
              ))}
          </select>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'heatmap' | 'status')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="heatmap">Visualização Heatmap</option>
            <option value="status">Visualização por Status</option>
          </select>
        </div>
      </div >

  {/* Legend */ }
  < div className = "flex flex-wrap gap-3" >
  {
    Object.entries(STATUS_CONFIG).map(([key, config]) => (
      <div key={key} className="flex items-center gap-2">
        <div className={cn('w-4 h-4 rounded', config.bgColor)} />
        <span className="text-sm text-slate-600">{config.label}</span>
      </div>
    ))
  }
    < div className = "flex items-center gap-2" >
          <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
          <span className="text-sm text-slate-600">Feriado</span>
        </div >
  <div className="flex items-center gap-2">
    <div className="w-4 h-4 rounded bg-slate-200" />
    <span className="text-sm text-slate-600">Fim de semana</span>
  </div>
      </div >

  const renderPersonView = () => {
  const col = filteredColaboradores[0];
  if (!col) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-3 py-2 text-left font-semibold text-slate-700 w-24 border-r border-slate-200">
                Mês
              </th>
              {Array.from({ length: 31 }, (_, i) => (
                <th key={i} className="w-8 h-8 text-center font-normal text-slate-500 border-r border-slate-100 last:border-r-0">
                  {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MONTHS.map((month, monthIndex) => {
              const daysInMonth = getDaysInMonth(new Date(year, monthIndex));

              return (
                <tr key={month} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-700 border-r border-slate-200">
                    {month}
                  </td>
                  {Array.from({ length: 31 }, (_, dayIndex) => {
                    if (dayIndex >= daysInMonth) {
                      return <td key={dayIndex} className="bg-slate-50/[0.3]" />;
                    }

                    const status = getStatusForDay(col.id, monthIndex, dayIndex + 1);
                    const date = new Date(year, monthIndex, dayIndex + 1);
                    const isWknd = isWeekend(date);
                    const isHol = isHoliday(monthIndex, dayIndex + 1);

                    let bgColor = 'bg-white';
                    let title = '';
                    let content = '';

                    if (isHol) {
                      bgColor = 'bg-red-100 text-red-700 font-bold';
                      title = 'Feriado';
                      content = 'F';
                    } else if (isWknd) {
                      bgColor = 'bg-slate-100';
                      title = 'Fim de semana';
                    } else if (status) {
                      bgColor = STATUS_CONFIG[status.status].bgColor;
                      title = STATUS_CONFIG[status.status].label;
                    }

                    return (
                      <td
                        key={dayIndex}
                        className={cn(
                          'border-r border-slate-50 text-center relative transition-colors',
                          bgColor,
                          !isWknd && !isHol && !status && 'hover:bg-slate-50'
                        )}
                        title={`${dayIndex + 1}/${monthIndex + 1}/${year}: ${title}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const renderTeamView = () => (
  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 min-w-[150px] border-r border-slate-200">
              Colaborador
            </th>
            {MONTHS.map((month, idx) => (
              <th
                key={month}
                className="px-1 py-2 text-center font-semibold text-slate-700 border-r border-slate-100"
                colSpan={getDaysInMonth(new Date(year, idx))}
              >
                {month}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-semibold text-slate-700 min-w-[80px]">
              Total
            </th>
          </tr>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="sticky left-0 bg-slate-50 border-r border-slate-200" />
            {MONTHS.map((_, monthIndex) => {
              const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
              return Array.from({ length: daysInMonth }, (_, dayIndex) => {
                const date = new Date(year, monthIndex, dayIndex + 1);
                const isWknd = isWeekend(date);
                const isHol = isHoliday(monthIndex, dayIndex + 1);
                return (
                  <th
                    key={`${monthIndex}-${dayIndex}`}
                    className={cn(
                      'w-5 h-6 text-center text-[10px] font-normal',
                      isHol ? 'bg-red-100 text-red-600' : isWknd ? 'bg-slate-100 text-slate-400' : 'text-slate-500'
                    )}
                  >
                    {dayIndex + 1}
                  </th>
                );
              });
            })}
            <th className="bg-slate-50" />
          </tr>
        </thead>
        <tbody>
          {filteredColaboradores.map((col) => {
            const stats = getStatsForColaborador(col.id);
            const totalDays = Object.values(stats).reduce((a, b) => a + b, 0);

            return (
              <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{col.nome}</span>
                    <span className="text-[10px] text-slate-500">{col.departamento}</span>
                  </div>
                </td>
                {MONTHS.map((_, monthIndex) => {
                  const daysInMonth = getDaysInMonth(new Date(year, monthIndex));
                  return Array.from({ length: daysInMonth }, (_, dayIndex) => {
                    const status = getStatusForDay(col.id, monthIndex, dayIndex + 1);
                    const date = new Date(year, monthIndex, dayIndex + 1);
                    const isWknd = isWeekend(date);
                    const isHol = isHoliday(monthIndex, dayIndex + 1);

                    let bgColor = 'bg-white';
                    let title = '';

                    if (isHol) {
                      bgColor = 'bg-red-100';
                      title = 'Feriado';
                    } else if (isWknd) {
                      bgColor = 'bg-slate-100';
                      title = 'Fim de semana';
                    } else if (status) {
                      bgColor = STATUS_CONFIG[status.status].bgColor;
                      title = STATUS_CONFIG[status.status].label;
                    }

                    return (
                      <td
                        key={`${monthIndex}-${dayIndex}`}
                        className={cn('w-5 h-6 border-r border-slate-50', bgColor)}
                        title={`${dayIndex + 1}/${monthIndex + 1}/${year}: ${title}`}
                      />
                    );
                  });
                })}
                <td className="px-3 py-2 text-center">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-800">{totalDays}</span>
                    <div className="flex gap-1 justify-center">
                      <span className="text-[10px] text-emerald-600" title="Presencial">
                        P:{stats.presencial}
                      </span>
                      <span className="text-[10px] text-blue-600" title="Teletrabalho">
                        T:{stats.teletrabalho}
                      </span>
                      <span className="text-[10px] text-purple-600" title="Férias">
                        F:{stats.ferias}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

return (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Painel Anual</h1>
        <p className="text-slate-500 mt-1">Visualização anual de férias e ausências</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear(year - 1)}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <span className="px-4 py-2 font-semibold text-slate-900 min-w-[80px] text-center">
          {year}
        </span>
        <button
          onClick={() => setYear(year + 1)}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
        <button
          onClick={exportToCSV}
          className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Exportar CSV</span>
        </button>
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Filtros</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={selectedDepartamento}
          onChange={(e) => {
            setSelectedDepartamento(e.target.value);
            setSelectedColaborador('');
          }}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Departamentos</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={selectedColaborador}
          onChange={(e) => setSelectedColaborador(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os Colaboradores</option>
          {colaboradores
            .filter((c) => c.situacao === 'ativo')
            .filter((c) => !selectedDepartamento || c.departamento === selectedDepartamento)
            .map((col) => (
              <option key={col.id} value={col.id}>{col.nome}</option>
            ))}
        </select>
        <select
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as 'heatmap' | 'status')}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="heatmap">Visualização Heatmap</option>
          <option value="status">Visualização por Status</option>
        </select>
      </div>
    </div>

    {/* Legend */}
    <div className="flex flex-wrap gap-3">
      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
        <div key={key} className="flex items-center gap-2">
          <div className={cn('w-4 h-4 rounded', config.bgColor)} />
          <span className="text-sm text-slate-600">{config.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-red-200 border border-red-300" />
        <span className="text-sm text-slate-600">Feriado</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded bg-slate-200" />
        <span className="text-sm text-slate-600">Fim de semana</span>
      </div>
    </div>

    {/* Annual Grid */}
    {selectedColaborador ? renderPersonView() : renderTeamView()}

    {/* Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {filteredColaboradores.slice(0, 3).map((col) => {
        const stats = getStatsForColaborador(col.id);
        return (
          <div key={col.id} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                {col.nome.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{col.nome}</p>
                <p className="text-sm text-slate-500">{col.departamento}</p>
              </div>
            </div>
            <div className="space-y-2">
              {(Object.entries(stats) as [StatusType, number][])
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 4)
                .map(([status, count]) => {
                  const config = STATUS_CONFIG[status];
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn('w-3 h-3 rounded', config.bgColor)} />
                        <span className="text-sm text-slate-600">{config.label}</span>
                      </div>
                      <span className="font-semibold text-slate-800">{count} dias</span>
                    </div>
                  );
                })}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
}
