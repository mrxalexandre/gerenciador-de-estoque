import { useEffect, useState } from 'react';
import { db, handleFirestoreError, OperationType, logUserAction } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { RefreshCw, Download, Printer, Loader2, PackageSearch, Search, MapPin, Edit2, Trash2, X, Save } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchAddress, setSearchAddress] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingRecord, setEditingRecord] = useState<StockRecord | null>(null);
  const [editMod, setEditMod] = useState('1');
  const [editRua, setEditRua] = useState('1');
  const [editNum, setEditNum] = useState('1');
  const [editApto, setEditApto] = useState('1');
  const [isUpdating, setIsUpdating] = useState(false);

  const N_OPTIONS = Array.from({ length: 30 }, (_, i) => String(i + 1));

  const handleDelete = async (record: StockRecord) => {
    if (!window.confirm(`Tem certeza que deseja deletar o endereço do produto: ${record.descricao}?`)) {
      return;
    }
    try {
      if (record.id) {
        await deleteDoc(doc(db, 'stock_records', record.id));
        await logUserAction('DELETE', `Deletado endereçamento para ${record.codigo} / ${record.codigoInterno} que estava no endereço ${record.endereco}`);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'stock_records');
      alert('Erro ao deletar o registro.');
    }
  };

  const openEditModal = (record: StockRecord) => {
    const parts = record.endereco.split(' - ');
    setEditMod(parts[0] || '1');
    setEditRua(parts[1] || '1');
    setEditNum(parts[2] || '1');
    setEditApto(parts[3] || '1');
    setEditingRecord(record);
  };

  const handleUpdate = async () => {
    if (!editingRecord || !editingRecord.id) return;
    setIsUpdating(true);
    const novoEndereco = `${editMod} - ${editRua} - ${editNum} - ${editApto}`;
    
    try {
      await updateDoc(doc(db, 'stock_records', editingRecord.id), {
        endereco: novoEndereco,
        updatedAt: serverTimestamp()
      });
      await logUserAction('UPDATE', `Alterado endereçamento para ${editingRecord.codigo} / ${editingRecord.codigoInterno} de ${editingRecord.endereco} para ${novoEndereco}`);
      setEditingRecord(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'stock_records');
      alert('Erro ao atualizar o registro.');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);

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
  }, [user, refreshKey]);

  const handlePrint = () => {
    window.print();
  };

  const filteredRecords = records.filter(r => {
    let matchGeneral = true;
    if (searchTerm) {
      // Split by space and check if ALL terms match somewhere in code, subcode, or description
      const terms = searchTerm.toLowerCase().split(' ').filter(t => t.length > 0);
      matchGeneral = terms.every(term => 
        r.codigo.toLowerCase().includes(term) ||
        r.codigoInterno.toLowerCase().includes(term) ||
        r.descricao.toLowerCase().includes(term)
      );
    }

    let matchAddress = true;
    if (searchAddress) {
      // Remove all spaces and dashes for a flexible comparison
      const addressQuery = searchAddress.replace(/[\s-]/g, '').toLowerCase();
      const itemAddress = r.endereco.replace(/[\s-]/g, '').toLowerCase();
      matchAddress = itemAddress.includes(addressQuery);
    }

    return matchGeneral && matchAddress;
  });

  const handleExportXLSX = () => {
    if (filteredRecords.length === 0) return;
    
    const exportData = filteredRecords.map(r => ({
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
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 print:hidden shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <PackageSearch className="w-5 h-5 text-slate-700" />
            <h2 className="text-sm font-bold text-slate-700">Registros de Endereçamento</h2>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded ml-2 uppercase">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setRefreshKey(prev => prev + 1)}
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

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por código ou descrição..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
          <div className="relative sm:w-64">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Endereço (ex: 1-2-15-1)..."
              value={searchAddress}
              onChange={e => setSearchAddress(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
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
        ) : filteredRecords.length === 0 ? (
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
                  <th className="p-3 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-200 text-right print:hidden">Ações</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filteredRecords.map((record) => (
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
                    <td className="p-3 text-right whitespace-nowrap print:hidden">
                      <button 
                        onClick={() => openEditModal(record)}
                        className="text-indigo-600 hover:text-indigo-800 p-1 rounded-md hover:bg-slate-100 transition-colors mr-2"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(record)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-md hover:bg-slate-100 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Editar Endereço</h3>
              <button 
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Produto</p>
                <p className="text-xs text-slate-500 line-clamp-2">{editingRecord.descricao}</p>
                <p className="text-xs font-mono text-indigo-600 mt-1">{editingRecord.codigoInterno} / {editingRecord.codigo}</p>
              </div>

              <div className="pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Novo Endereço</p>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">MOD</label>
                    <select value={editMod} onChange={e => setEditMod(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">RUA</label>
                    <select value={editRua} onChange={e => setEditRua(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">NUM</label>
                    <select value={editNum} onChange={e => setEditNum(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">APTO</label>
                    <select value={editApto} onChange={e => setEditApto(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Alteração
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
