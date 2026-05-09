import { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Search, Check, AlertCircle, Save, Info, Loader2 } from 'lucide-react';
import { db, handleFirestoreError, OperationType, logUserAction } from '../lib/firebase';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useAuth } from './FirebaseProvider';
import { saveFileState, loadFileState, clearFileState } from '../lib/storage';

interface ExcelRow {
  [key: string]: any;
}

interface MappedData {
  codigo: string;
  codigoInterno: string;
  descricao: string;
}

const N_OPTIONS = Array.from({ length: 999 }, (_, i) => i + 1);

export default function ConsultaScreen() {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  
  // File state
  const [data, setData] = useState<ExcelRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  
  // Mapping state
  const [mapping, setMapping] = useState({
    codigo: '',
    codigoInterno: '',
    descricao: ''
  });
  const [mappingRequired, setMappingRequired] = useState(false);
  
  // Search state
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<MappedData | null>(null);
  const [searchError, setSearchError] = useState('');

  // Address state
  const [mod, setMod] = useState('1');
  const [rua, setRua] = useState('1');
  const [num, setNum] = useState('1');
  const [apto, setApto] = useState('1');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [keepAddress, setKeepAddress] = useState(() => {
    return localStorage.getItem('keepAddress') === 'true';
  });

  const handleKeepAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setKeepAddress(e.target.checked);
    localStorage.setItem('keepAddress', String(e.target.checked));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFileState().then(state => {
      if (state && state.data && state.data.length > 0) {
        setData(state.data);
        setHeaders(state.headers);
        if (state.mapping && state.mapping.codigo) {
          setMapping(state.mapping);
          setMappingRequired(false);
        } else {
          setMappingRequired(true);
        }
      }
      setIsInitializing(false);
    }).catch(err => {
      console.error('Failed to load file state', err);
      setIsInitializing(false);
    });
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const ab = event.target?.result;
        const workbook = XLSX.read(ab, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
        
        if (jsonData.length > 0) {
          const fileHeaders = Object.keys(jsonData[0]);
          setHeaders(fileHeaders);
          setData(jsonData);
          
          // Auto-detect columns
          const newMapping = { codigo: '', codigoInterno: '', descricao: '' };
          let needsManual = false;

          const guessColumn = (keywords: string[]) => {
            const lowerHeaders = fileHeaders.map(h => h.toLowerCase());
            for (const keyword of keywords) {
              const idx = lowerHeaders.findIndex(h => h.includes(keyword));
              if (idx !== -1) return fileHeaders[idx];
            }
            return '';
          };

          newMapping.codigo = guessColumn(['código', 'codigo', 'cod', 'ean', 'gtin']);
          newMapping.codigoInterno = guessColumn(['interno', 'cod. int', 'sku', 'referência', 'referencia']);
          newMapping.descricao = guessColumn(['descrição', 'descricao', 'nome', 'produto']);

          if (!newMapping.codigo || !newMapping.codigoInterno || !newMapping.descricao) {
            needsManual = true;
          }

          setMapping(newMapping);
          setMappingRequired(needsManual);

          if (!needsManual) {
            saveFileState({ data: jsonData, headers: fileHeaders, mapping: newMapping });
          }

          setSearchCode('');
          setSearchResult(null);
          setSearchError('');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearData = () => {
    clearFileState();
    setData([]);
    setHeaders([]);
    setMappingRequired(false);
    setSearchResult(null);
    setSearchCode('');
    setSearchError('');
    setMapping({ codigo: '', codigoInterno: '', descricao: '' });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    setSaveSuccess(false);

    if (!searchCode.trim()) return;

    if (!mapping.codigo || !mapping.codigoInterno || !mapping.descricao) {
      setSearchError('Por favor, defina o mapeamento das colunas primeiro.');
      return;
    }

    const found = data.find(row => String(row[mapping.codigo]).trim() === searchCode.trim());

    if (found) {
      setSearchResult({
        codigo: String(found[mapping.codigo]),
        codigoInterno: String(found[mapping.codigoInterno]),
        descricao: String(found[mapping.descricao])
      });
      // Reset dropdowns if not keeping address
      if (!keepAddress) {
        setMod('1'); setRua('1'); setNum('1'); setApto('1');
      }
    } else {
      setSearchError('Código não encontrado na planilha.');
    }
  };

  const handleSave = async () => {
    if (!searchResult || !user) return;
    setIsSaving(true);
    setSaveSuccess(false);

    const endereco = `${mod} - ${rua} - ${num} - ${apto}`;
    
    // We auto-generate the doc ID, since stock_records allows it.
    const newRecordRef = doc(collection(db, 'stock_records'));

    const payload = {
      codigo: searchResult.codigo,
      codigoInterno: searchResult.codigoInterno,
      descricao: searchResult.descricao,
      endereco,
      userId: user.uid,
      createdAt: serverTimestamp(),
    };

    try {
      await setDoc(newRecordRef, payload);
      await logUserAction('CREATE', `Criado endereçamento para ${searchResult.codigo} / ${searchResult.codigoInterno} para o endereço ${endereco}`);
      setSaveSuccess(true);
      // Automatically focus search after save if user wants to keep going
      setTimeout(() => {
        setSearchCode('');
        setSearchResult(null);
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'stock_records');
    } finally {
      setIsSaving(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
        <p className="text-sm">Carregando base de dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Step 1: Upload and Mapping */}
      {(data.length === 0 || mappingRequired) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Base de Dados (XLSX)
          </h2>
        </div>
        
        {data.length === 0 ? (
          <div className="border border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700">Clique para selecionar</p>
            <p className="text-[10px] text-slate-400 mt-1">Apenas arquivos Excel (.xlsx)</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span className="font-medium">Planilha importada com sucesso ({data.length} registros)</span>
              </div>
              <button onClick={clearData} className="text-green-700 font-semibold hover:text-green-800 underline">
                Carregar outra
              </button>
            </div>

            {mappingRequired && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl space-y-4">
                <div className="flex items-center gap-2 text-orange-800">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-semibold text-sm">Precisamos de ajuda para mapear as colunas</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-orange-800 mb-1">Coluna de Código (Busca)</label>
                    <select value={mapping.codigo} onChange={e => setMapping({...mapping, codigo: e.target.value, })} className="w-full rounded-lg border-orange-200 text-sm focus:ring-orange-500 py-2 px-3 focus:border-orange-500">
                      <option value="">Selecione...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-800 mb-1">Coluna de Cód. Interno</label>
                    <select value={mapping.codigoInterno} onChange={e => setMapping({...mapping, codigoInterno: e.target.value, })} className="w-full rounded-lg border-orange-200 text-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500">
                      <option value="">Selecione...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-orange-800 mb-1">Coluna de Descrição</label>
                    <select value={mapping.descricao} onChange={e => setMapping({...mapping, descricao: e.target.value, })} className="w-full rounded-lg border-orange-200 text-sm py-2 px-3 focus:ring-orange-500 focus:border-orange-500">
                      <option value="">Selecione...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (mapping.codigo && mapping.codigoInterno && mapping.descricao) {
                      setMappingRequired(false);
                      saveFileState({ data, headers, mapping });
                    }
                  }}
                  disabled={!mapping.codigo || !mapping.codigoInterno || !mapping.descricao}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  Confirmar Mapeamento
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Step 2: Search */}
      {data.length > 0 && !mappingRequired && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Módulo de Consulta</h2>
             <button onClick={clearData} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
               Trocar Base de Dados
             </button>
          </div>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Busque pelo código do produto..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-slate-100 border-2 border-slate-200 rounded-lg text-base focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 h-12 bg-indigo-600 text-white font-semibold text-sm rounded-lg hover:bg-indigo-700 transition-colors whitespace-nowrap"
            >
              BUSCAR
            </button>
          </form>

          {searchError && (
            <div className="text-red-700 text-xs font-semibold flex items-center gap-2 bg-red-50 px-3 py-2 border border-red-200 rounded">
              <Info className="w-4 h-4" />
              {searchError}
            </div>
          )}

          {searchResult && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Código Interno</label>
                  <p className="text-xl font-bold font-mono text-indigo-700">{searchResult.codigoInterno}</p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Descrição do Produto</label>
                  <p className="text-lg leading-tight text-slate-700">{searchResult.descricao}</p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Endereçamento de Estoque</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={keepAddress}
                      onChange={handleKeepAddressChange}
                    />
                    <span className="text-xs font-medium text-slate-600">Manter endereço sugerido na próxima busca</span>
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">MOD</label>
                    <select value={mod} onChange={e => setMod(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">RUA</label>
                    <select value={rua} onChange={e => setRua(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">NUM</label>
                    <select value={num} onChange={e => setNum(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">APTO</label>
                    <select value={apto} onChange={e => setApto(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none">
                      {N_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                {saveSuccess ? (
                  <div className="text-emerald-700 text-xs font-semibold flex items-center gap-2 bg-emerald-50 px-3 py-2 border border-emerald-200 rounded flex-1">
                    <Check className="w-4 h-4" />
                    Endereçamento salvo com sucesso!
                  </div>
                ) : <div className="flex-1" />}
                
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-bold text-sm tracking-wide shadow-md transition-all disabled:opacity-50 mt-4 sm:mt-0"
                >
                  {isSaving ? 'SALVANDO...' : 'SALVAR NO FIREBASE'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
