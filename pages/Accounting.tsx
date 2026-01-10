
import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Account, SystemLinkType } from '../types';
import { Plus, Edit2, Trash2, Folder, FileText, ChevronRight, ChevronDown, Calendar, Filter, Link as LinkIcon } from 'lucide-react';

export const Accounting = () => {
  const { 
    language, accounts, addAccount, updateAccount, deleteAccount, settings, 
    products, transactions, invoices, banks, categories, customers, expenseCategories, cashRegisters 
  } = useStore();
  const t = (key: string) => getTranslation(language, key);

  const [activeTab, setActiveTab] = useState<'chart' | 'balance'>('chart');
  
  // --- CHART OF ACCOUNTS STATE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Partial<Account>>({});

  // --- BALANCE SHEET STATE ---
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // --- RECURSIVE ACCOUNT TREE RENDERER ---
  const buildTree = (parentId?: string) => {
      return accounts
          .filter(a => a.parentId === parentId)
          .sort((a, b) => a.code.localeCompare(b.code));
  };

  // --- ACTIONS ---
  const handleSaveAccount = () => {
      if (!editingAccount.code || !editingAccount.name) return;
      
      const level = editingAccount.parentId 
          ? (accounts.find(a => a.id === editingAccount.parentId)?.level || 0) + 1 
          : 1;

      if (level > 7) {
          alert(t('maxDepthWarning'));
          return;
      }

      const accountData: Account = {
          id: editingAccount.id || `acc-${Date.now()}`,
          code: editingAccount.code,
          name: editingAccount.name,
          level: level,
          parentId: editingAccount.parentId,
          systemLink: editingAccount.systemLink || 'NONE',
          systemLinkId: editingAccount.systemLinkId, // Specific link
          manualBalance: Number(editingAccount.manualBalance) || 0
      };

      if (editingAccount.id) updateAccount(accountData);
      else addAccount(accountData);

      setIsModalOpen(false);
      setEditingAccount({});
  };

  const handleDeleteAccount = (id: string) => {
      if(confirm(t('deleteConfirm'))) deleteAccount(id);
  };

  const openAdd = (parentId?: string) => {
      let nextCode = '';
      if (parentId) {
          const parent = accounts.find(a => a.id === parentId);
          if (parent) nextCode = `${parent.code}.`;
      }
      setEditingAccount({ parentId, code: nextCode, systemLink: 'NONE' });
      setIsModalOpen(true);
  };

  const openEdit = (acc: Account) => {
      setEditingAccount({ ...acc });
      setIsModalOpen(true);
  };

  // --- BALANCE CALCULATION LOGIC ---
  const calculateAccountBalance = (account: Account, start: string, end: string): number => {
      let balance = 0;

      // 1. System Linked Values
      if (account.systemLink === 'INVENTORY') {
          // Reconstruct Stock Value based on purchase price
          // If systemLinkId exists, filter by Category
          
          let totalInventoryValue = 0;
          products.forEach(p => {
              // Filter by Category Link
              if (account.systemLinkId && p.categoryId !== account.systemLinkId) return;

              const relevantInvoices = invoices.filter(inv => inv.date <= end + 'T23:59:59');
              let pQty = 0;
              
              relevantInvoices.forEach(inv => {
                  const item = inv.items.find(i => i.productId === p.id);
                  if (item) {
                      if (inv.type === 'PURCHASE' || inv.type === 'SALE_RETURN') {
                          pQty += (item.returnedQuantity || item.quantity);
                      } else if (inv.type === 'SALE' || inv.type === 'PURCHASE_RETURN') {
                          pQty -= (item.returnedQuantity || item.quantity);
                      }
                  }
              });
              
              totalInventoryValue += (Math.max(0, pQty) * p.purchasePrice);
          });
          balance = totalInventoryValue;

      } else if (account.systemLink === 'CASH') {
          // General Cash (All Registers aggregated if no ID)
          const cashTrans = transactions.filter(t => t.source === 'CASH_REGISTER' && t.date <= end + 'T23:59:59');
          const income = cashTrans.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = cashTrans.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
          balance = income - expense;

      } else if (account.systemLink === 'CASH_REGISTER') {
          // Specific Cash Register
          if (account.systemLinkId) {
             // Mock calculation
             balance = 0; 
          } else {
             balance = 0;
          }

      } else if (account.systemLink === 'BANK') {
          // Sum Bank Transactions <= End Date
          let bankTrans = transactions.filter(t => t.source === 'BANK' && t.date <= end + 'T23:59:59');
          
          // Filter by Specific Bank if linked
          if (account.systemLinkId) {
              bankTrans = bankTrans.filter(t => t.bankId === account.systemLinkId);
          }

          const income = bankTrans.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
          const expense = bankTrans.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
          
          // Add Initial Balance of the bank(s)
          let initial = 0;
          if (account.systemLinkId) {
              const b = banks.find(bk => bk.id === account.systemLinkId);
              if (b) initial = b.initialBalance;
          } else {
              initial = banks.reduce((sum, b) => sum + b.initialBalance, 0);
          }

          balance = initial + income - expense;

      } else if (account.systemLink === 'EXPENSE') {
          // Income Statement Item (Period based)
          let expenseTrans = transactions.filter(t => t.type === 'EXPENSE' && t.date >= start && t.date <= end + 'T23:59:59');
          
          // Filter by Expense Category
          if (account.systemLinkId) {
              expenseTrans = expenseTrans.filter(t => t.expenseCategoryId === account.systemLinkId);
          }

          balance = expenseTrans.reduce((s, t) => s + t.amount, 0);
          
      } else if (account.systemLink === 'SALES') {
          // Income Statement Item (Period based)
          // Filter transactions linked to sales
          let salesTrans = transactions.filter(t => t.category === 'SALES' && t.type === 'INCOME' && t.date >= start && t.date <= end + 'T23:59:59');
          
          // Filter by Customer (if linked)
          if (account.systemLinkId) {
              salesTrans = salesTrans.filter(t => t.partnerId === account.systemLinkId);
          }

          balance = salesTrans.reduce((s, t) => s + t.amount, 0);
          
      } else if (account.systemLink === 'CUSTOMER_AR') {
          if (account.systemLinkId) {
              const c = customers.find(cust => cust.id === account.systemLinkId);
              balance = c ? c.balance : 0; 
          } else {
              balance = customers.reduce((sum, c) => sum + c.balance, 0);
          }
      } else {
          balance = account.manualBalance || 0;
      }

      // 2. Add Children Balances (Rollup)
      const children = accounts.filter(a => a.parentId === account.id);
      children.forEach(child => {
          balance += calculateAccountBalance(child, start, end);
      });

      return balance;
  };

  // --- RECURSIVE TREE COMPONENT ---
  const AccountTreeItem: React.FC<{ account: Account; depth?: number; isReport?: boolean }> = ({ account, depth = 0, isReport = false }) => {
      const [isExpanded, setIsExpanded] = useState(true);
      const children = buildTree(account.id);
      const hasChildren = children.length > 0;

      const balance = isReport ? calculateAccountBalance(account, startDate, endDate) : 0;
      
      const getLinkName = () => {
          if (!account.systemLinkId) return null;
          if (account.systemLink === 'BANK') return banks.find(b => b.id === account.systemLinkId)?.name;
          if (account.systemLink === 'CASH_REGISTER') return cashRegisters.find(cr => cr.id === account.systemLinkId)?.name;
          if (account.systemLink === 'INVENTORY') return categories.find(c => c.id === account.systemLinkId)?.name;
          if (account.systemLink === 'SALES' || account.systemLink === 'CUSTOMER_AR') return customers.find(c => c.id === account.systemLinkId)?.name;
          if (account.systemLink === 'EXPENSE') return expenseCategories.find(c => c.id === account.systemLinkId)?.name;
          return null;
      };
      const linkName = getLinkName();

      return (
          <div className="select-none">
              <div 
                  className={`flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 ${isReport && depth === 0 ? 'bg-gray-50 dark:bg-gray-800 font-bold' : ''}`}
                  style={{ paddingLeft: `${depth * 20 + 10}px` }}
              >
                  <button 
                      onClick={() => setIsExpanded(!isExpanded)} 
                      className={`mr-2 text-gray-400 ${hasChildren ? 'visible' : 'invisible'}`}
                  >
                      {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                  </button>
                  
                  <div className="flex-1 flex justify-between items-center">
                      <div className="flex items-center">
                          <span className="font-mono text-gray-500 dark:text-gray-400 mr-3 text-sm">{account.code}</span>
                          <span className={`text-sm ${depth === 0 ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                              {account.name}
                          </span>
                          {!isReport && account.systemLink !== 'NONE' && (
                              <div className="flex items-center ml-2 space-x-1">
                                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 rounded">{t('link' + account.systemLink.replace('_', '') )}</span>
                                  {linkName && <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 rounded border border-gray-200 flex items-center"><LinkIcon size={8} className="mr-1"/> {linkName}</span>}
                              </div>
                          )}
                      </div>

                      {isReport ? (
                          <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                              {settings.currency}{balance.toLocaleString('en-US', {minimumFractionDigits: 2})}
                          </span>
                      ) : (
                          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => openAdd(account.id)} className="p-1 text-green-600 hover:bg-green-50 rounded" title={t('addAccount')}>
                                  <Plus size={14}/>
                              </button>
                              <button onClick={() => openEdit(account)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t('editAccount')}>
                                  <Edit2 size={14}/>
                              </button>
                              <button onClick={() => handleDeleteAccount(account.id)} className="p-1 text-red-600 hover:bg-red-50 rounded" title={t('delete')}>
                                  <Trash2 size={14}/>
                              </button>
                          </div>
                      )}
                  </div>
              </div>
              
              {isExpanded && hasChildren && (
                  <div>
                      {children.map(child => (
                          <AccountTreeItem key={child.id} account={child} depth={depth + 1} isReport={isReport} />
                      ))}
                  </div>
              )}
          </div>
      );
  };

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('accounting')}</h2>
        <p className="text-sm text-gray-500">{t('accountingDesc')}</p>

        {/* TABS */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button 
                onClick={() => setActiveTab('chart')}
                className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'chart' ? 'border-primary text-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
                <Folder size={20} className="mr-2"/> {t('chartOfAccounts')}
            </button>
            <button 
                onClick={() => setActiveTab('balance')}
                className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'balance' ? 'border-primary text-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            >
                <FileText size={20} className="mr-2"/> {t('balanceSheet')}
            </button>
        </div>

        {/* CONTENT */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px]">
            {activeTab === 'chart' && (
                <div className="p-4">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-lg dark:text-white">{t('chartOfAccounts')}</h3>
                        <button onClick={() => openAdd()} className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-blue-700">
                            <Plus size={16} className="mr-2"/> {t('addAccount')}
                        </button>
                    </div>
                    <div className="border rounded-lg overflow-hidden group">
                        {buildTree(undefined).length === 0 ? (
                            <p className="p-4 text-center text-gray-400">{t('noAccounts')}</p>
                        ) : (
                            buildTree(undefined).map(acc => (
                                <AccountTreeItem key={acc.id} account={acc} />
                            ))
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'balance' && (
                <div className="p-4">
                    <div className="flex items-center space-x-4 mb-6 bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <Filter size={20} className="text-gray-400"/>
                        <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{t('date')}:</span>
                            <input type="date" className="border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            <span className="text-gray-400">-</span>
                            <input type="date" className="border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        {buildTree(undefined).map(acc => (
                            <AccountTreeItem key={acc.id} account={acc} isReport={true} />
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* ADD/EDIT MODAL */}
        {isModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4 dark:text-white">{editingAccount.id ? t('editAccount') : t('addAccount')}</h3>
                    <div className="space-y-4">
                        {editingAccount.parentId && (
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-sm mb-2">
                                {t('parentAccount')}: <strong>{accounts.find(a => a.id === editingAccount.parentId)?.name}</strong>
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('accountCode')}</label>
                            <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.code || ''} onChange={e => setEditingAccount({...editingAccount, code: e.target.value})} placeholder="e.g. 100.01" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('accountName')}</label>
                            <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.name || ''} onChange={e => setEditingAccount({...editingAccount, name: e.target.value})} />
                        </div>
                        
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">{t('systemLink')}</label>
                            <select 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-3"
                                value={editingAccount.systemLink || 'NONE'}
                                onChange={e => setEditingAccount({...editingAccount, systemLink: e.target.value as SystemLinkType, systemLinkId: undefined})}
                            >
                                <option value="NONE">{t('linkNone')}</option>
                                <option value="CASH">{t('linkCash')}</option>
                                <option value="CASH_REGISTER">{t('linkCashRegister')}</option>
                                <option value="BANK">{t('linkBank')}</option>
                                <option value="INVENTORY">{t('linkInventory')}</option>
                                <option value="SALES">{t('linkSales')}</option>
                                <option value="CUSTOMER_AR">Accounts Receivable</option>
                                <option value="EXPENSE">{t('linkExpense')}</option>
                            </select>

                            {/* CONDITIONAL SUB-SELECTORS */}
                            
                            {editingAccount.systemLink === 'INVENTORY' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Inventory Group</label>
                                    <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.systemLinkId || ''} onChange={e => setEditingAccount({...editingAccount, systemLinkId: e.target.value})}>
                                        <option value="">All Inventory</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {editingAccount.systemLink === 'BANK' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Bank</label>
                                    <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.systemLinkId || ''} onChange={e => setEditingAccount({...editingAccount, systemLinkId: e.target.value})}>
                                        <option value="">All Banks</option>
                                        {banks.map(b => <option key={b.id} value={b.id}>{b.name} ({b.currency})</option>)}
                                    </select>
                                </div>
                            )}

                            {editingAccount.systemLink === 'CASH_REGISTER' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Cash Register</label>
                                    <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.systemLinkId || ''} onChange={e => setEditingAccount({...editingAccount, systemLinkId: e.target.value})}>
                                        <option value="">Select Register</option>
                                        {cashRegisters.map(cr => <option key={cr.id} value={cr.id}>{cr.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {(editingAccount.systemLink === 'SALES' || editingAccount.systemLink === 'CUSTOMER_AR') && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Customer</label>
                                    <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.systemLinkId || ''} onChange={e => setEditingAccount({...editingAccount, systemLinkId: e.target.value})}>
                                        <option value="">All Customers</option>
                                        {customers.filter(c => c.id !== 'gen').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {editingAccount.systemLink === 'EXPENSE' && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Select Expense Group</label>
                                    <select className="w-full border p-2 rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.systemLinkId || ''} onChange={e => setEditingAccount({...editingAccount, systemLinkId: e.target.value})}>
                                        <option value="">All Expenses</option>
                                        {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {(!editingAccount.systemLink || editingAccount.systemLink === 'NONE') && (
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('manualBalance')}</label>
                                <input type="number" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingAccount.manualBalance || ''} onChange={e => setEditingAccount({...editingAccount, manualBalance: Number(e.target.value)})} />
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300">{t('cancel')}</button>
                        <button onClick={handleSaveAccount} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 shadow">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
