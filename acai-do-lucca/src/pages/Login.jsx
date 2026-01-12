import React, { useState } from 'react';
import { Lock, ArrowLeft, Loader2 } from 'lucide-react';
import { useData } from '../hooks/useData';

export default function Login({ onBack, onLoginSuccess }) {
  const { login } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      onLoginSuccess();
    } catch (err) {
      setError('E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl relative">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600">
            <ArrowLeft />
        </button>
        
        <div className="text-center mb-8 mt-4">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
            </div>
            <h2 className="text-2xl font-black text-gray-800 uppercase">Acesso Restrito</h2>
            <p className="text-gray-400 text-sm">Área exclusiva para gerentes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="text-xs font-bold text-gray-500 ml-1">E-MAIL</label>
                <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-purple-200 border border-transparent focus:border-purple-500 transition-all"
                    placeholder="admin@acaidolucca.com"
                    required
                />
            </div>
            <div>
                <label className="text-xs font-bold text-gray-500 ml-1">SENHA</label>
                <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-xl outline-none focus:ring-2 ring-purple-200 border border-transparent focus:border-purple-500 transition-all"
                    placeholder="••••••••"
                    required
                />
            </div>

            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 p-2 rounded-lg">{error}</p>}

            <button disabled={loading} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={20} />}
                ENTRAR
            </button>
        </form>
      </div>
    </div>
  );
}