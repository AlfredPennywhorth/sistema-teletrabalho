import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter } from 'lucide-react';
import { parseISO, getDaysInMonth, isWeekend } from 'date-fns';
import { useStore } from '../store/useStore';
import { STATUS_CONFIG, type StatusType, type StatusDiario } from '../types';
import { cn } from '../utils/cn';
import { VacationSummaryModal } from './VacationSummaryModal';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function AnnualPanel() {
  const { colaboradores, statusDiarios, feriados } = useStore();
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [showVacationSummary, setShowVacationSummary] = useState(false);

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

  const statusMap = useMemo(() => {
    const map = new Map<string, StatusDiario>();
    statusDiarios.forEach(s => map.set(`${s.colaboradorId}-${s.data}`, s));
    return map;
  }, [statusDiarios]);

  const getStatusForDay = (colaboradorId: string, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return statusMap.get(`${colaboradorId}-${dateStr}`);
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
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `painel-anual-${year}.csv`;
    link.click();
  };

  const renderIndividualView = (colaboradorId: string) => {
    const col = colaboradores.find((c) => c.id === colaboradorId);
    if (!col) return null;

    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar touch-pan-x">
          <table className="w-full text-[10px] sm:text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-slate-700 w-24 border-r border-slate-200">
                  Mês
                </th>
                {Array.from({ length: 31 }).map((_, i) => (
                  <th key={i} className="px-1 py-1 text-center font-medium text-slate-500 border-r border-slate-100 min-w-[24px]">
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
                    <td className="px-3 py-2 font-medium text-slate-700 border-r border-slate-200 bg-slate-50/50">
                      {month}
                    </td>
                    {Array.from({ length: 31 }).map((_, dayIndex) => {
                      if (dayIndex >= daysInMonth) {
                        return <td key={dayIndex} className="bg-slate-50/20 border-r border-slate-50" />;
                      }

                      const status = getStatusForDay(col.id, monthIndex, dayIndex + 1);
                      const date = new Date(year, monthIndex, dayIndex + 1);
                      const isWknd = isWeekend(date);
                      const isHol = isHoliday(monthIndex, dayIndex + 1);

                      let bgColor = 'bg-white';
                      let title = '';
                      let content = '';

                      if (status && STATUS_CONFIG[status.status]) {
                        const config = STATUS_CONFIG[status.status];
                        bgColor = config.bgColor + ' ' + config.color;
                        title = config.label;
                        content = config.label[0].toUpperCase();
                      } else if (status) {
                        // Fallback for unknown status
                        bgColor = 'bg-slate-200 text-slate-700';
                        title = 'Status Desconhecido';
                        content = '?';
                      } else if (isHol) {
                        bgColor = 'bg-red-100 text-red-700 font-bold';
                        title = 'Feriado';
                        content = 'F';
                      } else if (isWknd) {
                        bgColor = 'bg-slate-100';
                        title = 'Fim de semana';
                      }

                      return (
                        <td
                          key={dayIndex}
                          className={cn(
                            'border-r border-slate-50 text-center relative transition-colors h-8',
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
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar touch-pan-x">
        <table className="w-full text-[10px] sm:text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700 min-w-[150px] border-r border-slate-200 z-10">
                Colaborador
              </th>
              {MONTHS.map((month, idx) => (
                <th
                  key={month}
                  translate="no"
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
              <th className="sticky left-0 bg-slate-50 border-r border-slate-200 z-10" />
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
                        'w-5 h-6 text-center text-[8px] font-normal min-w-[20px]',
                        isHol ? 'bg-red-100 text-red-600 font-bold' : isWknd ? 'bg-slate-100 text-slate-400' : 'text-slate-500'
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
                <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50 h-8">
                  <td translate="no" className="sticky left-0 bg-white px-3 py-2 font-medium text-slate-800 border-r border-slate-200 whitespace-nowrap z-10">
                    <div className="flex flex-col">
                      <span translate="no" className="truncate max-w-[120px]">{col.nome}</span>
                      <span translate="no" className="text-[8px] text-slate-500">{col.departamento}</span>
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

                      if (status && STATUS_CONFIG[status.status]) {
                        bgColor = STATUS_CONFIG[status.status].bgColor;
                        title = STATUS_CONFIG[status.status].label;
                      } else if (status) {
                        bgColor = 'bg-slate-200';
                        title = 'Status Desconhecido';
                      } else if (isHol) {
                        bgColor = 'bg-red-100';
                        title = 'Feriado';
                      } else if (isWknd) {
                        bgColor = 'bg-slate-100';
                        title = 'Fim de semana';
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
                  <td className="px-3 py-2 text-center bg-slate-50 z-10">
                    <span className="font-bold text-slate-800">{totalDays}</span>
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Painel Anual</h1>
          <p className="text-slate-500 mt-1">Visualização anual de ausências</p>
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
            className="ml-2 p-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => setShowVacationSummary(true)}
            className="p-2 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
            title="Resumo de Férias"
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">Férias</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={selectedDepartamento}
            onChange={(e) => {
              setSelectedDepartamento(e.target.value);
              setSelectedColaborador('');
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          <select
            value={selectedColaborador}
            onChange={(e) => setSelectedColaborador(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Colaboradores (Equipe)</option>
            {filteredColaboradores.map((col) => (
              <option key={col.id} value={col.id}>
                {col.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 p-1">
        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-600">
            <div className={cn('w-3 h-3 rounded', config.bgColor)} />
            <span>{config.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-600">
          <div className="w-3 h-3 rounded bg-red-200 border border-red-300" />
          <span>Feriado</span>
        </div>
      </div>

      {/* Annual Grid */}
      <div className="mt-2">
        {selectedColaborador 
          ? renderIndividualView(selectedColaborador) 
          : renderTeamView()
        }
      </div>

      <VacationSummaryModal
        isOpen={showVacationSummary}
        onClose={() => setShowVacationSummary(false)}
      />
    </div>
  );
}
