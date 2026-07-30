import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Ferias, FeriasStatus, ParcelaFerias } from '../types';
import { getFerias, saveFerias, cancelFerias } from '../services/feriasService';
import { Loader2, Calendar as CalendarIcon, AlertTriangle, RefreshCcw, Plus, Trash2 } from 'lucide-react';
import { calculateRotationMatrix } from '../services/rotationService';
import { addDays, differenceInDays, format, getDay, isBefore, isValid, parseISO } from 'date-fns';

export function FeriasManager() {
    const { colaboradores, feriados, statusDiarios, syncStatusDiarios } = useStore();
    const [feriasList, setFeriasList] = useState<Ferias[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRegerarModal, setShowRegerarModal] = useState(false);
    
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

    const handleRegerarEscala = async () => {
        const programadas = feriasList.filter(f => f.status === 'programado' || f.status === 'aprovado');
        
        if (!window.confirm(`Isso irá aplicar ${programadas.length} agendamentos de férias e recalcular o rodízio. Registros manuais (folga/atestado/etc) serão preservados. Deseja continuar?`)) return;
        
        const startDate = new Date();
        const endDate = addDays(startDate, 90);
        
        const newMatrix = calculateRotationMatrix(
            statusDiarios,
            feriados,
            colaboradores,
            startDate,
            endDate,
            programadas
        );
        
        syncStatusDiarios(newMatrix);
        setShowRegerarModal(false);
        alert("Escala regerada com sucesso!");
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
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowRegerarModal(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">Cancelar</button>
                            <button onClick={handleRegerarEscala} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Confirmar e Regerar</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-lg mb-4">Nova Programação</h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador</label>
                            <select value={selectedColaborador} onChange={e => setSelectedColaborador(e.target.value)} className="w-full border-slate-300 rounded-lg">
                                <option value="">Selecione...</option>
                                {colaboradores.map(c => (
                                    <option key={c.id} value={c.id}>{c.nome}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Início Aquisitivo</label>
                                <input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className="w-full border-slate-300 rounded-lg"/>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Fim Aquisitivo</label>
                                <input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className="w-full border-slate-300 rounded-lg"/>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={abonoPecuniario} onChange={e => setAbonoPecuniario(e.target.checked)} className="rounded text-blue-600"/>
                                <span className="text-sm font-medium text-slate-700">Abono Pecuniário (vender 10 dias)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={antecipar13} onChange={e => setAntecipar13(e.target.checked)} className="rounded text-blue-600"/>
                                <span className="text-sm font-medium text-slate-700">Antecipar 13º</span>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium text-slate-700">Parcelas ({parcelas.length}/3)</h4>
                                {parcelas.length < 3 && (
                                    <button onClick={addParcela} className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-700">
                                        <Plus className="w-4 h-4"/> Adicionar
                                    </button>
                                )}
                            </div>
                            
                            <div className="space-y-3">
                                {parcelas.map((p, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input type="date" value={p.dataInicio} onChange={e => handleParcelaChange(i, 'dataInicio', e.target.value)} className="w-full border-slate-300 rounded-lg text-sm"/>
                                        <input type="date" value={p.dataFim} onChange={e => handleParcelaChange(i, 'dataFim', e.target.value)} className="w-full border-slate-300 rounded-lg text-sm"/>
                                        <span className="text-sm font-medium w-16 text-center">{p.dias} dias</span>
                                        {parcelas.length > 1 && (
                                            <button onClick={() => removeParcela(i)} className="text-red-500 hover:text-red-700">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                            <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className="w-full border-slate-300 rounded-lg" rows={2}></textarea>
                        </div>

                        {errors.length > 0 && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm space-y-1">
                                {errors.map((e, i) => <p key={i}>• {e}</p>)}
                            </div>
                        )}
                        {warnings.length > 0 && (
                            <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm space-y-1">
                                {warnings.map((w, i) => <p key={i}>• {w}</p>)}
                            </div>
                        )}

                        <button onClick={handleSave} className="w-full bg-slate-900 text-white font-medium py-2 rounded-lg hover:bg-slate-800">
                            Salvar Programação
                        </button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-semibold text-lg mb-4">Resumo do Colaborador</h3>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Dias de Direito</p>
                            <p className="text-2xl font-bold">{diasDireito}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Abono Pecuniário</p>
                            <p className="text-2xl font-bold text-amber-600">{diasAbono}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Dias de Descanso Exigido</p>
                            <p className="text-2xl font-bold text-blue-600">{diasDescanso}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <p className="text-sm text-slate-500">Dias Programados</p>
                            <p className={cn("text-2xl font-bold", diasProgramados === diasDescanso ? 'text-green-600' : 'text-red-600')}>
                                {diasProgramados}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Utility class names merger since cn is imported elsewhere
function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(' ');
}
