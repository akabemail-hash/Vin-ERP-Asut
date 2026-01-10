
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Product, PaymentMethod, Invoice, InvoiceItem } from '../types';
import { Search, Trash2, Plus, Minus, CreditCard, Banknote, User, FileText, Printer, CheckCircle, Unlock, Lock, ChevronDown, ArrowDownCircle, RotateCcw, PieChart, ShieldAlert, AlertTriangle } from 'lucide-react';

// Simple beep using Web Audio API
const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1500;
    gain.gain.value = 0.1;
    osc.start();
    setTimeout(() => osc.stop(), 100);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

const getQuantityType = (unitName: string = ''): number => {
    const lower = unitName.toLowerCase();
    if (lower.includes('kq') || lower.includes('kg') || lower.includes('kilogram')) return 1;
    if (lower.includes('litr') || lower.includes('liter') || lower === 'l') return 2;
    if (lower.includes('metr') || lower.includes('meter') || lower === 'm') return 3;
    if (lower.includes('kv') || lower.includes('m2') || lower.includes('sqm')) return 4;
    if (lower.includes('kub') || lower.includes('m3') || lower.includes('cbm')) return 5;
    return 0; // Default to Piece (Ədəd)
};

export const POS = () => {
  const { products, categories, customers, language, addInvoice, settings, banks, checkPermission, currentUser, cashRegisters, units } = useStore();
  const t = (key: string) => getTranslation(language, key);

  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('gen'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturnMode, setIsReturnMode] = useState(false); 
  
  // Pagination State for products
  const [visibleCount, setVisibleCount] = useState(12);

  // Searchable Customer State
  const [custSearch, setCustSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);

  // Bank Selection for Card
  const [showBankSelect, setShowBankSelect] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState('');
  
  // Split Payment State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);

  // Cash Payment with Change State
  const [showCashModal, setShowCashModal] = useState(false);
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);

  // Receipt Modal State
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

  // Message Modal State
  const [msgModal, setMsgModal] = useState<{ show: boolean; type: 'success' | 'error'; message: string } | null>(null);

  // Offline/Error Handling State
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [pendingSale, setPendingSale] = useState<any>(null);

  // Permissions
  const canEditPrice = checkPermission('view_admin'); // Mapping "Admin" access to view_admin for simplicity
  const canProcessReturns = checkPermission('view_pos_returns'); // Updated Permission

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(12);
  }, [selectedCategory, searchQuery]);

  // Computed Values
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCat = selectedCategory === 'ALL' || p.categoryId === selectedCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.barcode.includes(searchQuery) || 
                            p.code.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);

  const currentCustomer = customers.find(c => c.id === selectedCustomerId);
  
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(custSearch.toLowerCase()));

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = currentCustomer ? (subtotal * currentCustomer.discountRate / 100) : 0;
  const total = subtotal - discountAmount;

  // Actions
  const addToCart = (product: Product) => {
    playBeep(); // Audio Feedback
    setCart(prev => {
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

  const updateQty = (prodId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.productId === prodId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty, total: newQty * item.price };
      }
      return item;
    }));
  };

  const updatePrice = (prodId: string, newPrice: number) => {
      if (!canEditPrice) return;
      setCart(prev => prev.map(item => {
          if (item.productId === prodId) {
              return { ...item, price: newPrice, total: item.quantity * newPrice };
          }
          return item;
      }));
  };

  const removeFromCart = (prodId: string) => {
    setCart(prev => prev.filter(item => item.productId !== prodId));
  };

  const initiateCheckout = (method: PaymentMethod) => {
      if (cart.length === 0) return;
      
      if (method === PaymentMethod.CASH) {
          setTenderedAmount(total); // Default to exact amount
          setShowCashModal(true);
      } else if (method === PaymentMethod.CARD) {
          if (settings.defaultBankId) {
              handleCheckout(method, settings.defaultBankId);
          } else {
              setSelectedBankId(banks[0]?.id || '');
              setShowBankSelect(true);
          }
      } else if (method === PaymentMethod.MIXED) {
          // Open Split Payment Modal
          setSplitCash(0);
          setSplitCard(total);
          setSelectedBankId(banks[0]?.id || '');
          setShowSplitModal(true);
      } else {
          handleCheckout(method);
      }
  };

  const handleCheckout = async (
      method: PaymentMethod, 
      bankId?: string, 
      splitDetails?: {cash: number, card: number},
      cashDetails?: {tendered: number, change: number},
      forceOffline: boolean = false
    ) => {
    setIsProcessing(true);

    let fiscalDocumentId = "";
    let fiscalShortDocumentId = "";

    // --- API INTEGRATION FOR SALE ---
    // Resolve IP safely
    let ip = settings.kassaConfig?.ip;
    if (currentUser?.assignedCashRegisterId) {
        const assigned = cashRegisters.find(r => r.id === currentUser.assignedCashRegisterId);
        if (assigned?.ipAddress) ip = assigned.ipAddress;
    } else if (!ip && cashRegisters.length > 0) {
        const firstWithIp = cashRegisters.find(r => r.ipAddress);
        if (firstWithIp) ip = firstWithIp.ipAddress;
    }

    if (!forceOffline && ip && !isReturnMode) {
        // Construct Items for API
        const apiItems = cart.map(item => {
            const productDef = products.find(p => p.id === item.productId);
            const unitDef = units.find(u => u.id === productDef?.unitId);
            return {
                name: item.productName,
                code: productDef?.barcode || productDef?.code || '000000',
                quantity: item.quantity,
                salePrice: item.price,
                purchasePrice: productDef?.purchasePrice || 0,
                codeType: 1, // Barcode
                quantityType: getQuantityType(unitDef?.name || unitDef?.shortName), 
                vatType: 1 // Default to 1 as per prompt
            };
        });

        // Determine Payment Amounts
        let cashPayment = 0.0;
        let cardPayment = 0.0;
        let creditPayment = 0.0;

        if (method === PaymentMethod.CASH) cashPayment = total;
        else if (method === PaymentMethod.CARD) cardPayment = total;
        else if (method === PaymentMethod.CREDIT) creditPayment = total;
        else if (method === PaymentMethod.MIXED && splitDetails) {
            cashPayment = splitDetails.cash;
            cardPayment = splitDetails.card;
        }

        const payload = {
            data: {
                cashPayment,
                creditPayment,
                depositPayment: 0.0,
                cardPayment,
                bonusPayment: 0.0,
                items: apiItems,
                clientName: currentCustomer?.name || "General Customer",
                clientTotalBonus: 0.0,
                clientEarnedBonus: 0.0,
                clientBonusCardNumber: "",
                cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Cashier",
                note: `Sale #${Date.now()}`,
                rrn: "",
                currency: settings.currency || "AZN"
            },
            operation: "sale",
            username: currentUser?.username || "username",
            password: currentUser?.password || "password"
        };

        try {
            // Added timeout to prevent hanging on network errors
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout for local printer

            const response = await fetch(`http://${ip}:5544/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await response.json();
            
            if (result.data && result.data.document_id) {
                fiscalDocumentId = result.data.document_id;
                fiscalShortDocumentId = result.data.short_document_id;
            } else {
                console.warn("API did not return success document fields", result);
            }
        } catch (error) {
            // Prevent NetworkError from blocking the UI flow
            console.error("Sale API Connection Error (Fiscal Printer Skipped):", error);
            // Trigger confirmation modal
            setPendingSale({ method, bankId, splitDetails, cashDetails });
            setShowOfflineModal(true);
            setIsProcessing(false);
            return; // Stop execution here, wait for modal
        }
    } else if (!forceOffline && !ip && !isReturnMode) {
        // IP Config is missing entirely
        setPendingSale({ method, bankId, splitDetails, cashDetails });
        setShowOfflineModal(true);
        setIsProcessing(false);
        return;
    }

    // --- LOCAL INVOICE CREATION ---
    const invoice: Invoice = {
      id: Date.now().toString(),
      type: isReturnMode ? 'SALE_RETURN' : 'SALE',
      date: new Date().toISOString(),
      partnerId: selectedCustomerId,
      partnerName: currentCustomer?.name || 'Unknown',
      items: isReturnMode ? cart.map(item => ({ ...item, returnedQuantity: item.quantity })) : cart,
      subtotal,
      discount: discountAmount,
      tax: 0,
      total,
      paymentMethod: method,
      bankId: bankId,
      locationId: 'loc-1', // Default
      // API Fields
      fiscalDocumentId,
      fiscalShortDocumentId,
      // Add Split Details if Mixed
      ...(method === PaymentMethod.MIXED ? {
          cashAmount: splitDetails?.cash,
          cardAmount: splitDetails?.card
      } : {}),
      // Add Cash Details if Cash
      ...(method === PaymentMethod.CASH ? {
          tenderedAmount: cashDetails?.tendered,
          changeAmount: cashDetails?.change
      } : {})
    };

    const success = addInvoice(invoice);
    
    if (success) {
        setLastInvoice(invoice);
        // Clear and Show Receipt
        setTimeout(() => {
            setCart([]);
            setSelectedCustomerId('gen');
            setCustSearch(''); // Reset search
            setIsProcessing(false);
            setShowBankSelect(false);
            setShowSplitModal(false);
            setShowCashModal(false);
            setShowReceipt(true);
        }, 300);
    } else {
        setIsProcessing(false);
    }
  };

  const handleForceSave = () => {
      if (pendingSale) {
          setShowOfflineModal(false);
          handleCheckout(
              pendingSale.method,
              pendingSale.bankId,
              pendingSale.splitDetails,
              pendingSale.cashDetails,
              true // Force offline save
          );
          setPendingSale(null);
      }
  };

  const handlePrint = () => {
    if (!lastInvoice) return;

    // Use a hidden iframe to print ONLY the receipt content without app styles interfering
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open();
        doc.write(`
            <html>
            <head>
                <title>Receipt ${lastInvoice.id}</title>
                <style>
                    body { 
                        font-family: 'Courier New', Courier, monospace; 
                        padding: 10px; 
                        margin: 0; 
                        width: 300px; /* Standard Thermal Width approx */
                        color: #000;
                    }
                    .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                    .company { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
                    .meta { font-size: 12px; margin-bottom: 2px; }
                    
                    .items { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 12px; }
                    .items th { text-align: left; border-bottom: 1px solid #000; }
                    .items td { padding: 4px 0; vertical-align: top; }
                    .item-name { display: block; font-weight: bold; }
                    .item-meta { font-size: 11px; color: #333; }
                    .text-right { text-align: right; }
                    
                    .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 5px; font-size: 12px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                    .total { font-size: 16px; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; padding-top: 5px; }
                    
                    .footer { text-align: center; margin-top: 20px; font-size: 11px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="company">${settings.companyName}</div>
                    <div class="meta">${settings.companyPhone}</div>
                    <div class="meta">VOEN: ${settings.companyVoen}</div>
                    <div class="meta">Date: ${new Date(lastInvoice.date).toLocaleString()}</div>
                    <div class="meta">Inv: #${lastInvoice.id}</div>
                    <div class="meta">Cashier: ${settings.companyName}</div> 
                    ${lastInvoice.fiscalShortDocumentId ? `<div class="meta">Doc ID: ${lastInvoice.fiscalShortDocumentId}</div>` : ''}
                </div>

                <table class="items">
                    <tbody>
                        ${lastInvoice.items.map(item => `
                            <tr>
                                <td colspan="2">
                                    <span class="item-name">${item.productName}</span>
                                </td>
                            </tr>
                            <tr>
                                <td>${item.quantity} x ${settings.currency}${item.price.toFixed(2)}</td>
                                <td class="text-right">${settings.currency}${item.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="totals">
                    <div class="row">
                        <span>Subtotal:</span>
                        <span>${settings.currency}${lastInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span>Discount:</span>
                        <span>${settings.currency}${lastInvoice.discount.toFixed(2)}</span>
                    </div>
                    <div class="row total">
                        <span>Total:</span>
                        <span>${settings.currency}${lastInvoice.total.toFixed(2)}</span>
                    </div>
                    
                    <div class="row" style="margin-top:10px; font-weight:bold;">
                        <span>Payment:</span>
                        <span>${lastInvoice.paymentMethod}</span>
                    </div>
                    ${lastInvoice.tenderedAmount ? `
                    <div class="row">
                        <span>Tendered:</span>
                        <span>${settings.currency}${lastInvoice.tenderedAmount.toFixed(2)}</span>
                    </div>
                    <div class="row">
                        <span>Change:</span>
                        <span>${settings.currency}${(lastInvoice.changeAmount || 0).toFixed(2)}</span>
                    </div>
                    ` : ''}
                </div>

                <div class="footer">
                    <p>*** ${lastInvoice.type === 'SALE_RETURN' ? 'RETURN RECEIPT' : 'THANK YOU'} ***</p>
                </div>
            </body>
            </html>
        `);
        doc.close();
        
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
    }

    // Clean up iframe after printing
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 2000);
  };

  const handleLoadMore = () => {
      setVisibleCount(prev => prev + 12);
  };

  const toggleReturnMode = () => {
      // Permission check is now handled by hiding/showing the button, 
      // but double check here for safety.
      if(!canProcessReturns) {
          alert(t('returnAccessDenied'));
          return;
      }
      setIsReturnMode(!isReturnMode);
      setCart([]);
  };

  const handleOpenDrawer = async () => {
    let ip = settings.kassaConfig?.ip; // Legacy setting check

    // 1. Try to get IP from assigned register
    if (currentUser?.assignedCashRegisterId) {
        const assigned = cashRegisters.find(r => r.id === currentUser.assignedCashRegisterId);
        if (assigned?.ipAddress) ip = assigned.ipAddress;
    } 
    // 2. Fallback: If no assigned register, pick the first valid IP from list (useful for Admin testing)
    else if (!ip && cashRegisters.length > 0) {
        const firstWithIp = cashRegisters.find(r => r.ipAddress);
        if (firstWithIp) ip = firstWithIp.ipAddress;
    }

    if (!ip) {
        console.log(t('ipNotConfigured'));
        setMsgModal({ show: true, type: 'error', message: t('ipNotConfigured') });
        return;
    }

    const payload = {
        data: {
            sum: 0.0
        },
        operation: "openShift",
        cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Kassir",
        username: currentUser?.username || "username",
        password: currentUser?.password || "password"
    };

    try {
        const response = await fetch(`http://${ip}:5544/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.code === "0" && result.message === "Success operation") {
            setMsgModal({ show: true, type: 'success', message: t('registerOpened') });
        } else {
            setMsgModal({ show: true, type: 'error', message: result.message || t('operationFailed') });
        }

    } catch (error) {
        console.error("Drawer Open Error:", error);
        setMsgModal({ show: true, type: 'error', message: t('connectionFailed') });
    }
  };

  const handleCloseRegister = async () => {
    // 1. Resolve IP (reuse logic from handleOpenDrawer)
    let ip = settings.kassaConfig?.ip;
    if (currentUser?.assignedCashRegisterId) {
        const assigned = cashRegisters.find(r => r.id === currentUser.assignedCashRegisterId);
        if (assigned?.ipAddress) ip = assigned.ipAddress;
    } else if (!ip && cashRegisters.length > 0) {
        const firstWithIp = cashRegisters.find(r => r.ipAddress);
        if (firstWithIp) ip = firstWithIp.ipAddress;
    }

    if (!ip) {
        console.log(t('ipNotConfigured'));
        setMsgModal({ show: true, type: 'error', message: t('ipNotConfigured') });
        return;
    }

    // 2. Payload
    const payload = {
        data: {
            cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Kassir"
        },
        operation: "closeShift",
        username: currentUser?.username || "username",
        password: currentUser?.password || "password"
    };

    // 3. Fetch
    try {
        const response = await fetch(`http://${ip}:5544/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        // 4. Handle Result
        if (result.message === "Success operation") {
             setMsgModal({ show: true, type: 'success', message: t('registerClosed') });
        } else {
             setMsgModal({ show: true, type: 'error', message: result.message || t('operationFailed') });
        }
    } catch (error) {
        console.error("Close Register Error:", error);
        setMsgModal({ show: true, type: 'error', message: t('connectionFailed') });
    }
  };

  const handlePrintXReport = async () => {
    // 1. Resolve IP (reuse logic from existing handlers)
    let ip = settings.kassaConfig?.ip;
    if (currentUser?.assignedCashRegisterId) {
        const assigned = cashRegisters.find(r => r.id === currentUser.assignedCashRegisterId);
        if (assigned?.ipAddress) ip = assigned.ipAddress;
    } else if (!ip && cashRegisters.length > 0) {
        const firstWithIp = cashRegisters.find(r => r.ipAddress);
        if (firstWithIp) ip = firstWithIp.ipAddress;
    }

    if (!ip) {
        setMsgModal({ show: true, type: 'error', message: t('ipNotConfigured') });
        return;
    }

    // 2. Payload
    const payload = {
        data: {
            cashierName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Kassir"
        },
        operation: "getXReport",
        username: currentUser?.username || "username",
        password: currentUser?.password || "password"
    };

    // 3. API Call
    try {
        const response = await fetch(`http://${ip}:5544/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        // 4. Handle Result
        if (result.message === "Success operation") {
            setMsgModal({ show: true, type: 'success', message: t('xReportPrinted') });
        } else {
            setMsgModal({ show: true, type: 'error', message: result.message || t('operationFailed') });
        }
    } catch (error) {
        console.error("X-Report Error:", error);
        setMsgModal({ show: true, type: 'error', message: t('connectionFailed') });
    }
  };

  return (
    <div className="flex h-full gap-4 relative print:hidden">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b flex space-x-2 overflow-x-auto">
           <button 
             onClick={() => setSelectedCategory('ALL')}
             className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${selectedCategory === 'ALL' ? 'bg-dark text-white' : 'bg-gray-100 text-gray-700'}`}
           >
             {t('allTypes')}
           </button>
           {categories.map(cat => (
             <button
               key={cat.id}
               onClick={() => setSelectedCategory(cat.id)}
               className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${selectedCategory === cat.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'}`}
             >
               {cat.name}
             </button>
           ))}
        </div>
        <div className="p-4 border-b">
           <div className="relative">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
             <input 
               type="text" 
               placeholder={t('scanProduct')}
               className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
               value={searchQuery}
               onChange={e => {
                   setSearchQuery(e.target.value);
                   const exactMatch = products.find(p => p.barcode === e.target.value);
                   if (exactMatch) {
                       addToCart(exactMatch);
                       setSearchQuery('');
                   }
               }}
               autoFocus
             />
           </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedProducts.map(product => (
                <div 
                  key={product.id} 
                  onClick={() => addToCart(product)}
                  className="bg-white p-3 rounded-lg shadow hover:shadow-md cursor-pointer transition-transform transform hover:-translate-y-1 flex flex-col items-center text-center group h-full"
                >
                  <div className="h-24 w-full flex items-center justify-center mb-2 bg-gray-100 rounded overflow-hidden">
                     <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-semibold text-sm line-clamp-2 leading-tight min-h-[2.5em]">{product.name}</h4>
                  <div className="mt-auto pt-2 w-full">
                    <span className="block text-primary font-bold text-lg">{settings.currency}{product.salesPrice.toFixed(2)}</span>
                    <span className={`text-xs block ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {product.stock > 0 ? `${product.stock} ${t('available')}` : t('outOfStock')}
                    </span>
                  </div>
                </div>
              ))}
           </div>
           
           {visibleCount < filteredProducts.length && (
               <div className="flex justify-center mt-6 mb-2">
                   <button 
                       onClick={handleLoadMore}
                       className="flex items-center px-6 py-2 bg-white border border-gray-300 rounded-full shadow-sm text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary transition-all"
                   >
                       <ArrowDownCircle size={18} className="mr-2"/> Load More ({filteredProducts.length - visibleCount} remaining)
                   </button>
               </div>
           )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className={`w-1/3 min-w-[350px] bg-white rounded-lg shadow flex flex-col transition-colors duration-300 ${isReturnMode ? 'border-2 border-red-500' : ''}`}>
         {isReturnMode && (
             <div className="bg-red-500 text-white text-center py-1 text-xs font-bold uppercase tracking-wider">
                 {t('returnMode')}
             </div>
         )}

         <div className="p-4 border-b bg-gray-50 relative">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-500 flex items-center">
                    <User size={12} className="mr-1"/> {t('customer')}
                </label>
            </div>
            <div className="relative">
                <div 
                    className="w-full border rounded p-2 text-sm bg-white flex justify-between items-center cursor-pointer"
                    onClick={() => setShowCustDropdown(!showCustDropdown)}
                >
                    <span>{customers.find(c => c.id === selectedCustomerId)?.name || t('selectCustomer')}</span>
                    <ChevronDown size={16} className="text-gray-400" />
                </div>
                {showCustDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border rounded shadow-lg z-20 mt-1 max-h-60 overflow-y-auto">
                        <div className="p-2 sticky top-0 bg-white border-b">
                            <input 
                                className="w-full border p-1.5 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder={t('searchPlaceholder')}
                                value={custSearch}
                                onChange={e => setCustSearch(e.target.value)}
                                autoFocus
                            />
                        </div>
                        {filteredCustomers.map(c => (
                            <div 
                                key={c.id} 
                                className={`p-2 hover:bg-gray-100 cursor-pointer text-sm ${selectedCustomerId === c.id ? 'bg-blue-50 font-bold' : ''}`}
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

         {/* Cart Items */}
         <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <div className={`bg-gray-100 p-4 rounded-full mb-3 ${isReturnMode ? 'text-red-300' : ''}`}>
                        <FileText size={40} />
                    </div>
                    <p>{t('emptyCart')}</p>
                    <p className="text-xs">{t('scanToStart')}</p>
                </div>
            ) : (
                cart.map(item => (
                  <div key={item.productId} className={`flex justify-between items-center p-2 rounded border shadow-sm ${isReturnMode ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex-1">
                       <p className={`font-medium text-sm leading-tight ${isReturnMode ? 'text-red-900' : ''}`}>{item.productName}</p>
                       <div className="text-xs text-gray-500 mt-1 flex items-center">
                           {item.quantity} x 
                           {/* Price Editing Logic */}
                           {canEditPrice ? (
                               <input 
                                   type="number"
                                   className="w-16 mx-1 border rounded px-1 py-0.5 text-center bg-white"
                                   value={item.price}
                                   onChange={e => updatePrice(item.productId, parseFloat(e.target.value) || 0)}
                               />
                           ) : (
                               <span className="mx-1">{settings.currency}{item.price.toFixed(2)}</span>
                           )}
                       </div>
                    </div>
                    <div className="flex items-center space-x-1 mx-2">
                       <button onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded hover:bg-red-50 text-red-500"><Minus size={14}/></button>
                       <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                       <button onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 flex items-center justify-center bg-white border rounded hover:bg-green-50 text-green-500"><Plus size={14}/></button>
                    </div>
                    <div className="flex flex-col items-end min-w-[60px]">
                       <span className={`font-bold text-sm ${isReturnMode ? 'text-red-600' : ''}`}>{settings.currency}{item.total.toFixed(2)}</span>
                       <button onClick={() => removeFromCart(item.productId)} className="text-gray-400 hover:text-red-500 mt-1"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
            )}
         </div>

         {/* Footer */}
         <div className={`p-4 border-t ${isReturnMode ? 'bg-red-50' : 'bg-gray-50'}`}>
            <div className="space-y-1 mb-4 text-sm">
                <div className="flex justify-between text-gray-600">
                    <span>{t('subtotal')}:</span>
                    <span>{settings.currency}{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                    <span>{t('discount')} {currentCustomer && currentCustomer.discountRate > 0 && `(${currentCustomer.discountRate}%)`}:</span>
                    <span>-{settings.currency}{discountAmount.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-bold text-2xl mt-2 pt-2 border-t border-gray-200 ${isReturnMode ? 'text-red-600' : 'text-dark'}`}>
                    <span>{isReturnMode ? t('refundAmount') : t('totalAmount')}:</span>
                    <span>{settings.currency}{total.toFixed(2)}</span>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
               <button 
                 disabled={cart.length === 0 || isProcessing}
                 onClick={() => initiateCheckout(PaymentMethod.CASH)}
                 className={`col-span-1 flex flex-col items-center justify-center py-2 text-white rounded disabled:opacity-50 transition-colors ${isReturnMode ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
               >
                 <Banknote size={18} className="mb-1" />
                 <span className="text-[10px] font-bold">{t('cash')}</span>
               </button>
               <button 
                 disabled={cart.length === 0 || isProcessing}
                 onClick={() => initiateCheckout(PaymentMethod.CARD)}
                 className="col-span-1 flex flex-col items-center justify-center py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
               >
                 <CreditCard size={18} className="mb-1" />
                 <span className="text-[10px] font-bold">{t('card')}</span>
               </button>
               <button 
                 disabled={cart.length === 0 || isProcessing}
                 onClick={() => initiateCheckout(PaymentMethod.MIXED)}
                 className="col-span-1 flex flex-col items-center justify-center py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
               >
                 <PieChart size={18} className="mb-1" />
                 <span className="text-[10px] font-bold">{t('splitPayment')}</span>
               </button>
               <button 
                 disabled={cart.length === 0 || isProcessing}
                 onClick={() => initiateCheckout(PaymentMethod.CREDIT)}
                 className="col-span-1 flex flex-col items-center justify-center py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors"
               >
                 <User size={18} className="mb-1" />
                 <span className="text-[10px] font-bold">{t('credit')}</span>
               </button>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-2 pt-2 border-t border-gray-200">
               {/* Only show return button if user has permission */}
               {canProcessReturns && (
                   <button 
                     className={`flex flex-col items-center justify-center py-2 rounded transition-colors shadow-sm ${isReturnMode ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'}`}
                     onClick={toggleReturnMode}
                   >
                     <RotateCcw size={16} className="mb-1" />
                     <span className="text-[9px] font-bold uppercase whitespace-nowrap">{isReturnMode ? t('saleMode') : t('returnMode')}</span>
                   </button>
               )}

               <button 
                 className="flex flex-col items-center justify-center py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors shadow-sm"
                 onClick={handleOpenDrawer}
               >
                 <Unlock size={16} className="mb-1" />
                 <span className="text-[9px] font-bold uppercase">{t('posOpen')}</span>
               </button>
               <button 
                 className="flex flex-col items-center justify-center py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
                 onClick={handleCloseRegister}
               >
                 <Lock size={16} className="mb-1" />
                 <span className="text-[9px] font-bold uppercase">{t('posClose')}</span>
               </button>
               <button 
                 className="flex flex-col items-center justify-center py-2 bg-violet-600 text-white rounded hover:bg-violet-700 transition-colors shadow-sm"
                 onClick={handlePrintXReport}
               >
                 <FileText size={16} className="mb-1" />
                 <span className="text-[9px] font-bold uppercase">{t('xReport')}</span>
               </button>
            </div>
         </div>
      </div>

      {/* MODALS */}

      {/* CASH PAYMENT MODAL (Calculates Change) */}
      {showCashModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-2xl">
                  <h3 className="text-xl font-bold mb-6 flex items-center text-green-700">
                      <Banknote className="mr-2" size={24}/> {t('cashPayment')}
                  </h3>
                  
                  <div className="mb-6 bg-gray-50 p-4 rounded border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">{t('totalAmount')}</p>
                      <p className="text-3xl font-extrabold text-gray-900">{settings.currency}{total.toFixed(2)}</p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold mb-2 text-gray-700">{t('tendered')}</label>
                          <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400 font-bold">{settings.currency}</span>
                              <input 
                                  type="number" 
                                  className="w-full pl-8 pr-4 py-3 border-2 border-green-200 rounded-lg text-2xl font-bold focus:ring-4 focus:ring-green-100 focus:border-green-500 outline-none transition-all"
                                  value={tenderedAmount}
                                  onChange={(e) => setTenderedAmount(parseFloat(e.target.value))}
                                  autoFocus
                                  onKeyDown={(e) => {
                                      if (e.key === 'Enter' && tenderedAmount >= total) {
                                          handleCheckout(PaymentMethod.CASH, undefined, undefined, { tendered: tenderedAmount, change: tenderedAmount - total });
                                      }
                                  }}
                              />
                          </div>
                      </div>

                      <div className={`p-4 rounded-lg border flex justify-between items-center ${tenderedAmount >= total ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <span className="font-bold text-gray-700">{t('change')}:</span>
                          <span className={`text-2xl font-bold ${tenderedAmount >= total ? 'text-green-700' : 'text-red-700'}`}>
                              {settings.currency}{Math.max(0, tenderedAmount - total).toFixed(2)}
                          </span>
                      </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-8">
                      <button onClick={() => setShowCashModal(false)} className="px-5 py-2.5 border rounded-lg hover:bg-gray-50 font-medium text-gray-700">{t('cancel')}</button>
                      <button 
                        disabled={tenderedAmount < total}
                        onClick={() => {
                            handleCheckout(PaymentMethod.CASH, undefined, undefined, { tendered: tenderedAmount, change: tenderedAmount - total });
                        }} 
                        className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-500/30 font-bold transition-all"
                      >
                          {t('confirm')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* BANK SELECTION MODAL */}
      {showBankSelect && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-4">{t('selectBank')}</h3>
                  <select className="w-full border p-2 rounded mb-4" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                      {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="flex justify-end space-x-2">
                      <button onClick={() => setShowBankSelect(false)} className="px-4 py-2 border rounded">{t('cancel')}</button>
                      <button onClick={() => handleCheckout(PaymentMethod.CARD, selectedBankId)} className="px-4 py-2 bg-primary text-white rounded">{t('confirm')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* SPLIT PAYMENT MODAL */}
      {showSplitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm rounded-lg p-6 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 flex items-center text-gray-800"><PieChart className="mr-2 text-purple-600" size={20}/> {t('splitDetails')}</h3>
                  <div className="mb-4 bg-gray-50 p-3 rounded border border-gray-200 text-center">
                      <p className="text-xs text-gray-500 uppercase font-bold">{t('totalAmount')}</p>
                      <p className="text-2xl font-bold text-gray-900">{settings.currency}{total.toFixed(2)}</p>
                  </div>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium mb-1 flex items-center"><Banknote size={16} className="mr-1 text-green-600"/> {t('cash')}</label>
                          <input type="number" className="w-full border p-2 rounded text-lg font-bold focus:ring-2 focus:ring-green-500 outline-none" value={splitCash} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setSplitCash(val); setSplitCard(parseFloat((total - val).toFixed(2))); }} />
                      </div>
                      <div>
                          <label className="block text-sm font-medium mb-1 flex items-center"><CreditCard size={16} className="mr-1 text-blue-600"/> {t('card')}</label>
                          <input type="number" className="w-full border p-2 rounded text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none" value={splitCard} onChange={(e) => { const val = parseFloat(e.target.value) || 0; setSplitCard(val); setSplitCash(parseFloat((total - val).toFixed(2))); }} />
                      </div>
                      {splitCard > 0 && (
                          <div>
                              <label className="block text-xs font-bold text-gray-500 mb-1">{t('selectBank')}</label>
                              <select className="w-full border p-2 rounded text-sm" value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)}>
                                  {banks.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                          </div>
                      )}
                  </div>
                  <div className="flex justify-end space-x-2 mt-6">
                      <button onClick={() => setShowSplitModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50 text-sm font-medium">{t('cancel')}</button>
                      <button disabled={Math.abs((splitCash + splitCard) - total) > 0.01 || (splitCard > 0 && !selectedBankId)} onClick={() => handleCheckout(PaymentMethod.MIXED, splitCard > 0 ? selectedBankId : undefined, { cash: splitCash, card: splitCard })} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 shadow-md font-bold text-sm">{t('confirm')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* RECEIPT MODAL (Optimized for Printing) */}
      {showReceipt && lastInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4">
              <div id="receipt-content" className="bg-white w-full max-w-sm rounded-lg shadow-xl overflow-hidden animate-fade-in-up">
                  <div className={`p-4 text-white text-center no-print ${lastInvoice.type === 'SALE_RETURN' ? 'bg-red-600' : 'bg-green-600'}`}>
                      {lastInvoice.type === 'SALE_RETURN' ? <RotateCcw size={48} className="mx-auto mb-2 opacity-90"/> : <CheckCircle size={48} className="mx-auto mb-2 opacity-90"/>}
                      <h3 className="text-xl font-bold">{lastInvoice.type === 'SALE_RETURN' ? t('returnSuccess') : t('saleSuccessful')}</h3>
                  </div>
                  
                  {/* Visual Receipt Preview */}
                  <div className="p-6 text-gray-900">
                      <div className="text-center mb-6 border-b pb-4 border-gray-200 border-dashed">
                          <h2 className="text-xl font-bold uppercase tracking-wider">{settings.companyName}</h2>
                          <p className="text-xs text-gray-500 mt-1">{settings.companyPhone}</p>
                          <p className="text-xs text-gray-500">{t('invoice')} #{lastInvoice.id.slice(-6)}</p>
                      </div>

                      <div className="space-y-1 mb-4">
                          {lastInvoice.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                  <span className="flex-1">{item.productName} <span className="text-xs text-gray-500">x{item.quantity}</span></span>
                                  <span className="font-bold">{settings.currency}{item.total.toFixed(2)}</span>
                              </div>
                          ))}
                      </div>
                      
                      <div className="border-t border-gray-200 border-dashed pt-4 space-y-2 text-sm">
                          <div className="flex justify-between"><span>{t('subtotal')}:</span> <span>{settings.currency}{lastInvoice.subtotal.toFixed(2)}</span></div>
                          <div className="flex justify-between"><span>{t('discount')}:</span> <span>-{settings.currency}{lastInvoice.discount.toFixed(2)}</span></div>
                          <div className="flex justify-between font-bold text-lg border-t border-gray-200 pt-2 mt-2">
                              <span>{lastInvoice.type === 'SALE_RETURN' ? t('refundAmount') : t('total')}:</span> 
                              <span>{settings.currency}{lastInvoice.total.toFixed(2)}</span>
                          </div>
                      </div>

                      {/* Payment Details (Cash Change etc) */}
                      <div className="mt-4 pt-2 border-t border-gray-200 text-sm">
                          <div className="flex justify-between">
                              <span className="font-bold">{t('paymentTerms')}:</span>
                              <span>{lastInvoice.paymentMethod === PaymentMethod.MIXED ? 'Mixed' : t(lastInvoice.paymentMethod.toLowerCase())}</span>
                          </div>
                          {lastInvoice.paymentMethod === PaymentMethod.CASH && lastInvoice.tenderedAmount && (
                              <>
                                  <div className="flex justify-between text-gray-600"><span>{t('tendered')}:</span> <span>{settings.currency}{lastInvoice.tenderedAmount.toFixed(2)}</span></div>
                                  <div className="flex justify-between font-bold"><span>{t('change')}:</span> <span>{settings.currency}${(lastInvoice.changeAmount || 0).toFixed(2)}</span></div>
                              </>
                          )}
                      </div>

                      <div className="mt-6 text-center text-xs text-gray-400">
                          {new Date(lastInvoice.date).toLocaleString()}
                          {lastInvoice.fiscalShortDocumentId && <div className="mt-1 font-mono">Doc: {lastInvoice.fiscalShortDocumentId}</div>}
                      </div>
                  </div>

                  <div className="p-4 bg-gray-50 flex gap-3 no-print">
                      <button onClick={handlePrint} className="flex-1 flex items-center justify-center py-2 border border-gray-300 rounded hover:bg-gray-100 font-medium">
                          <Printer size={18} className="mr-2"/> {t('printReceipt')}
                      </button>
                      <button onClick={() => setShowReceipt(false)} className="flex-1 flex items-center justify-center py-2 bg-primary text-white rounded hover:bg-blue-700 font-medium">
                          {t('newSale')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MESSAGE MODAL */}
      {msgModal && msgModal.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[110] flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in-up">
                  <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${msgModal.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {msgModal.type === 'success' ? <CheckCircle size={32}/> : <AlertTriangle size={32}/>}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{msgModal.type === 'success' ? t('successTitle') : t('errorTitle')}</h3>
                  <p className="text-gray-600 mb-6">{msgModal.message}</p>
                  <button 
                      onClick={() => setMsgModal(null)} 
                      className={`px-6 py-2 rounded-lg text-white font-bold shadow-md transition-all ${msgModal.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                      {t('close')}
                  </button>
              </div>
          </div>
      )}

      {/* OFFLINE SAVE CONFIRMATION MODAL */}
      {showOfflineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in-up border-t-4 border-orange-500">
                  <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-orange-600">
                      <AlertTriangle size={36}/>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Cash Register Inaccessible</h3>
                  <p className="text-gray-600 mb-6 text-sm">
                      Unable to connect to the fiscal printer (IP not configured or offline). 
                      <br/><br/>
                      <strong>Do you still want to save this sale locally?</strong>
                  </p>
                  <div className="flex gap-3 justify-center">
                      <button 
                          onClick={() => { setShowOfflineModal(false); setPendingSale(null); setIsProcessing(false); }} 
                          className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                      >
                          No, Cancel
                      </button>
                      <button 
                          onClick={handleForceSave} 
                          className="flex-1 py-2.5 px-4 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 shadow-md transition-colors"
                      >
                          Yes, Save
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
