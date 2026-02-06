import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Calendar,
  Star,
  Building2,
  Globe,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import type { Feriado, HolidayType } from '../types';
import { cn } from '../utils/cn';

const HOLIDAY_TYPE_CONFIG: Record<HolidayType, { label: string; color: string; bgColor: string; icon: typeof Globe }> = {
  nacional: { label: 'Nacional', color: 'text-red-700', bgColor: 'bg-red-100', icon: Globe },
  municipal: { label: 'Municipal', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Building2 },
  empresa: { label: 'Empresa', color: 'text-green-700', bgColor: 'bg-green-100', icon: Star },
};

export function FeriadosManager() {
  const { feriados, addFeriado, updateFeriado, deleteFeriado } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<Feriado | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterAno, setFilterAno] = useState<string>(new Date().getFullYear().toString());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    data: '',
    nome: '',
    tipo: 'nacional' as HolidayType,
  });

  const years = useMemo(() => {
    const yearsSet = new Set(feriados.map((f) => parseISO(f.data).getFullYear()));
    yearsSet.add(new Date().getFullYear());
    yearsSet.add(new Date().getFullYear() + 1);
    return [...yearsSet].sort((a, b) => b - a);
  }, [feriados]);

  const filteredFeriados = useMemo(() => {
    return feriados
      .filter((fer) => {
        const matchesSearch = fer.nome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTipo = !filterTipo || fer.tipo === filterTipo;
        const matchesAno = !filterAno || parseISO(fer.data).getFullYear().toString() === filterAno;
        return matchesSearch && matchesTipo && matchesAno;
      })
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [feriados, searchTerm, filterTipo, filterAno]);

  const handleOpenModal = (feriado?: Feriado) => {
    if (feriado) {
      setEditingFeriado(feriado);
      setFormData({
        data: feriado.data,
        nome: feriado.nome,
        tipo: feriado.tipo,
      });
    } else {
      setEditingFeriado(null);
      setFormData({
        data: '',
        nome: '',
        tipo: 'nacional',
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.data || !formData.nome) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    if (editingFeriado) {
      updateFeriado(editingFeriado.id, formData);
    } else {
      addFeriado({
        id: Date.now().toString(),
        ...formData,
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteFeriado(id);
    setShowDeleteConfirm(null);
  };

  const stats = useMemo(() => {
    const yearFeriados = feriados.filter(
      (f) => parseISO(f.data).getFullYear().toString() === filterAno
    );
    return {
      total: yearFeriados.length,
      nacional: yearFeriados.filter((f) => f.tipo === 'nacional').length,
      municipal: yearFeriados.filter((f) => f.tipo === 'municipal').length,
      empresa: yearFeriados.filter((f) => f.tipo === 'empresa').length,
    };
  }, [feriados, filterAno]);

  // Group feriados by month
  const feriadosByMonth = useMemo(() => {
    const grouped: Record<string, Feriado[]> = {};
    filteredFeriados.forEach((fer) => {
      const month = format(parseISO(fer.data), 'MMMM yyyy', { locale: ptBR });
      if (!grouped[month]) grouped[month] = [];
      grouped[month].push(fer);
    });
    return grouped;
  }, [filteredFeriados]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feriados</h1>
          <p className="text-slate-500 mt-1">Gerencie os feriados e pontes</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 self-start"
        >
          <Plus className="w-5 h-5" />
          Novo Feriado
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-slate-50">
            <Calendar className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50">
            <Globe className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Nacionais</p>
            <p className="text-2xl font-bold text-slate-900">{stats.nacional}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <Building2 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Municipais</p>
            <p className="text-2xl font-bold text-slate-900">{stats.municipal}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50">
            <Star className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Empresa</p>
            <p className="text-2xl font-bold text-slate-900">{stats.empresa}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Tipos</option>
            <option value="nacional">Nacional</option>
            <option value="municipal">Municipal</option>
            <option value="empresa">Empresa</option>
          </select>
          <select
            value={filterAno}
            onChange={(e) => setFilterAno(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Feriados List */}
      <div className="space-y-6">
        {Object.keys(feriadosByMonth).length > 0 ? (
          Object.entries(feriadosByMonth).map(([month, monthFeriados]) => (
            <div key={month} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 capitalize">{month}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {monthFeriados.map((fer) => {
                  const config = HOLIDAY_TYPE_CONFIG[fer.tipo];
                  const Icon = config.icon;
                  return (
                    <div
                      key={fer.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn('p-2 rounded-lg', config.bgColor)}>
                          <Icon className={cn('w-5 h-5', config.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{fer.nome}</p>
                          <p className="text-sm text-slate-500">
                            {format(parseISO(fer.data), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'px-2 py-1 text-xs font-medium rounded-full hidden sm:inline-block',
                            config.bgColor,
                            config.color
                          )}
                        >
                          {config.label}
                        </span>
                        <button
                          onClick={() => handleOpenModal(fer)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(fer.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">Nenhum feriado encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingFeriado ? 'Editar Feriado' : 'Novo Feriado'}
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
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Natal"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(HOLIDAY_TYPE_CONFIG).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.tipo === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, tipo: key as HolidayType })}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors',
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        )}
                      >
                        <Icon className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-slate-400')} />
                        <span className={cn('text-xs font-medium', isSelected ? 'text-blue-700' : 'text-slate-600')}>
                          {config.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Confirmar exclusão
              </h3>
              <p className="text-slate-500">
                Tem certeza que deseja excluir este feriado? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
