import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Ferias, FeriasStatus, ParcelaFerias } from '../types';
import { getFerias, saveFerias, cancelFerias } from '../services/feriasService';
import { setRegistrosBatch } from '../services/firestoreService';
import { Loader2, Calendar as CalendarIcon, AlertTriangle, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { calculateRotationMatrix } from '../services/rotationService';
import { addDays, differenceInDays, format, getDay, isBefore, isValid, parseISO } from 'date-fns';

export function FeriasManager() {
    const { colaboradores, feriados, statusDiarios, syncStatusDiarios } = useStore();
    const [feriasList, setFeriasList] = useState<Ferias[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRegerarModal, setShowRegerarModal] = useState(false);
    const [modalMaxTeletrabalho, setModalMaxTeletrabalho] = useState(1);
    
    // Form state
    const [selectedColaborador, setSelectedColaborador] = useState('');
    const [periodoInicio, setPeriodoInicio] = useState('');
    const [periodoFim, setPeriodoFim] = useState('');
    const [abonoPecuniario, setAbonoPecuniario] = useState(false);
    const [antecipar13, setAntecipar13] = useState(false);
    const [parcelas, setParcelas] = useState<ParcelaFerias[]>([{ dataInicio: '', dataFim: '', dias: 0 }]);
    const [observacao, setObservacao] = useState('');
    
    const [errors, setErrors] = useState<string[]>([]);
    const [warnings, setWarnings] = useState<string[]>([]);

    useEffect(() => {
        const fetchFerias = async () => {
            const data = await getFerias();
            setFeriasList(data);
            setLoading(false);
        };
        fetchFerias();
    }, []);

    const diasDireito = 30;
    const diasAbono = abonoPecuniario ? 10 : 0;
    const diasDescanso = abonoPecuniario ? 20 : 30;

    const calculateDias = (inicio: string, fim: string) => {
        if (!inicio || !fim) return 0;
        const d1 = parseISO(inicio);
        const d2 = parseISO(fim);
        if (isValid(d1) && isValid(d2)) {
            return differenceInDays(d2, d1) + 1;
        }
        return 0;
    };

    const handleParcelaChange = (index: number, field: keyof ParcelaFerias, value: string) => {
        const newParcelas = [...parcelas];
        newParcelas[index] = { ...newParcelas[index], [field]: value };
        
        if (field === 'dataInicio' || field === 'dataFim') {
            newParcelas[index].dias = calculateDias(newParcelas[index].dataInicio, newParcelas[index].dataFim);
        }
        setParcelas(newParcelas);
    };

    const addParcela = () => {
        if (parcelas.length < 3) {
            setParcelas([...parcelas, { dataInicio: '', dataFim: '', dias: 0 }]);
        }
    };

    const removeParcela = (index: number) => {
        setParcelas(parcelas.filter((_, i) => i !== index));
    };

    const validateForm = () => {
        const newErrors: string[] = [];
        const newWarnings: string[] = [];
        
        if (!selectedColaborador) newErrors.push('Colaborador é obrigatório.');
        
        let totalDias = 0;
        let has14Days = false;
        
        // Ordena parcelas por data de início para validar sobreposição
        const parcelasValidas = parcelas.filter(p => p.dataInicio && p.dataFim);
        
        if (parcelasValidas.length !== parcelas.length) {
            newErrors.push('Todas as parcelas devem ter data de início e fim preenchidas.');
        }

        const parcelasOrdenadas = [...parcelasValidas].sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());

        parcelasOrdenadas.forEach((p, i) => {
            const dInicio = parseISO(p.dataInicio);
            const dFim = parseISO(p.dataFim);

            if (isValid(dInicio) && isValid(dFim)) {
                if (isBefore(dFim, dInicio)) {
                    newErrors.push(`Parcela ${i + 1}: Data fim não pode ser anterior à data de início.`);
                }
            }

            totalDias += p.dias;
            if (p.dias >= 14) has14Days = true;
            if (p.dias > 0 && p.dias < 5) newErrors.push(`Parcela ${i + 1} deve ter no mínimo 5 dias.`);
            
            if (i > 0) {
                const prevFim = parseISO(parcelasOrdenadas[i - 1].dataFim);
                if (isValid(prevFim) && isValid(dInicio)) {
                    if (dInicio <= prevFim) {
                        newErrors.push('Há sobreposição entre períodos de férias. Ajuste as datas antes de salvar.');
                    }
                }
            }

            if (p.dataInicio) {
                const date = dInicio;
                const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, ..., 6=Sat
                if (dayOfWeek === 0 || dayOfWeek === 6) newErrors.push(`Parcela ${i + 1} não pode iniciar no fim de semana.`);
                if (dayOfWeek === 4 || dayOfWeek === 5) newErrors.push(`Parcela ${i + 1} não pode iniciar em quinta ou sexta-feira.`);
                
                // check feriados and vespera
                const dateStr = format(date, 'yyyy-MM-dd');
                const next1 = format(addDays(date, 1), 'yyyy-MM-dd');
                const next2 = format(addDays(date, 2), 'yyyy-MM-dd');
                
                const isHol = feriados.some(f => f.data === dateStr);
                const isVespera1 = feriados.some(f => f.data === next1);
                const isVespera2 = feriados.some(f => f.data === next2);
                
                if (isHol) newErrors.push(`Parcela ${i + 1} não pode iniciar em feriado.`);
                if (isVespera1 || isVespera2) newErrors.push(`Parcela ${i + 1} não pode iniciar nos 2 dias que antecedem um feriado.`);
                
                // Warnings
                const daysDiff = differenceInDays(date, new Date());
                if (daysDiff < 30 && daysDiff >= 0) newWarnings.push(`Parcela ${i + 1} inicia em menos de 30 dias.`);
                
                if (antecipar13 && date.getMonth() === 0) {
                    newWarnings.push(`Antecipação de 13º marcada para janeiro (Verificar norma).`);
                }
            }
        });
        
        if (totalDias !== diasDescanso) {
            newErrors.push(`A soma dos dias (${totalDias}) deve ser igual a ${diasDescanso} (Direito: ${diasDireito} - Abono: ${diasAbono}).`);
        }
        
        if (parcelas.length > 1 && !has14Days) {
            newErrors.push('No fracionamento, ao menos uma parcela deve ter 14 dias ou mais.');
        }

        if (abonoPecuniario) {
            const today = new Date();
            const aquisitivoFim = parseISO(periodoFim);
            if (isValid(aquisitivoFim) && differenceInDays(aquisitivoFim, today) < 15) {
                newWarnings.push('Abono pecuniário solicitado com menos de 15 dias do vencimento do período aquisitivo.');
            }
        }
        
        setErrors(newErrors);
        setWarnings(newWarnings);
        
        return newErrors.length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        
        const newFerias: Ferias = {
            id: crypto.randomUUID(),
            colaboradorId: selectedColaborador,
            periodoAquisitivoInicio: periodoInicio,
            periodoAquisitivoFim: periodoFim,
            diasDireito,
            abonoPecuniario,
            diasAbono,
            diasDescanso,
            antecipar13,
            parcelas,
            status: 'programado',
            observacao
        };
        
        try {
            await saveFerias(newFerias);
            setFeriasList([...feriasList, newFerias]);
            alert('Férias salvas com sucesso!');
        } catch (error) {
            alert('Erro ao salvar férias.');
        }
    };

    const handleCancel = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja cancelar esta programação de férias?')) return;
        try {
            await cancelFerias(id);
            setFeriasList(prev => prev.map(f => f.id === id ? { ...f, status: 'cancelado' } : f));
            alert('Programação de férias cancelada com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao cancelar férias.');
        }
    };

    const handleRegerarEscala = async () => {
        const programadas = feriasList.filter(f => f.status === 'programado' || f.status === 'aprovado');
        
        if (!window.confirm(`Isso irá aplicar ${programadas.length} agendamentos de férias e recalcular o rodízio. Registros manuais (folga/atestado/etc) serão preservados. Deseja continuar?`)) return;
        
        setLoading(true);
        try {
            const startDate = new Date();
            const endDate = addDays(startDate, 90);
            
            const newMatrix = calculateRotationMatrix(
                statusDiarios,
                feriados,
                colaboradores,
                startDate,
                endDate,
                programadas,
                modalMaxTeletrabalho
            );
            
            await setRegistrosBatch(newMatrix);
            syncStatusDiarios(newMatrix);
            setShowRegerarModal(false);
            alert("Escala regerada com sucesso!");
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar escala no banco de dados.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const diasProgramados = parcelas.reduce((acc, p) => acc + (p.dias || 0), 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Gestão de Férias</h2>
                <button
                    onClick={() => setShowRegerarModal(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Regerar Escala
                </button>
            </div>

            {showRegerarModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">Confirmar Recálculo da Escala</h3>
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg mb-4 text-sm flex gap-3">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                            <p>Serão aplicadas as férias com status 'programado' e 'aprovado'. Registros manuais sensíveis não serão perdidos.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                                Limite de Colaboradores em Teletrabalho
                            </label>
                            <select
                                value={modalMaxTeletrabalho}
                                onChange={e => setModalMaxTeletrabalho(Number(e.target.value))}
                                className="w-full border-slate-300 rounded-lg text-sm"
                            >
                                <option value={1}>1 Colaborador por dia</option>
                                <option value={2}>2 Colaboradores por dia</option>
                                <option value={3}>3 Colaboradores por dia</option>
                                <option value={4}>4 Colaboradores por dia</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowRegerarModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleRegerarEscala} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Confirmar e Regerar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Formulário de Cadastro Compacto */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-base mb-3 text-slate-800">Nova Programação</h3>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Colaborador</label>
                            <select value={selectedColaborador} onChange={e => setSelectedColaborador(e.target.value)} className="w-full border-slate-300 rounded-lg text-sm py-1.5 px-2">
                                <option value="">Selecione...</option>
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Início Aquisitivo</label>
                                <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full border-slate-300 rounded-lg text-sm py-1.5 px-2"/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Fim Aquisitivo</label>
                                <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full border-slate-300 rounded-lg text-sm py-1.5 px-2"/>
                            </div>
                        </div>

                        <div className="flex gap-4 items-center py-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={abonoPecuniario} onChange={e => setAbonoPecuniario(e.target.checked)} className="rounded text-blue-600 w-4 h-4"/>
                                <span className="text-xs font-medium text-slate-700">Abono Pecuniário (10 dias)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={antecipar13} onChange={e => setAntecipar13(e.target.checked)} className="rounded text-blue-600 w-4 h-4"/>
                                <span className="text-xs font-medium text-slate-700">Antecipar 13º</span>
                            </label>
                        </div>

                        <div className="pt-3 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-xs font-semibold text-slate-700">Parcelas ({parcelas.length}/3)</h4>
                                {parcelas.length < 3 && (
                                    <button onClick={addParcela} className="text-xs text-blue-600 flex items-center gap-1 hover:text-blue-700 font-medium">
                                        <Plus className="w-3.5 h-3.5"/> Adicionar
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-2">
                                {parcelas.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input type="date" value={p.dataInicio} onChange={e => handleParcelaChange(i, 'dataInicio', e.target.value)} className="w-full border-slate-300 rounded-lg text-xs py-1 px-1.5"/>
                                        <input type="date" value={p.dataFim} onChange={e => handleParcelaChange(i, 'dataFim', e.target.value)} className="w-full border-slate-300 rounded-lg text-xs py-1 px-1.5"/>
                                        <span className="text-xs font-medium w-16 text-center shrink-0">{p.dias} dias</span>
                                        {parcelas.length > 1 && (
                                            <button onClick={() => removeParcela(i)} className="text-red-500 hover:text-red-700 shrink-0">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className="w-full border-slate-300 rounded-lg text-xs p-1.5" rows={1.5}></textarea>
                        </div>

                        {errors.length > 0 && (
                            <div className="bg-red-50 text-red-700 p-2 rounded-lg text-xs space-y-0.5">
                                {errors.map((e, i) => <p key={i}>• {e}</p>)}
                            </div>
                        )}
                        {warnings.length > 0 && (
                            <div className="bg-amber-50 text-amber-700 p-2 rounded-lg text-xs space-y-0.5">
                                {warnings.map((w, i) => <p key={i}>• {w}</p>)}
                            </div>
                        )}

                        <button onClick={handleSave} className="w-full bg-slate-900 text-white font-medium py-1.5 rounded-lg hover:bg-slate-800 text-sm">
                            Salvar Programação
                        </button>
                    </div>
                </div>

                {/* Resumo do Colaborador Compacto */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold text-base mb-3 text-slate-800">Resumo do Colaborador</h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500">Dias de Direito</p>
                                <p className="text-xl font-bold text-slate-800">{diasDireito}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500">Abono Pecuniário</p>
                                <p className="text-xl font-bold text-amber-600">{diasAbono}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500">Dias de Descanso</p>
                                <p className="text-xl font-bold text-blue-600">{diasDescanso}</p>
                            </div>
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-500">Dias Programados</p>
                                <p className={cn("text-xl font-bold", diasProgramados === diasDescanso ? 'text-green-600' : 'text-red-600')}>
                                    {diasProgramados}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                        <p className="font-semibold">Regras CLT / Acordo:</p>
                        <p>• As férias podem ser fracionadas em até 3 vezes.</p>
                        <p>• Uma das parcelas deve ter pelo menos 14 dias de descanso.</p>
                        <p>• As demais parcelas não podem ser menores que 5 dias cada.</p>
                        <p>• O início não pode ocorrer em D-2 de feriados ou fins de semana.</p>
                    </div>
                </div>
            </div>

            {/* Tabela de Férias Agendadas na Parte Inferior */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    Férias Agendadas ({feriasList.filter(f => f.status !== 'cancelado').length})
                </h3>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50">
                                <th className="px-4 py-2.5">Colaborador</th>
                                <th className="px-4 py-2.5">Período Aquisitivo</th>
                                <th className="px-4 py-2.5">Parcelas Programadas</th>
                                <th className="px-4 py-2.5 text-center">Dias (Descanso / Abono)</th>
                                <th className="px-4 py-2.5">Status</th>
                                <th className="px-4 py-2.5 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {feriasList.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                                        Nenhuma programação de férias encontrada.
                                    </td>
                                </tr>
                            ) : (
                                [...feriasList]
                                    .sort((a, b) => {
                                        const dateA = a.parcelas?.[0]?.dataInicio || a.periodoAquisitivoInicio || '';
                                        const dateB = b.parcelas?.[0]?.dataInicio || b.periodoAquisitivoInicio || '';
                                        return dateB.localeCompare(dateA);
                                    })
                                    .map(f => {
                                        const colaborador = colaboradores.find(c => c.id === f.colaboradorId);
                                        return (
                                            <tr key={f.id} className={cn(
                                                "hover:bg-slate-50/50 transition-colors",
                                                f.status === 'cancelado' && "opacity-60 bg-slate-50/30"
                                            )}>
                                                <td className="px-4 py-2.5 font-medium text-slate-900">
                                                    {colaborador?.nome || 'Colaborador não encontrado'}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-slate-600">
                                                    {f.periodoAquisitivoInicio ? format(parseISO(f.periodoAquisitivoInicio), 'dd/MM/yyyy') : '-'}
                                                    <span className="mx-1">a</span>
                                                    {f.periodoAquisitivoFim ? format(parseISO(f.periodoAquisitivoFim), 'dd/MM/yyyy') : '-'}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {f.parcelas?.map((p, idx) => (
                                                            <span key={idx} className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                                                                {idx + 1}ª: {p.dataInicio ? format(parseISO(p.dataInicio), 'dd/MM/yyyy') : '-'} a {p.dataFim ? format(parseISO(p.dataFim), 'dd/MM/yyyy') : '-'} ({p.dias}d)
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-center text-xs">
                                                    <div className="font-semibold text-slate-800">{f.diasDescanso} dias</div>
                                                    {f.abonoPecuniario ? (
                                                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-medium">Abono: {f.diasAbono}d</span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400">Sem abono</span>
                                                    )}
                                                    {f.antecipar13 && (
                                                        <div className="text-[9px] text-blue-600 font-medium mt-0.5">Ant. 13º</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border",
                                                        f.status === 'programado' && "bg-blue-50 text-blue-700 border-blue-100",
                                                        f.status === 'aprovado' && "bg-green-50 text-green-700 border-green-100",
                                                        f.status === 'cancelado' && "bg-rose-50 text-rose-700 border-rose-100"
                                                    )}>
                                                        {f.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {f.status !== 'cancelado' && (
                                                        <button
                                                            onClick={() => handleCancel(f.id)}
                                                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors inline-flex"
                                                            title="Cancelar férias"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Utility class names merger since cn is imported elsewhere
function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(' ');
}
