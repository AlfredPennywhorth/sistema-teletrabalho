import { useState, useEffect } from 'react';
import { onAuthStateChanged, parseActionCodeURL } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useStore } from './store/useStore';
import { Login } from './components/Login';
import { ResetPassword } from './components/ResetPassword';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { AnnualPanel } from './components/AnnualPanel';
import { ColaboradoresManager } from './components/ColaboradoresManager';
import { FeriadosManager } from './components/FeriadosManager';
import { getColaboradores, getFeriados, getRegistros, fixCorruptedData, purgeLegacyData } from './services/firestoreService';
import { Loader2 } from 'lucide-react';

export function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [resetCode, setResetCode] = useState<string | null>(null);
  
    const {
    currentUser,
    setCurrentUser,
    setColaboradores,
    setFeriados,
    syncStatusDiarios
  } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se é um link de ação do Firebase (ex: reset password)
    const actionCodeUrl = parseActionCodeURL(window.location.href);
    if (actionCodeUrl && actionCodeUrl.mode === 'resetPassword') {
      setResetCode(actionCodeUrl.oobCode);
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Load data from Firestore first to link user
        try {

          // Data Audit & Cleanup
          await fixCorruptedData();
          await purgeLegacyData();

          const [cols, fers, regs] = await Promise.all([
            getColaboradores(),
            getFeriados(),
            getRegistros()
          ]);

          if (cols.length > 0) setColaboradores(cols);
          if (fers.length > 0) setFeriados(fers);
          if (regs.length > 0) syncStatusDiarios(regs);
          // Dados sincronizados

          // Link User to Colaborador
          const linkedColaborador = cols.find(c => c.email.toLowerCase() === user.email?.toLowerCase());

          setCurrentUser({
            id: user.uid,
            nome: linkedColaborador ? linkedColaborador.nome : (user.displayName || user.email?.split('@')[0] || 'Usuário'),
            email: user.email || '',
            role: 'admin', // Keep admin for now, allows managing everything
            colaboradorId: linkedColaborador?.id
          });

        } catch (error) {
          console.error('Erro ao carregar dados do Firestore:', error);
          // Fallback user set if error
          setCurrentUser({
            id: user.uid,
            nome: user.displayName || user.email?.split('@')[0] || 'Usuário',
            email: user.email || '',
            role: 'admin',
          });
        }

      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setCurrentUser, setColaboradores, setFeriados, syncStatusDiarios]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Se houver código de reset, renderiza a tela de redefinição indepentende de estar logado ou não
  if (resetCode) {
    return <ResetPassword oobCode={resetCode} onGoToLogin={() => {
      setResetCode(null);
      // Limpa os parâmetros da URL sem recarregar a página
      window.history.replaceState({}, document.title, window.location.pathname);
    }} />;
  }

  if (!currentUser) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'calendario':
        return <MonthlyCalendar />;
      case 'painel-anual':
        return <AnnualPanel />;
      case 'colaboradores':
        return <ColaboradoresManager />;
      case 'feriados':
        return <FeriadosManager />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
