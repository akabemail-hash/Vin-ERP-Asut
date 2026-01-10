
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Customer, Supplier } from '../types';
import { Plus, Edit2, Trash2, Search, User, Truck } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const Partners = () => {
  const { customers, suppliers, addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier, deleteSupplier, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);
  
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Generic State for Form
  const [editingPartner, setEditingPartner] = useState<Partial<Customer & Supplier>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredData = activeTab === 'customer' 
    ? customers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) && c.id !== 'gen')
    : suppliers.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination on tab change
  React.useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const handleSave = () => {
    if (!editingPartner.name) return;

    if (activeTab === 'customer') {
        const customerData: Customer = {
            id: editingPartner.id || `c-${Date.now()}`,
            name: editingPartner.name,
            type: editingPartner.type || 'individual',
            discountRate: Number(editingPartner.discountRate) || 0,
            dueDay: Number(editingPartner.dueDay) || 0,
            phone: editingPartner.phone || '',
            balance: editingPartner.balance || 0,
            email: editingPartner.email,
            address: editingPartner.address
        };
        if (editingPartner.id) updateCustomer(customerData);
        else addCustomer(customerData);
    } else {
        const supplierData: Supplier = {
             id: editingPartner.id || `s-${Date.now()}`,
             name: editingPartner.name,
             phone: editingPartner.phone || '',
             balance: editingPartner.balance || 0,
             email: editingPartner.email,
             address: editingPartner.address,
             contactPerson: editingPartner.contactPerson
        };
        if (editingPartner.id) updateSupplier(supplierData);
        else addSupplier(supplierData);
    }
    setIsModalOpen(false);
    setEditingPartner({});
  };

  const openNew = () => {
    setEditingPartner({ type: 'individual' });
    setIsModalOpen(true);
  };

  const openEdit = (data: any) => {
    setEditingPartner({...data});
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
      if (confirm(t('deleteConfirm'))) {
          if (activeTab === 'customer') deleteCustomer(id);
          else deleteSupplier(id);
      }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">{t('customer')} / {t('supplier')}</h2>

      {/* Tabs */}
      <div className="flex space-x-4 border-b">
         <button 
           onClick={() => { setActiveTab('customer'); setSearchQuery(''); }}
           className={`flex items-center pb-2 px-4 ${activeTab === 'customer' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
         >
           <User size={20} className="mr-2"/> {t('customer')}
         </button>
         <button 
           onClick={() => { setActiveTab('supplier'); setSearchQuery(''); }}
           className={`flex items-center pb-2 px-4 ${activeTab === 'supplier' ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500'}`}
         >
           <Truck size={20} className="mr-2"/> {t('supplier')}
         </button>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
          <div className="relative w-64">
             <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder={t('searchPlaceholder')}
               className="w-full pl-10 pr-4 py-2 border rounded focus:ring-2 focus:ring-primary"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
             />
          </div>
          <button onClick={openNew} className="bg-primary text-white px-4 py-2 rounded flex items-center hover:bg-indigo-700">
             <Plus size={18} className="mr-2" /> {activeTab === 'customer' ? t('addCustomer') : t('addSupplier')}
          </button>
      </div>

      {/* List */}
      <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-left">
              <thead className="bg-gray-50">
                  <tr>
                      <th className="p-3">{t('name')}</th>
                      <th className="p-3">{t('phone')}</th>
                      <th className="p-3">{t('balance')}</th>
                      {activeTab === 'customer' && <th className="p-3">{t('type')}</th>}
                      {activeTab === 'customer' && <th className="p-3">{t('discount')}</th>}
                      {activeTab === 'supplier' && <th className="p-3">{t('contactPerson')}</th>}
                      <th className="p-3"></th>
                  </tr>
              </thead>
              <tbody>
                  {paginatedData.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-gray-400">{t('noRecords')}</td></tr>
                  ) : (
                      paginatedData.map((item: any) => (
                          <tr key={item.id} className="border-t hover:bg-gray-50">
                              <td className="p-3 font-medium">{item.name}</td>
                              <td className="p-3 text-gray-600">{item.phone}</td>
                              <td className={`p-3 font-bold ${item.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{settings.currency}{item.balance.toFixed(2)}</td>
                              {activeTab === 'customer' && (
                                  <>
                                    <td className="p-3 capitalize">{item.type}</td>
                                    <td className="p-3">{item.discountRate}%</td>
                                  </>
                              )}
                              {activeTab === 'supplier' && <td className="p-3">{item.contactPerson || '-'}</td>}
                              <td className="p-3 flex space-x-2">
                                  <button onClick={() => openEdit(item)} className="text-blue-500 hover:bg-blue-50 p-1 rounded"><Edit2 size={16}/></button>
                                  <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
          <Pagination 
            currentPage={currentPage} 
            totalItems={filteredData.length} 
            pageSize={pageSize} 
            onPageChange={setCurrentPage} 
         />
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">{editingPartner.id ? t('edit') : t('add')} {activeTab === 'customer' ? t('customer') : t('supplier')}</h3>
                
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium mb-1">{t('name')}</label>
                        <input className="w-full border p-2 rounded" value={editingPartner.name || ''} onChange={e => setEditingPartner({...editingPartner, name: e.target.value})} />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('phone')}</label>
                            <input className="w-full border p-2 rounded" value={editingPartner.phone || ''} onChange={e => setEditingPartner({...editingPartner, phone: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('email')}</label>
                            <input className="w-full border p-2 rounded" value={editingPartner.email || ''} onChange={e => setEditingPartner({...editingPartner, email: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('address')}</label>
                        <input className="w-full border p-2 rounded" value={editingPartner.address || ''} onChange={e => setEditingPartner({...editingPartner, address: e.target.value})} />
                    </div>

                    {activeTab === 'customer' && (
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('type')}</label>
                                <select className="w-full border p-2 rounded" value={editingPartner.type} onChange={e => setEditingPartner({...editingPartner, type: e.target.value as any})}>
                                    <option value="individual">Individual</option>
                                    <option value="corporate">Corporate</option>
                                    <option value="general">General</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t('discount')} (%)</label>
                                <input type="number" className="w-full border p-2 rounded" value={editingPartner.discountRate || ''} onChange={e => setEditingPartner({...editingPartner, discountRate: Number(e.target.value)})} />
                            </div>
                             <div>
                                <label className="block text-sm font-medium mb-1">{t('dueDays')}</label>
                                <input type="number" className="w-full border p-2 rounded" value={editingPartner.dueDay || ''} onChange={e => setEditingPartner({...editingPartner, dueDay: Number(e.target.value)})} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'supplier' && (
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('contactPerson')}</label>
                            <input className="w-full border p-2 rounded" value={editingPartner.contactPerson || ''} onChange={e => setEditingPartner({...editingPartner, contactPerson: e.target.value})} />
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-100">{t('cancel')}</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-primary text-white rounded hover:bg-indigo-700">{t('save')}</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
