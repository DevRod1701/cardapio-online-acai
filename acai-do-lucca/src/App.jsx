import React, { useState, useEffect, useRef } from 'react';
import Menu from './pages/Menu';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Pricing from './pages/Pricing';
import { useData } from './hooks/useData';

function App() {
  const { user } = useData();
  
  // Flag para saber se a navegação foi feita por um botão do site (INTERNA)
  const isInternalNav = useRef(false);

  // Lê a URL inicial
  const [currentPage, setCurrentPage] = useState(() => {
      const hash = window.location.hash.replace('#', '');
      return hash || 'menu';
  });

  // --- 1. ROTEADOR (Ouve mudanças na URL) ---
  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        setCurrentPage(hash || 'menu');
        
        // Resetamos a flag após a troca de página ter ocorrido
        isInternalNav.current = false;
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- 2. TRAVA DE SAÍDA (Apenas no Menu) ---
  useEffect(() => {
    if (currentPage === 'menu') {
        // Empurramos um estado 'trap' para o histórico
        // Isso cria uma "barreira" para o botão voltar
        if (window.history.state?.page !== 'menu_trap') {
            window.history.pushState({ page: 'menu_trap' }, '', '#menu');
        }

        const handleBackAttempt = (e) => {
            // SE FOI NAVEGAÇÃO INTERNA (BOTÃO), IGNORA A TRAVA
            if (isInternalNav.current) return;

            // Se foi botão VOLTAR do celular/navegador:
            // O navegador tentou voltar, então consumiu nosso estado 'trap'.
            // Mostramos a confirmação.
            const confirmExit = window.confirm("Deseja sair do aplicativo?");
            
            if (!confirmExit) {
                // Se CANCELAR: Restauramos a barreira para proteger de novo
                window.history.pushState({ page: 'menu_trap' }, '', '#menu');
            } else {
                // Se CONFIRMAR: Voltamos mais uma vez para sair de verdade (ir pro Google)
                window.history.go(-1); 
            }
        };

        window.addEventListener('popstate', handleBackAttempt);
        return () => window.removeEventListener('popstate', handleBackAttempt);
    }
  }, [currentPage]);


  // --- FUNÇÃO DE NAVEGAÇÃO SEGURA (USAR NOS BOTÕES) ---
  const navigateTo = (page) => {
      // 1. Avisa o sistema que isso é uma navegação permitida (botão)
      isInternalNav.current = true;
      
      // 2. Muda a URL (o roteador vai capturar isso)
      window.location.hash = page;
  };

  const handleGoToAdmin = () => {
      if (user) {
          navigateTo('admin');
      } else {
          navigateTo('login');
      }
  };

  // Se deslogar, força voltar pro menu
  useEffect(() => {
      if (!user && (currentPage === 'admin' || currentPage === 'pricing')) {
          navigateTo('menu');
      }
  }, [user]);

  return (
    <div>
      {currentPage === 'menu' && (
          <Menu onGoToAdmin={handleGoToAdmin} />
      )}
      
      {currentPage === 'login' && (
          <Login 
            onBack={() => navigateTo('menu')} 
            onLoginSuccess={() => navigateTo('admin')} 
          />
      )}
      
      {currentPage === 'admin' && (
          <Admin 
            onBack={() => navigateTo('menu')} 
            onNavigate={navigateTo} 
          />
      )}
      
      {currentPage === 'pricing' && (
          <Pricing 
            onBack={() => navigateTo('admin')} 
          />
      )}
    </div>
  );
}

export default App;