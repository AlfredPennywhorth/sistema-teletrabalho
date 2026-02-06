import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Plus,
} from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isWeekend,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { STATUS_CONFIG, type StatusType, type Colaborador } from '../types';
import { cn } from '../utils/cn';

export function MonthlyCalendar() {
  const { colaboradores, statusDiarios, feriados, addStatusDiario, deleteStatusDiario } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalColaborador, setModalColaborador] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<StatusType>('presencial');
  const [modalObservacao, setModalObservacao] = useState('');

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

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const getDayData = (date: Date, colaboradorId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return statusDiarios.find(
      (s) => s.data === dateStr && s.colaboradorId === colaboradorId
    );
  };

  const isHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return feriados.find((f) => f.data === dateStr);
  };

  const handleDayClick = (date: Date, colaborador: Colaborador) => {
    setModalDate(date);
    setModalColaborador(colaborador.id);
    const existingStatus = getDayData(date, colaborador.id);
    if (existingStatus) {
      setModalStatus(existingStatus.status);
      setModalObservacao(existingStatus.observacao || '');
    } else {
      setModalStatus('presencial');
      setModalObservacao('');
    }
    setShowModal(true);
  };

  const handleSaveStatus = () => {
    if (!modalDate || !modalColaborador) return;
    const dateStr = format(modalDate, 'yyyy-MM-dd');
    addStatusDiario({
      id: `${modalColaborador}-${dateStr}`,
      colaboradorId: modalColaborador,
      data: dateStr,
      status: modalStatus,
      observacao: modalObservacao || undefined,
    });
    setShowModal(false);
  };

  const handleDeleteStatus = () => {
    if (!modalDate || !modalColaborador) return;
    const existingStatus = getDayData(modalDate, modalColaborador);
    if (existingStatus) {
      deleteStatusDiario(existingStatus.id);
    }
    setShowModal(false);
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Calendário Mensal</h1>
          <p className="text-slate-500 mt-1">Visualize e gerencie os status diários</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <span className="px-4 py-2 font-semibold text-slate-900 min-w-[160px] text-center capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
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
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.label}</option>
            ))}
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
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-sm font-semibold text-slate-600 bg-slate-50"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, new Date());
            const holiday = isHoliday(day);
            const weekend = isWeekend(day);
            const isWorkingDay = !weekend && !holiday;

            return (
              <div
                key={idx}
                className={cn(
                  'min-h-[120px] h-full border-b border-r border-slate-100 p-1 flex flex-col',
                  !isCurrentMonth && 'bg-slate-50',
                  holiday && 'bg-red-50',
                  weekend && !holiday && 'bg-slate-50'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={cn(
                      'w-7 h-7 flex items-center justify-center text-sm rounded-full',
                      isToday && 'bg-blue-600 text-white font-bold',
                      !isToday && !isCurrentMonth && 'text-slate-400',
                      !isToday && isCurrentMonth && 'text-slate-700'
                    )}
                  >
                    {format(day, 'd')}
                  </span>
                  {holiday && (
                    <span className="text-[10px] text-red-600 font-medium truncate max-w-[80px] text-left">
                      {holiday.nome}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {filteredColaboradores.map((col) => {
                    const dayData = getDayData(day, col.id);
                    if (selectedStatus && dayData?.status !== selectedStatus) return null;
                    if (!dayData && selectedStatus) return null;

                    // Show only if it's a working day (hide weekends/holidays to reduce visual pollution)
                    if (!isWorkingDay) return null;
                    if (!dayData) return null;

                    return (
                      <button
                        key={col.id}
                        onClick={() => handleDayClick(day, col)}
                        className={cn(
                          'w-full px-1 py-0.5 text-[10px] rounded text-left truncate transition-colors',
                          dayData
                            ? cn(STATUS_CONFIG[dayData.status].bgColor, STATUS_CONFIG[dayData.status].color, 'hover:opacity-80')
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        )}
                        title={`${col.nome}${dayData ? ` - ${STATUS_CONFIG[dayData.status].label}` : ''}`}
                      >
                        {col.nome.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {showModal && modalDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Registrar Status
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Data
                </label>
                <p className="text-slate-900 capitalize">
                  {format(modalDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Colaborador
                </label>
                <p className="text-slate-900">
                  {colaboradores.find((c) => c.id === modalColaborador)?.nome}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value as StatusType)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>{config.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observação
                </label>
                <textarea
                  value={modalObservacao}
                  onChange={(e) => setModalObservacao(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Adicione uma observação (opcional)"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border-t border-slate-200">
              <button
                onClick={handleDeleteStatus}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors"
              >
                Remover
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveStatus}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
