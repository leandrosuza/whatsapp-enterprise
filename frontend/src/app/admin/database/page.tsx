'use client';

import { useState, useEffect } from 'react';
import { useApp } from '../../../contexts/AppContext';

interface TableData {
  name: string;
  schema: any[];
  data: any[];
  rowCount: number;
  hasMoreData?: boolean;
  error?: string;
}

interface DatabaseResponse {
  success: boolean;
  data: {
    tables: TableData[];
    totalTables: number;
  };
}

export default function DatabasePage() {
  const { setCurrentView } = useApp();
  const [tables, setTables] = useState<TableData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentView('database');
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/database/all-tables');
      const data: DatabaseResponse = await response.json();
      
      if (data.success) {
        setTables(data.data.tables);
      } else {
        setError('Erro ao carregar tabelas');
      }
    } catch (err) {
      setError('Erro de conexão');
      console.error('Error loading tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedTableData = () => {
    return tables.find(table => table.name === selectedTable);
  };

  const filteredData = () => {
    const tableData = getSelectedTableData();
    if (!tableData) return [];
    
    if (!searchTerm) return tableData.data;
    
    return tableData.data.filter((row: any) => {
      return Object.values(row).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  };

  const paginatedData = () => {
    const filtered = filteredData();
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = Math.ceil(filteredData().length / itemsPerPage);

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando tabelas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadTables}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-database text-green-600 mr-3 text-xl"></i>
              <h1 className="text-2xl font-semibold text-gray-900">Database Viewer</h1>
            </div>
            <div className="text-sm text-gray-500">
              {tables.length} tabelas encontradas
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Table List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Tabelas</h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  {tables.map((table) => (
                    <button
                      key={table.name}
                      onClick={() => setSelectedTable(table.name)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedTable === table.name
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{table.name}</div>
                          <div className="text-sm text-gray-500">
                            {table.rowCount} registros
                          </div>
                        </div>
                        {table.hasMoreData && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                            +1000
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Table Data */}
          <div className="lg:col-span-3">
            {selectedTable ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {selectedTable}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {getSelectedTableData()?.rowCount} registros
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {getSelectedTableData()?.schema.map((column: any) => (
                          <th
                            key={column.name}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column.name}
                            <div className="text-xs text-gray-400 font-normal">
                              {column.type}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedData().map((row: any, rowIndex: number) => (
                        <tr
                          key={rowIndex}
                          className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                        >
                          {getSelectedTableData()?.schema.map((column: any) => (
                            <td
                              key={column.name}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {formatValue(row[column.name])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Mostrando {((currentPage - 1) * itemsPerPage) + 1} a{' '}
                        {Math.min(currentPage * itemsPerPage, filteredData().length)} de{' '}
                        {filteredData().length} resultados
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Anterior
                        </button>
                        <span className="text-sm text-gray-700">
                          Página {currentPage} de {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {filteredData().length === 0 && (
                  <div className="p-8 text-center">
                    <i className="fas fa-search text-gray-400 text-3xl mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Nenhum resultado encontrado
                    </h3>
                    <p className="text-gray-500">
                      {searchTerm ? 'Tente ajustar os termos de busca.' : 'Esta tabela está vazia.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <i className="fas fa-table text-gray-400 text-4xl mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecione uma tabela
                </h3>
                <p className="text-gray-500">
                  Escolha uma tabela na lista ao lado para visualizar seus dados.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
