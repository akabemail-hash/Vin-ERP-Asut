
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Invoice, InvoiceItem, PaymentMethod, Product } from '../types';
import { Search, ArrowLeftRight, Plus, Trash2, CheckCircle, User, CreditCard, Banknote, Eye, X, FileText, ChevronDown, DollarSign, Wallet, Landmark } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const Sales = () => {
  const { invoices, addInvoice, language, settings, customers, products, banks, addTransaction, currentUser } = useStore();
  const t = (key: string) => getTranslation(language, key);
  
  const [view, setView] = useState<'list' | 'new'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Return State
  const [returnMode, setReturnMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<InvoiceItem[]>([]);

  // Details Modal State
  const [showDetails, setShowDetails] = useState(false);
  const [detailsInvoice, setDetailsInvoice] = useState<Invoice | null>(null);

  // New Sale State
  const [saleCart, setSaleCart] = useState<InvoiceItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [productSearch, setProductSearch] = useState('');
  const [discountRate, setDiscountRate] = useState<number>(0);

  // Searchable Customer State
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()));

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Pay Modal State (For partial/full payments)
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paySource, setPaySource] = useState<'CASH_REGISTER' | 'BANK'>('CASH_REGISTER');
  const [payBankId, setPayBankId] = useState('');

  // Filter Sales Invoices
  const salesInvoices = invoices.filter(i => 
    i.type === 'SALE' && 
    (i.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) || i.id.includes(searchQuery))
  );

  const paginatedInvoices = salesInvoices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // --- NEW SALE LOGIC ---
  const handleProductSearch = (term: string) => {
      setProductSearch(term);
      const exactMatch = products.find(p => p.barcode === term || p.code === term);
      if (exactMatch) {
          addToSaleCart(exactMatch);
          setProductSearch('');
      }
  };

  const addToSaleCart = (product: Product) => {
      setSaleCart(prev => {
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
              price: product.salesPrice,
              total: product.salesPrice,
              returnedQuantity: 0
          }];
      });
  };

  const updateSaleItem = (id: string, field: 'quantity' | 'price', value: number) => {
      setSaleCart(prev => prev.map(item => {
          if(item.productId === id) {
              const updated = { ...item, [field]: value };
              updated.total = updated.quantity * updated.price;
              return updated;
          }
          return item;
      }));
  };

  const submitSale = () => {
      if(!selectedCustomerId || saleCart.length === 0) return;
      const customer = customers.find(c => c.id === selectedCustomerId);
      const subtotal = saleCart.reduce((sum, i) => sum + i.total, 0);
      const discountAmount = subtotal * (discountRate / 100);
      const total = subtotal - discountAmount;

      const invoice: Invoice = {
          id: `INV-${Date.now()}`,
          type: 'SALE',
          partnerId: selectedCustomerId,
          partnerName: customer?.name || 'Unknown',
          date: new Date().toISOString(),
          items: saleCart,
          subtotal: subtotal,
          tax: 0, 
          discount: discountAmount, 
          total: total,
          paymentMethod: paymentMethod,
          locationId: 'loc1', // Default warehouse
          status: paymentMethod === PaymentMethod.CREDIT ? 'UNPAID' : 'PAID',
          paidAmount: paymentMethod === PaymentMethod.CREDIT ? 0 : total
      };
      
      const success = addInvoice(invoice);
      if (success) {
          alert(t('saleSuccessful'));
          setView('list');
          setSaleCart([]);
          setSelectedCustomerId('');
          setProductSearch('');
          setDiscountRate(0);
      }
  };

  // Filtered Products for Dropdown
  const searchResults = productSearch.length > 1 ? products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.barcode.includes(productSearch)
  ).slice(0, 5) : [];

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

    const totalRefund = itemsToReturn.reduce((sum, i) => sum + i.total, 0);
    const returnInvoice: Invoice = {
        id: `RET-S-${Date.now()}`,
        type: 'SALE_RETURN',
        partnerId: selectedInvoice.partnerId,
        partnerName: selectedInvoice.partnerName,
        date: new Date().toISOString(),
        items: itemsToReturn,
        subtotal: totalRefund,
        tax: 0,
        discount: 0,
        total: totalRefund,
        paymentMethod: PaymentMethod.CASH,
        parentInvoiceId: selectedInvoice.id
    };

    const success = addInvoice(returnInvoice);
    if (success) {
        setReturnMode(false);
        setSelectedInvoice(null);
    }
  };

  // --- VIEW DETAILS LOGIC ---
  const openDetails = (invoice: Invoice) => {
      setDetailsInvoice(invoice);
      setShowDetails(true);
  };

  // --- PAYMENT LOGIC ---
  const handlePayClick = (inv: Invoice) => {
      setPayInvoice(inv);
      const remaining = inv.total - (inv.paidAmount || 0);
      setPayAmount(remaining);
      setPaySource('CASH_REGISTER');
      setPayBankId(banks[0]?.id || '');
      setShowPayModal(true);
  };

  const submitPayment = () => {
      if (!payInvoice) return;
      if (paySource === 'BANK' && !payBankId) {
          alert(t('noBankSelected'));
          return;
      }

      addTransaction({
          id: `TRX-PAY-${Date.now()}`,
          date: new Date().toISOString(),
          type: 'INCOME', // Sales payment is INCOME
          category: 'SALES',
          amount: payAmount,
          description: `Payment for Invoice #${payInvoice.id}`,
          source: paySource,
          bankId: paySource === 'BANK' ? payBankId : undefined,
          partnerId: payInvoice.partnerId,
          relatedInvoiceId: payInvoice.id,
          user: currentUser?.username || 'system'
      });

      alert(t('paymentSuccessful') || 'Payment Successful!');
      setShowPayModal(false);
      setPayInvoice(null);
  };

  // --- RENDER VIEWS ---

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
      const currentSubtotal = saleCart.reduce((s, i) => s + i.total, 0);
      const currentDiscount = currentSubtotal * (discountRate / 100);
      const currentTotal = currentSubtotal - currentDiscount;

      return (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-[85vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h3 className="text-xl font-bold flex items-center text-gray-800"><Plus size={24} className="mr-2 text-primary"/> {t('newSale')}</h3>
                <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">{t('customer')}</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 text-gray-400" size={18} />
                        <div className="relative">
                            <div 
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg flex justify-between items-center cursor-pointer bg-white"
                                onClick={() => setShowCustDropdown(!showCustDropdown)}
                            >
                                <span>{customers.find(c => c.id === selectedCustomerId)?.name || t('selectCustomer')}</span>
                                <ChevronDown size={16} className="text-gray-400" />
                            </div>
                            {showCustDropdown && (
                                <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-xl z-20 mt-1 max-h-60 overflow-y-auto">
                                    <div className="p-2 sticky top-0 bg-white border-b">
                                        <input 
                                            className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder={t('searchPlaceholder')}
                                            value={custSearch}
                                            onChange={e => setCustSearch(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    {filteredCustomers.map(c => (
                                        <div 
                                            key={c.id} 
                                            className={`p-3 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-50 last:border-0 ${selectedCustomerId === c.id ? 'bg-blue-50 font-medium text-primary' : 'text-gray-700'}`}
                                            onClick={() => {
                                                setSelectedCustomerId(c.id);
                                                setShowCustDropdown(false);
                                                setCustSearch('');
                                            }}
                                        >
                                            {c.name}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">{t('paymentTerms')}</label>
                    <div className="flex space-x-2">
                        {[PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.CREDIT].map(method => (
                            <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                                    paymentMethod === method 
                                    ? (method === PaymentMethod.CREDIT ? 'bg-orange-50 text-white border-orange-600 shadow-md' : 'bg-primary text-white border-primary shadow-md')
                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                {t(method.toLowerCase())}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative">
                     <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">{t('addProduct')}</label>
                     <div className="relative">
                         <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                         <input 
                             type="text"
                             className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                             placeholder={t('scanProduct')}
                             value={productSearch}
                             onChange={e => handleProductSearch(e.target.value)}
                         />
                     </div>
                     {/* Search Dropdown */}
                     {searchResults.length > 0 && (
                         <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                             {searchResults.map(p => (
                                 <div 
                                     key={p.id} 
                                     className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0"
                                     onClick={() => { addToSaleCart(p); setProductSearch(''); }}
                                 >
                                     <div>
                                         <p className="font-bold text-sm text-gray-800">{p.name}</p>
                                         <p className="text-xs text-gray-500">{p.code}</p>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-sm font-bold text-primary">{settings.currency}{p.salesPrice}</p>
                                         <p className="text-xs text-gray-500">{t('stock')}: {p.stock}</p>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     )}
                </div>
            </div>

            {/* Sale Cart Table */}
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg mb-4 bg-gray-50/30">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 text-xs uppercase sticky top-0 font-semibold">
                        <tr>
                            <th className="p-3">{t('name')}</th>
                            <th className="p-3 text-center">{t('quantity')}</th>
                            <th className="p-3 text-center">{t('price')}</th>
                            <th className="p-3 text-right">{t('totalAmount')}</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {saleCart.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-400 italic">{t('emptyCart')}</td></tr>
                        ) : (
                            saleCart.map(item => (
                                <tr key={item.productId} className="hover:bg-gray-50">
                                    <td className="p-3 font-medium text-gray-800">{item.productName}</td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            className="w-16 border border-gray-300 rounded p-1 text-center text-sm"
                                            value={item.quantity}
                                            onChange={e => updateSaleItem(item.productId, 'quantity', parseInt(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-3 text-center">
                                        <input 
                                            type="number" 
                                            min="0" 
                                            className="w-24 border border-gray-300 rounded p-1 text-center text-sm"
                                            value={item.price}
                                            onChange={e => updateSaleItem(item.productId, 'price', parseFloat(e.target.value))}
                                        />
                                    </td>
                                    <td className="p-3 text-right font-bold text-gray-800">{settings.currency}{item.total.toFixed(2)}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => setSaleCart(prev => prev.filter(p => p.productId !== item.productId))} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-center border-t border-gray-200 pt-4 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl">
                <div className="flex items-center space-x-6">
                    <div className="text-gray-600 font-medium">
                        {t('items')}: <span className="font-bold text-gray-900">{saleCart.length}</span>
                    </div>
                    <div className="flex items-center">
                        <label className="text-sm font-bold mr-2 text-gray-600">{t('discount')} (%):</label>
                        <input 
                            type="number" 
                            min="0" 
                            max="100" 
                            className="border border-gray-300 rounded p-1.5 w-16 text-center text-sm"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(Number(e.target.value))}
                        />
                    </div>
                </div>
                
                <div className="flex items-center space-x-6">
                     <div className="text-right">
                         <p className="text-sm text-gray-500">{t('subtotal')}: {settings.currency}{currentSubtotal.toFixed(2)}</p>
                         <p className="text-sm text-green-600 font-medium">{t('discount')}: -{settings.currency}{currentDiscount.toFixed(2)}</p>
                         <p className="text-2xl font-extrabold text-gray-800">{t('totalAmount')}: {settings.currency}{currentTotal.toFixed(2)}</p>
                     </div>
                     <button 
                         onClick={submitSale} 
                         disabled={!selectedCustomerId || saleCart.length === 0} 
                         className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-0.5"
                     >
                         <CheckCircle className="mr-2" size={20}/> {t('completeSale')}
                     </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('sales')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('salesTrackDesc')}</p>
        </div>
        <button onClick={() => setView('new')} className="bg-primary text-white px-5 py-2.5 rounded-lg flex items-center hover:bg-blue-700 shadow-md shadow-blue-500/30 text-sm font-medium transition-all">
            <Plus size={18} className="mr-2"/> {t('newSale')}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-0 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
         <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50">
             <div className="relative max-w-md">
                 <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                 <input 
                   type="text" 
                   placeholder={t('searchPlaceholder')}
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
             </div>
         </div>

         <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                 <thead>
                     <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('transactionDate')}</th>
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('customer')}</th>
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('totalAmount')}</th>
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                         <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('actions')}</th>
                     </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                     {paginatedInvoices.length === 0 ? (
                         <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('noRecords')}</td></tr>
                     ) : (
                         paginatedInvoices.map(inv => {
                             const isUnpaid = inv.status !== 'PAID';
                             const paidAmt = inv.paidAmount || 0;
                             
                             let badgeClass = 'bg-green-50 text-green-600 border-green-200';
                             if (inv.status === 'UNPAID') badgeClass = 'bg-red-50 text-red-600 border-red-200';
                             else if (inv.status === 'PARTIAL') badgeClass = 'bg-orange-50 text-orange-600 border-orange-200';

                             return (
                                 <tr key={inv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                     <td className="p-4 font-mono text-sm text-gray-600 dark:text-gray-400">{inv.id.substring(0,8)}...</td>
                                     <td className="p-4 text-sm text-gray-700 dark:text-gray-300">{new Date(inv.date).toLocaleDateString()}</td>
                                     <td className="p-4 text-sm font-medium text-gray-900 dark:text-white">{inv.partnerName}</td>
                                     <td className="p-4 text-sm font-bold text-gray-900 dark:text-white">{settings.currency}{inv.total.toFixed(2)}</td>
                                     <td className="p-4">
                                         <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeClass}`}>
                                             {inv.status === 'PARTIAL' ? `${t('partial')} (${settings.currency}${paidAmt.toFixed(2)})` : 
                                              inv.status === 'UNPAID' ? t('unpaid') : t('paid')}
                                         </span>
                                     </td>
                                     <td className="p-4 text-right flex justify-end space-x-2">
                                         {isUnpaid && (
                                             <button onClick={() => handlePayClick(inv)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title={t('pay')}>
                                                 <DollarSign size={18}/>
                                             </button>
                                         )}
                                         <button onClick={() => openDetails(inv)} className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors" title={t('view')}>
                                             <Eye size={18} />
                                         </button>
                                         <button onClick={() => handleStartReturn(inv)} className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors flex items-center">
                                             <ArrowLeftRight size={18}/> 
                                         </button>
                                     </td>
                                 </tr>
                             );
                         })
                     )}
                 </tbody>
             </table>
         </div>
         <Pagination 
            currentPage={currentPage} 
            totalItems={salesInvoices.length} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
         />
      </div>

      {/* INVOICE DETAILS MODAL */}
      {showDetails && detailsInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
                  <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                              <FileText size={20} />
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-gray-900">{t('invoiceDetails')}</h3>
                              <p className="text-xs text-gray-500 font-mono">ID: {detailsInvoice.id}</p>
                          </div>
                      </div>
                      <button onClick={() => setShowDetails(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={24}/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-6 mb-8 text-sm p-4 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('customer')}</p>
                              <p className="font-bold text-gray-900 text-base">{detailsInvoice.partnerName}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('transactionDate')}</p>
                              <p className="font-bold text-gray-900">{new Date(detailsInvoice.date).toLocaleString()}</p>
                          </div>
                          <div>
                              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{t('type')}</p>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">{t(detailsInvoice.paymentMethod.toLowerCase())}</span>
                          </div>
                      </div>

                      <table className="w-full text-left mb-6 border border-gray-200 rounded-lg overflow-hidden">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                              <tr>
                                  <th className="p-3 border-b">{t('name')}</th>
                                  <th className="p-3 border-b text-center">{t('quantity')}</th>
                                  <th className="p-3 border-b text-right">{t('price')}</th>
                                  <th className="p-3 border-b text-right">{t('totalAmount')}</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                              {detailsInvoice.items.map((item, idx) => (
                                  <tr key={idx}>
                                      <td className="p-3 text-sm text-gray-700">{item.productName}</td>
                                      <td className="p-3 text-sm text-center text-gray-600">{item.quantity}</td>
                                      <td className="p-3 text-sm text-right text-gray-600">{settings.currency}{item.price.toFixed(2)}</td>
                                      <td className="p-3 text-sm text-right font-medium text-gray-900">{settings.currency}{item.total.toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>

                      <div className="flex justify-end text-sm">
                          <div className="w-64 space-y-3 bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between text-gray-600">
                                  <span>{t('subtotal')}</span>
                                  <span>{settings.currency}{detailsInvoice.subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-red-500">
                                  <span>{t('discount')}</span>
                                  <span>-{settings.currency}{detailsInvoice.discount.toFixed(2)}</span>
                              </div>
                              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-lg text-gray-900">
                                  <span>{t('totalAmount')}</span>
                                  <span>{settings.currency}{detailsInvoice.total.toFixed(2)}</span>
                              </div>
                          </div>
                      </div>
                  </div>
                  <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                      <button onClick={() => setShowDetails(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 shadow-sm transition-colors">{t('close')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal && payInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                  <h3 className="text-xl font-bold mb-4 flex items-center text-gray-800 border-b pb-2">
                      <DollarSign className="mr-2 text-green-600"/> {t('payInvoice')}
                  </h3>
                  
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-3 rounded-lg text-sm border border-gray-200">
                          <div className="flex justify-between mb-1">
                              <span className="text-gray-500">{t('customer')}:</span>
                              <span className="font-bold text-gray-800">{payInvoice.partnerName}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                              <span className="text-gray-500">{t('total')}:</span>
                              <span className="font-bold">{settings.currency}{payInvoice.total.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between mb-1">
                              <span className="text-gray-500">{t('paid')}:</span>
                              <span className="text-green-600 font-bold">{settings.currency}{(payInvoice.paidAmount || 0).toFixed(2)}</span>
                          </div>
                          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between text-base">
                              <span className="font-bold text-red-500">{t('remaining')}:</span>
                              <span className="font-bold text-red-600">{settings.currency}{(payInvoice.total - (payInvoice.paidAmount || 0)).toFixed(2)}</span>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{t('amount')}</label>
                          <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-400 font-bold">{settings.currency}</span>
                              <input 
                                  type="number" 
                                  className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-lg"
                                  value={payAmount} 
                                  max={payInvoice.total - (payInvoice.paidAmount || 0)}
                                  onChange={(e) => setPayAmount(parseFloat(e.target.value))}
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">{t('paymentSource')}</label>
                          <div className="flex space-x-2">
                              <button 
                                  onClick={() => setPaySource('CASH_REGISTER')}
                                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${paySource === 'CASH_REGISTER' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}
                              >
                                  <Wallet size={18} className="mr-2"/> {t('cash')}
                              </button>
                              <button 
                                  onClick={() => setPaySource('BANK')}
                                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${paySource === 'BANK' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600'}`}
                              >
                                  <Landmark size={18} className="mr-2"/> {t('banks')}
                              </button>
                          </div>
                      </div>

                      {paySource === 'BANK' && (
                          <div className="animate-fade-in-down">
                              <label className="block text-sm font-bold text-gray-700 mb-1">{t('selectBank')}</label>
                              <select className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-primary outline-none" value={payBankId} onChange={(e) => setPayBankId(e.target.value)}>
                                  <option value="">{t('selectOption')}</option>
                                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                          </div>
                      )}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                      <button onClick={() => setShowPayModal(false)} className="px-5 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">{t('cancel')}</button>
                      <button onClick={submitPayment} className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-lg shadow-green-500/30">{t('confirm')}</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
