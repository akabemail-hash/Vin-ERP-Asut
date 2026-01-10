
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { UserRole, Location, User, Role, Permission, CashRegister } from '../types';
import { getTranslation } from '../utils/i18n';
import { Trash2, Plus, Settings as SettingsIcon, Database, MapPin, Tag, Box, Building2, Monitor, Edit2, Palette, Type, DollarSign, X, Users, Lock, Shield, Server, CheckCircle } from 'lucide-react';
import { Toast } from '../components/Toast';

export const Admin = () => {
  const { 
    currentUser, settings, updateSettings, language,
    categories, addCategory, deleteCategory, updateCategory,
    brands, addBrand, deleteBrand, updateBrand,
    locations, addLocation, deleteLocation, updateLocation,
    units, addUnit, deleteUnit, updateUnit,
    kassaBrands, addKassaBrand, deleteKassaBrand, updateKassaBrand,
    expenseCategories, addExpenseCategory, deleteExpenseCategory, updateExpenseCategory,
    banks, users, addUser, updateUser, deleteUser, roles, addRole, updateRole, deleteRole,
    cashRegisters, addCashRegister, updateCashRegister, deleteCashRegister
  } = useStore();

  const t = (key: string) => getTranslation(language, key);
  const [activeTab, setActiveTab] = useState<'company' | 'users' | 'roles' | 'locations' | 'appearance' | 'kassa' | 'settings' | 'categories' | 'brands' | 'units' | 'expenses'>('users');

  // --- TOAST STATE ---
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ message, type });
  };

  // --- STATE FOR USERS ---
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // --- STATE FOR ROLES ---
  const [editingRole, setEditingRole] = useState<Partial<Role> | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  // --- STATE FOR LOCATIONS (Advanced) ---
  const [locId, setLocId] = useState<string | null>(null);
  const [locName, setLocName] = useState('');
  const [locType, setLocType] = useState<'WAREHOUSE' | 'STORE'>('WAREHOUSE');
  const [linkedWarehouses, setLinkedWarehouses] = useState<string[]>([]); // For Stores
  const [showLocModal, setShowLocModal] = useState(false);

  // --- STATE FOR CASH REGISTERS (KASSA) ---
  const [editingRegister, setEditingRegister] = useState<Partial<CashRegister> | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // --- STATE FOR GENERAL SETTINGS ---
  const [localSettings, setLocalSettings] = useState({
      currency: settings.currency,
      allowNegativeStock: settings.allowNegativeStock
  });

  useEffect(() => {
      setLocalSettings({
          currency: settings.currency,
          allowNegativeStock: settings.allowNegativeStock
      });
  }, [settings]);

  // --- STATE FOR OTHERS ---
  const [newCategory, setNewCategory] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [newBrand, setNewBrand] = useState('');
  const [editBrandId, setEditBrandId] = useState<string | null>(null);
  const [newKassaBrand, setNewKassaBrand] = useState('');
  const [editKassaBrandOldName, setEditKassaBrandOldName] = useState<string | null>(null);
  const [newExpenseCat, setNewExpenseCat] = useState('');
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitShort, setNewUnitShort] = useState('');
  const [editUnitId, setEditUnitId] = useState<string | null>(null);

  if (currentUser?.role !== UserRole.ADMIN) {
      return <div className="text-red-500 font-bold p-10">{t('accessDenied')}</div>;
  }

  // --- USER HANDLERS ---
  const handleSaveUser = async () => {
      if(!editingUser?.username || !editingUser.firstName) return;
      try {
          const user: User = {
              id: editingUser.id || `u-${Date.now()}`,
              username: editingUser.username!,
              role: editingUser.roleId === 'admin_role' ? UserRole.ADMIN : UserRole.STAFF, 
              roleId: editingUser.roleId || 'cashier_role',
              password: editingUser.password || '1234',
              firstName: editingUser.firstName,
              lastName: editingUser.lastName || '',
              phone: editingUser.phone || '',
              allowedStoreIds: editingUser.allowedStoreIds || [],
              allowedWarehouseIds: editingUser.allowedWarehouseIds || [],
              assignedCashRegisterId: editingUser.assignedCashRegisterId
          };
          if(editingUser.id) await updateUser(user); else await addUser(user);
          setShowUserModal(false); setEditingUser(null);
          showToast(t('successTitle'), 'success');
      } catch (e) {
          showToast(t('errorTitle'), 'error');
      }
  };

  const handleEditUser = (u: User) => {
      setEditingUser({...u});
      setShowUserModal(true);
  };

  const handleDeleteUser = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try {
              await deleteUser(id);
              showToast(t('successTitle'), 'success');
          } catch(e) {
              showToast(t('errorTitle'), 'error');
          }
      }
  };

  // --- ROLE HANDLERS ---
  const handleSaveRole = async () => {
      if(!editingRole?.name) return;
      try {
          const role: Role = {
              id: editingRole.id || `role-${Date.now()}`,
              name: editingRole.name!,
              permissions: editingRole.permissions || []
          };
          if(editingRole.id) await updateRole(role); else await addRole(role);
          setShowRoleModal(false); setEditingRole(null);
          showToast(t('successTitle'), 'success');
      } catch (e) {
          showToast(t('errorTitle'), 'error');
      }
  };

  const handleDeleteRole = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try {
              await deleteRole(id);
              showToast(t('successTitle'), 'success');
          } catch (e) {
              showToast(t('errorTitle'), 'error');
          }
      }
  }

  const togglePermission = (perm: Permission) => {
      if(!editingRole) return;
      const current = editingRole.permissions || [];
      if(current.includes(perm)) {
          setEditingRole({...editingRole, permissions: current.filter(p => p !== perm)});
      } else {
          setEditingRole({...editingRole, permissions: [...current, perm]});
      }
  };

  // --- LOCATION HANDLERS ---
  const openLocationModal = (l?: Location) => {
      if (l) {
          setLocId(l.id);
          setLocName(l.name);
          setLocType(l.type);
          setLinkedWarehouses(l.linkedWarehouseIds || []);
      } else {
          setLocId(null);
          setLocName('');
          setLocType('WAREHOUSE');
          setLinkedWarehouses([]);
      }
      setShowLocModal(true);
  };

  const handleSaveLocation = async () => {
      if(!locName) return;
      try {
          const loc: Location = {
              id: locId || `loc-${Date.now()}`,
              name: locName,
              type: locType,
              linkedWarehouseIds: locType === 'STORE' ? linkedWarehouses : undefined
          };
          if (locId) await updateLocation(loc); else await addLocation(loc);
          setShowLocModal(false);
          showToast(t('successTitle'), 'success');
      } catch(e) {
          showToast(t('errorTitle'), 'error');
      }
  };

  const handleDeleteLocation = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try {
              await deleteLocation(id);
              showToast(t('successTitle'), 'success');
          } catch(e) {
              showToast(t('errorTitle'), 'error');
          }
      }
  };

  // --- CASH REGISTER HANDLERS ---
  const handleSaveRegister = async () => {
      if(!editingRegister?.name || !editingRegister?.storeId) return;
      try {
          const reg: CashRegister = {
              id: editingRegister.id || `cr-${Date.now()}`,
              name: editingRegister.name,
              storeId: editingRegister.storeId,
              brand: editingRegister.brand || '',
              ipAddress: editingRegister.ipAddress || ''
          };
          if(editingRegister.id) await updateCashRegister(reg); else await addCashRegister(reg);
          setShowRegisterModal(false);
          setEditingRegister(null);
          showToast(t('successTitle'), 'success');
      } catch(e) {
          showToast(t('errorTitle'), 'error');
      }
  };

  const handleDeleteRegister = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try {
              await deleteCashRegister(id);
              showToast(t('successTitle'), 'success');
          } catch(e) {
              showToast(t('errorTitle'), 'error');
          }
      }
  };

  // --- GENERAL SETTINGS HANDLER ---
  const handleSaveGeneralSettings = async () => {
      try {
          await updateSettings({
              ...settings,
              currency: localSettings.currency,
              allowNegativeStock: localSettings.allowNegativeStock
          });
          showToast(t('successTitle'), 'success');
      } catch (e) {
          showToast(t('errorTitle'), 'error');
      }
  };

  const handleSaveCompanyInfo = async (key: string, value: string) => {
      // Direct updates from input onChange for Company tab usually implies local state,
      // but if we want to save immediately or just when leaving tab, typically there's a save button.
      // Since Company tab inputs call updateSettings directly in previous code:
      try {
          await updateSettings({ ...settings, [key]: value });
          // Note: Triggering toast on every keystroke is bad UX.
          // Ideally, we should have a save button for Company Info too, or debounced save.
          // For now, I won't toast on every keystroke, but we might want a Save button there too.
      } catch (e) {
          // Silent fail or toast error
      }
  };

  // --- GENERIC HANDLERS (Categories, Brands, etc.) ---
  const handleSaveCategory = async () => { 
      if (!newCategory) return; 
      try {
          editCategoryId ? await updateCategory({ id: editCategoryId, name: newCategory }) : await addCategory({ id: Date.now().toString(), name: newCategory }); 
          setNewCategory(''); setEditCategoryId(null); 
          showToast(t('successTitle'), 'success');
      } catch(e) { showToast(t('errorTitle'), 'error'); }
  };
  const handleDeleteCategory = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try { await deleteCategory(id); showToast(t('successTitle'), 'success'); } catch(e) { showToast(t('errorTitle'), 'error'); }
      }
  }

  const handleSaveBrand = async () => { 
      if (!newBrand) return; 
      try {
          editBrandId ? await updateBrand({ id: editBrandId, name: newBrand }) : await addBrand({ id: Date.now().toString(), name: newBrand }); 
          setNewBrand(''); setEditBrandId(null); 
          showToast(t('successTitle'), 'success');
      } catch(e) { showToast(t('errorTitle'), 'error'); }
  };
  const handleDeleteBrand = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try { await deleteBrand(id); showToast(t('successTitle'), 'success'); } catch(e) { showToast(t('errorTitle'), 'error'); }
      }
  }

  const handleSaveUnit = async () => { 
      if(!newUnitName) return; 
      try {
          editUnitId ? await updateUnit({ id: editUnitId, name: newUnitName, shortName: newUnitShort }) : await addUnit({ id: Date.now().toString(), name: newUnitName, shortName: newUnitShort }); 
          setNewUnitName(''); setNewUnitShort(''); setEditUnitId(null); 
          showToast(t('successTitle'), 'success');
      } catch(e) { showToast(t('errorTitle'), 'error'); }
  };
  const handleDeleteUnit = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try { await deleteUnit(id); showToast(t('successTitle'), 'success'); } catch(e) { showToast(t('errorTitle'), 'error'); }
      }
  }

  const handleSaveExpense = async () => { 
      if(!newExpenseCat) return; 
      try {
          editExpenseId ? await updateExpenseCategory(editExpenseId, newExpenseCat) : await addExpenseCategory(newExpenseCat); 
          setNewExpenseCat(''); setEditExpenseId(null); 
          showToast(t('successTitle'), 'success');
      } catch(e) { showToast(t('errorTitle'), 'error'); }
  };
  const handleDeleteExpense = async (id: string) => {
      if(confirm(t('deleteConfirm'))) {
          try { await deleteExpenseCategory(id); showToast(t('successTitle'), 'success'); } catch(e) { showToast(t('errorTitle'), 'error'); }
      }
  }

  const handleSaveKassaBrand = async () => { 
      if (!newKassaBrand) return; 
      try {
          editKassaBrandOldName ? await updateKassaBrand(editKassaBrandOldName, newKassaBrand) : await addKassaBrand(newKassaBrand); 
          setNewKassaBrand(''); setEditKassaBrandOldName(null); 
          showToast(t('successTitle'), 'success');
      } catch(e) { showToast(t('errorTitle'), 'error'); }
  }
  const handleDeleteKassaBrand = async (name: string) => {
      if(confirm(t('deleteConfirm'))) {
          try { await deleteKassaBrand(name); showToast(t('successTitle'), 'success'); } catch(e) { showToast(t('errorTitle'), 'error'); }
      }
  }

  const tabs = [
      { id: 'users', icon: Users, label: t('usersAndRoles') }, 
      { id: 'locations', icon: MapPin, label: t('location') },
      { id: 'company', icon: Building2, label: t('companyInfo') },
      { id: 'appearance', icon: Palette, label: t('appearance') },
      { id: 'kassa', icon: Monitor, label: t('kassaSettings') },
      { id: 'expenses', icon: DollarSign, label: t('expenses') },
      { id: 'settings', icon: SettingsIcon, label: t('generalSettings') },
      { id: 'categories', icon: Tag, label: t('category') },
      { id: 'brands', icon: Database, label: t('brand') },
      { id: 'units', icon: Box, label: t('unit') },
  ];

  // Permission List
  const availablePermissions: {key: Permission, labelKey: string}[] = [
      { key: 'view_dashboard', labelKey: 'perm_view_dashboard' },
      { key: 'view_pos', labelKey: 'perm_view_pos' },
      { key: 'view_pos_returns', labelKey: 'perm_view_pos_returns' },
      { key: 'view_products', labelKey: 'perm_view_products' },
      { key: 'view_sales', labelKey: 'perm_view_sales' },
      { key: 'view_purchases', labelKey: 'perm_view_purchases' },
      { key: 'view_returns', labelKey: 'perm_view_returns' },
      { key: 'view_finance', labelKey: 'perm_view_finance' },
      { key: 'view_accounting', labelKey: 'perm_view_accounting' },
      { key: 'view_transfer', labelKey: 'perm_view_transfer' },
      { key: 'view_hr', labelKey: 'perm_view_hr' },
      { key: 'view_partners', labelKey: 'perm_view_partners' },
      { key: 'view_reports', labelKey: 'perm_view_reports' },
      { key: 'view_admin', labelKey: 'perm_view_admin' },
      { key: 'manage_users', labelKey: 'perm_manage_users' },
  ];

  return (
    <div className="space-y-6">
        <h2 className="text-2xl font-bold dark:text-white">{t('admin')}</h2>
        
        {/* Navigation */}
        <div className="flex space-x-2 border-b dark:border-gray-700 overflow-x-auto pb-1">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center px-4 py-2 whitespace-nowrap text-sm ${activeTab === tab.id ? 'border-b-2 border-primary text-primary font-bold' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                    <tab.icon size={16} className="mr-2"/> {tab.label}
                </button>
            ))}
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border dark:border-gray-700">

            {/* --- USERS & ROLES TAB --- */}
            {activeTab === 'users' && (
                <div className="space-y-8">
                    {/* User Management */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg dark:text-white">{t('employees')} / {t('username')}</h3>
                            <button onClick={() => { setEditingUser({}); setShowUserModal(true); }} className="bg-primary text-white px-3 py-1.5 rounded text-sm flex items-center"><Plus size={16} className="mr-1"/> {t('add')}</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="p-3">{t('username')}</th>
                                        <th className="p-3">{t('name')}</th>
                                        <th className="p-3">{t('roles')}</th>
                                        <th className="p-3 text-right">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className="border-t dark:border-gray-700">
                                            <td className="p-3 font-medium">{u.username}</td>
                                            <td className="p-3">{u.firstName} {u.lastName}</td>
                                            <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">{roles.find(r => r.id === u.roleId)?.name || u.role}</span></td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => handleEditUser(u)} className="text-blue-500 mr-2"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteUser(u.id)} className="text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <hr className="dark:border-gray-700"/>

                    {/* Role Management */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg dark:text-white">{t('roles')} & {t('permissions')}</h3>
                            <button onClick={() => { setEditingRole({ permissions: [] }); setShowRoleModal(true); }} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white px-3 py-1.5 rounded text-sm flex items-center border dark:border-gray-600"><Plus size={16} className="mr-1"/> {t('addRole')}</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {roles.map(role => (
                                <div key={role.id} className="border dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className="font-bold text-primary">{role.name}</h4>
                                        <div className="flex space-x-1">
                                            <button onClick={() => { setEditingRole(role); setShowRoleModal(true); }} className="text-gray-500 hover:text-blue-500"><Edit2 size={14}/></button>
                                            <button onClick={() => handleDeleteRole(role.id)} className="text-gray-500 hover:text-red-500"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.slice(0, 5).map(p => (
                                            <span key={p} className="text-[10px] bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded text-gray-700 dark:text-gray-300">
                                                {t(`perm_${p}` as any)}
                                            </span>
                                        ))}
                                        {role.permissions.length > 5 && <span className="text-[10px] text-gray-500">+{role.permissions.length - 5} more</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOCATIONS TAB --- */}
            {activeTab === 'locations' && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white">{t('allowedStores')} & {t('allowedWarehouses')}</h3>
                        <button onClick={() => openLocationModal()} className="bg-primary text-white px-4 py-2 rounded flex items-center"><Plus size={18} className="mr-2"/> {t('add')}</button>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {locations.map(l => (
                            <div key={l.id} className="border dark:border-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <div>
                                    <div className="flex items-center">
                                        <span className={`p-2 rounded mr-3 ${l.type === 'STORE' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                            {l.type === 'STORE' ? <Building2 size={20}/> : <Box size={20}/>}
                                        </span>
                                        <div>
                                            <h4 className="font-bold text-lg">{l.name}</h4>
                                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded">{l.type}</span>
                                        </div>
                                    </div>
                                    {l.type === 'STORE' && (
                                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 ml-12">
                                            <p><span className="font-semibold">{t('linkedWarehouses')}:</span> {l.linkedWarehouseIds?.map(wid => locations.find(loc => loc.id === wid)?.name).join(', ') || t('linkNone')}</p>
                                            <p><span className="font-semibold">{t('cashRegisters')}:</span> {cashRegisters.filter(cr => cr.storeId === l.id).map(cr => cr.name).join(', ') || t('linkNone')}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => openLocationModal(l)} className="p-2 border rounded hover:bg-gray-100"><Edit2 size={16}/></button>
                                    <button onClick={() => handleDeleteLocation(l.id)} className="p-2 border rounded text-red-500 hover:bg-red-50"><Trash2 size={16}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- COMPANY TAB --- */}
            {activeTab === 'company' && (
                <div className="space-y-4 max-w-lg">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">{t('companyInfo')}</h3>
                    <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('companyName')}</label><input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={settings.companyName} onChange={e => handleSaveCompanyInfo('companyName', e.target.value)} /></div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('voen')}</label><input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={settings.companyVoen} onChange={e => handleSaveCompanyInfo('companyVoen', e.target.value)} /></div>
                    <div><label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('companyPhone')}</label><input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={settings.companyPhone} onChange={e => handleSaveCompanyInfo('companyPhone', e.target.value)} /></div>
                </div>
            )}

            {/* --- APPEARANCE TAB --- */}
            {activeTab === 'appearance' && (
                <div className="space-y-6 max-w-lg">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">{t('appearance')}</h3>
                    
                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('themeColor')}</label>
                        <div className="flex gap-3">
                             <button onClick={() => updateSettings({...settings, themeColor: 'blue'})} className={`w-8 h-8 rounded-full bg-blue-600 ${settings.themeColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-600 dark:ring-offset-gray-800' : ''}`}></button>
                             <button onClick={() => updateSettings({...settings, themeColor: 'purple'})} className={`w-8 h-8 rounded-full bg-purple-600 ${settings.themeColor === 'purple' ? 'ring-2 ring-offset-2 ring-purple-600 dark:ring-offset-gray-800' : ''}`}></button>
                             <button onClick={() => updateSettings({...settings, themeColor: 'green'})} className={`w-8 h-8 rounded-full bg-green-600 ${settings.themeColor === 'green' ? 'ring-2 ring-offset-2 ring-green-600 dark:ring-offset-gray-800' : ''}`}></button>
                             <button onClick={() => updateSettings({...settings, themeColor: 'red'})} className={`w-8 h-8 rounded-full bg-red-600 ${settings.themeColor === 'red' ? 'ring-2 ring-offset-2 ring-red-600 dark:ring-offset-gray-800' : ''}`}></button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 dark:text-gray-300">{t('fontSize')}</label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" 
                                min="12" 
                                max="18" 
                                step="1" 
                                value={settings.baseFontSize} 
                                onChange={(e) => updateSettings({ ...settings, baseFontSize: Number(e.target.value) })}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                            <span className="text-sm font-medium dark:text-gray-300 min-w-[3rem] text-right">{settings.baseFontSize}px</span>
                        </div>
                    </div>
                </div>
            )}

            {/* --- KASSA TAB --- */}
            {activeTab === 'kassa' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white">{t('manageRegisters')}</h3>
                        <button 
                            onClick={() => { setEditingRegister({}); setShowRegisterModal(true); }} 
                            className="bg-primary text-white px-3 py-1.5 rounded text-sm flex items-center"
                        >
                            <Plus size={16} className="mr-1"/> {t('addRegister')}
                        </button>
                    </div>

                    <div className="overflow-hidden border rounded-lg dark:border-gray-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50">
                                <tr>
                                    <th className="p-3">{t('name')}</th>
                                    <th className="p-3">{t('location')}</th>
                                    <th className="p-3">{t('deviceBrand')}</th>
                                    <th className="p-3">{t('kassaIp')}</th>
                                    <th className="p-3 text-right">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                                {cashRegisters.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-gray-400">{t('noRecords')}</td></tr>
                                ) : (
                                    cashRegisters.map(cr => (
                                        <tr key={cr.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                                            <td className="p-3 font-medium dark:text-gray-200">{cr.name}</td>
                                            <td className="p-3 dark:text-gray-300">{locations.find(l => l.id === cr.storeId)?.name}</td>
                                            <td className="p-3 dark:text-gray-300">{cr.brand || '-'}</td>
                                            <td className="p-3 dark:text-gray-300 font-mono text-xs">{cr.ipAddress || '-'}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => { setEditingRegister(cr); setShowRegisterModal(true); }} className="text-blue-500 mr-2"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteRegister(cr.id)} className="text-red-500"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pt-6 border-t dark:border-gray-700">
                        <label className="block text-sm font-bold mb-2 dark:text-white">{t('defineKassaBrands')}</label>
                        <div className="flex gap-2 mb-2 max-w-md">
                            <input 
                                className="border p-2 rounded flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                placeholder={t('newBrandName')}
                                value={newKassaBrand} 
                                onChange={e => setNewKassaBrand(e.target.value)} 
                            />
                            <button onClick={handleSaveKassaBrand} className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-white px-4 rounded border dark:border-gray-600">
                                {editKassaBrandOldName ? <Edit2 size={18}/> : <Plus/>}
                            </button>
                        </div>
                        <ul className="flex flex-wrap gap-2">
                            {kassaBrands.map(b => (
                                <li key={b} className="pl-3 pr-2 py-1 flex items-center bg-gray-100 dark:bg-gray-800 rounded-full border dark:border-gray-600">
                                    <span className="text-sm dark:text-gray-300 mr-2">{b}</span>
                                    <button onClick={() => { setEditKassaBrandOldName(b); setNewKassaBrand(b); }} className="text-blue-500 hover:text-blue-700 mr-1"><Edit2 size={12}/></button>
                                    <button onClick={() => handleDeleteKassaBrand(b)} className="text-red-500 hover:text-red-700"><X size={14}/></button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* --- SETTINGS TAB --- */}
            {activeTab === 'settings' && (
                <div className="space-y-6 max-w-lg">
                    <h3 className="font-bold text-lg mb-4 dark:text-white">{t('generalSettings')}</h3>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">{t('currency')}</label>
                        <input 
                            className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                            value={localSettings.currency} 
                            onChange={e => setLocalSettings({ ...localSettings, currency: e.target.value })} 
                        />
                    </div>

                    <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                        <input 
                            type="checkbox" 
                            id="allowNegative"
                            className="w-4 h-4 text-primary rounded"
                            checked={localSettings.allowNegativeStock} 
                            onChange={e => setLocalSettings({ ...localSettings, allowNegativeStock: e.target.checked })} 
                        />
                        <label htmlFor="allowNegative" className="ml-3 text-sm font-medium dark:text-gray-300 cursor-pointer">{t('allowNegativeStock')}</label>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSaveGeneralSettings}
                            className="bg-primary text-white px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors font-medium flex items-center justify-center w-full sm:w-auto"
                        >
                            <CheckCircle className="mr-2" size={18} />
                            {t('save')}
                        </button>
                    </div>
                </div>
            )}
            
            {/* Reuse existing blocks for Appearance, Expenses, etc. */}
            {activeTab === 'categories' && (<div><div className="flex gap-2 mb-4"><input className="border p-2 rounded flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('category')} value={newCategory} onChange={e => setNewCategory(e.target.value)} /><button onClick={handleSaveCategory} className="bg-primary text-white px-4 rounded">{editCategoryId ? <Edit2 size={18}/> : <Plus/>}</button></div><ul className="divide-y dark:divide-gray-700 border rounded dark:border-gray-700">{categories.map(c => (<li key={c.id} className="p-3 flex justify-between items-center dark:text-gray-300"><span>{c.name}</span><div className="flex space-x-2"><button onClick={() => { setEditCategoryId(c.id); setNewCategory(c.name); }} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteCategory(c.id)} className="text-red-500"><Trash2 size={18}/></button></div></li>))}</ul></div>)}
            {activeTab === 'brands' && (<div><div className="flex gap-2 mb-4"><input className="border p-2 rounded flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('brand')} value={newBrand} onChange={e => setNewBrand(e.target.value)} /><button onClick={handleSaveBrand} className="bg-primary text-white px-4 rounded">{editBrandId ? <Edit2 size={18}/> : <Plus/>}</button></div><ul className="divide-y dark:divide-gray-700 border rounded dark:border-gray-700">{brands.map(b => (<li key={b.id} className="p-3 flex justify-between items-center dark:text-gray-300"><span>{b.name}</span><div className="flex space-x-2"><button onClick={() => { setEditBrandId(b.id); setNewBrand(b.name); }} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteBrand(b.id)} className="text-red-500"><Trash2 size={18}/></button></div></li>))}</ul></div>)}
            {activeTab === 'units' && (<div><div className="flex gap-2 mb-4"><input className="border p-2 rounded flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('name')} value={newUnitName} onChange={e => setNewUnitName(e.target.value)} /><input className="border p-2 rounded w-24 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('shortName')} value={newUnitShort} onChange={e => setNewUnitShort(e.target.value)} /><button onClick={handleSaveUnit} className="bg-primary text-white px-4 rounded">{editUnitId ? <Edit2 size={18}/> : <Plus/>}</button></div><ul className="divide-y dark:divide-gray-700 border rounded dark:border-gray-700">{units.map(u => (<li key={u.id} className="p-3 flex justify-between items-center dark:text-gray-300"><span>{u.name} ({u.shortName})</span><div className="flex space-x-2"><button onClick={() => { setEditUnitId(u.id); setNewUnitName(u.name); setNewUnitShort(u.shortName); }} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteUnit(u.id)} className="text-red-500"><Trash2 size={18}/></button></div></li>))}</ul></div>)}
            {activeTab === 'expenses' && (<div><div className="flex gap-2 mb-4"><input className="border p-2 rounded flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('newExpenseGroup')} value={newExpenseCat} onChange={e => setNewExpenseCat(e.target.value)} /><button onClick={handleSaveExpense} className="bg-primary text-white px-4 rounded">{editExpenseId ? <Edit2 size={18}/> : <Plus/>}</button></div><ul className="divide-y dark:divide-gray-700 border rounded dark:border-gray-700">{expenseCategories.map(c => (<li key={c.id} className="p-3 flex justify-between items-center dark:text-gray-300"><span>{c.name}</span><div className="flex space-x-2"><button onClick={() => { setEditExpenseId(c.id); setNewExpenseCat(c.name); }} className="text-blue-500"><Edit2 size={18}/></button><button onClick={() => handleDeleteExpense(c.id)} className="text-red-500"><Trash2 size={18}/></button></div></li>))}</ul></div>)}

        </div>

        {/* TOAST COMPONENT */}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

        {/* --- MODALS --- */}

        {/* User Modal */}
        {showUserModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
                    <h3 className="font-bold text-xl mb-4 dark:text-white">{editingUser?.id ? t('edit') : t('add')} {t('username')}</h3>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('firstName')} value={editingUser?.firstName || ''} onChange={e => setEditingUser({...editingUser, firstName: e.target.value})} />
                            <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('lastName')} value={editingUser?.lastName || ''} onChange={e => setEditingUser({...editingUser, lastName: e.target.value})} />
                        </div>
                        <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('username')} value={editingUser?.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} />
                        <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('password')} type="password" value={editingUser?.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} />
                        
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('roles')}</label>
                            <select className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingUser?.roleId || ''} onChange={e => setEditingUser({...editingUser, roleId: e.target.value})}>
                                <option value="">{t('selectOption')}</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        <div className="border-t pt-2 mt-2 dark:border-gray-700">
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('allowedStores')}</label>
                            <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto border p-2 rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600">
                                {locations.filter(l => l.type === 'STORE').map(l => (
                                    <label key={l.id} className="flex items-center text-sm dark:text-gray-300">
                                        <input 
                                            type="checkbox" 
                                            checked={editingUser?.allowedStoreIds?.includes(l.id)} 
                                            onChange={e => {
                                                const current = editingUser?.allowedStoreIds || [];
                                                const next = e.target.checked ? [...current, l.id] : current.filter(id => id !== l.id);
                                                setEditingUser({...editingUser, allowedStoreIds: next});
                                            }}
                                            className="mr-2"
                                        />
                                        {l.name}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* ASSIGNED CASH REGISTER */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('assignedCashRegister')}</label>
                            <select 
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={editingUser?.assignedCashRegisterId || ''}
                                onChange={e => setEditingUser({...editingUser, assignedCashRegisterId: e.target.value})}
                            >
                                <option value="">{t('selectOption')}</option>
                                {cashRegisters
                                    .filter(cr => !editingUser?.allowedStoreIds?.length || editingUser.allowedStoreIds.includes(cr.storeId))
                                    .map(cr => (
                                        <option key={cr.id} value={cr.id}>
                                            {cr.name} {cr.brand ? `- ${cr.brand}` : ''} {cr.ipAddress ? `(${cr.ipAddress})` : ''} - {locations.find(l => l.id === cr.storeId)?.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('allowedWarehouses')}</label>
                            <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto border p-2 rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600">
                                {locations.filter(l => l.type === 'WAREHOUSE').map(l => (
                                    <label key={l.id} className="flex items-center text-sm dark:text-gray-300">
                                        <input 
                                            type="checkbox" 
                                            checked={editingUser?.allowedWarehouseIds?.includes(l.id)} 
                                            onChange={e => {
                                                const current = editingUser?.allowedWarehouseIds || [];
                                                const next = e.target.checked ? [...current, l.id] : current.filter(id => id !== l.id);
                                                setEditingUser({...editingUser, allowedWarehouseIds: next});
                                            }}
                                            className="mr-2"
                                        />
                                        {l.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button onClick={() => setShowUserModal(false)} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('cancel')}</button>
                        <button onClick={handleSaveUser} className="px-4 py-2 bg-primary text-white rounded">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Role Modal */}
        {showRoleModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl">
                    <h3 className="font-bold text-xl mb-4 dark:text-white">{editingRole?.id ? t('editRole') : t('addRole')}</h3>
                    <div className="space-y-4">
                        <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder={t('roleName')} value={editingRole?.name || ''} onChange={e => setEditingRole({...editingRole, name: e.target.value})} />
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-2">{t('permissions')}</label>
                            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded bg-gray-50 dark:bg-gray-900 dark:border-gray-600">
                                {availablePermissions.map(perm => (
                                    <label key={perm.key} className="flex items-center text-sm p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer dark:text-gray-300">
                                        <input 
                                            type="checkbox" 
                                            checked={editingRole?.permissions?.includes(perm.key)} 
                                            onChange={() => togglePermission(perm.key)}
                                            className="mr-2"
                                        />
                                        {t(perm.labelKey)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button onClick={() => setShowRoleModal(false)} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('cancel')}</button>
                        <button onClick={handleSaveRole} className="px-4 py-2 bg-primary text-white rounded">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Location Modal */}
        {showLocModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]">
                    <h3 className="font-bold text-xl mb-4 dark:text-white">{locId ? t('edit') : t('add')} {t('location')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('name')}</label>
                            <input className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={locName} onChange={e => setLocName(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('type')}</label>
                            <select className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={locType} onChange={e => setLocType(e.target.value as any)}>
                                <option value="WAREHOUSE">Warehouse</option>
                                <option value="STORE">Store</option>
                            </select>
                        </div>

                        {locType === 'STORE' && (
                            <>
                                <div className="border-t pt-4 dark:border-gray-700">
                                    <label className="block text-xs font-bold text-gray-500 mb-2">{t('linkedWarehouses')}</label>
                                    <div className="space-y-1 bg-gray-50 dark:bg-gray-900 p-2 rounded border dark:border-gray-600 max-h-32 overflow-y-auto">
                                        {locations.filter(l => l.type === 'WAREHOUSE').map(wh => (
                                            <label key={wh.id} className="flex items-center text-sm dark:text-gray-300">
                                                <input 
                                                    type="checkbox" 
                                                    checked={linkedWarehouses.includes(wh.id)}
                                                    onChange={e => {
                                                        const next = e.target.checked ? [...linkedWarehouses, wh.id] : linkedWarehouses.filter(id => id !== wh.id);
                                                        setLinkedWarehouses(next);
                                                    }}
                                                    className="mr-2"
                                                />
                                                {wh.name}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button onClick={() => setShowLocModal(false)} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('cancel')}</button>
                        <button onClick={handleSaveLocation} className="px-4 py-2 bg-primary text-white rounded">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* Cash Register Modal */}
        {showRegisterModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl">
                    <h3 className="font-bold text-xl mb-4 dark:text-white">{editingRegister?.id ? t('editRegister') : t('addRegister')}</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('name')}</label>
                            <input 
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                value={editingRegister?.name || ''} 
                                onChange={e => setEditingRegister({...editingRegister, name: e.target.value})} 
                                placeholder="e.g. Kassa 1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">{t('location')}</label>
                            <select 
                                className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                value={editingRegister?.storeId || ''} 
                                onChange={e => setEditingRegister({...editingRegister, storeId: e.target.value})}
                            >
                                <option value="">{t('selectOption')}</option>
                                {locations.filter(l => l.type === 'STORE').map(l => (
                                    <option key={l.id} value={l.id}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('deviceBrand')}</label>
                                <select 
                                    className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    value={editingRegister?.brand || ''}
                                    onChange={e => setEditingRegister({...editingRegister, brand: e.target.value})}
                                >
                                    <option value="">{t('selectOption')}</option>
                                    {kassaBrands.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">{t('kassaIp')}</label>
                                <input 
                                    className="border p-2 rounded w-full dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={editingRegister?.ipAddress || ''} 
                                    onChange={e => setEditingRegister({...editingRegister, ipAddress: e.target.value})}
                                    placeholder="192.168.1.xxx" 
                                />
                            </div>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                        <button onClick={() => setShowRegisterModal(false)} className="px-4 py-2 border rounded dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">{t('cancel')}</button>
                        <button onClick={handleSaveRegister} className="px-4 py-2 bg-primary text-white rounded">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
