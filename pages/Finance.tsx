
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Transaction, UserRole, BankAccount } from '../types';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Edit2, Calendar, FileText, Landmark, CreditCard, User, Building, Wallet, ChevronDown } from 'lucide-react';

export const Finance = () => {
  const { transactions, expenseCategories, addTransaction, updateTransaction, deleteTransaction, currentUser, language, settings, banks, addBank, updateBank, deleteBank, customers, suppliers, invoices } = useStore();
  const t = (key: string) => getTranslation(language, key);

  const [activeTab, setActiveTab] = useState<'cash' | 'banks'>('cash');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10)); 
  
  // Transaction Modal State
  const [isTransModalOpen, setIsTransModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'expense' | 'payment' | 'generic'>('generic'); // New: mode for modal
  
  // Form Fields
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [transSource, setTransSource] = useState<'CASH_REGISTER' | 'BANK'>('CASH_REGISTER');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');

  // Searchable Partner State
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  
  // Combine Customers and Suppliers for search
  const allPartners = useMemo(() => {
      const c = customers.filter(c => c.id !== 'gen').map(c => ({ id: c.id, name: c.name, type: 'Customer' }));
      const s = suppliers.map(s => ({ id: s.id, name: s.name, type: 'Supplier' }));
      return [...c, ...s];
  }, [customers, suppliers]);

  const filteredPartners = allPartners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()));

  // Bank Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Partial<BankAccount>>({});

  // Filter transactions by date and source
  const filteredTransactions = useMemo(() => {
      return transactions.filter(tr => 
          (activeTab === 'cash' ? tr.source === 'CASH_REGISTER' : tr.source === 'BANK') && 
          tr.date.startsWith(dateFilter)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dateFilter, activeTab]);

  // Calculations for End of Day Report
  const totalIn = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalOut = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIn - totalOut;

  // --- Bank Helpers ---
  const getBankBalance = (bankId: string) => {
      const bank = banks.find(b => b.id === bankId);
      if(!bank) return 0;
      const txs = transactions.filter(t => t.bankId === bankId);
      const inc = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return bank.initialBalance + inc - exp;
  };

  // --- Transaction Actions ---
  const resetForm = () => {
      setEditingId(null);
      setTransType('EXPENSE');
      setTransSource(activeTab === 'cash' ? 'CASH_REGISTER' : 'BANK');
      setSelectedBankId(banks[0]?.id || '');
      setAmount('');
      setDescription('');
      setCategoryId('');
      setSelectedPartnerId('');
      setPartnerSearch('');
      setLinkedInvoiceId('');
  }

  const openAddExpense = () => {
      resetForm();
      setModalMode('expense');
      setTransType('EXPENSE');
      setIsTransModalOpen(true);
  };

  const openMakePayment = () => {
      resetForm();
      setModalMode('payment');
      setTransType('EXPENSE'); // Default to outgoing payment
      setIsTransModalOpen(true);
  };

  const openGeneric = () => {
      resetForm();
      setModalMode('generic');
      setIsTransModalOpen(true);
  }

  // --- Logic to auto-switch Transaction Type based on Partner ---
  const handlePartnerSelect = (pId: string) => {
      setSelectedPartnerId(pId);
      const partner = allPartners.find(p => p.id === pId);
      if (partner) {
          if (partner.type === 'Customer') {
              setTransType('INCOME'); // Customer pays us
          } else {
              setTransType('EXPENSE'); // We pay supplier
          }
      }
      setShowPartnerDropdown(false);
      setPartnerSearch('');
      setLinkedInvoiceId(''); // Reset linked invoice when partner changes
  };

  const handleInvoiceSelect = (invId: string) => {
      setLinkedInvoiceId(invId);
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
          // Auto-fill amount with remaining balance
          const remaining = inv.total - (inv.paidAmount || 0);
          setAmount(remaining.toFixed(2));
          // Auto-fill description
          if (!description) {
              setDescription(`Payment for Invoice #${inv.id}`);
          }
      }
  };

  const handleSaveTransaction = () => {
      // Auto-fill description if missing but an invoice is linked
      let finalDescription = description;
      if (!finalDescription && linkedInvoiceId) {
          finalDescription = `Payment for Invoice #${linkedInvoiceId}`;
      }

      if (!amount || !finalDescription) {
          alert('Please enter amount and description.');
          return;
      }
      if (transSource === 'BANK' && !selectedBankId) {
          alert(t('noBankSelected'));
          return;
      }

      // Determine Category Name
      let catName = 'General';
      if (categoryId) {
          catName = expenseCategories.find(c => c.id === categoryId)?.name || 'General';
      } else if (selectedPartnerId) {
          const pName = allPartners.find(p => p.id === selectedPartnerId)?.name;
          catName = `${t('paymentTo')} ${pName}`;
      } else if (linkedInvoiceId) {
          const inv = invoices.find(i => i.id === linkedInvoiceId);
          catName = inv ? (inv.type === 'SALE' ? 'SALES' : 'PURCHASE') : 'General';
      }

      const transactionData: Transaction = {
          id: editingId || `TRX-${Date.now()}`,
          date: new Date().toISOString(),
          type: transType,
          category: catName,
          expenseCategoryId: categoryId,
          amount: parseFloat(amount),
          description: finalDescription,
          source: transSource,
          bankId: transSource === 'BANK' ? selectedBankId : undefined,
          partnerId: selectedPartnerId,
          relatedInvoiceId: linkedInvoiceId,
          user: currentUser?.username || 'unknown'
      };

      if (editingId) updateTransaction(transactionData);
      else addTransaction(transactionData);

      setIsTransModalOpen(false);
  };

  const handleDeleteTransaction = (id: string) => {
      if (currentUser?.role !== UserRole.ADMIN) return;
      if (confirm(t('deleteConfirm'))) deleteTransaction(id);
  };

  // --- Bank Actions ---
  const handleSaveBank = () => {
      if (!editingBank.name || !editingBank.accountNumber) return;
      const bankData: BankAccount = {
          id: editingBank.id || `BNK-${Date.now()}`,
          name: editingBank.name!,
          accountNumber: editingBank.accountNumber!,
          iban: editingBank.iban || '',
          currency: editingBank.currency || settings.currency,
          initialBalance: Number(editingBank.initialBalance) || 0
      };
      if (editingBank.id) updateBank(bankData);
      else addBank(bankData);
      setIsBankModalOpen(false);
  };

  const openEditBank = (b: BankAccount) => {
      setEditingBank({...b});
      setIsBankModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Finance Header Navigation */}
      <div className="flex flex-col space-y-4">
          <h2 className="text-2xl font-bold text-gray-800">{t('finance')}</h2>
          <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => setActiveTab('cash')}
                    className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'cash' ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Wallet size={20} className="mr-2"/> {t('cashier')}
                </button>
                <button 
                    onClick={() => setActiveTab('banks')}
                    className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'banks' ? 'border-primary text-primary bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <Landmark size={20} className="mr-2"/> {t('banks')}
                </button>
          </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
           <div className="flex items-center space-x-3">
                 <div className="relative">
                     <Calendar className="absolute left-3 top-2.5 text-gray-400" size={18} />
                     <input 
                        type="date" 
                        className="pl-10 pr-4 py-2 border rounded shadow-sm focus:ring-2 focus:ring-primary w-full md:w-auto"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                     />
                 </div>
           </div>
           <div className="flex space-x-2">
                 <button onClick={openAddExpense} className="bg-red-500 text-white px-4 py-2 rounded flex items-center hover:bg-red-600 shadow-sm transition-colors text-sm font-bold">
                     <TrendingDown size={18} className="mr-2"/> {t('addExpense')}
                 </button>
                 <button onClick={openMakePayment} className="bg-blue-500 text-white px-4 py-2 rounded flex items-center hover:bg-blue-600 shadow-sm transition-colors text-sm font-bold">
                     <User size={18} className="mr-2"/> {t('makePayment')}
                 </button>
                 <button onClick={openGeneric} className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded flex items-center hover:bg-gray-200 shadow-sm transition-colors text-sm font-bold">
                     <Plus size={18} className="mr-2"/> {t('newTransaction')}
                 </button>
           </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-500 flex items-center justify-between">
              <div>
                  <p className="text-gray-500 text-sm font-medium">{t('cashIn')}</p>
                  <h3 className="text-2xl font-bold text-green-600">{settings.currency}{totalIn.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                  <TrendingUp className="text-green-600" size={24}/>
              </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-red-500 flex items-center justify-between">
              <div>
                  <p className="text-gray-500 text-sm font-medium">{t('cashOut')}</p>
                  <h3 className="text-2xl font-bold text-red-600">{settings.currency}{totalOut.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                  <TrendingDown className="text-red-600" size={24}/>
              </div>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                  <p className="text-gray-500 text-sm font-medium">{t('netBalance')}</p>
                  <h3 className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{settings.currency}{netBalance.toFixed(2)}</h3>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                  <DollarSign className="text-blue-600" size={24}/>
              </div>
          </div>
      </div>

      {/* BANKS LIST (Only in Bank Tab) */}
      {activeTab === 'banks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-up">
              {banks.map(bank => (
                  <div key={bank.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow relative group">
                      <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                              <div className="p-3 bg-blue-50 rounded-full mr-3 text-primary"><Landmark size={24}/></div>
                              <div>
                                  <h3 className="font-bold text-lg text-gray-800">{bank.name}</h3>
                                  <p className="text-xs text-gray-500">{bank.accountNumber}</p>
                              </div>
                          </div>
                          <button onClick={() => openEditBank(bank)} className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 size={16}/></button>
                      </div>
                      <div className="border-t pt-4 flex justify-between items-end">
                          <span className="text-sm text-gray-500">{t('balance')}</span>
                          <span className="text-2xl font-bold text-gray-900">{bank.currency}{getBankBalance(bank.id).toFixed(2)}</span>
                      </div>
                  </div>
              ))}
              <button 
                onClick={() => { setEditingBank({}); setIsBankModalOpen(true); }}
                className="border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:text-primary hover:border-primary hover:bg-blue-50 transition-all cursor-pointer h-full min-h-[160px]"
              >
                  <Plus size={32} className="mb-2"/>
                  <span className="font-bold">{t('addBank')}</span>
              </button>
          </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded shadow overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <h3 className="font-bold text-lg flex items-center text-gray-800">
                  <FileText className="mr-2 text-gray-500" size={20}/> 
                  {activeTab === 'cash' ? t('todayReport') : t('bankTransaction')} <span className="ml-2 font-normal text-sm text-gray-500">({dateFilter})</span>
              </h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead className="bg-white text-gray-600 text-xs uppercase border-b">
                      <tr>
                          <th className="p-4">{t('transactionDate')}</th>
                          <th className="p-4">{t('transactionType')}</th>
                          {activeTab === 'banks' && <th className="p-4">{t('bankName')}</th>}
                          <th className="p-4">{t('category')}</th>
                          <th className="p-4">{t('description')}</th>
                          <th className="p-4 text-right">{t('amount')}</th>
                          <th className="p-4 text-right">{t('actions')}</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredTransactions.length === 0 ? (
                          <tr><td colSpan={8} className="p-8 text-center text-gray-400 italic">{t('noRecords')}</td></tr>
                      ) : (
                          filteredTransactions.map(transaction => (
                              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="p-4 text-sm text-gray-700">{new Date(transaction.date).toLocaleTimeString()}</td>
                                  <td className="p-4">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${transaction.type === 'INCOME' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                          {t(transaction.type.toLowerCase())}
                                      </span>
                                  </td>
                                  {activeTab === 'banks' && <td className="p-4 text-sm font-medium text-gray-700">{banks.find(b => b.id === transaction.bankId)?.name || '-'}</td>}
                                  <td className="p-4 text-sm font-medium text-gray-700">{t(transaction.category)}</td>
                                  <td className="p-4 text-sm text-gray-500">
                                      {transaction.description} 
                                      {transaction.relatedInvoiceId && <span className="text-xs text-blue-500 ml-1">(Inv: {transaction.relatedInvoiceId})</span>}
                                  </td>
                                  <td className={`p-4 text-right font-bold ${transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                      {settings.currency}{transaction.amount.toFixed(2)}
                                  </td>
                                  <td className="p-4 text-right flex justify-end space-x-2">
                                      {currentUser?.role === UserRole.ADMIN && (
                                          <button onClick={() => handleDeleteTransaction(transaction.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={t('delete')}>
                                              <Trash2 size={16}/>
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {/* NEW TRANSACTION MODAL */}
      {isTransModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
                    {modalMode === 'expense' ? t('addExpense') : modalMode === 'payment' ? t('makePayment') : t('newTransaction')}
                </h3>
                
                <div className="space-y-4">
                    {/* 1. Type & Source */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('transactionType')}</label>
                            <select 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" 
                                value={transType} 
                                onChange={e => setTransType(e.target.value as any)}
                                disabled={modalMode === 'expense'} // Lock to expense if in expense mode
                            >
                                <option value="EXPENSE">{t('expense')}</option>
                                <option value="INCOME">{t('income')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('paymentSource')}</label>
                            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" value={transSource} onChange={e => setTransSource(e.target.value as any)}>
                                <option value="CASH_REGISTER">{t('cashRegister')}</option>
                                <option value="BANK">{t('banks')}</option>
                            </select>
                        </div>
                    </div>

                    {/* 2. Bank Selection */}
                    {transSource === 'BANK' && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('selectBank')}</label>
                            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                                <option value="">{t('selectOption')}</option>
                                {banks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>)}
                            </select>
                        </div>
                    )}

                    {/* 3. Partner (For Payments) */}
                    {(modalMode === 'payment' || modalMode === 'generic') && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('partner')}</label>
                            <div className="relative">
                                <div 
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none flex justify-between items-center cursor-pointer bg-white"
                                    onClick={() => setShowPartnerDropdown(!showPartnerDropdown)}
                                >
                                    <span>{allPartners.find(p => p.id === selectedPartnerId)?.name || t('noPartner')}</span>
                                    <ChevronDown size={16} className="text-gray-400" />
                                </div>
                                {showPartnerDropdown && (
                                    <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                                        <div className="p-2 sticky top-0 bg-white border-b">
                                            <input 
                                                className="w-full border p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                                placeholder={t('searchPlaceholder')}
                                                value={partnerSearch}
                                                onChange={e => setPartnerSearch(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div 
                                            className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-500 italic"
                                            onClick={() => {
                                                setSelectedPartnerId('');
                                                setShowPartnerDropdown(false);
                                            }}
                                        >
                                            {t('none')}
                                        </div>
                                        {filteredPartners.map(p => (
                                            <div 
                                                key={p.id} 
                                                className={`p-2 hover:bg-gray-100 cursor-pointer text-sm ${selectedPartnerId === p.id ? 'bg-blue-50 font-bold' : ''}`}
                                                onClick={() => handlePartnerSelect(p.id)}
                                            >
                                                {p.name} <span className="text-xs text-gray-400 ml-1">({p.type})</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 4. Link Invoice (If Partner selected) */}
                    {selectedPartnerId && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('linkInvoice')}</label>
                            <select 
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" 
                                value={linkedInvoiceId} 
                                onChange={e => handleInvoiceSelect(e.target.value)}
                            >
                                <option value="">{t('linkNone')}</option>
                                {invoices
                                    .filter(i => i.partnerId === selectedPartnerId && i.status !== 'PAID')
                                    .map(inv => (
                                    <option key={inv.id} value={inv.id}>
                                        #{inv.id.slice(-6)} - {settings.currency}{inv.total} (Due: {(inv.total - (inv.paidAmount || 0)).toFixed(2)})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 5. Expense Category (If Expense and No Partner) */}
                    {transType === 'EXPENSE' && !selectedPartnerId && (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('expenseGroup')}</label>
                            <select className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
                                <option value="">{t('selectGroup')}</option>
                                {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    {/* 6. Amount & Desc */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('amount')}</label>
                        <input type="number" className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none text-lg font-bold" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"/>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('description')}</label>
                        <textarea className="w-full border p-2 rounded focus:ring-2 focus:ring-primary outline-none" rows={2} value={description} onChange={e => setDescription(e.target.value)}></textarea>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3 pt-4 border-t">
                    <button onClick={() => setIsTransModalOpen(false)} className="px-5 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 font-medium">{t('cancel')}</button>
                    <button onClick={handleSaveTransaction} className="px-5 py-2 bg-primary text-white rounded hover:bg-indigo-700 font-medium shadow-md">{t('save')}</button>
                </div>
            </div>
        </div>
      )}

      {/* BANK MODAL */}
      {isBankModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                  <h3 className="text-xl font-bold mb-4">{editingBank.id ? t('edit') : t('addBank')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1">{t('bankName')}</label>
                          <input className="w-full border p-2 rounded" value={editingBank.name || ''} onChange={e => setEditingBank({...editingBank, name: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">{t('accountNumber')}</label>
                          <input className="w-full border p-2 rounded" value={editingBank.accountNumber || ''} onChange={e => setEditingBank({...editingBank, accountNumber: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">{t('iban')}</label>
                          <input className="w-full border p-2 rounded" value={editingBank.iban || ''} onChange={e => setEditingBank({...editingBank, iban: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1">{t('initialBalance')}</label>
                          <input type="number" className="w-full border p-2 rounded" value={editingBank.initialBalance || ''} onChange={e => setEditingBank({...editingBank, initialBalance: Number(e.target.value)})} />
                      </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-2 pt-4 border-t">
                      <button onClick={() => setIsBankModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">{t('cancel')}</button>
                      <button onClick={handleSaveBank} className="px-4 py-2 bg-primary text-white rounded hover:bg-indigo-700 shadow">{t('save')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
