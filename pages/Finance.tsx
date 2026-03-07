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
  const [modalMode, setModalMode] = useState<'expense' | 'payment' | 'generic'>('generic');

  // Form Fields
  const [transType, setTransType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [transSource, setTransSource] = useState<'CASH_REGISTER' | 'BANK'>('CASH_REGISTER');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [linkedInvoiceId, setLinkedInvoiceId] = useState('');

  // Partner Search
  const [partnerSearch, setPartnerSearch] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

  // Combine Customers and Suppliers
  const allPartners = useMemo(() => {
      const c = customers.filter(c => c.id !== 'gen').map(c => ({ id: c.id, name: c.name, type: 'Customer' }));
      const s = suppliers.map(s => ({ id: s.id, name: s.name, type: 'Supplier' }));
      return [...c, ...s];
  }, [customers, suppliers]);

  const filteredPartners = allPartners.filter(p => p.name.toLowerCase().includes(partnerSearch.toLowerCase()));

  // Bank Modal State
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Partial<BankAccount>>({});

  // Filter transactions
  const filteredTransactions = useMemo(() => {
      return transactions.filter(tr => 
          (activeTab === 'cash' ? tr.source === 'CASH_REGISTER' : tr.source === 'BANK') && 
          tr.date.startsWith(dateFilter)
      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, dateFilter, activeTab]);

  // Summary calculations
  const totalIn = filteredTransactions.filter(t => t.type === 'INCOME').reduce((sum, t) => sum + t.amount, 0);
  const totalOut = filteredTransactions.filter(t => t.type === 'EXPENSE').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIn - totalOut;

  // Bank helpers
  const getBankBalance = (bankId: string) => {
      const bank = banks.find(b => b.id === bankId);
      if(!bank) return 0;
      const txs = transactions.filter(t => t.bankId === bankId);
      const inc = txs.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
      const exp = txs.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
      return bank.initialBalance + inc - exp;
  };

  // Reset form
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

  // Open modals
  const openAddExpense = () => {
      resetForm();
      setModalMode('expense');
      setTransType('EXPENSE');
      setIsTransModalOpen(true);
  };

  const openMakePayment = () => {
      resetForm();
      setModalMode('payment');
      setTransType('EXPENSE');
      if (banks.length) setSelectedBankId(banks[0].id);
      setIsTransModalOpen(true);
  };

  const openGeneric = () => {
      resetForm();
      setModalMode('generic');
      setIsTransModalOpen(true);
  }

  // --- Partner Selection (Fix for Make a Payment) ---
  const handlePartnerSelect = (pId: string) => {
      const partner = allPartners.find(p => p.id === pId);
      if (!partner) return;

      setSelectedPartnerId(pId);
      setShowPartnerDropdown(false);
      setPartnerSearch('');
      setLinkedInvoiceId('');

      // Auto-set type & description
      const type = partner.type === 'Customer' ? 'INCOME' : 'EXPENSE';
      setTransType(type);
      setDescription(`Payment to ${partner.name}`);
  };

  // Invoice selection
  const handleInvoiceSelect = (invId: string) => {
      setLinkedInvoiceId(invId);
      const inv = invoices.find(i => i.id === invId);
      if (inv) {
          const remaining = inv.total - (inv.paidAmount || 0);
          setAmount(remaining.toFixed(2));
          if (!description) setDescription(`Payment for Invoice #${inv.id}`);
      }
  };

  // Save Transaction
  const handleSaveTransaction = () => {
      if (!amount) {
          alert('Please enter amount.');
          return;
      }

      if (!description) {
          setDescription(selectedPartnerId 
              ? `Payment to ${allPartners.find(p => p.id === selectedPartnerId)?.name}` 
              : 'General transaction');
      }

      if (transSource === 'BANK' && !selectedBankId) {
          alert(t('noBankSelected'));
          return;
      }

      const transactionData: Transaction = {
          id: editingId || `TRX-${Date.now()}`,
          date: new Date().toISOString(),
          type: transType || 'EXPENSE',
          category: selectedPartnerId 
              ? `Payment to ${allPartners.find(p => p.id === selectedPartnerId)?.name}` 
              : 'General',
          expenseCategoryId: categoryId,
          amount: parseFloat(amount),
          description,
          source: transSource,
          bankId: transSource === 'BANK' ? selectedBankId : undefined,
          partnerId: selectedPartnerId,
          relatedInvoiceId: linkedInvoiceId,
          user: currentUser?.username || 'unknown'
      };

      if (editingId) updateTransaction(transactionData);
      else addTransaction(transactionData);

      setIsTransModalOpen(false);
      resetForm();
  };

  // Delete Transaction
  const handleDeleteTransaction = (id: string) => {
      if (currentUser?.role !== UserRole.ADMIN) return;
      if (confirm(t('deleteConfirm'))) deleteTransaction(id);
  };

  // Bank actions
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

  // --- JSX Component (Kısaltılmış, senin orijinal JSX’i buraya ekleyebilirsin) ---
  return (
      <div className="space-y-6">
          {/* Finance Header, Action Bar, Summary Cards, Bank List, Transactions Table */}
          {/* Burada senin mevcut JSX’in olacak */}
          {/* Transaction Modal & Bank Modal */}
      </div>
  );
};
