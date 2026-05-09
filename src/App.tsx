/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { LogIn, PackageSearch, FileSpreadsheet, LogOut, Loader2, History } from 'lucide-react';
import ConsultaScreen from './components/ConsultaScreen';
import RelatorioScreen from './components/RelatorioScreen';
import LogsScreen from './components/LogsScreen';

function MainApp() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'consulta' | 'relatorios' | 'logs'>('consulta');
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      await signIn(username, password);
    } catch (err: any) {
      setLoginError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <PackageSearch className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sistema de Estoque</h1>
            <p className="text-gray-500 mt-2">Faça login para gerenciar o endereçamento de produtos.</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Login"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Senha"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-left focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            {loginError && (
              <div className="text-red-500 text-sm font-semibold p-2 bg-red-50 rounded-lg">
                {loginError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-medium py-3 px-4 rounded-xl transition-colors"
            >
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              Entrar
            </button>
          </form>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans print:bg-white print:block print:h-auto print:min-h-0">
      <header className="h-14 flex items-center justify-between px-4 sm:px-6 bg-slate-900 text-white shrink-0 shadow-lg z-10 sticky top-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center font-bold text-lg">
            <PackageSearch className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight hidden sm:block">Gerenciador de Estoque <span className="text-slate-400 font-normal">v1.2.0</span></h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 p-1 rounded-md">
            <button
              onClick={() => setActiveTab('consulta')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-2 rounded
                ${activeTab === 'consulta' ? 'bg-slate-700 shadow-sm text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <PackageSearch className="w-4 h-4" />
              <span className="hidden sm:inline">Consulta</span>
            </button>
            <button
              onClick={() => setActiveTab('relatorios')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-2 rounded
                ${activeTab === 'relatorios' ? 'bg-slate-700 shadow-sm text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Relatórios</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-2 rounded
                ${activeTab === 'logs' ? 'bg-slate-700 shadow-sm text-white' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Logs</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 mr-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Firebase Conectado
            </div>
            <button
              onClick={signOutUser}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 sm:p-6 gap-6 max-w-7xl mx-auto w-full flex-col print:overflow-visible print:h-auto print:block print:p-0 print:m-0">
        {activeTab === 'consulta' && <ConsultaScreen />}
        {activeTab === 'relatorios' && <RelatorioScreen />}
        {activeTab === 'logs' && <LogsScreen />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <FirebaseProvider>
      <MainApp />
    </FirebaseProvider>
  );
}
