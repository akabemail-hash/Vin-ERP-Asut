
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Invoice, InvoiceItem, PaymentMethod } from '../types';
import { ArrowLeftRight, History, Search, RefreshCcw, CheckCircle, AlertTriangle, Edit2, Trash2, Download, Plus, ArrowLeft } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const Returns = () => {
  const { invoices, addInvoice, updateInvoice, deleteInvoice, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);

  const [view, setView] = useState<'list' | 'create'>('list');
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases'>('sales');
  
  // Create/Edit State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<InvoiceItem[]>([]);
  const [editingReturnId, setEditingReturnId] = useState<string | null>(null);

  // List View State
  const [listSearch, setListSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // --- LIST LOGIC ---
  const returnsList = useMemo(() => {
      const type = activeTab === 'sales' ? 'SALE_RETURN' : 'PURCHASE_RETURN';
      return invoices
          .filter(inv => inv.type === type && (inv.id.toLowerCase().includes(listSearch.toLowerCase()) || inv.partnerName.toLowerCase().includes(listSearch.toLowerCase())))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, activeTab, listSearch]);

  const paginatedReturns = returnsList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          deleteInvoice(id);
      }
  };

  const handleEdit = (inv: Invoice) => {
      setEditingReturnId(inv.id);
      
      // We need the PARENT invoice to know original quantities.
      const parentInvoice = invoices.find(i => i.id === inv.parentInvoiceId);
      
      if (parentInvoice) {
          setSelectedInvoice(parentInvoice);
          // Map items from parent, filling in returnedQuantity from the existing return invoice
          const items = parentInvoice.items.map(parentItem => {
              const returnedItem = inv.items.find(ri => ri.productId === parentItem.productId);
              
              // Calculate already returned amount excluding CURRENT return being edited
              const otherReturns = invoices.filter(i => i.parentInvoiceId === parentInvoice.id && i.id !== inv.id);
              const alreadyReturnedOthers = otherReturns.reduce((acc, retInv) => {
                  const retItem = retInv.items.find(ri => ri.productId === parentItem.productId);
                  return acc + (retItem ? retItem.returnedQuantity || retItem.quantity : 0);
              }, 0);

              return {
                  ...parentItem,
                  maxReturnable: Math.max(0, parentItem.quantity - alreadyReturnedOthers),
                  returnedQuantity: returnedItem ? returnedItem.quantity : 0 
              };
          });
          setReturnItems(items);
          setView('create');
      } else {
          alert("Original invoice not found.");
      }
  };

  const exportReturns = () => {
      const data = returnsList.map(r => ({
          ID: r.id,
          Date: new Date(r.date).toLocaleDateString(),
          Original_Invoice: r.parentInvoiceId,
          Partner: r.partnerName,
          Total: r.total,
          Items: r.items.map(i => `${i.productName} (${i.quantity})`).join(', ')
      }));
      
      const headers = Object.keys(data[0]);
      const csv = [
          headers.join(','),
          ...data.map(row => headers.map(fieldName => `"${(row as any)[fieldName]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Returns_${activeTab}_${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
  };

  // --- CREATE LOGIC ---
  const eligibleInvoices = useMemo(() => {
      const type = activeTab === 'sales' ? 'SALE' : 'PURCHASE';
      return invoices.filter(inv => 
          inv.type === type && 
          (inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || inv.partnerName.toLowerCase().includes(searchQuery.toLowerCase()))
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [invoices, activeTab, searchQuery]);

  const handleSelectInvoice = (inv: Invoice) => {
      setSelectedInvoice(inv);
      setEditingReturnId(null);
      // Initialize return items with 0 returned quantity
      const previousReturns = invoices.filter(i => i.parentInvoiceId === inv.id);
      
      const items = inv.items.map(item => {
          const alreadyReturned = previousReturns.reduce((acc, retInv) => {
              const retItem = retInv.items.find(ri => ri.productId === item.productId);
              return acc + (retItem ? retItem.returnedQuantity || retItem.quantity : 0);
          }, 0);

          return {
              ...item,
              maxReturnable: Math.max(0, item.quantity - alreadyReturned),
              returnedQuantity: 0 
          };
      });
      setReturnItems(items);
  };

  const updateReturnQty = (productId: string, qty: number) => {
      setReturnItems(prev => prev.map(item => {
          if (item.productId === productId) {
              const max = (item as any).maxReturnable;
              return { ...item, returnedQuantity: Math.min(Math.max(0, qty), max) };
          }
          return item;
      }));
  };

  const submitReturn = () => {
      if (!selectedInvoice) return;

      const itemsToReturn = returnItems.filter(i => i.returnedQuantity > 0).map(i => ({
          ...i,
          quantity: i.returnedQuantity, 
          total: i.price * i.returnedQuantity
      }));

      if (itemsToReturn.length === 0) return;

      const totalRefund = itemsToReturn.reduce((sum, i) => sum + i.total, 0);

      const returnInvoice: Invoice = {
          id: editingReturnId || `RET-${activeTab === 'sales' ? 'S' : 'P'}-${Date.now()}`,
          type: activeTab === 'sales' ? 'SALE_RETURN' : 'PURCHASE_RETURN',
          partnerId: selectedInvoice.partnerId,
          partnerName: selectedInvoice.partnerName,
          date: editingReturnId ? (invoices.find(i => i.id === editingReturnId)?.date || new Date().toISOString()) : new Date().toISOString(),
          items: itemsToReturn,
          subtotal: totalRefund,
          tax: 0,
          discount: 0,
          total: totalRefund,
          paymentMethod: PaymentMethod.CASH, 
          parentInvoiceId: selectedInvoice.id,
          locationId: selectedInvoice.locationId
      };

      let success = false;
      if (editingReturnId) {
          success = updateInvoice(returnInvoice);
      } else {
          success = addInvoice(returnInvoice);
      }

      if (success) {
          alert(t('returnSuccess'));
          setView('list');
          setSelectedInvoice(null);
          setReturnItems([]);
          setSearchQuery('');
          setEditingReturnId(null);
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('returnsManagement')}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('returnDesc')}</p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
                {view === 'list' && (
                    <>
                        <button onClick={exportReturns} className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all">
                            <Download size={18} className="mr-2"/> {t('export')}
                        </button>
                        <button onClick={() => { setView('create'); setSelectedInvoice(null); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 shadow-md transition-all">
                            <Plus size={18} className="mr-2"/> {t('newReturn')}
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
            <button 
                onClick={() => { setActiveTab('sales'); setCurrentPage(1); }}
                className={`flex items-center px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                    activeTab === 'sales' 
                    ? 'bg-white dark:bg-gray-700 shadow text-primary' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
                <ArrowLeftRight size={18} className="mr-2"/> {t('salesReturn')}
            </button>
            <button 
                onClick={() => { setActiveTab('purchases'); setCurrentPage(1); }}
                className={`flex items-center px-6 py-2.5 rounded-md text-sm font-bold transition-all ${
                    activeTab === 'purchases' 
                    ? 'bg-white dark:bg-gray-700 shadow text-red-500' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                }`}
            >
                <History size={18} className="mr-2"/> {t('purchaseReturn')}
            </button>
        </div>

        {/* LIST VIEW */}
        {view === 'list' && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                        <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-900 dark:border-gray-600 dark:text-white outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Search Returns..."
                            value={listSearch}
                            onChange={e => setListSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">{t('date')}</th>
                                <th className="p-4">{t('originalInvoice')}</th>
                                <th className="p-4">{t('partner')}</th>
                                <th className="p-4 text-right">{t('total')}</th>
                                <th className="p-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedReturns.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('noRecords')}</td></tr>
                            ) : (
                                paginatedReturns.map(ret => (
                                    <tr key={ret.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-300">{ret.id.substring(0, 10)}...</td>
                                        <td className="p-4 text-sm text-gray-900 dark:text-white">{new Date(ret.date).toLocaleDateString()}</td>
                                        <td className="p-4 text-sm font-mono text-blue-500">{ret.parentInvoiceId?.substring(0, 10)}...</td>
                                        <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">{ret.partnerName}</td>
                                        <td className="p-4 text-right text-sm font-bold text-red-600">{settings.currency}{ret.total.toFixed(2)}</td>
                                        <td className="p-4 text-right flex justify-end space-x-2">
                                            <button onClick={() => handleEdit(ret)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title={t('edit')}>
                                                <Edit2 size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(ret.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title={t('delete')}>
                                                <Trash2 size={16}/>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination 
                    currentPage={currentPage} 
                    totalItems={returnsList.length} 
                    pageSize={pageSize} 
                    onPageChange={setCurrentPage} 
                />
            </div>
        )}

        {/* CREATE / EDIT VIEW */}
        {view === 'create' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
                {/* Left: Invoice List (Only relevant when Creating New, hidden if Editing specific return) */}
                {!editingReturnId && (
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[600px]">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                            <label className="text-xs font-bold text-gray-500 uppercase block">{t('selectInvoiceToReturn')}</label>
                            <button onClick={() => setView('list')} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18}/></button>
                        </div>
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18}/>
                                <input 
                                    type="text" 
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="Search Original Invoice..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {eligibleInvoices.length === 0 ? (
                                <div className="text-center p-8 text-gray-400 text-sm">
                                    {t('noRecords')}
                                </div>
                            ) : (
                                eligibleInvoices.map(inv => (
                                    <div 
                                        key={inv.id}
                                        onClick={() => handleSelectInvoice(inv)}
                                        className={`p-3 rounded-lg cursor-pointer border transition-all ${
                                            selectedInvoice?.id === inv.id 
                                            ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-500' 
                                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">#{inv.id.slice(-6)}</span>
                                            <span className="text-xs text-gray-400">{new Date(inv.date).toLocaleDateString()}</span>
                                        </div>
                                        <div className="font-bold text-gray-900 dark:text-white text-sm mb-1">{inv.partnerName}</div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">{inv.paymentMethod}</span>
                                            <span className="font-bold text-primary">{settings.currency}{inv.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Right: Return Form */}
                <div className={`${editingReturnId ? 'lg:col-span-3' : 'lg:col-span-2'} bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[600px]`}>
                    {selectedInvoice ? (
                        <>
                            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start bg-gray-50/50 dark:bg-gray-900/50">
                                <div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center">
                                        <RefreshCcw size={20} className="mr-2 text-primary"/> 
                                        {editingReturnId ? t('editReturn') : t('newReturn')}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">{t('originalInvoice')}: #{selectedInvoice.id} &bull; {selectedInvoice.partnerName}</p>
                                </div>
                                <div className="text-right">
                                    {editingReturnId && <button onClick={() => setView('list')} className="text-sm text-gray-500 hover:text-gray-800 mb-1 block w-full text-right underline">{t('cancel')}</button>}
                                    <p className="text-xs text-gray-500 uppercase font-bold">{t('total')}</p>
                                    <p className="text-xl font-bold text-gray-900 dark:text-white">{settings.currency}{selectedInvoice.total.toFixed(2)}</p>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 font-semibold sticky top-0">
                                        <tr>
                                            <th className="p-4">{t('products')}</th>
                                            <th className="p-4 text-center">{t('price')}</th>
                                            <th className="p-4 text-center">Qty (Sold)</th>
                                            <th className="p-4 text-center">{t('returnQty')}</th>
                                            <th className="p-4 text-right">{t('refund')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {returnItems.map(item => {
                                            const max = (item as any).maxReturnable;
                                            const isMaxed = max === 0 && item.returnedQuantity === 0;
                                            return (
                                                <tr key={item.productId} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${isMaxed ? 'opacity-50 grayscale' : ''}`}>
                                                    <td className="p-4">
                                                        <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                                                        {isMaxed && <span className="text-[10px] text-red-500 font-bold">Fully Returned</span>}
                                                    </td>
                                                    <td className="p-4 text-center text-gray-500">{settings.currency}{item.price.toFixed(2)}</td>
                                                    <td className="p-4 text-center font-medium">{item.quantity}</td>
                                                    <td className="p-4 text-center">
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={max}
                                                            disabled={isMaxed}
                                                            className="w-20 border border-gray-300 dark:border-gray-600 rounded p-1.5 text-center focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:text-white"
                                                            value={item.returnedQuantity}
                                                            onChange={(e) => updateReturnQty(item.productId, parseInt(e.target.value) || 0)}
                                                        />
                                                        <div className="text-[10px] text-gray-400 mt-1">Max: {max}</div>
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-red-500">
                                                        {item.returnedQuantity > 0 ? `-${settings.currency}${(item.returnedQuantity * item.price).toFixed(2)}` : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                                <div className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200 text-sm">
                                    <AlertTriangle size={16} className="mr-2"/>
                                    {t('maxReturnWarning')}
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="text-right">
                                        <p className="text-sm text-gray-500">{t('total')}:</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {settings.currency}{returnItems.reduce((sum, i) => sum + (i.returnedQuantity * i.price), 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={submitReturn}
                                        disabled={returnItems.every(i => i.returnedQuantity === 0)}
                                        className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-red-500/30 transition-all"
                                    >
                                        <CheckCircle size={20} className="mr-2"/> {editingReturnId ? t('save') : t('confirmReturn')}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                            <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-full mb-4">
                                <RefreshCcw size={48} className="opacity-50"/>
                            </div>
                            <p className="font-medium text-lg">{t('selectInvoiceToReturn')}</p>
                            <p className="text-sm">Select an invoice from the list to start the return process.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};
