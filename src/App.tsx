import { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MonthlyCalendar } from './components/MonthlyCalendar';
import { AnnualPanel } from './components/AnnualPanel';
import { ColaboradoresManager } from './components/ColaboradoresManager';
import { FeriadosManager } from './components/FeriadosManager';

export function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

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
