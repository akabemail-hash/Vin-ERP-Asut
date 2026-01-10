
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { TransferDocument, TransferItem, Product } from '../types';
import { ArrowLeftRight, Plus, Search, Trash2, Edit2, FileText, X } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const StockTransfer = () => {
    const { locations, products, transfers, addTransfer, updateTransfer, deleteTransfer, language } = useStore();
    const t = (key: string) => getTranslation(language, key);

    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [fromLoc, setFromLoc] = useState('');
    const [toLoc, setToLoc] = useState('');
    const [note, setNote] = useState('');
    const [items, setItems] = useState<TransferItem[]>([]);
    
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [productSearch, setProductSearch] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const filteredTransfers = transfers.filter(t => t.id.includes(searchQuery));
    const paginatedTransfers = filteredTransfers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // --- Actions ---

    const startNew = () => {
        setEditingId(null);
        setFromLoc(locations[0]?.id || '');
        setToLoc('');
        setNote('');
        setItems([]);
        setView('form');
    };

    const startEdit = (doc: TransferDocument) => {
        setEditingId(doc.id);
        setFromLoc(doc.sourceLocationId);
        setToLoc(doc.targetLocationId);
        setNote(doc.note || '');
        // Deep copy items
        setItems(doc.items.map(i => ({...i})));
        setView('form');
    };

    const handleSearchProduct = (term: string) => {
        setProductSearch(term);
        const exactMatch = products.find(p => p.barcode === term || p.code === term);
        if (exactMatch) {
            addItem(exactMatch);
            setProductSearch('');
        }
    };

    const addItem = (product: Product) => {
        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if(existing) {
                return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { productId: product.id, productName: product.name, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setItems(prev => prev.filter(i => i.productId !== id));
    };

    const updateItemQty = (id: string, qty: number) => {
        setItems(prev => prev.map(i => i.productId === id ? { ...i, quantity: qty } : i));
    };

    const saveTransfer = () => {
        if (!fromLoc || !toLoc || items.length === 0) {
            alert(t('transferAlert1'));
            return;
        }
        if (fromLoc === toLoc) {
            alert(t('transferAlert2'));
            return;
        }

        const doc: TransferDocument = {
            id: editingId || `TRF-${Date.now()}`,
            date: editingId ? (transfers.find(t => t.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
            sourceLocationId: fromLoc,
            targetLocationId: toLoc,
            items: items,
            note: note
        };

        let success = false;
        if (editingId) {
            success = updateTransfer(doc);
        } else {
            success = addTransfer(doc);
        }

        if (success) {
            setView('list');
        }
    };

    const handleDelete = (id: string) => {
        if(confirm(t('deleteConfirm'))) {
            deleteTransfer(id);
        }
    };

    // Filter Products for Dropdown
    const searchResults = productSearch.length > 1 ? products.filter(p => 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.code.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode.includes(productSearch)
    ).slice(0, 5) : [];

    // --- RENDER ---

    if (view === 'form') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{editingId ? t('editTransfer') : t('newTransfer')}</h2>
                    <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 flex items-center">
                        <X size={20} className="mr-1"/> {t('cancel')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded shadow space-y-4">
                        <h3 className="font-bold border-b pb-2">{t('transferDetails')}</h3>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('source')} {t('location')}</label>
                            <select className="w-full border p-2 rounded" value={fromLoc} onChange={e => setFromLoc(e.target.value)}>
                                <option value="">{t('selectOption')}</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="flex justify-center text-gray-400"><ArrowLeftRight size={20}/></div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('target')} {t('location')}</label>
                            <select className="w-full border p-2 rounded" value={toLoc} onChange={e => setToLoc(e.target.value)}>
                                <option value="">{t('selectOption')}</option>
                                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('note')}</label>
                            <textarea 
                                className="w-full border p-2 rounded" 
                                rows={3}
                                value={note}
                                onChange={e => setNote(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                    <div className="md:col-span-2 bg-white p-4 rounded shadow flex flex-col">
                        <h3 className="font-bold border-b pb-2 mb-4">{t('transferItems')}</h3>
                        
                        <div className="relative mb-4">
                             <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                             <input 
                                 type="text"
                                 className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary"
                                 placeholder={t('scanProduct')}
                                 value={productSearch}
                                 onChange={e => handleSearchProduct(e.target.value)}
                                 autoFocus
                             />
                             {/* Dropdown */}
                             {searchResults.length > 0 && (
                                 <div className="absolute z-10 w-full bg-white border rounded shadow-lg mt-1 max-h-60 overflow-y-auto">
                                     {searchResults.map(p => (
                                         <div 
                                             key={p.id} 
                                             className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between items-center"
                                             onClick={() => { addItem(p); setProductSearch(''); }}
                                         >
                                             <div>
                                                 <p className="font-bold text-sm">{p.name}</p>
                                                 <p className="text-xs text-gray-500">{p.code}</p>
                                             </div>
                                             <div className="text-sm font-bold">{t('stock')}: {p.stocks?.[fromLoc] || 0}</div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>

                        <div className="flex-1 overflow-y-auto border rounded mb-4 bg-gray-50">
                            <table className="w-full text-left">
                                <thead className="bg-gray-100 sticky top-0 text-sm">
                                    <tr>
                                        <th className="p-3">{t('products')}</th>
                                        <th className="p-3 w-32">{t('transferQty')}</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y">
                                    {items.length === 0 ? (
                                        <tr><td colSpan={3} className="p-6 text-center text-gray-400">{t('scanToStart')}</td></tr>
                                    ) : (
                                        items.map(item => (
                                            <tr key={item.productId}>
                                                <td className="p-3">
                                                    <div className="font-medium">{item.productName}</div>
                                                    {fromLoc && (
                                                        <div className="text-xs text-gray-500">
                                                            {t('available')}: {products.find(p => p.id === item.productId)?.stocks?.[fromLoc] || 0}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="number" 
                                                        min="1" 
                                                        className="w-full border p-1 rounded text-center"
                                                        value={item.quantity}
                                                        onChange={e => updateItemQty(item.productId, parseInt(e.target.value))}
                                                    />
                                                </td>
                                                <td className="p-3 text-right">
                                                    <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500">
                                                        <Trash2 size={18}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={saveTransfer}
                                disabled={items.length === 0 || !fromLoc || !toLoc}
                                className="bg-primary text-white px-6 py-2 rounded font-bold disabled:opacity-50 hover:bg-indigo-700 flex items-center"
                            >
                                <FileText className="mr-2" size={20}/> {editingId ? t('updateSlip') : t('createSlip')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">{t('stockTransfer')}</h2>
                <button onClick={startNew} className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700">
                    <Plus size={18} className="mr-2"/> {t('newTransfer')}
                </button>
            </div>

            <div className="bg-white p-4 rounded shadow">
                 <div className="mb-4 relative max-w-md">
                     <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                     <input 
                       type="text" 
                       placeholder={t('searchPlaceholder')}
                       className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary"
                       value={searchQuery}
                       onChange={e => setSearchQuery(e.target.value)}
                     />
                 </div>

                 <table className="w-full text-left text-sm">
                     <thead className="bg-gray-50">
                         <tr>
                             <th className="p-3">ID</th>
                             <th className="p-3">{t('date')}</th>
                             <th className="p-3">{t('source')}</th>
                             <th className="p-3">{t('target')}</th>
                             <th className="p-3">{t('items')}</th>
                             <th className="p-3">{t('note')}</th>
                             <th className="p-3 text-right"></th>
                         </tr>
                     </thead>
                     <tbody className="divide-y">
                         {paginatedTransfers.length === 0 ? (
                             <tr><td colSpan={7} className="p-6 text-center text-gray-400">{t('noRecords')}</td></tr>
                         ) : (
                             paginatedTransfers.map(doc => {
                                 const sourceName = locations.find(l => l.id === doc.sourceLocationId)?.name || 'Unknown';
                                 const targetName = locations.find(l => l.id === doc.targetLocationId)?.name || 'Unknown';
                                 return (
                                     <tr key={doc.id} className="hover:bg-gray-50">
                                         <td className="p-3 font-mono text-gray-600">{doc.id}</td>
                                         <td className="p-3">{new Date(doc.date).toLocaleDateString()}</td>
                                         <td className="p-3 font-medium">{sourceName}</td>
                                         <td className="p-3 font-medium">{targetName}</td>
                                         <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{doc.items.length} {t('itemsCount')}</span></td>
                                         <td className="p-3 text-gray-500 truncate max-w-xs">{doc.note}</td>
                                         <td className="p-3 flex justify-end space-x-2">
                                             <button onClick={() => startEdit(doc)} className="p-1 text-blue-500 hover:bg-blue-50 rounded" title={t('edit')}><Edit2 size={16}/></button>
                                             <button onClick={() => handleDelete(doc.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title={t('delete')}><Trash2 size={16}/></button>
                                         </td>
                                     </tr>
                                 );
                             })
                         )}
                     </tbody>
                 </table>
                 <Pagination 
                    currentPage={currentPage} 
                    totalItems={filteredTransfers.length} 
                    pageSize={pageSize} 
                    onPageChange={setCurrentPage} 
                 />
            </div>
        </div>
    );
};
