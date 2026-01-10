
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { Employee, LeaveRequest } from '../types';
import { Plus, Edit2, Trash2, Search, User, Calendar, Briefcase, FileText, ArrowLeftRight } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const HR = () => {
  const { employees, leaves, addEmployee, updateEmployee, deleteEmployee, addLeave, updateLeave, deleteLeave, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);
  
  const [activeTab, setActiveTab] = useState<'employees' | 'leaves'>('employees');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  
  // Form State
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>({});
  const [editingLeave, setEditingLeave] = useState<Partial<LeaveRequest>>({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredEmployees = employees.filter(e => 
      e.firstName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLeaves = leaves.filter(l => {
      const emp = employees.find(e => e.id === l.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedLeaves = filteredLeaves.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset pagination on tab change
  React.useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // --- Employee Handlers ---
  const handleSaveEmployee = () => {
      if (!editingEmployee.firstName || !editingEmployee.lastName || !editingEmployee.jobTitle) return;

      const employeeData: Employee = {
          id: editingEmployee.id || `emp-${Date.now()}`,
          firstName: editingEmployee.firstName,
          lastName: editingEmployee.lastName,
          phone: editingEmployee.phone || '',
          email: editingEmployee.email || '',
          jobTitle: editingEmployee.jobTitle,
          salary: Number(editingEmployee.salary) || 0,
          description: editingEmployee.description || '',
          joinDate: editingEmployee.joinDate || new Date().toISOString().split('T')[0],
          isActive: editingEmployee.isActive !== undefined ? editingEmployee.isActive : true
      };

      if (editingEmployee.id) updateEmployee(employeeData);
      else addEmployee(employeeData);

      setIsEmpModalOpen(false);
      setEditingEmployee({});
  };

  const handleDeleteEmployee = (id: string) => {
      if(confirm(t('deleteConfirm'))) deleteEmployee(id);
  };

  // --- Leave Handlers ---
  const handleSaveLeave = () => {
      if (!editingLeave.employeeId || !editingLeave.startDate || !editingLeave.endDate) return;

      const leaveData: LeaveRequest = {
          id: editingLeave.id || `leave-${Date.now()}`,
          employeeId: editingLeave.employeeId,
          type: editingLeave.type || 'VACATION',
          startDate: editingLeave.startDate,
          endDate: editingLeave.endDate,
          reason: editingLeave.reason || '',
          status: editingLeave.status || 'PENDING'
      };

      if (editingLeave.id) updateLeave(leaveData);
      else addLeave(leaveData);

      setIsLeaveModalOpen(false);
      setEditingLeave({});
  };

  const handleDeleteLeave = (id: string) => {
      if(confirm(t('deleteConfirm'))) deleteLeave(id);
  };

  // --- Render ---
  return (
    <div className="space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t('hr')}</h2>
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => { setActiveTab('employees'); setSearchQuery(''); }}
                    className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'employees' ? 'border-primary text-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <User size={20} className="mr-2"/> {t('employees')}
                </button>
                <button 
                    onClick={() => { setActiveTab('leaves'); setSearchQuery(''); }}
                    className={`flex items-center px-6 py-3 font-bold transition-all border-b-2 ${activeTab === 'leaves' ? 'border-primary text-primary bg-blue-50/50 dark:bg-blue-900/20' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    <Calendar size={20} className="mr-2"/> {t('leaveManagement')}
                </button>
            </div>
        </div>

        {/* Actions & Search */}
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            {activeTab === 'employees' ? (
                <button onClick={() => { setEditingEmployee({}); setIsEmpModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow">
                    <Plus size={18} className="mr-2" /> {t('addEmployee')}
                </button>
            ) : (
                <button onClick={() => { setEditingLeave({}); setIsLeaveModalOpen(true); }} className="bg-primary text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow">
                    <Plus size={18} className="mr-2" /> {t('newLeaveRequest')}
                </button>
            )}
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
                {activeTab === 'employees' ? (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-sm uppercase">
                            <tr>
                                <th className="p-4">{t('name')}</th>
                                <th className="p-4">{t('jobTitle')}</th>
                                <th className="p-4">{t('salary')}</th>
                                <th className="p-4">{t('phone')}</th>
                                <th className="p-4">{t('joinDate')}</th>
                                <th className="p-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedEmployees.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('noRecords')}</td></tr>
                            ) : (
                                paginatedEmployees.map(emp => (
                                    <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 dark:text-white">{emp.firstName} {emp.lastName}</div>
                                            <div className="text-xs text-gray-500">{emp.email}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded text-xs font-bold">{emp.jobTitle}</span>
                                        </td>
                                        <td className="p-4 font-bold text-green-600">{settings.currency}{emp.salary.toFixed(2)}</td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{emp.phone}</td>
                                        <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{emp.joinDate}</td>
                                        <td className="p-4 text-right flex justify-end space-x-2">
                                            <button onClick={() => { setEditingEmployee(emp); setIsEmpModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={16}/></button>
                                            <button onClick={() => handleDeleteEmployee(emp.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-sm uppercase">
                            <tr>
                                <th className="p-4">{t('name')}</th>
                                <th className="p-4">{t('leaveType')}</th>
                                <th className="p-4">{t('startDate')} - {t('endDate')}</th>
                                <th className="p-4">{t('status')}</th>
                                <th className="p-4">{t('reason')}</th>
                                <th className="p-4 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {paginatedLeaves.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">{t('noRecords')}</td></tr>
                            ) : (
                                paginatedLeaves.map(leave => {
                                    const emp = employees.find(e => e.id === leave.employeeId);
                                    const diffTime = Math.abs(new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime());
                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
                                    
                                    return (
                                        <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">{emp?.firstName} {emp?.lastName}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    leave.type === 'SICK' ? 'bg-red-100 text-red-800' :
                                                    leave.type === 'VACATION' ? 'bg-green-100 text-green-800' :
                                                    leave.type === 'UNPAID' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {t(leave.type === 'SICK' ? 'sickLeave' : leave.type === 'VACATION' ? 'vacation' : leave.type === 'UNPAID' ? 'leaveUnpaid' : 'other')}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                                {leave.startDate} <ArrowLeftRight size={12} className="inline mx-1"/> {leave.endDate}
                                                <span className="ml-2 text-xs text-gray-400">({diffDays} {t('days')})</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs border ${
                                                    leave.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                                                    leave.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                }`}>
                                                    {t(leave.status.toLowerCase())}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-500 truncate max-w-xs">{leave.reason}</td>
                                            <td className="p-4 text-right flex justify-end space-x-2">
                                                <button onClick={() => { setEditingLeave(leave); setIsLeaveModalOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={16}/></button>
                                                <button onClick={() => handleDeleteLeave(leave.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            <Pagination 
                currentPage={currentPage} 
                totalItems={activeTab === 'employees' ? filteredEmployees.length : filteredLeaves.length} 
                pageSize={pageSize} 
                onPageChange={setCurrentPage} 
            />
        </div>

        {/* EMPLOYEE MODAL */}
        {isEmpModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2">
                        {editingEmployee.id ? t('editEmployee') : t('addEmployee')}
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('firstName')}</label>
                                <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.firstName || ''} onChange={e => setEditingEmployee({...editingEmployee, firstName: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('lastName')}</label>
                                <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.lastName || ''} onChange={e => setEditingEmployee({...editingEmployee, lastName: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('jobTitle')}</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input 
                                    className="w-full pl-10 border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    value={editingEmployee.jobTitle || ''} 
                                    onChange={e => setEditingEmployee({...editingEmployee, jobTitle: e.target.value})} 
                                    placeholder="e.g. Sales Manager"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('salary')}</label>
                                <input type="number" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.salary || ''} onChange={e => setEditingEmployee({...editingEmployee, salary: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('joinDate')}</label>
                                <input type="date" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.joinDate || ''} onChange={e => setEditingEmployee({...editingEmployee, joinDate: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('phone')}</label>
                                <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.phone || ''} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('email')}</label>
                                <input className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingEmployee.email || ''} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('employeeDesc')}</label>
                            <textarea 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                rows={3}
                                value={editingEmployee.description || ''} 
                                onChange={e => setEditingEmployee({...editingEmployee, description: e.target.value})}
                            ></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                        <button onClick={() => setIsEmpModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">{t('cancel')}</button>
                        <button onClick={handleSaveEmployee} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 shadow">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}

        {/* LEAVE MODAL */}
        {isLeaveModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white border-b pb-2">
                        {editingLeave.id ? t('edit') : t('newLeaveRequest')}
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('employees')}</label>
                            <select 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={editingLeave.employeeId || ''}
                                onChange={e => setEditingLeave({...editingLeave, employeeId: e.target.value})}
                            >
                                <option value="">{t('selectEmployee')}</option>
                                {employees.map(e => (
                                    <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('leaveType')}</label>
                            <select 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={editingLeave.type || 'VACATION'}
                                onChange={e => setEditingLeave({...editingLeave, type: e.target.value as any})}
                            >
                                <option value="VACATION">{t('vacation')}</option>
                                <option value="SICK">{t('sickLeave')}</option>
                                <option value="UNPAID">{t('leaveUnpaid')}</option>
                                <option value="OTHER">{t('other')}</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('startDate')}</label>
                                <input type="date" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingLeave.startDate || ''} onChange={e => setEditingLeave({...editingLeave, startDate: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('endDate')}</label>
                                <input type="date" className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" value={editingLeave.endDate || ''} onChange={e => setEditingLeave({...editingLeave, endDate: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('status')}</label>
                            <select 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={editingLeave.status || 'PENDING'}
                                onChange={e => setEditingLeave({...editingLeave, status: e.target.value as any})}
                            >
                                <option value="PENDING">{t('pending')}</option>
                                <option value="APPROVED">{t('approved')}</option>
                                <option value="REJECTED">{t('rejected')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('reason')}</label>
                            <textarea 
                                className="w-full border p-2 rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                rows={2}
                                value={editingLeave.reason || ''} 
                                onChange={e => setEditingLeave({...editingLeave, reason: e.target.value})}
                            ></textarea>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3 border-t pt-4">
                        <button onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white">{t('cancel')}</button>
                        <button onClick={handleSaveLeave} className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700 shadow">{t('save')}</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
