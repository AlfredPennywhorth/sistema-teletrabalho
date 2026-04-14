import { useState, useEffect } from 'react';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Lock, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordProps {
    oobCode: string;
    onGoToLogin: () => void;
}

export function ResetPassword({ oobCode, onGoToLogin }: ResetPasswordProps) {
    const [step, setStep] = useState<'verifying' | 'form' | 'success' | 'error'>('verifying');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [verifyingError, setVerifyingError] = useState('');
    const [formError, setFormError] = useState('');

    useEffect(() => {
        const verifyCode = async () => {
            try {
                await verifyPasswordResetCode(auth, oobCode);
                setStep('form');
            } catch (err: any) {
                console.error('Erro ao verificar código de redefinição:', err);
                setVerifyingError('Link inválido ou expirado. Por favor, solicite a recuperação de senha novamente.');
                setStep('error');
            }
        };

        if (oobCode) {
            verifyCode();
        } else {
            setVerifyingError('Código de redefinição ausente.');
            setStep('error');
        }
    }, [oobCode]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (newPassword.length < 6) {
            setFormError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setFormError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStep('success');
        } catch (err: any) {
            console.error('Erro ao redefinir senha:', err);
            if (err.code === 'auth/weak-password') {
                setFormError('A senha é muito fraca. Tente uma combinação mais complexa.');
            } else if (err.code === 'auth/expired-action-code') {
                setFormError('O código expirou. Solicite a redefinição novamente.');
            } else {
                setFormError('Ocorreu um erro ao redefinir sua senha. Tente novamente mais tarde.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (step === 'verifying') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center flex flex-col items-center">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                    <h3 className="text-xl font-bold text-slate-900">Validando link...</h3>
                    <p className="text-slate-500 mt-2">Aguarde um momento enquanto verificamos seu código.</p>
                </div>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-12 h-12 text-red-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">Ops! Algo deu errado</h3>
                        <p className="text-slate-600">{verifyingError}</p>
                    </div>
                    <button
                        onClick={onGoToLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all"
                    >
                        Voltar para o Login
                    </button>
                </div>
            </div>
        );
    }

    if (step === 'success') {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center space-y-6">
                    <div className="flex justify-center">
                        <div className="p-3 bg-green-100 rounded-full">
                            <CheckCircle2 className="w-12 h-12 text-green-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-slate-900">Senha Alterada!</h3>
                        <p className="text-slate-600">Sua senha foi redefinida com sucesso. Agora você já pode fazer login.</p>
                    </div>
                    <button
                        onClick={onGoToLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-blue-200"
                    >
                        Fazer Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 translate="no" className="text-3xl font-bold text-slate-900">Nova Senha</h2>
                        <p className="text-slate-500 mt-2">Escolha uma senha segura para sua conta</p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Nova Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Confirmar Nova Senha
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
                            </div>
                        </div>

                        {formError && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm animate-in fade-in slide-in-from-top-1">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-200"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                'Redefinir Senha'
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-slate-50 px-8 py-4 text-center">
                    <button
                        onClick={onGoToLogin}
                        className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                    >
                        Voltar para o login
                    </button>
                </div>
            </div>
        </div>
    );
}
