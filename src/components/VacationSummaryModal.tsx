import { useState } from 'react';
import { X, RefreshCw, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useStore } from '../store/useStore';
import { purgeObsoleteVacationRecords } from '../services/firestoreService';

interface VacationSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function VacationSummaryModal({ isOpen, onClose }: VacationSummaryModalProps) {
    const { statusDiarios, colaboradores, recalculateRotation } = useStore();
    const [syncing, setSyncing] = useState(false);

    if (!isOpen) return null;

    const handleSync = async () => {
        setSyncing(true);
        try {
            const purged = await purgeObsoleteVacationRecords();
            await recalculateRotation(format(new Date(), 'yyyy-01-01'), 1, false);
            alert(`Sincronização concluída! ${purged} registro(s) de férias obsoletos removidos do banco.`);
        } catch (err) {
            console.error(err);
            alert('Erro ao sincronizar férias.');
        } finally {
            setSyncing(false);
        }
    };

    // Filter only vacations for 2026 (or current year context if needed, but assuming 2026 for now)
    const vacationRecords = statusDiarios.filter(s => s.status === 'ferias');

    // Group by User
    const grouped = vacationRecords.reduce((acc, r) => {
        if (!acc[r.colaboradorId]) acc[r.colaboradorId] = [];
        acc[r.colaboradorId].push(r);
        return acc;
    }, {} as Record<string, typeof vacationRecords>);

    // Get active collaborators to ensure order/label
    const activeColabs = colaboradores.filter(c => c.situacao === 'ativo');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">Resumo de Férias 2026</h2>
                        <button
                            onClick={handleSync}
                            disabled={syncing}
                            className="flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
                            title="Purga férias antigas do banco de dados que não pertencem ao módulo de Gestão de Férias"
                        >
                            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                            <span>{syncing ? 'Sincronizando...' : 'Sincronizar & Limpar Banco'}</span>
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    {activeColabs.map(col => {
                        const userRecords = grouped[col.id] || [];
                        if (userRecords.length === 0) return null;

                        // Sort by date
                        const sorted = [...userRecords].sort((a, b) => a.data.localeCompare(b.data));

                        // Group by Month
                        const months = sorted.reduce((acc, r) => {
                            const month = r.data.substring(0, 7); // YYYY-MM
                            if (!acc[month]) acc[month] = [];
                            acc[month].push(r);
                            return acc;
                        }, {} as Record<string, typeof vacationRecords>);

                        const totalDays = userRecords.length;

                        return (
                            <div key={col.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                            {col.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800">{col.nome}</h3>
                                            <p className="text-xs text-slate-500">{col.departamento}</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                                        Total: {totalDays} dias
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {Object.entries(months).sort().map(([month, recs]) => {
                                        const year = month.substring(0, 4);
                                        const isDiffYear = year !== '2026';
                                        
                                        return (
                                            <div key={month} className={`p-3 rounded-lg border ${isDiffYear ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                                                <div className={`font-semibold text-xs mb-2 flex justify-between items-start ${isDiffYear ? 'text-amber-800' : 'text-slate-600'}`}>
                                                    <div className="flex flex-col">
                                                        {isDiffYear && <span className="text-[9px] font-bold opacity-70 leading-tight uppercase tracking-wider">{year}</span>}
                                                        <span className="capitalize">{format(parseISO(month + '-01'), 'MMMM', { locale: ptBR })}</span>
                                                    </div>
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] shadow-sm border mt-0.5 ${isDiffYear ? 'bg-amber-100 border-amber-200 text-amber-800' : 'bg-white border-slate-100'}`}>
                                                        {recs.length}d
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {recs.map(r => (
                                                        <span
                                                            key={r.id}
                                                            title={r.data}
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border shadow-sm ${isDiffYear ? 'bg-amber-100/50 text-amber-900 border-amber-200' : 'bg-white text-slate-700 border-slate-200'}`}
                                                        >
                                                            {r.data.substring(8)}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {Object.keys(grouped).length === 0 && (
                        <div className="text-center py-10 text-slate-500">
                            Nenhum registro de férias encontrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
