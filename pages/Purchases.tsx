
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Invoice, InvoiceItem, PaymentMethod, Product } from '../types';
import { Search, Plus, ArrowLeftRight, Trash2, Truck, CheckCircle, ChevronDown, Edit2, AlertTriangle, DollarSign } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const Purchases = () => {
  const { invoices, suppliers, products, addInvoice, updateInvoice, addTransaction, updateSupplier, language, settings, banks, currentUser } = useStore();
  const t = (key: string) => getTranslation(language, key);
  
  const [view, setView] = useState<'list' | 'new'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Return State
  const [returnMode, setReturnMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<InvoiceItem[]>([]);

  // New/Edit Purchase State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [newPurchaseCart, setNewPurchaseCart] = useState<InvoiceItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH); // For initial state only
  
  // Searchable Supplier State
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const filteredSuppliers = suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()));

  // Modals for Payment & Update
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  
  // Pay Unpaid Modal (New)
  const [showPayUnpaidModal, setShowPayUnpaidModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paySource, setPaySource] = useState<'CASH_REGISTER' | 'BANK'>('CASH_REGISTER');
  const [payBankId, setPayBankId] = useState('');
  
  // Bank Select for Purchase
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const purchaseInvoices = invoices.filter(i => 
    i.type === 'PURCHASE' && 
    (i.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) || i.id.includes(searchQuery))
  );

  const paginatedInvoices = purchaseInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // --- SEARCH LOGIC ---
  const handleProductSearch = (term: string) => {
    setProductSearch(term);
    const exactMatch = products.find(p => p.barcode === term || p.code === term);
    if (exactMatch) {
        addToPurchaseCart(exactMatch);
        setProductSearch('');
    }
  };

  const searchResults = productSearch.length > 1 ? products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  ).slice(0, 5) : [];

  // --- NEW PURCHASE LOGIC ---
  const addToPurchaseCart = (product: Product) => {
      setNewPurchaseCart(prev => {
          const existing = prev.find(item => item.productId === product.id);
          if (existing) {
              return prev.map(item => item.productId === product.id ? { 
                  ...item, 
                  quantity: item.quantity + 1,
                  total: (item.quantity + 1) * item.price 
              } : item);
          }
          return [...prev, {
              productId: product.id,
              productName: product.name,
              quantity: 1,
              price: product.purchasePrice,
              total: product.purchasePrice,
              returnedQuantity: 0
          }];
      });
  };

  const updatePurchaseItem = (id: string, field: 'quantity' | 'price', value: number) => {
      setNewPurchaseCart(prev => prev.map(item => {
          if(item.productId === id) {
              const updated = { ...item, [field]: value };
              updated.total = updated.quantity * updated.price;
              return updated;
          }
          return item;
      }));
  };

  const handleEditPurchase = (inv: Invoice) => {
      setEditingInvoiceId(inv.id);
      setSelectedSupplierId(inv.partnerId);
      // We clone items to avoid mutating state directly
      setNewPurchaseCart(inv.items.map(i => ({...i})));
      setView('new');
  };

  const handleSaveClick = () => {
      if(!selectedSupplierId || newPurchaseCart.length === 0) return;
      
      if (editingInvoiceId) {
          setShowUpdateModal(true);
      } else {
          setShowPaymentModal(true);
      }
  };

  const finalizePurchase = (method: PaymentMethod, bankId?: string) => {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      const total = newPurchaseCart.reduce((sum, i) => sum + i.total, 0);
      
      const invoice: Invoice = {
          id: editingInvoiceId || `PUR-${Date.now()}`,
          type: 'PURCHASE',
          partnerId: selectedSupplierId,
          partnerName: supplier?.name || 'Unknown',
          date: editingInvoiceId ? (invoices.find(i => i.id === editingInvoiceId)?.date || new Date().toISOString()) : new Date().toISOString(),
          items: newPurchaseCart,
          subtotal: total,
          tax: 0, discount: 0, total: total,
          paymentMethod: method,
          bankId: bankId,
          status: method === PaymentMethod.CREDIT ? 'UNPAID' : 'PAID',
          paidAmount: method === PaymentMethod.CREDIT ? 0 : total
      };
      
      let success = false;
      if (editingInvoiceId) {
          success = updateInvoice(invoice);
      } else {
          success = addInvoice(invoice);
      }

      if (success) {
          alert(t('purchaseInvoiceSaved'));
          resetForm();
      }
  };

  const resetForm = () => {
      setView('list');
      setNewPurchaseCart([]);
      setSelectedSupplierId('');
      setSupplierSearch('');
      setEditingInvoiceId(null);
      setShowBankSelect(false);
      setShowPaymentModal(false);
      setShowUpdateModal(false);
  };

  // --- RETURN LOGIC ---
  const handleStartReturn = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setReturnItems(invoice.items.map(item => ({...item, returnedQuantity: 0}))); 
    setReturnMode(true);
  };

  const submitReturn = () => {
    if (!selectedInvoice) return;
    const itemsToReturn = returnItems.filter(i => i.returnedQuantity > 0).map(i => ({
        ...i,
        quantity: i.returnedQuantity,
        total: i.price * i.returnedQuantity
    }));
    if (itemsToReturn.length === 0) return;
    const returnInvoice: Invoice = {
        id: `RET-P-${Date.now()}`,
        type: 'PURCHASE_RETURN',
        partnerId: selectedInvoice.partnerId,
        partnerName: selectedInvoice.partnerName,
        date: new Date().toISOString(),
        items: itemsToReturn,
        subtotal: itemsToReturn.reduce((sum, i) => sum + i.total, 0),
        tax: 0, discount: 0, total: itemsToReturn.reduce((sum, i) => sum + i.total, 0),
        paymentMethod: PaymentMethod.CASH,
        parentInvoiceId: selectedInvoice.id,
        status: 'PAID', // Returns usually imply immediate refund or credit note adjustment
        paidAmount: itemsToReturn.reduce((sum, i) => sum + i.total, 0)
    };
    
    const success = addInvoice(returnInvoice);
    if (success) {
        setReturnMode(false);
        setSelectedInvoice(null);
    }
  };

  // --- PAY UNPAID INVOICE LOGIC ---
  const handlePayClick = (inv: Invoice) => {
      setPayInvoice(inv);
      // Default to remaining balance
      const remaining = inv.total - (inv.paidAmount || 0);
      setPayAmount(remaining);
      setPaySource('CASH_REGISTER');
      setPayBankId(banks[0]?.id || '');
      setShowPayUnpaidModal(true);
  };

  const submitPayment = () => {
      if (!payInvoice) return;
      if (paySource === 'BANK' && !payBankId) {
          alert(t('noBankSelected'));
          return;
      }

      // Create Transaction (Expense). The StoreContext will handle updating:
      // 1. The Supplier's Balance
      // 2. The Invoice's paidAmount
      // 3. The Invoice's status (Partial/Paid)
      addTransaction({
          id: `TRX-PAY-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'EXPENSE',
          category: 'PURCHASE',
          amount: payAmount,
          description: `Payment for Invoice #${payInvoice.id}`,
          source: paySource,
          bankId: paySource === 'BANK' ? payBankId : undefined,
          partnerId: payInvoice.partnerId,
          relatedInvoiceId: payInvoice.id,
          user: currentUser?.username || 'system'
      });

      alert(t('paymentSuccessful') || 'Payment Successful!');
      setShowPayUnpaidModal(false);
      setPayInvoice(null);
  };

  // --- RENDER ---
  if (returnMode && selectedInvoice) {
      // Reuse Return UI 
      return (
        <div className="bg-white p-6 rounded shadow">
             <h3 className="text-xl font-bold mb-4">{t('returns')}: {t('invoice')} #{selectedInvoice.id}</h3>
             <table className="w-full text-left mb-4">
                 <thead className="bg-gray-100">
                     <tr><th>{t('name')}</th><th>{t('salesQty')}</th><th>{t('returnQty')}</th><th>{t('refund')}</th></tr>
                 </thead>
                 <tbody>
                     {returnItems.map(item => (
                         <tr key={item.productId} className="border-t">
                             <td className="p-2">{item.productName}</td>
                             <td className="p-2">{item.quantity}</td>
                             <td className="p-2">
                                 <input type="number" min="0" max={item.quantity} className="border w-20 p-1 rounded"
                                     value={item.returnedQuantity}
                                     onChange={(e) => {
                                         const qty = parseInt(e.target.value) || 0;
                                         setReturnItems(prev => prev.map(pi => pi.productId === item.productId ? {...pi, returnedQuantity: Math.min(qty, item.quantity)} : pi));
                                     }}
                                 />
                             </td>
                             <td className="p-2">{settings.currency}{(item.price * item.returnedQuantity).toFixed(2)}</td>
                         </tr>
                     ))}
                 </tbody>
             </table>
             <div className="flex justify-end space-x-3">
                 <button onClick={() => setReturnMode(false)} className="px-4 py-2 border rounded">{t('cancel')}</button>
                 <button onClick={submitReturn} className="px-4 py-2 bg-red-600 text-white rounded">{t('confirmReturn')}</button>
             </div>
        </div>
      );
  }

  if (view === 'new') {
      return (
          <div className="bg-white p-6 rounded shadow h-full flex flex-col relative">
              <div className="flex justify-between items-center mb-6 border-b pb-4">
                  <h3 className="text-xl font-bold flex items-center"><Truck className="mr-2"/> {editingInvoiceId ? t('edit') : t('newPurchase')}</h3>
                  <button onClick={resetForm} className="text-gray-500 hover:text-gray-800">{t('close')}</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                      <label className="block text-sm font-bold mb-2 text-gray-700">{t('supplier')}</label>
                      <div className="relative">
                          <div 
                              className="border w-full p-2 rounded focus:ring-2 focus:ring-primary flex justify-between items-center cursor-pointer bg-white"
                              onClick={() => setShowSupplierDropdown(!showSupplierDropdown)}
                          >
                              <span>{suppliers.find(s => s.id === selectedSupplierId)?.name || t('selectOption')}</span>
                              <ChevronDown size={16} className="text-gray-400" />
                          </div>
                          {showSupplierDropdown && (
                              <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                                  <div className="p-2 sticky top-0 bg-white border-b">
                                      <input 
                                          className="w-full border p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                          placeholder={t('searchPlaceholder')}
                                          value={supplierSearch}
                                          onChange={e => setSupplierSearch(e.target.value)}
                                          autoFocus
                                      />
                                  </div>
                                  {filteredSuppliers.map(s => (
                                      <div 
                                          key={s.id} 
                                          className={`p-2 hover:bg-gray-100 cursor-pointer text-sm ${selectedSupplierId === s.id ? 'bg-blue-50 font-bold' : ''}`}
                                          onClick={() => {
                                              setSelectedSupplierId(s.id);
                                              setShowSupplierDropdown(false);
                                              setSupplierSearch('');
                                          }}
                                      >
                                          {s.name}
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="relative">
                      <label className="block text-sm font-bold mb-2 text-gray-700">{t('scanProduct')}</label>
                      <div className="relative">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          <input 
                              type="text" 
                              className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary"
                              placeholder={t('scanProduct')}
                              value={productSearch}
                              onChange={e => handleProductSearch(e.target.value)}
                          />
                      </div>
                      {/* Search Dropdown */}
                      {searchResults.length > 0 && (
                         <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                             {searchResults.map(p => (
                                 <div 
                                     key={p.id} 
                                     className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                     onClick={() => { addToPurchaseCart(p); setProductSearch(''); }}
                                 >
                                     <div>
                                         <p className="font-bold text-sm">{p.name}</p>
                                         <p className="text-xs text-gray-500">{p.code}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto border rounded mb-4 bg-gray-50">
                  <table className="w-full text-left">
                      <thead className="bg-gray-100 sticky top-0 text-sm text-gray-600">
                          <tr><th className="p-3">{t('name')}</th><th className="p-3">{t('stock')}</th><th className="p-3">{t('purchasePrice')}</th><th className="p-3">{t('totalAmount')}</th><th className="p-3"></th></tr>
                      </thead>
                      <tbody className="bg-white divide-y">
                          {newPurchaseCart.length === 0 ? (
                               <tr><td colSpan={5} className="p-8 text-center text-gray-400">{t('emptyCart')}</td></tr>
                          ) : (
                              newPurchaseCart.map(item => (
                                  <tr key={item.productId}>
                                      <td className="p-3 font-medium">{item.productName}</td>
                                      <td className="p-3"><input type="number" min="1" value={item.quantity} onChange={e => updatePurchaseItem(item.productId, 'quantity', parseInt(e.target.value))} className="w-20 border p-1 rounded text-center" /></td>
                                      <td className="p-3"><input type="number" min="0" value={item.price} onChange={e => updatePurchaseItem(item.productId, 'price', parseFloat(e.target.value))} className="w-24 border p-1 rounded" /></td>
                                      <td className="p-3 font-bold text-gray-800">{settings.currency}{item.total.toFixed(2)}</td>
                                      <td className="p-3 text-right"><button onClick={() => setNewPurchaseCart(prev => prev.filter(p => p.productId !== item.productId))} className="text-gray-400 hover:text-red-500"><Trash2 size={18}/></button></td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
              
              <div className="flex justify-between items-center border-t pt-4">
                  <div className="w-1/3"></div>
                  <div className="flex items-center">
                      <div className="mr-6 text-right">
                          <p className="text-sm text-gray-500">{t('totalCost')}</p>
                          <p className="text-2xl font-bold">{settings.currency}{newPurchaseCart.reduce((s, i) => s + i.total, 0).toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={handleSaveClick} 
                        disabled={!selectedSupplierId || newPurchaseCart.length === 0} 
                        className="bg-primary text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center shadow"
                      >
                          <CheckCircle className="mr-2" size={20}/> {t('saveInvoice')}
                      </button>
                  </div>
              </div>

              {/* PAYMENT CONFIRMATION MODAL (NEW PURCHASE) */}
              {showPaymentModal && (
                  <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-6 backdrop-blur-sm">
                      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                          <h3 className="text-lg font-bold mb-4 border-b pb-2">{t('paymentTerms')}</h3>
                          <p className="mb-4 text-gray-600 text-sm">How would you like to save this purchase?</p>
                          
                          <div className="space-y-3">
                              <button 
                                onClick={() => finalizePurchase(PaymentMethod.CASH)}
                                className="w-full p-4 border rounded-lg hover:bg-green-50 hover:border-green-500 flex items-center justify-between group transition-all"
                              >
                                  <span className="font-bold text-gray-800 group-hover:text-green-700">{t('cash')} (Pay Now)</span>
                                  <span className="text-xs text-gray-500">Auto-creates Expense</span>
                              </button>
                              
                              <button 
                                onClick={() => { setShowPaymentModal(false); setShowBankSelect(true); }}
                                className="w-full p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-500 flex items-center justify-between group transition-all"
                              >
                                  <span className="font-bold text-gray-800 group-hover:text-blue-700">{t('card')} / Bank (Pay Now)</span>
                                  <span className="text-xs text-gray-500">Auto-creates Expense</span>
                              </button>

                              <button 
                                onClick={() => finalizePurchase(PaymentMethod.CREDIT)}
                                className="w-full p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-500 flex items-center justify-between group transition-all"
                              >
                                  <span className="font-bold text-gray-800 group-hover:text-orange-700">{t('credit')} (Pay Later)</span>
                                  <span className="text-xs text-gray-500">Updates Balance Only</span>
                              </button>
                          </div>
                          
                          <button onClick={() => setShowPaymentModal(false)} className="mt-4 w-full py-2 text-gray-500 hover:text-gray-800 text-sm">{t('cancel')}</button>
                      </div>
                  </div>
              )}

              {/* UPDATE CONFIRMATION MODAL (EDIT PURCHASE) */}
              {showUpdateModal && (
                  <div className="absolute inset-0 bg-black/50 z-30 flex items-center justify-center p-6 backdrop-blur-sm">
                      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm text-center">
                          <AlertTriangle className="mx-auto text-orange-500 mb-4" size={48} />
                          <h3 className="text-lg font-bold mb-2">Update Purchase?</h3>
                          <p className="text-sm text-gray-600 mb-6">Do you want to update the financial records (Expense) and Stock levels associated with this invoice?</p>
                          <div className="flex justify-center space-x-3">
                              <button onClick={() => setShowUpdateModal(false)} className="px-4 py-2 border rounded">{t('cancel')}</button>
                              <button 
                                onClick={() => {
                                    // Use original payment method of the invoice being edited
                                    const originalInv = invoices.find(i => i.id === editingInvoiceId);
                                    finalizePurchase(originalInv?.paymentMethod || PaymentMethod.CASH, originalInv?.bankId);
                                }} 
                                className="px-4 py-2 bg-primary text-white rounded font-bold"
                              >
                                  {t('confirm')}
                              </button>
                          </div>
                      </div>
                  </div>
              )}

              {/* Bank Select Modal */}
              {showBankSelect && (
                  <div className="absolute inset-0 bg-white/90 z-40 flex items-center justify-center p-6">
                      <div className="bg-white border w-full max-w-sm rounded-lg shadow-xl p-6">
                          <h3 className="text-lg font-bold mb-4">{t('selectBank')}</h3>
                          <select className="w-full border p-2 rounded mb-4" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                              {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <div className="flex justify-end space-x-2">
                              <button onClick={() => setShowBankSelect(false)} className="px-4 py-2 border rounded">{t('cancel')}</button>
                              <button onClick={() => finalizePurchase(PaymentMethod.CARD, selectedBankId)} className="px-4 py-2 bg-primary text-white rounded">{t('confirm')}</button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">{t('purchases')}</h2>
        <button onClick={() => { resetForm(); setView('new'); }} className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700 shadow-sm">
            <Plus size={18} className="mr-2"/> {t('newPurchase')}
        </button>
      </div>

      <div className="bg-white p-4 rounded shadow">
         <div className="mb-4 relative">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
             <input 
               type="text" 
               placeholder={t('searchPlaceholder')}
               className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
         </div>

         <table className="w-full text-left">
             <thead className="bg-gray-50">
                 <tr>
                     <th className="p-3">ID</th>
                     <th className="p-3">{t('date')}</th>
                     <th className="p-3">{t('supplier')}</th>
                     <th className="p-3">{t('totalAmount')}</th>
                     <th className="p-3">{t('status')}</th>
                     <th className="p-3 text-right"></th>
                 </tr>
             </thead>
             <tbody>
                 {paginatedInvoices.length === 0 ? (
                     <tr><td colSpan={6} className="p-4 text-center text-gray-400">{t('noRecords')}</td></tr>
                 ) : (
                     paginatedInvoices.map(inv => {
                         const isUnpaid = inv.status !== 'PAID';
                         const paidAmt = inv.paidAmount || 0;
                         const remaining = inv.total - paidAmt;
                         
                         let badgeClass = 'bg-green-50 text-green-600 border-green-200';
                         if (inv.status === 'UNPAID') badgeClass = 'bg-red-50 text-red-600 border-red-200';
                         else if (inv.status === 'PARTIAL') badgeClass = 'bg-orange-50 text-orange-600 border-orange-200';

                         return (
                             <tr key={inv.id} className="border-t hover:bg-gray-50">
                                 <td className="p-3 font-mono text-sm">{inv.id.substring(0,8)}...</td>
                                 <td className="p-3">{new Date(inv.date).toLocaleDateString()}</td>
                                 <td className="p-3">{inv.partnerName}</td>
                                 <td className="p-3 font-bold">{settings.currency}{inv.total.toFixed(2)}</td>
                                 <td className="p-3">
                                     <span className={`px-2 py-1 rounded text-xs font-bold border ${badgeClass}`}>
                                         {inv.status === 'PARTIAL' ? `${t('partial')} (${settings.currency}${paidAmt.toFixed(2)})` : 
                                          inv.status === 'UNPAID' ? t('unpaid') : t('paid')}
                                     </span>
                                 </td>
                                 <td className="p-3 text-right flex justify-end space-x-2">
                                     {isUnpaid && (
                                         <button onClick={() => handlePayClick(inv)} className="p-2 text-green-600 hover:bg-green-50 rounded" title={t('makePayment')}>
                                             <DollarSign size={16}/>
                                         </button>
                                     )}
                                     <button onClick={() => handleEditPurchase(inv)} className="p-2 text-blue-500 hover:bg-blue-50 rounded" title={t('edit')}>
                                         <Edit2 size={16}/>
                                     </button>
                                     <button onClick={() => handleStartReturn(inv)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded text-sm flex items-center">
                                         <ArrowLeftRight size={14} className="mr-1"/> {t('returnItem')}
                                     </button>
                                 </td>
                             </tr>
                         );
                     })
                 )}
             </tbody>
         </table>
         <Pagination 
            currentPage={currentPage} 
            totalItems={purchaseInvoices.length} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
         />
      </div>

      {/* PAY UNPAID INVOICE MODAL */}
      {showPayUnpaidModal && payInvoice && (
          <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
                  <h3 className="text-lg font-bold mb-4 border-b pb-2 flex items-center">
                      <DollarSign className="mr-2 text-green-600" /> {t('payInvoice')}
                  </h3>
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded text-sm">
                          <p><strong>{t('supplier')}:</strong> {payInvoice.partnerName}</p>
                          <p><strong>{t('invoice')}:</strong> {payInvoice.id}</p>
                          <div className="flex justify-between mt-2 border-t pt-2">
                              <span>Total:</span>
                              <span className="font-bold">{settings.currency}{payInvoice.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                              <span>Paid:</span>
                              <span>{settings.currency}{(payInvoice.paidAmount || 0).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-red-600 font-bold text-lg border-t mt-1 pt-1">
                              <span>{t('totalDue')}:</span>
                              <span>{settings.currency}{(payInvoice.total - (payInvoice.paidAmount || 0)).toFixed(2)}</span>
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold mb-1">{t('amount')}</label>
                          <input 
                              type="number" 
                              className="w-full border p-2 rounded" 
                              value={payAmount} 
                              max={payInvoice.total - (payInvoice.paidAmount || 0)}
                              onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold mb-1">{t('paymentSource')}</label>
                          <select className="w-full border p-2 rounded" value={paySource} onChange={(e) => setPaySource(e.target.value as any)}>
                              <option value="CASH_REGISTER">{t('cashRegister')}</option>
                              <option value="BANK">{t('banks')}</option>
                          </select>
                      </div>

                      {paySource === 'BANK' && (
                          <div>
                              <label className="block text-sm font-bold mb-1">{t('selectBank')}</label>
                              <select className="w-full border p-2 rounded" value={payBankId} onChange={(e) => setPayBankId(e.target.value)}>
                                  <option value="">{t('selectOption')}</option>
                                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                          </div>
                      )}
                  </div>
                  
                  <div className="mt-6 flex justify-end space-x-2">
                      <button onClick={() => setShowPayUnpaidModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">{t('cancel')}</button>
                      <button onClick={submitPayment} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold">{t('confirm')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
