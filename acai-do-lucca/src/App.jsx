import React, { useState, useEffect } from 'react';
import Menu from './pages/Menu';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { useData } from './hooks/useData';

function App() {
  const { user } = useData();
  const [currentPage, setCurrentPage] = useState('menu'); // menu, login, admin

  // Se o usuário já estiver logado e tentar ir pro login, joga pro admin direto
  useEffect(() => {
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
      {currentPage === 'admin' && <Admin onBack={() => setCurrentPage('menu')} />}
    </div>
  );
}

export default App;