
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Invoice, InvoiceItem, PaymentMethod } from '../types';
import { ArrowLeftRight, Check, History } from 'lucide-react';

export const Transactions = () => {
  const { invoices, customers, suppliers, addInvoice, products, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);
  
  const [activeTab, setActiveTab] = useState<'sales' | 'purchases' | 'returns'>('sales');
  
  // Return Logic States
  const [returnStep, setReturnStep] = useState<number>(0); // 0: Select Type, 1: Select Invoice, 2: Select Items
  const [returnType, setReturnType] = useState<'SALE' | 'PURCHASE'>('SALE');
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<InvoiceItem[]>([]);

  // Helpers for Lists
  const salesInvoices = invoices.filter(i => i.type === 'SALE');
  const purchaseInvoices = invoices.filter(i => i.type === 'PURCHASE');

  const handleStartReturn = (invoice: Invoice) => {
    setSelectedInvoiceForReturn(invoice);
    // Deep copy items to track return quantities independently
    setReturnItems(invoice.items.map(item => ({...item, returnedQuantity: 0}))); 
    setReturnStep(2);
  };

  const handleReturnQtyChange = (productId: string, qty: number) => {
    setReturnItems(prev => prev.map(item => {
        if (item.productId === productId) {
            // Cannot return more than bought
            const maxReturn = item.quantity; 
            return { ...item, returnedQuantity: Math.min(Math.max(0, qty), maxReturn) };
        }
        return item;
    }));
  };

  const submitReturn = () => {
    if (!selectedInvoiceForReturn) return;

    const itemsToReturn = returnItems.filter(i => i.returnedQuantity > 0).map(i => ({
        ...i,
        quantity: i.returnedQuantity, // The quantity being moved back to stock
        total: i.price * i.returnedQuantity
    }));

    if (itemsToReturn.length === 0) return;

    const totalRefund = itemsToReturn.reduce((sum, i) => sum + i.total, 0);

    const returnInvoice: Invoice = {
        id: `RET-${Date.now()}`,
        type: returnType === 'SALE' ? 'SALE_RETURN' : 'PURCHASE_RETURN',
        partnerId: selectedInvoiceForReturn.partnerId,
        partnerName: selectedInvoiceForReturn.partnerName,
        date: new Date().toISOString(),
        items: itemsToReturn,
        subtotal: totalRefund,
        tax: 0,
        discount: 0,
        total: totalRefund,
        paymentMethod: PaymentMethod.CASH, // Assuming refunding cash for simplicity
        parentInvoiceId: selectedInvoiceForReturn.id
    };

    const success = addInvoice(returnInvoice);
    if (success) {
        setReturnStep(0);
        setSelectedInvoiceForReturn(null);
        setReturnItems([]);
        alert(t('returnSuccess'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex border-b">
        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 ${activeTab === 'sales' ? 'border-b-2 border-primary font-bold' : ''}`}>{t('sales')}</button>
        <button onClick={() => setActiveTab('purchases')} className={`px-4 py-2 ${activeTab === 'purchases' ? 'border-b-2 border-primary font-bold' : ''}`}>{t('purchases')}</button>
        <button onClick={() => { setActiveTab('returns'); setReturnStep(0); }} className={`px-4 py-2 ${activeTab === 'returns' ? 'border-b-2 border-primary font-bold' : ''}`}>{t('returnsManagement')}</button>
      </div>

      {activeTab === 'sales' && (
         <InvoiceList invoices={salesInvoices} title={t('salesReport')} t={t} currency={settings.currency} />
      )}

      {activeTab === 'purchases' && (
          <InvoiceList invoices={purchaseInvoices} title={t('purchaseReport')} t={t} currency={settings.currency} />
      )}

      {activeTab === 'returns' && (
          <div className="bg-white p-6 rounded shadow">
             {returnStep === 0 && (
                 <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => { setReturnType('SALE'); setReturnStep(1); }} className="p-8 border-2 border-dashed rounded-lg hover:border-primary hover:bg-blue-50 flex flex-col items-center">
                        <ArrowLeftRight size={48} className="text-primary mb-2"/>
                        <span className="text-xl font-bold">{t('salesReturn')}</span>
                        <span className="text-sm text-gray-500">{t('returnDesc')}</span>
                     </button>
                     <button onClick={() => { setReturnType('PURCHASE'); setReturnStep(1); }} className="p-8 border-2 border-dashed rounded-lg hover:border-red-500 hover:bg-red-50 flex flex-col items-center">
                        <History size={48} className="text-red-500 mb-2"/>
                        <span className="text-xl font-bold">{t('purchaseReturn')}</span>
                        <span className="text-sm text-gray-500">{t('returnDesc')}</span>
                     </button>
                 </div>
             )}

             {returnStep === 1 && (
                 <div>
                     <h3 className="text-lg font-bold mb-4">{t('selectInvoiceToReturn')}</h3>
                     <InvoiceList 
                        invoices={returnType === 'SALE' ? salesInvoices : purchaseInvoices} 
                        title={`${t('selectOption')} ${returnType === 'SALE' ? t('sales') : t('purchases')} ${t('invoice')}`} 
                        onSelect={handleStartReturn}
                        t={t}
                        currency={settings.currency}
                    />
                     <button onClick={() => setReturnStep(0)} className="mt-4 text-gray-500 underline">{t('back')}</button>
                 </div>
             )}

             {returnStep === 2 && selectedInvoiceForReturn && (
                 <div>
                    <h3 className="text-lg font-bold mb-2">{t('returnItem')}</h3>
                    <p className="text-sm text-gray-500 mb-4">{t('invoice')} #{selectedInvoiceForReturn.id} - {selectedInvoiceForReturn.partnerName}</p>
                    
                    <div className="border rounded overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-2">{t('products')}</th>
                                    <th className="p-2">{t('salesQty')}</th>
                                    <th className="p-2">{t('returnQty')}</th>
                                    <th className="p-2">{t('refund')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returnItems.map(item => (
                                    <tr key={item.productId} className="border-t">
                                        <td className="p-2">{item.productName}</td>
                                        <td className="p-2">{item.quantity}</td>
                                        <td className="p-2">
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max={item.quantity}
                                                className="border w-20 p-1 rounded"
                                                value={item.returnedQuantity}
                                                onChange={(e) => handleReturnQtyChange(item.productId, parseInt(e.target.value))}
                                            />
                                        </td>
                                        <td className="p-2 font-bold">{settings.currency}{(item.price * item.returnedQuantity).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 flex justify-end space-x-3">
                        <button onClick={() => setReturnStep(1)} className="px-4 py-2 border rounded">{t('cancel')}</button>
                        <button onClick={submitReturn} className="px-4 py-2 bg-red-600 text-white rounded font-bold">{t('confirmReturn')}</button>
                    </div>
                 </div>
             )}
          </div>
      )}
    </div>
  );
};

const InvoiceList = ({ invoices, title, onSelect, t, currency }: any) => (
    <div className="bg-white rounded shadow p-4">
        <h3 className="font-bold text-lg mb-3">{title}</h3>
        {invoices.length === 0 ? <p className="text-gray-400">{t('noRecords')}</p> : (
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="p-2">ID</th>
                        <th className="p-2">{t('date')}</th>
                        <th className="p-2">{t('partner')}</th>
                        <th className="p-2">{t('total')}</th>
                        <th className="p-2">{t('paymentTerms')}</th>
                        {onSelect && <th className="p-2">{t('actions')}</th>}
                    </tr>
                </thead>
                <tbody>
                    {invoices.map((inv: any) => (
                        <tr key={inv.id} className="border-t hover:bg-gray-50">
                            <td className="p-2 font-mono">{inv.id.substring(0,8)}...</td>
                            <td className="p-2">{new Date(inv.date).toLocaleDateString()}</td>
                            <td className="p-2">{inv.partnerName}</td>
                            <td className="p-2 font-bold">{currency}{inv.total.toFixed(2)}</td>
                            <td className="p-2"><span className="px-2 py-1 rounded-full bg-gray-200 text-xs">{t(inv.paymentMethod.toLowerCase())}</span></td>
                            {onSelect && (
                                <td className="p-2">
                                    <button onClick={() => onSelect(inv)} className="text-primary hover:underline">{t('selectOption')}</button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
    </div>
);
