import React, { useState, useEffect } from 'react';
import Menu from './pages/Menu';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Pricing from './pages/Pricing'; // Importe a nova página
import { useData } from './hooks/useData';

function App() {
  const { user } = useData();
  const [currentPage, setCurrentPage] = useState('menu'); 

  useEffect(() => {
    // Se está no login e logou, vai pro Admin
    if (user && currentPage === 'login') {
        setCurrentPage('admin');
    }
  }, [user, currentPage]);

  const handleGoToAdmin = () => {
      if (user) {
          setCurrentPage('admin');
      } else {
          setCurrentPage('login');
      }
  };

  return (
    <div>
      {currentPage === 'menu' && <Menu onGoToAdmin={handleGoToAdmin} />}
      {currentPage === 'login' && <Login onBack={() => setCurrentPage('menu')} onLoginSuccess={() => setCurrentPage('admin')} />}
      
      {/* Aqui passamos a função onNavigate para o Admin poder trocar de tela */}
      {currentPage === 'admin' && <Admin onBack={() => setCurrentPage('menu')} onNavigate={setCurrentPage} />}
      
      {/* Nova Página de Precificação */}
      {currentPage === 'pricing' && <Pricing onBack={() => setCurrentPage('admin')} />}
    </div>
  );
}

export default App;