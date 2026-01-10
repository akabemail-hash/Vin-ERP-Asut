
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Product } from '../types';
import { Edit2, Trash2, Plus, Filter, Download, Upload, Image as ImageIcon, X, Search, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Pagination } from '../components/Pagination';
import * as XLSX from 'xlsx';

export const Inventory = () => {
  const { products, categories, brands, units, addProduct, addProducts, updateProduct, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const fileInputRef = useRef<HTMLInputElement>(null); // For Excel Import
  const imageInputRef = useRef<HTMLInputElement>(null); // For Image Upload
  
  // Import Result Modal State
  const [importResult, setImportResult] = useState<{ imported: number, skipped: number, show: boolean }>({ imported: 0, skipped: 0, show: false });

  // Filtering State
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.barcode.includes(searchQuery);
        const matchesCategory = filterCategory ? p.categoryId === filterCategory : true;
        const matchesBrand = filterBrand ? p.brandId === filterBrand : true;
        
        return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchQuery, filterCategory, filterBrand]);

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [searchQuery, filterCategory, filterBrand]);

  const handleSave = () => {
    // Basic validation
    if (!editingProduct.name || !editingProduct.salesPrice) return;

    const newProduct: Product = {
        id: editingProduct.id || Date.now().toString(),
        code: editingProduct.code || `P-${Date.now()}`,
        barcode: editingProduct.barcode || '',
        name: editingProduct.name!,
        brandId: editingProduct.brandId || brands[0]?.id || '',
        categoryId: editingProduct.categoryId || categories[0]?.id || '',
        unitId: editingProduct.unitId || units[0]?.id || '',
        salesPrice: Number(editingProduct.salesPrice),
        purchasePrice: Number(editingProduct.purchasePrice) || 0,
        vatRate: Number(editingProduct.vatRate) || 0,
        vatIncluded: editingProduct.vatIncluded || false,
        image: editingProduct.image || 'https://picsum.photos/200',
        stock: Number(editingProduct.stock) || 0,
        stocks: editingProduct.stocks || {}
    };

    if (editingProduct.id) {
        updateProduct(newProduct);
    } else {
        addProduct(newProduct);
    }
    setIsModalOpen(false);
    setEditingProduct({});
  };

  const openNew = () => {
    setEditingProduct({});
    setIsModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct({...p});
    setIsModalOpen(true);
  };

  // --- IMAGE UPLOAD HANDLER ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              // Convert to Base64 string for storage
              setEditingProduct(prev => ({ ...prev, image: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerImageInput = () => {
      imageInputRef.current?.click();
  };

  // --- EXCEL IMPORT HANDLER ---
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              const bstr = evt.target?.result;
              if (bstr) {
                  const wb = XLSX.read(bstr, { type: 'binary' });
                  const wsname = wb.SheetNames[0];
                  const ws = wb.Sheets[wsname];
                  const data = XLSX.utils.sheet_to_json(ws);
                  
                  // 1. Map Excel Data to Product Interface
                  const parsedProducts: Product[] = data.map((row: any) => ({
                      id: `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      name: row[t('name')] || row['Name'] || row['Product Name'] || 'Imported Product',
                      code: String(row[t('code')] || row['Code'] || `P-${Math.floor(Math.random() * 10000)}`),
                      barcode: String(row[t('barcode')] || row['Barcode'] || ''),
                      salesPrice: Number(row[t('salesPrice')] || row['Sales Price'] || row['Price']) || 0,
                      purchasePrice: Number(row[t('purchasePrice')] || row['Purchase Price'] || row['Cost']) || 0,
                      stock: Number(row[t('stock')] || row['Stock']) || 0,
                      stocks: {},
                      // Attempt to find IDs by name, else default
                      categoryId: categories.find(c => c.name === (row[t('category')] || row['Category']))?.id || categories[0]?.id || '',
                      brandId: brands.find(b => b.name === (row[t('brand')] || row['Brand']))?.id || brands[0]?.id || '',
                      unitId: units.find(u => u.shortName === (row[t('unit')] || row['Unit']))?.id || units[0]?.id || '',
                      vatRate: Number(row[t('vatRate')] || row['VAT Rate'] || 18),
                      vatIncluded: true,
                      image: 'https://picsum.photos/200'
                  }));

                  // 2. Validate Uniqueness (Code & Barcode)
                  const validProducts: Product[] = [];
                  let skippedCount = 0;

                  // Create Sets of existing data for O(1) lookup
                  // We normalize codes to lowercase for comparison
                  const existingCodes = new Set(products.map(p => p.code.trim().toLowerCase()));
                  const existingBarcodes = new Set(products.map(p => p.barcode.trim()));

                  parsedProducts.forEach(p => {
                      const normalizedCode = p.code.trim().toLowerCase();
                      const normalizedBarcode = p.barcode.trim();

                      // Check if code exists
                      const isCodeDuplicate = existingCodes.has(normalizedCode);
                      // Check if barcode exists (only if barcode is not empty)
                      const isBarcodeDuplicate = normalizedBarcode && existingBarcodes.has(normalizedBarcode);

                      if (isCodeDuplicate || isBarcodeDuplicate) {
                          skippedCount++;
                      } else {
                          validProducts.push(p);
                          // Add to our Sets so we don't import duplicates within the same file
                          existingCodes.add(normalizedCode);
                          if(normalizedBarcode) existingBarcodes.add(normalizedBarcode);
                      }
                  });

                  // 3. Commit Import
                  if (validProducts.length > 0) {
                      addProducts(validProducts);
                  }

                  // 4. Show Summary in Custom Modal
                  if (validProducts.length > 0 || skippedCount > 0) {
                      setImportResult({ 
                          imported: validProducts.length, 
                          skipped: skippedCount, 
                          show: true 
                      });
                  } else {
                      alert(t('noValidData'));
                  }
              }
          };
          reader.readAsBinaryString(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- EXCEL EXPORT HANDLER ---
  const handleExport = () => {
      // Export FILTERED products, not all products, to respect the view
      const exportData = filteredProducts.map(p => ({
          [t('name')]: p.name,
          [t('code')]: p.code,
          [t('barcode')]: p.barcode,
          [t('category')]: categories.find(c => c.id === p.categoryId)?.name || '',
          [t('brand')]: brands.find(b => b.id === p.brandId)?.name || '',
          [t('unit')]: units.find(u => u.id === p.unitId)?.shortName || '',
          [t('purchasePrice')]: p.purchasePrice,
          [t('salesPrice')]: p.salesPrice,
          [t('stock')]: p.stock,
          [t('vatRate')]: p.vatRate
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, t('products'));
      XLSX.writeFile(wb, `${t('products')}_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const clearFilters = () => {
      setSearchQuery('');
      setFilterCategory('');
      setFilterBrand('');
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for Excel */}
      <input 
          type="file" 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          accept=".xlsx, .xls"
          onChange={handleExcelImport}
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('products')}</h2>
            <p className="text-gray-500 text-sm mt-1">{t('inventoryManageDesc')}</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 border text-sm font-medium rounded-lg flex items-center shadow-sm transition-colors ${showFilters ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
                <Filter size={16} className="mr-2"/> {t('filter')}
            </button>
            <button 
                onClick={handleExport}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center shadow-sm text-sm font-medium"
            >
                <Download size={16} className="mr-2"/> {t('export')}
            </button>
            {/* Import Button */}
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center shadow-md shadow-green-500/30 text-sm font-medium transition-all"
            >
                <Upload size={16} className="mr-2"/> {t('import')}
            </button>
            <button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 shadow-md shadow-blue-500/30 text-sm font-medium transition-all">
                <Plus size={18} className="mr-2"/> {t('newProduct')}
            </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-down">
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input 
                      type="text" 
                      placeholder={`${t('searchPlaceholder')} (${t('name')}, ${t('code')}, ${t('barcode')})`}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white outline-none"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                  />
              </div>
              <div>
                  <select 
                      className="w-full border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={filterCategory}
                      onChange={e => setFilterCategory(e.target.value)}
                  >
                      <option value="">{t('allTypes')} ({t('category')})</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>
              <div>
                  <select 
                      className="w-full border rounded-lg p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                      value={filterBrand}
                      onChange={e => setFilterBrand(e.target.value)}
                  >
                      <option value="">{t('allTypes')} ({t('brand')})</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
              </div>
              <div className="flex items-center">
                  {(searchQuery || filterCategory || filterBrand) && (
                      <button 
                          onClick={clearFilters}
                          className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                          <RotateCcw size={16} className="mr-2"/> {t('cancel')}
                      </button>
                  )}
              </div>
          </div>
      )}

      {/* Table Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('image')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('name')} / {t('code')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('category')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('brand')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('unit')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('stock')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('salesPrice')}</th>
                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {paginatedProducts.length === 0 ? <tr><td colSpan={8} className="p-8 text-center text-gray-400">{t('noRecords')}</td></tr> :
                    paginatedProducts.map(p => {
                        const catName = categories.find(c => c.id === p.categoryId)?.name || '-';
                        const brandName = brands.find(b => b.id === p.brandId)?.name || '-';
                        const unitName = units.find(u => u.id === p.unitId)?.shortName || '-';
                        return (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                <td className="p-4"><img src={p.image} className="w-10 h-10 rounded-md object-cover border border-gray-200" alt="" /></td>
                                <td className="p-4">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{p.name}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{p.code}</div>
                                </td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300"><span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">{catName}</span></td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{brandName}</td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{unitName}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.stock < 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                        {p.stock}
                                    </span>
                                </td>
                                <td className="p-4 text-sm font-bold text-gray-800 dark:text-white">{settings.currency}{p.salesPrice.toFixed(2)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-primary p-2 hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={18}/></button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
        <Pagination 
            currentPage={currentPage} 
            totalItems={filteredProducts.length} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
        />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingProduct.id ? t('editProduct') : t('newProduct')}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><span className="text-2xl">&times;</span></button>
                </div>
                
                <div className="p-6 grid grid-cols-2 gap-5">
                    {/* IMAGE UPLOAD SECTION */}
                    <div className="col-span-2 flex flex-col items-center justify-center mb-2">
                        <input 
                            type="file" 
                            accept="image/*" 
                            ref={imageInputRef} 
                            onChange={handleImageUpload} 
                            style={{ display: 'none' }}
                        />
                        <div 
                            className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary overflow-hidden relative group bg-gray-50 dark:bg-gray-700"
                            onClick={triggerImageInput}
                        >
                            {editingProduct.image ? (
                                <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="text-gray-400" size={32} />
                            )}
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-bold">{t('edit')}</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">{t('image')}</p>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('productName')}</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('barcode')}</label>
                        <input className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none" value={editingProduct.barcode || ''} onChange={e => setEditingProduct({...editingProduct, barcode: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('category')}</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={editingProduct.categoryId} onChange={e => setEditingProduct({...editingProduct, categoryId: e.target.value})}>
                            <option value="">{t('selectOption')}</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('brand')}</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={editingProduct.brandId} onChange={e => setEditingProduct({...editingProduct, brandId: e.target.value})}>
                            <option value="">{t('selectOption')}</option>
                            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('unit')}</label>
                        <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white" value={editingProduct.unitId} onChange={e => setEditingProduct({...editingProduct, unitId: e.target.value})}>
                            <option value="">{t('selectOption')}</option>
                            {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('purchasePrice')} ({settings.currency})</label>
                        <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={editingProduct.purchasePrice || ''} onChange={e => setEditingProduct({...editingProduct, purchasePrice: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('salesPrice')} ({settings.currency})</label>
                        <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={editingProduct.salesPrice || ''} onChange={e => setEditingProduct({...editingProduct, salesPrice: Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('vatRate')} (%)</label>
                        <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={editingProduct.vatRate || ''} onChange={e => setEditingProduct({...editingProduct, vatRate: Number(e.target.value)})} />
                    </div>
                    <div className="flex items-center mt-6">
                        <input type="checkbox" id="vatInc" checked={editingProduct.vatIncluded} onChange={e => setEditingProduct({...editingProduct, vatIncluded: e.target.checked})} className="mr-2 w-4 h-4 text-primary rounded" />
                        <label htmlFor="vatInc" className="text-sm font-medium">{t('vatIncluded')}</label>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">{t('initialStock')}</label>
                        <input type="number" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={editingProduct.stock || ''} onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3 rounded-b-xl">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-md">{t('save')}</button>
                </div>
            </div>
        </div>
      )}

      {/* IMPORT REPORT MODAL */}
      {importResult.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm text-center animate-fade-in-up">
                  <h3 className="text-xl font-bold mb-4 dark:text-white">{t('importResult')}</h3>
                  
                  <div className="space-y-4 mb-6">
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                          <p className="text-sm text-green-800 dark:text-green-300 font-bold uppercase tracking-wide mb-1 flex items-center justify-center"><CheckCircle size={16} className="mr-1"/> {t('importedCount')}</p>
                          <p className="text-4xl font-extrabold text-green-600 dark:text-green-400">{importResult.imported}</p>
                      </div>
                      
                      {importResult.skipped > 0 ? (
                          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                              <p className="text-sm text-orange-800 dark:text-orange-300 font-bold uppercase tracking-wide mb-1 flex items-center justify-center"><AlertTriangle size={16} className="mr-1"/> {t('skippedCount')}</p>
                              <p className="text-4xl font-extrabold text-orange-600 dark:text-orange-400">{importResult.skipped}</p>
                          </div>
                      ) : (
                          <p className="text-sm text-gray-500">{t('noDuplicates')}</p>
                      )}
                  </div>

                  <button 
                      onClick={() => setImportResult({...importResult, show: false})} 
                      className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30"
                  >
                      {t('close')}
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
