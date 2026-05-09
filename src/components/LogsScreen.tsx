import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { Loader2, History, RefreshCw } from 'lucide-react';
import { useAuth } from './FirebaseProvider';

interface ActionLog {
  id?: string;
  userId: string;
  action: string;
  details: string;
  timestamp: Timestamp;
}

export default function LogsScreen() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const q = query(
      collection(db, 'action_logs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: ActionLog[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as ActionLog);
      });
      setLogs(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'action_logs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, refreshKey]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-700">Audit Logs (Histórico de Ações)</h2>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded ml-2 uppercase">
              {logs.length} {logs.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          
          <button 
            onClick={() => setRefreshKey(prev => prev + 1)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-sm">Carregando logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <History className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Nenhum log encontrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Data e Hora</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Usuário ID</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Ação</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Detalhes</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {log.timestamp ? log.timestamp.toDate().toLocaleString('pt-BR') : 'N/D'}
                    </td>
                    <td className="p-3 text-slate-400 font-mono whitespace-nowrap">
                      {log.userId}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                        log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' :
                        log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                        log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
