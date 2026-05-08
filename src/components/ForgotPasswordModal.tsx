import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { X, Mail, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ForgotPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError('Por favor, informe seu e-mail.');
            return;
        }

        setLoading(true);

        try {
            const actionCodeSettings = {
                url: window.location.origin,
                handleCodeInApp: false,
            };

            await sendPasswordResetEmail(auth, normalizedEmail, actionCodeSettings);
            setSuccess(true);
            setEmail('');
        } catch (err: any) {
            console.error('Erro ao enviar e-mail de recuperação:', err);
            // Seguindo a diretriz de não revelar se o e-mail existe,
            // mas tratando erros técnicos de rede ou e-mail inválido.
            if (err.code === 'auth/invalid-email') {
                setError('Por favor, insira um e-mail válido.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Falha na rede. Verifique sua conexão e tente novamente.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Muitas tentativas em sequência. Aguarde alguns minutos e tente novamente.');
            } else {
                // Para outros erros, mostramos a mensagem de sucesso para manter a segurança,
                // ou uma genérica se for algo impeditivo.
                setSuccess(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 translate="no" className="text-xl font-bold text-slate-900">Recuperar Senha</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8">
                    {success ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="flex justify-center">
                                <div className="p-3 bg-green-100 rounded-full">
                                    <CheckCircle2 className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="text-lg font-semibold text-slate-900">E-mail enviado!</h4>
                                <p className="text-slate-600">
                                    Se houver uma conta vinculada a este e-mail, as instruções foram enviadas.
                                </p>
                                <p className="text-slate-500 text-sm">
                                    Se não encontrar a mensagem, verifique também a caixa de spam/lixo eletrônico.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Informe o e-mail da sua conta e enviaremos um link para você definir uma nova senha.
                            </p>

                            <div className="space-y-2">
                                <label translate="no" className="block text-sm font-medium text-slate-700">
                                    E-mail
                                </label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="seu@email.com"
                                        required
                                    />
                                    <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm animate-in fade-in slide-in-from-top-1">
                                    <AlertTriangle className="w-5 h-5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        'Enviar Instruções'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
