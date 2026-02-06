import { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Filter,
  UserCheck,
  UserX,
  Mail,
  Briefcase,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Colaborador, SituationType } from '../types';
import { cn } from '../utils/cn';

export function ColaboradoresManager() {
  const { colaboradores, addColaborador, updateColaborador, deleteColaborador } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartamento, setFilterDepartamento] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    matricula: '',
    email: '',
    cargo: '',
    departamento: '',
    situacao: 'ativo' as SituationType,
    jornada: '',
  });

  const departments = useMemo(
    () => [...new Set(colaboradores.map((c) => c.departamento))],
    [colaboradores]
  );

  const filteredColaboradores = useMemo(() => {
    return colaboradores.filter((col) => {
      const matchesSearch =
        col.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        col.matricula.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartamento = !filterDepartamento || col.departamento === filterDepartamento;
      const matchesSituacao = !filterSituacao || col.situacao === filterSituacao;
      return matchesSearch && matchesDepartamento && matchesSituacao;
    });
  }, [colaboradores, searchTerm, filterDepartamento, filterSituacao]);

  const handleOpenModal = (colaborador?: Colaborador) => {
    if (colaborador) {
      setEditingColaborador(colaborador);
      setFormData({
        nome: colaborador.nome,
        matricula: colaborador.matricula,
        email: colaborador.email,
        cargo: colaborador.cargo,
        departamento: colaborador.departamento,
        situacao: colaborador.situacao,
        jornada: colaborador.jornada || '',
      });
    } else {
      setEditingColaborador(null);
      setFormData({
        nome: '',
        matricula: '',
        email: '',
        cargo: '',
        departamento: '',
        situacao: 'ativo',
        jornada: '',
      });
    }
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.nome || !formData.email || !formData.matricula) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    if (editingColaborador) {
      updateColaborador(editingColaborador.id, formData);
    } else {
      addColaborador({
        id: Date.now().toString(),
        ...formData,
      });
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteColaborador(id);
    setShowDeleteConfirm(null);
  };

  const stats = useMemo(() => ({
    total: colaboradores.length,
    ativos: colaboradores.filter((c) => c.situacao === 'ativo').length,
    inativos: colaboradores.filter((c) => c.situacao === 'inativo').length,
  }), [colaboradores]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Colaboradores</h1>
          <p className="text-slate-500 mt-1">Gerencie a equipe da empresa</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 self-start"
        >
          <Plus className="w-5 h-5" />
          Novo Colaborador
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50">
            <UserCheck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Ativos</p>
            <p className="text-2xl font-bold text-slate-900">{stats.ativos}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50">
            <UserX className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">Inativos</p>
            <p className="text-2xl font-bold text-slate-900">{stats.inativos}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou matrícula"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterDepartamento}
            onChange={(e) => setFilterDepartamento(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Departamentos</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filterSituacao}
            onChange={(e) => setFilterSituacao(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Situações</option>
            <option value="ativo">Ativos</option>
            <option value="inativo">Inativos</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Colaborador</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Matrícula</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Cargo</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Departamento</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Situação</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredColaboradores.length > 0 ? (
                filteredColaboradores.map((col) => (
                  <tr key={col.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold">
                          {col.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{col.nome}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {col.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{col.matricula}</td>
                    <td className="py-3 px-4 text-slate-600">{col.cargo}</td>
                    <td className="py-3 px-4 text-slate-600">{col.departamento}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'px-2 py-1 text-xs font-medium rounded-full',
                          col.situacao === 'ativo'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        )}
                      >
                        {col.situacao === 'ativo' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(col)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(col.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum colaborador encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
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
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Matrícula <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.matricula}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: 001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Situação
                  </label>
                  <select
                    value={formData.situacao}
                    onChange={(e) => setFormData({ ...formData, situacao: e.target.value as SituationType })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Cargo
                  </label>
                  <input
                    type="text"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Analista"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: TI"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Jornada (opcional)
                </label>
                <input
                  type="text"
                  value={formData.jornada}
                  onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 40h semanais"
                />
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
                Tem certeza que deseja excluir este colaborador? Esta ação não pode ser desfeita.
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
