
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { 
  LayoutDashboard, ShoppingCart, Package, Users, FileText, Settings, 
  LogOut, Menu, X, Globe, DollarSign, Truck, ArrowLeftRight, Moon, Sun, User as UserIcon, Lock, Wallet, Bell, ChevronLeft, ChevronRight, ChevronDown,
  Maximize, Minimize, Briefcase, Calculator, RefreshCcw
} from 'lucide-react';
import { Permission } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

// --- Flag Icon Component ---
export const FlagIcon = ({ lang, size = 24, className = "" }: { lang: string, size?: number, className?: string }) => {
  const common = `rounded-full object-cover shadow-sm ring-1 ring-gray-100 dark:ring-gray-700 ${className}`;
  
  switch (lang) {
    case 'tr': // Turkey
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={common} xmlns="http://www.w3.org/2000/svg">
          <mask id="maskTr"><rect width="32" height="32" rx="16" fill="white" /></mask>
          <g mask="url(#maskTr)">
            <rect width="32" height="32" fill="#E30A17" />
            <circle cx="13" cy="16" r="6" fill="white" />
            <circle cx="14.5" cy="16" r="4.8" fill="#E30A17" />
            <g transform="translate(19, 16) rotate(-15)">
               <polygon points="0,-4 1.2,-1.3 4,-1.3 1.8,0.5 2.5,3.3 0,1.7 -2.5,3.3 -1.8,0.5 -4,-1.3 -1.2,-1.3" fill="white" transform="scale(0.9)"/>
            </g>
          </g>
        </svg>
      );
    case 'az': // Azerbaijan
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={common} xmlns="http://www.w3.org/2000/svg">
          <mask id="maskAz"><rect width="32" height="32" rx="16" fill="white" /></mask>
          <g mask="url(#maskAz)">
            <rect y="0" width="32" height="10.6" fill="#0092BC" />
            <rect y="10.6" width="32" height="10.6" fill="#E4002B" />
            <rect y="21.2" width="32" height="10.8" fill="#00AF66" />
            <circle cx="16" cy="16" r="3" fill="white" />
            <circle cx="17" cy="16" r="2.5" fill="#E4002B" />
            <path d="M18.5 16 l1 -1 l-1 2 z" fill="white" />
          </g>
        </svg>
      );
    case 'ru': // Russia
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={common} xmlns="http://www.w3.org/2000/svg">
          <mask id="maskRu"><rect width="32" height="32" rx="16" fill="white" /></mask>
          <g mask="url(#maskRu)">
            <rect y="0" width="32" height="10.6" fill="#FFFFFF" />
            <rect y="10.6" width="32" height="10.6" fill="#0039A6" />
            <rect y="21.2" width="32" height="10.8" fill="#D52B1E" />
          </g>
        </svg>
      );
    case 'uz': // Uzbekistan
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={common} xmlns="http://www.w3.org/2000/svg">
          <mask id="maskUz"><rect width="32" height="32" rx="16" fill="white" /></mask>
          <g mask="url(#maskUz)">
            <rect y="0" width="32" height="10" fill="#0099B5" />
            <rect y="10" width="32" height="1" fill="#CE1126" />
            <rect y="11" width="32" height="10" fill="#FFFFFF" />
            <rect y="21" width="32" height="1" fill="#CE1126" />
            <rect y="22" width="32" height="10" fill="#1EB53A" />
            <circle cx="8" cy="5" r="2" fill="white" />
            <circle cx="9" cy="5" r="1.5" fill="#0099B5" />
          </g>
        </svg>
      );
    case 'en': // UK/English
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" className={common} xmlns="http://www.w3.org/2000/svg">
           <mask id="maskEn"><rect width="32" height="32" rx="16" fill="white" /></mask>
           <g mask="url(#maskEn)">
             <rect width="32" height="32" fill="#012169"/>
             <path d="M0,0 L32,32 M32,0 L0,32" stroke="white" strokeWidth="4"/>
             <path d="M0,0 L32,32 M32,0 L0,32" stroke="#C8102E" strokeWidth="2"/>
             <path d="M16,0 L16,32 M0,16 L32,16" stroke="white" strokeWidth="6"/>
             <path d="M16,0 L16,32 M0,16 L32,16" stroke="#C8102E" strokeWidth="3"/>
           </g>
        </svg>
      );
  }
};

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate }) => {
  const { language, setLanguage, logout, currentUser, settings, darkMode, toggleTheme, updateUserProfile, checkPermission } = useStore();
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  
  // User Dropdown & Modal State
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  // Fullscreen State
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Profile Form State
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [newPassword, setNewPassword] = useState('');

  const t = (key: string) => getTranslation(language, key);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(e => console.error(e));
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('dashboard'), perm: 'view_dashboard' },
    { id: 'pos', icon: ShoppingCart, label: t('pos'), perm: 'view_pos' },
    { id: 'products', icon: Package, label: t('products'), perm: 'view_products' },
    { id: 'sales', icon: DollarSign, label: t('sales'), perm: 'view_sales' },
    { id: 'purchases', icon: Truck, label: t('purchases'), perm: 'view_purchases' },
    { id: 'returns', icon: RefreshCcw, label: t('returns'), perm: 'view_returns' },
    { id: 'finance', icon: Wallet, label: t('finance'), perm: 'view_finance' },
    { id: 'accounting', icon: Calculator, label: t('accounting'), perm: 'view_accounting' },
    { id: 'transfer', icon: ArrowLeftRight, label: t('stockTransfer'), perm: 'view_transfer' },
    { id: 'hr', icon: Briefcase, label: t('hr'), perm: 'view_hr' },
    { id: 'partners', icon: Users, label: t('customer') + ' / ' + t('supplier'), perm: 'view_partners' },
    { id: 'reports', icon: FileText, label: t('reports'), perm: 'view_reports' },
    { id: 'admin', icon: Settings, label: t('admin'), perm: 'view_admin' },
  ];

  const visibleNavItems = navItems.filter(item => checkPermission(item.perm as Permission));

  const handleOpenProfile = () => {
      setFirstName(currentUser?.firstName || '');
      setLastName(currentUser?.lastName || '');
      setPhone(currentUser?.phone || '');
      setNewPassword('');
      setShowProfileModal(true);
      setShowUserMenu(false);
  };

  const handleSaveProfile = () => {
      if(currentUser) {
          updateUserProfile(currentUser.id, {
              firstName, lastName, phone, 
              ...(newPassword ? { password: newPassword } : {})
          });
      }
      setShowProfileModal(false);
      alert("Profile updated!");
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100 font-sans">
      {/* Professional Corporate Sidebar */}
      <aside 
        className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-slate-900 text-slate-300 transition-all duration-300 ease-in-out flex flex-col shadow-2xl z-20 relative`}
      >
        {/* Brand Section */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/50">
            {isSidebarOpen ? (
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary/50">
                        V
                    </div>
                    <span className="font-bold text-xl text-white tracking-tight">{settings.companyName || 'VinERP-POS'}</span>
                </div>
            ) : (
                <div className="mx-auto w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-xl">V</div>
            )}
            <button 
                onClick={() => setSidebarOpen(!isSidebarOpen)} 
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 lg:block hidden"
            >
                {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
            </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1 scrollbar-hide">
            <p className={`px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'text-center'}`}>
                {isSidebarOpen ? 'Menu' : '...'}
            </p>
            {visibleNavItems.map(item => (
                <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                        ${activePage === item.id 
                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                            : 'hover:bg-slate-800 hover:text-white'}`}
                >
                    <item.icon 
                        size={20} 
                        className={`min-w-[20px] transition-colors ${activePage === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} 
                    />
                    {isSidebarOpen && <span className="ml-3 font-medium text-sm tracking-wide">{item.label}</span>}
                    {!isSidebarOpen && (
                        <div className="absolute left-full top-2 ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-xl border border-slate-700">
                            {item.label}
                        </div>
                    )}
                </button>
            ))}
        </nav>

        {/* User Mini Profile (Bottom Sidebar) */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/30">
            <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'}`}>
                <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
                        {currentUser?.firstName?.charAt(0) || currentUser?.username?.charAt(0).toUpperCase()}
                    </div>
                    {isSidebarOpen && (
                        <div className="ml-3">
                            <p className="text-sm font-semibold text-white leading-none">{currentUser?.firstName || currentUser?.username}</p>
                            <p className="text-xs text-slate-500 mt-1 capitalize">{currentUser?.role.toLowerCase()}</p>
                        </div>
                    )}
                </div>
                {isSidebarOpen && (
                    <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors p-2 rounded hover:bg-slate-800" title={t('logout')}>
                        <LogOut size={18} />
                    </button>
                )}
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50/50 dark:bg-gray-900">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 h-16 flex items-center justify-between px-6 z-10 sticky top-0">
            {/* Page Title / Breadcrumb Placeholder */}
            <div className="flex items-center">
                <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden mr-4 text-gray-500">
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white capitalize tracking-tight">
                    {navItems.find(n => n.id === activePage)?.label}
                </h1>
            </div>
            
            {/* Right Actions */}
            <div className="flex items-center space-x-3 md:space-x-5">
                {/* POS Button */}
                {checkPermission('view_pos') && (
                    <button 
                        onClick={() => onNavigate('pos')}
                        className="hidden md:flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-full shadow-md transition-all transform hover:scale-105"
                    >
                        <ShoppingCart size={18} className="mr-2" />
                        <span className="font-bold text-sm">{t('pos')}</span>
                    </button>
                )}

                {/* Theme & Language & Fullscreen */}
                <div className="flex items-center space-x-2 border-r border-gray-200 dark:border-gray-700 pr-4">
                    <button 
                        onClick={toggleFullscreen}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors hidden md:block"
                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>

                    <button 
                        onClick={toggleTheme}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        title={darkMode ? t('lightMode') : t('darkMode')}
                    >
                        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    
                    <div className="relative group flex items-center">
                        <div className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full cursor-pointer flex items-center space-x-1">
                            <FlagIcon lang={language} size={24} />
                            <ChevronDown size={14} className="text-gray-400" />
                        </div>
                        {/* Custom Dropdown for Language */}
                        <select 
                            value={language} 
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                            <option value="en">English</option>
                            <option value="tr">Türkçe</option>
                            <option value="az">Azərbaycan</option>
                            <option value="ru">Русский</option>
                            <option value="uz">Oʻzbek</option>
                        </select>
                    </div>
                </div>

                {/* Notifications (Mock) */}
                <button className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full relative">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                {/* Profile Dropdown Trigger */}
                <div className="relative">
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full p-1 pr-3 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                    >
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                            <UserIcon size={18} className="text-slate-500 dark:text-slate-300" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:block">
                            {currentUser?.firstName || 'User'}
                        </span>
                        <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl py-2 border border-gray-100 dark:border-gray-700 z-50 transform origin-top-right transition-all">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800">
                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{currentUser?.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize truncate">{currentUser?.role.toLowerCase()}</p>
                            </div>
                            <button 
                                onClick={handleOpenProfile}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center"
                            >
                                <Settings size={16} className="mr-2 text-gray-400"/> {t('profile')}
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                            <button 
                                onClick={logout}
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                            >
                                <LogOut size={16} className="mr-2"/> {t('logout')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>

        {/* Main Content Scrollable */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900 p-6 scroll-smooth">
            <div className="max-w-7xl mx-auto w-full">
                {children}
            </div>
        </main>
      </div>

      {/* PROFILE MODAL (Styled) */}
      {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                      <h3 className="font-bold text-lg dark:text-white flex items-center">
                          <UserIcon size={20} className="mr-2 text-primary"/> {t('editProfile')}
                      </h3>
                      <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  <div className="p-6 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">{t('firstName')}</label>
                              <input 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none dark:bg-gray-900 dark:text-white transition-all"
                                value={firstName}
                                onChange={e => setFirstName(e.target.value)}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">{t('lastName')}</label>
                              <input 
                                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none dark:bg-gray-900 dark:text-white transition-all"
                                value={lastName}
                                onChange={e => setLastName(e.target.value)}
                              />
                          </div>
                      </div>
                      <div>
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5">{t('phone')}</label>
                          <input 
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none dark:bg-gray-900 dark:text-white transition-all"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                          />
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                          <label className="block text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1.5 flex items-center">
                              <Lock size={12} className="mr-1"/> {t('newPassword')} <span className="text-gray-400 font-normal normal-case ml-1">(Optional)</span>
                          </label>
                          <input 
                            type="password"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none dark:bg-gray-900 dark:text-white transition-all"
                            placeholder="••••••••"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="p-5 border-t border-gray-100 dark:border-gray-700 flex justify-end space-x-3 bg-gray-50/50 dark:bg-gray-900/50">
                      <button 
                        onClick={() => setShowProfileModal(false)}
                        className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                          {t('cancel')}
                      </button>
                      <button 
                        onClick={handleSaveProfile}
                        className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5"
                      >
                          {t('save')}
                      </button>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 text-center text-xs text-gray-400 border-t border-gray-200 dark:border-gray-700">
                      &copy; 2025 VinERP-POS
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
