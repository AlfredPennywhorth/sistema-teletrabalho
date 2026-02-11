
import { useState } from 'react';
import { Database, Upload, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { migrateViaRest } from '../services/restMigrationService';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export function MigrationButton() {
    const { colaboradores, feriados, statusDiarios, currentUser } = useStore();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (currentUser?.role !== 'admin') return null;

    const handleMigration = async () => {
        // Validate data before confirming
        const totalItems = colaboradores.length + feriados.length + statusDiarios.length;
        console.log('Dados para migração:', {
            colaboradores: colaboradores.length,
            feriados: feriados.length,
            registros: statusDiarios.length
        });

        if (totalItems === 0) {
            alert('Não há dados locais para migrar! Verifique se a aplicação carregou corretamente.');
            return;
        }

        if (!confirm(`Isso importará ${totalItems} itens para o novo banco de dados. Continuar?`)) return;

        setLoading(true);
        setProgress('Iniciando...');
        setError('');
        setSuccess(false);

        try {
            console.log('Usuário autenticado:', currentUser?.id || 'Nenhum', currentUser?.email);

            // 1. Raw HTTP Test (Rest API)
            console.log('Passo 1: Testando conexão HTTP direta...');
            setProgress('Testando conexão HTTP...');
            try {
                const projectId = 'sistema-teletrabalho';
                const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/teste`;
                const response = await fetch(url);
                console.log('HTTP Status:', response.status);
                if (!response.ok && response.status !== 404) {
                    // 404 means "collection empty" but connected. 200 means connected.
                    // Other errors mean trouble.
                    throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
                }
                console.log('Conexão HTTP OK!');
            } catch (httpError: any) {
                console.error('Falha no teste HTTP:', httpError);
                throw new Error('Seu computador não consegue acessar o endereço do Firestore. Verifique DNS ou se algum software de segurança está bloqueando.');
            }



            // 2. REST Force Migration
            console.log(`Passo 2: Migrando dados para sistema-teletrabalho-v2...`);
            setProgress('Preparando pacotes REST...');

            await migrateViaRest(colaboradores, feriados, statusDiarios, undefined, (msg) => {
                console.log('REST Progresso:', msg);
                setProgress(msg);
            });

            setSuccess(true);
            alert('Migração concluída com sucesso! Verifique o console do navegador (F12) para detalhes.');
        } catch (err: any) {
            console.error('Erro na migração:', err);
            setError('Erro: ' + (err.message || 'Desconhecido'));
            alert(`Erro ao migrar dados: ${err.message}`);
        } finally {
            setLoading(false);
            setProgress('');
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50">
            {error && (
                <div className="absolute bottom-full mb-2 right-0 bg-red-100 text-red-700 p-3 rounded-lg text-sm whitespace-nowrap flex items-center gap-2 shadow-lg">
                    <AlertTriangle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <button
                onClick={handleMigration}
                disabled={loading || success}
                className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg font-medium transition-all ${success
                    ? 'bg-green-600 text-white cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105'
                    }`}
                title="Migrar dados locais para o Cloud"
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : success ? (
                    <Check className="w-5 h-5" />
                ) : (
                    <Upload className="w-5 h-5" />
                )}
                <span className={loading || success ? '' : 'hidden sm:inline'}>
                    {loading ? (progress || 'Migrando...') : success ? 'Migrado!' : 'Salvar no Cloud'}
                </span>
            </button>
        </div>
    );

}
