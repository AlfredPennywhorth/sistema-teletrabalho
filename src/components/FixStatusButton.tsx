import { useState } from 'react';
import { Upload, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import data2026 from '../data/data_2026.json';
import { migrateViaRest } from '../services/restMigrationService';
import { useStore } from '../store/useStore';

export function FixStatusButton() {
    const { currentUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Allow user to run this
    if (currentUser?.role !== 'admin' && currentUser?.email !== 'andres@cetsp.com.br') {
        // Fallback 
    }

    const handleFix = async () => {
        if (!confirm('Isso atualizará a escala e as férias com a regra de DIAS CORRIDOS para o Ano Todo. Continuar?')) return;

        setLoading(true);
        setProgress('Iniciando...');
        setError('');
        setSuccess(false);

        try {

            setProgress('Buscando dados antigos...');
            // 1. Fetch ALL existing records for 2026 to find orphans
            const q = query(collection(db, 'registros'), where('data', '>=', '2026-01-01'), where('data', '<=', '2026-12-31'));
            const snapshot = await getDocs(q);
            const existingIds = snapshot.docs.map(doc => doc.id);

            // 2. Identify orphans (IDs in DB but NOT in new data)
            const newIds = new Set(data2026.map(d => d.id));
            const orphans = existingIds.filter(id => !newIds.has(id));

            console.log(`Encontrados ${existingIds.length} registros no banco.`);
            console.log(`Novos dados tem ${data2026.length} registros.`);
            console.log(`Serão excluídos ${orphans.length} registros obsoletos.`);

            if (orphans.length > 0) {
                setProgress(`Limpando ${orphans.length} registros antigos...`);
            }

            // 3. Migrate: Update new ones AND delete orphans
            await migrateViaRest([], [], data2026, orphans, undefined, (msg) => {
                setProgress(msg);
            });

            setSuccess(true);
            alert('Escala atualizada com sucesso!');
        } catch (err: any) {
            console.error('Erro ao atualizar:', err);
            setError(err.message);
            alert(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (success) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {error && (
                <div className="absolute bottom-full mb-2 right-0 bg-red-100 text-red-700 p-3 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 shadow-lg">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button
                onClick={handleFix}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-medium transition-all bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105"
                title="Atualizar Escala (Dias Corridos)"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Upload className="w-5 h-5" />
                )}
                <span className={loading ? '' : 'hidden sm:inline'}>
                    {loading ? progress : 'Atualizar Escala'}
                </span>
            </button>
        </div>
    );
}
