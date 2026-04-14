import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
    auth, 
    setPersistence, 
    browserLocalPersistence, 
    browserSessionPersistence 
} from '../lib/firebase';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Definir persistência ANTES do login
            await setPersistence(
                auth, 
                rememberMe ? browserLocalPersistence : browserSessionPersistence
            );
            
            await signInWithEmailAndPassword(auth, email, password);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('E-mail ou senha inválidos.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Muitas tentativas sem sucesso. Tente novamente mais tarde.');
            } else {
                setError('Ocorreu um erro ao tentar fazer login. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 translate="no" className="text-3xl font-bold text-slate-900">Bem-vindo</h1>
                        <p translate="no" className="text-slate-500 mt-2">Faça login para acessar o sistema</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label translate="no" className="block text-sm font-medium text-slate-700 mb-2">
                                E-mail
                            </label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="seu@email.com"
                                    required
                                />
                                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label translate="no" className="block text-sm font-medium text-slate-700">
                                    Senha
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsForgotModalOpen(true)}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    Esqueci minha senha
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                                Lembrar-me neste dispositivo
                            </label>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Entrando...
                                </>
                            ) : (
                                'Entrar'
                            )}
                        </button>
                    </form>
                </div>
                <div className="bg-slate-50 px-8 py-4 text-center text-sm text-slate-500">
                    Sistema de Gestão de Teletrabalho
                </div>
            </div>

            <ForgotPasswordModal 
                isOpen={isForgotModalOpen} 
                onClose={() => setIsForgotModalOpen(false)} 
            />
        </div>
    );
}
