import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2, Trash2, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VacationRecord {
    id: string;
    colaboradorId: string;
    data: string;
    status: string;
}

export function VerificationPanel() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [records, setRecords] = useState<VacationRecord[]>([]);

    // Expected dates for Carol (hardcoded based on user request)
    const expectedCarolDates = new Set([
        // March: 02 to 13 (12 days)
        '2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-07',
        '2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13',
        // Nov: 03 to 20 (18 days)
        '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
        '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14',
        '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'
    ]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Simplify query: fetch all 2026 records, filter in memory
            const q = query(
                collection(db, 'registros'),
                where('data', '>=', '2026-01-01'),
                where('data', '<=', '2026-12-31')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as VacationRecord))
                .filter(d => d.status === 'ferias');

            setRecords(data);
        } catch (error: any) {
            console.error('Erro detalhado:', error);
            alert(`Erro ao buscar dados: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCleanCarol = async () => {
        if (!confirm('Isso apagará TODOS os registros de férias da Carol que NÃO estejam na lista de 30 dias esperados. Confirmar?')) return;

        setLoading(true);
        try {
            const carolRecords = records.filter(r => r.colaboradorId === 'carol');
            const toDelete = carolRecords.filter(r => !expectedCarolDates.has(r.data));

            for (const r of toDelete) {
                await deleteDoc(doc(db, 'registros', r.id));
            }

            alert(`Novos registros apagados: ${toDelete.length}`);
            fetchData(); // Refresh
        } catch (error) {
            console.error(error);
            alert('Erro ao limpar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-slate-800 text-white rounded-full shadow-lg text-sm hover:bg-slate-700"
            >
                Verificar Férias
            </button>
        );
    }

    // Group by User
    const grouped = records.reduce((acc, r) => {
        if (!acc[r.colaboradorId]) acc[r.colaboradorId] = [];
        acc[r.colaboradorId].push(r);
        return acc;
    }, {} as Record<string, VacationRecord[]>);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h2 className="text-lg font-bold">Auditoria de Férias</h2>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-200 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-8">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>
                    ) : (
                        Object.entries(grouped).map(([userId, userRecords]) => {
                            // Sort by date
                            const sorted = userRecords.sort((a, b) => a.data.localeCompare(b.data));
                            const months = sorted.reduce((acc, r) => {
                                const month = r.data.substring(0, 7); // YYYY-MM
                                if (!acc[month]) acc[month] = [];
                                acc[month].push(r);
                                return acc;
                            }, {} as Record<string, VacationRecord[]>);

                            const isCarol = userId === 'carol';
                            const totalDays = userRecords.length;
                            const hasError = isCarol && totalDays !== 30;

                            return (
                                <div key={userId} className={`border rounded-xl p-4 ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-lg capitalize flex items-center gap-2">
                                            {userId}
                                            <span className={`text-sm px-2 py-1 rounded-full ${hasError ? 'bg-red-200 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                                {totalDays} dias
                                            </span>
                                        </h3>
                                        {isCarol && hasError && (
                                            <button
                                                onClick={handleCleanCarol}
                                                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 flex items-center gap-1"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                                Corrigir Férias da Carol
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(months).sort().map(([month, recs]) => (
                                            <div key={month} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                                                <div className="font-semibold text-sm text-slate-500 mb-2 border-b pb-1">
                                                    {format(parseISO(month + '-01'), 'MMMM yyyy', { locale: ptBR })}
                                                    <span className="float-right text-xs bg-slate-100 px-1 rounded">{recs.length} dias</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {recs.map(r => {
                                                        const isExpected = isCarol ? expectedCarolDates.has(r.data) : true;
                                                        return (
                                                            <span
                                                                key={r.id}
                                                                title={r.data}
                                                                className={`text-xs px-1.5 py-0.5 rounded ${!isExpected ? 'bg-red-100 text-red-700 font-bold border border-red-200' : 'bg-slate-100 text-slate-600'}`}
                                                            >
                                                                {r.data.substring(8)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
