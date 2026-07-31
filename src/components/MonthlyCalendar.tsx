import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Plus,
  Pencil,
  RefreshCw,
  Loader2,
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
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { STATUS_CONFIG, type StatusType, type Colaborador } from '../types';
import { cn } from '../utils/cn';

export function MonthlyCalendar() {
  const { colaboradores, statusDiarios, feriados, addStatusDiario, deleteStatusDiario, recalculateRotation } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState<Date | null>(null);
  const [modalColaborador, setModalColaborador] = useState<string>('');
  const [modalStatus, setModalStatus] = useState<StatusType>('presencial');
  const [modalObservacao, setModalObservacao] = useState('');
  const [rotationStartDate, setRotationStartDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [maxTeletrabalho, setMaxTeletrabalho] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  
  // Novos estados para Gerenciamento do Dia
  const [viewMode, setViewMode] = useState<'day' | 'edit'>('day');
  const [newColaboradorId, setNewColaboradorId] = useState('');
  const [newStatus, setNewStatus] = useState<StatusType>('presencial');

  const departments = useMemo(
    () => [...new Set(colaboradores.map((c) => c.departamento))],
    [colaboradores]
  );
  const activeColaboradores = useMemo(
    () => colaboradores.filter((c) => c.situacao === 'ativo'),
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

  const getDefaultColaboradorId = () => (
    selectedColaborador ||
    filteredColaboradores[0]?.id ||
    activeColaboradores[0]?.id ||
    ''
  );

  const isHoliday = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return feriados.find((f) => f.data === dateStr);
  };

  const handleDayClick = (date: Date, colaborador: Colaborador) => {
    setModalDate(date);
    setModalColaborador(colaborador.id);
    setViewMode('edit');
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

  const handleManageDay = (date: Date) => {
    setModalDate(date);
    setModalColaborador('');
    setViewMode('day');
    setNewColaboradorId('');
    setNewStatus('presencial');
    setShowModal(true);
  };

  const handleEditDayClick = (date: Date) => {
    handleManageDay(date);
  };

  const handleSaveStatus = async () => {
    if (!modalDate || !modalColaborador) return;
    setIsSaving(true);
    try {
      const dateStr = format(modalDate, 'yyyy-MM-dd');
      const statusData: any = {
        id: `${modalColaborador}-${dateStr}`,
        colaboradorId: modalColaborador,
        data: dateStr,
        status: modalStatus,
        isManual: true,
      };
      
      if (modalObservacao) {
        statusData.observacao = modalObservacao;
      }
      
      await addStatusDiario(statusData);
      setShowModal(false);
    } catch (error: any) {
      console.error('Erro ao salvar status:', error);
      alert('Erro ao salvar no banco de dados: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStatus = async (colId?: string) => {
    const targetColId = colId || modalColaborador;
    if (!modalDate || !targetColId) return;

    const existingStatus = getDayData(modalDate, targetColId);
    if (existingStatus) {
      const colName = colaboradores.find(c => c.id === targetColId)?.nome || 'este colaborador';
      if (!confirm(`Tem certeza que deseja remover o registro de "${colName}" nesta data?\n\nEssa ação remove apenas o status do dia, não exclui o colaborador do cadastro.`)) {
        return;
      }

      setIsSaving(true);
      try {
        await deleteStatusDiario(existingStatus.id);
        if (viewMode === 'edit') setShowModal(false);
      } catch (error: any) {
        console.error('Erro ao deletar status:', error);
        alert('Erro ao deletar do banco de dados: ' + (error.message || 'Erro desconhecido'));
      } finally {
        setIsSaving(false);
      }
    } else {
      if (viewMode === 'edit') setShowModal(false);
    }
  };

  const handleAddColaboradorToDay = async () => {
    if (!modalDate || !newColaboradorId) return;
    
    setIsSaving(true);
    try {
      const dateStr = format(modalDate, 'yyyy-MM-dd');
      const statusData: any = {
        id: `${newColaboradorId}-${dateStr}`,
        colaboradorId: newColaboradorId,
        data: dateStr,
        status: newStatus,
        isManual: true,
      };
      
      await addStatusDiario(statusData);
      setNewColaboradorId('');
      setNewStatus('presencial');
    } catch (error: any) {
      console.error('Erro ao adicionar colaborador:', error);
      alert('Erro ao adicionar no banco de dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const handleRecalculate = async () => {
    const confirmRecalc = window.confirm(
      `Deseja recalcular o rodízio a partir de ${format(parseISO(rotationStartDate), 'dd/MM/yyyy')} até o final do ano?\n\n` +
      `• As férias ativas (programadas/aprovadas) serão importadas do Firestore e respeitadas.\n` +
      `• O limite atual é de no máximo 1 pessoa em teletrabalho por dia útil.\n` +
      `• Férias, folgas, licenças, atestados e observações manuais serão preservados.`
    );
    if (!confirmRecalc) return;

    const sobrescreverManual = window.confirm(
      `Deseja SOBRESCREVER também os ajustes manuais de Presencial/Teletrabalho feitos anteriormente no modo 'Gerenciar Dia'?\n\n` +
      `• Clique em 'OK' para SOBRESCREVER e recalcular todos os dias.\n` +
      `• Clique em 'Cancelar' para MANTER e PRESERVAR seus ajustes manuais.`
    );

    setIsSaving(true);
    try {
      await recalculateRotation(rotationStartDate, 1, sobrescreverManual);
      alert('Rodízio recalculado com sucesso!');
    } catch (error: any) {
      console.error(error);
      alert('Erro ao recalcular rodízio: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

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



      {/* Rotation Controls */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-indigo-900">
          <RefreshCw className="w-5 h-5" />
          <span className="font-semibold">Gerar Rodízio Automático</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium text-indigo-700 whitespace-nowrap">
            A partir de:
          </label>
          <input
            type="date"
            value={rotationStartDate}
            onChange={(e) => setRotationStartDate(e.target.value)}
            className="px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          />
          <label className="text-sm font-medium text-indigo-700 whitespace-nowrap">
            Limite Teletrabalho:
          </label>
          <select
            value={1}
            disabled
            className="px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-indigo-50 text-indigo-800 font-semibold cursor-not-allowed"
          >
            <option value={1}>1 Colaborador (Regra)</option>
          </select>
          <button
            onClick={handleRecalculate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium whitespace-nowrap"
          >
            Recalcular
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
              translate="no"
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
                  <button
                    onClick={() => handleManageDay(day)}
                    className={cn(
                      'w-7 h-7 flex items-center justify-center text-sm rounded-full transition-colors hover:bg-blue-50',
                      isToday && 'bg-blue-600 text-white font-bold hover:bg-blue-700',
                      !isToday && !isCurrentMonth && 'text-slate-400',
                      !isToday && isCurrentMonth && 'text-slate-700'
                    )}
                    title="Gerenciar colaboradores deste dia"
                  >
                    {format(day, 'd')}
                  </button>
                  {isWorkingDay && (
                    <button
                      onClick={() => handleEditDayClick(day)}
                      className="p-1 rounded hover:bg-slate-200/70 transition-colors"
                      title="Editar escala do dia"
                    >
                      <Pencil className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  )}

                  {holiday && (
                    <div className="text-[10px] text-red-600 font-medium leading-tight text-right w-full pr-1">
                      {holiday.nome}
                    </div>
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
      {
        showModal && modalDate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 shrink-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {viewMode === 'edit' ? 'Registrar Status' : 'Gerenciar Dia'}

                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded hover:bg-slate-100"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="p-4 border-b border-slate-100 shrink-0">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Data Selecionada
                </label>
                <p className="text-slate-900 font-medium capitalize">
                  {format(modalDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {viewMode === 'edit' ? (
                  // MODO EDIÇÃO INDIVIDUAL
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Colaborador
                      </label>
                      <p className="text-slate-900 font-semibold bg-slate-50 p-2 rounded-lg border border-slate-100">
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
                ) : (
                  // MODO GESTÃO DO DIA
                  <div className="space-y-6">
                    {/* Lista de Colaboradores Existentes */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Colaboradores no Dia
                      </label>
                      <div className="space-y-2">
                        {colaboradores
                          .filter(c => getDayData(modalDate, c.id))
                          .map(col => {
                            const data = getDayData(modalDate, col.id);
                            if (!data) return null;
                            return (
                              <div key={col.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-slate-900">{col.nome}</span>
                                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit mt-1", STATUS_CONFIG[data.status].bgColor, STATUS_CONFIG[data.status].color)}>
                                    {STATUS_CONFIG[data.status].label}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => {
                                      setModalColaborador(col.id);
                                      setModalStatus(data.status);
                                      setModalObservacao(data.observacao || '');
                                      setViewMode('edit');
                                    }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                    title="Editar status"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStatus(col.id)}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Remover deste dia"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        {colaboradores.filter(c => getDayData(modalDate, c.id)).length === 0 && (
                          <p className="text-sm text-slate-400 italic text-center py-4">Nenhum colaborador registrado para este dia.</p>
                        )}
                      </div>
                    </div>

                    {/* Formulário de Adição */}
                    <div className="pt-4 border-t border-slate-100">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Adicionar Colaborador ao Dia
                      </label>
                      <div className="space-y-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                        <select
                          value={newColaboradorId}
                          onChange={(e) => setNewColaboradorId(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                        >
                          <option value="">Selecione um colaborador...</option>
                          {colaboradores
                            .filter(c => c.situacao === 'ativo')
                            .filter(c => !getDayData(modalDate, c.id)) // Apenas quem não está no dia
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map(c => (
                              <option key={c.id} value={c.id}>{c.nome}</option>
                            ))
                          }
                        </select>
                        <div className="flex gap-2">
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as StatusType)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                          >
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <option key={key} value={key}>{config.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleAddColaboradorToDay}
                            disabled={!newColaboradorId || isSaving}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {isSaving && (
                  <div className="flex items-center gap-2 text-blue-600 text-xs font-medium animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Processando...
                  </div>
                )}
                <div role="alert" className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  Exclusão de colaboradores na escala está bloqueada. Use apenas a edição para correções.
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border-t border-slate-200 shrink-0">
                {viewMode === 'edit' ? (
                  <>
                    <button
                      onClick={() => handleDeleteStatus()}
                      disabled={isSaving}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors text-sm disabled:opacity-50"
                    >
                      Remover deste dia
                    </button>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (modalColaborador) setViewMode('day');
                          else setShowModal(false);
                        }}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors text-sm"
                      >
                        Voltar
                      </button>
                      <button
                        onClick={handleSaveStatus}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        Salvar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full flex justify-end">
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium transition-colors text-sm"
                    >
                      Concluído
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }
    </div>
  );
}
