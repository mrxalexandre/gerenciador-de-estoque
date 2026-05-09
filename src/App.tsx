/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { LogIn, PackageSearch, FileSpreadsheet, LogOut, Loader2 } from 'lucide-react';
import ConsultaScreen from './components/ConsultaScreen';
import RelatorioScreen from './components/RelatorioScreen';

function MainApp() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'consulta' | 'relatorios'>('consulta');

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
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-xl transition-colors"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
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
        {activeTab === 'consulta' ? <ConsultaScreen /> : <RelatorioScreen />}
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
