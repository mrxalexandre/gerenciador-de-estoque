import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { RefreshCw, Download, Printer, Loader2, PackageSearch } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from './FirebaseProvider';

interface StockRecord {
  id: string;
  codigo: string;
  codigoInterno: string;
  descricao: string;
  endereco: string;
  createdAt: Timestamp | null;
}

export default function RelatorioScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<StockRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'stock_records'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: StockRecord[] = [];
      snapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as StockRecord);
      });
      setRecords(fetched);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'stock_records');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportXLSX = () => {
    if (records.length === 0) return;
    
    const exportData = records.map(r => ({
      'Código': r.codigo,
      'Cód. Interno': r.codigoInterno,
      'Descrição': r.descricao,
      'Endereço Físico': r.endereco,
      'Data de Registro': r.createdAt ? r.createdAt.toDate().toLocaleString('pt-BR') : 'N/D'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório_Estoque');
    XLSX.writeFile(workbook, 'Relatorio_Enderecamento_Estoque.xlsx');
  };

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)] print:h-auto print:block">
      {/* Header Actions - hidden when printing */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden shrink-0">
        <div className="flex items-center gap-2">
          <PackageSearch className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-700">Registros de Endereçamento</h2>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded ml-2 uppercase">
            {records.length} {records.length === 1 ? 'item' : 'itens'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setLoading(true)} // onSnapshot will quickly reset it to false as it re-evaluates
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          
          <button 
            onClick={handlePrint}
            title="Exportar PDF"
            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
          >
            <Printer className="w-5 h-5" />
          </button>

          <button 
            onClick={handleExportXLSX}
            title="Exportar XLSX"
            className="p-1.5 text-slate-500 hover:bg-slate-200 rounded transition-colors"
          >
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0 print:overflow-visible print:block">
        {/* Print Header */}
        <div className="hidden print:block mb-6 p-4">
          <h1 className="text-xl font-bold">Relatório de Endereçamento de Estoque</h1>
          <p className="text-slate-500 mt-1 text-sm">Gerado em {new Date().toLocaleString('pt-BR')}</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            <p className="text-sm">Carregando registros...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <PackageSearch className="w-10 h-10 mb-3 text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto print:overflow-visible print:h-auto print:block">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Cód. Interno</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Código</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Descrição</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200">Endereço</th>
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 whitespace-nowrap">Data</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50 border-b border-slate-100 transition-colors">
                    <td className="p-3 font-medium font-mono text-slate-700 whitespace-nowrap">{record.codigoInterno}</td>
                    <td className="p-3 text-slate-500 font-mono whitespace-nowrap">{record.codigo}</td>
                    <td className="p-3 text-slate-600 truncate max-w-xs">{record.descricao}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 whitespace-nowrap">
                        {record.endereco}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">
                      {record.createdAt ? record.createdAt.toDate().toLocaleString('pt-BR') : 'N/D'}
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
