
import React, { useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Layout, FlagIcon } from './components/Layout';
import { POS } from './pages/POS';
import { Inventory } from './pages/Inventory';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Partners } from './pages/Partners';
import { Sales } from './pages/Sales';
import { Purchases } from './pages/Purchases';
import { StockTransfer } from './pages/StockTransfer';
import { Finance } from './pages/Finance';
import { Accounting } from './pages/Accounting';
import { HR } from './pages/HR';
import { Reports } from './pages/Reports';
import { Returns } from './pages/Returns';
import { getTranslation } from './utils/i18n';
import { Hexagon, User, Lock, ArrowRight, ShieldCheck, Sun, Moon, ChevronDown } from 'lucide-react';

const AppContent = () => {
  const { currentUser, login, language, setLanguage, darkMode, toggleTheme } = useStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [activePage, setActivePage] = useState('dashboard');
  const [loginError, setLoginError] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = (key: string) => getTranslation(language, key);

  const handleLogin = async () => {
      setLoading(true);
      setLoginError(false);
      const success = await login(username, password);
      setLoading(false);
      if(!success) setLoginError(true);
  };

  // Modern Corporate Login View
  if (!currentUser) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors duration-200 relative">
        
        {/* Top Right Controls (Language & Theme) */}
        <div className="absolute top-6 right-6 flex items-center space-x-4 z-50">
             <button 
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={darkMode ? t('lightMode') : t('darkMode')}
            >
                {darkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-full shadow-sm px-3 py-2 border border-gray-200 dark:border-gray-700 relative">
                <div className="flex items-center space-x-2">
                    <FlagIcon lang={language} size={24} />
                    <ChevronDown size={14} className="text-gray-400" />
                </div>
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

        {/* Left Side - Brand / Marketing */}
        <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-900 relative overflow-hidden items-center justify-center p-12 text-white">
            {/* Abstract Background Shapes */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-3xl"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-400 blur-3xl"></div>
            </div>

            <div className="relative z-10 max-w-lg">
                <div className="flex items-center space-x-3 mb-8">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                        <Hexagon size={40} className="text-white fill-indigo-500/50" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">VinERP-POS</h1>
                </div>
                
                <h2 className="text-3xl font-bold mb-6 leading-tight">{t('marketingTitle')}</h2>
                
                <p className="text-indigo-200 text-lg mb-8 leading-relaxed">
                    {t('marketingDesc')}
                </p>

                <div className="flex flex-col space-y-4">
                    <div className="flex items-center space-x-3 text-indigo-100">
                        <div className="p-1 bg-green-500/20 rounded-full"><ShieldCheck size={18} className="text-green-400"/></div>
                        <span>{t('featureSecure')}</span>
                    </div>
                    <div className="flex items-center space-x-3 text-indigo-100">
                         <div className="p-1 bg-blue-500/20 rounded-full"><ShieldCheck size={18} className="text-blue-400"/></div>
                        <span>{t('featureSync')}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center lg:text-left">
                    <div className="inline-flex lg:hidden items-center space-x-2 mb-8">
                        <Hexagon size={32} className="text-primary fill-primary/20" />
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">VinERP-POS</span>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('loginTitle')}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{t('welcomeBack')}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                    {loginError && (
                        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
                            {t('loginError')}
                        </div>
                    )}
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('username')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User size={20} className="text-gray-400" />
                                </div>
                                <input 
                                    type="text" 
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder={t('enterUsername')}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleLogin();
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('password')}</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-gray-400" />
                                </div>
                                <input 
                                    type="password" 
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-gray-50 dark:bg-gray-700 dark:text-white transition-all"
                                    placeholder={t('enterPasswordPlaceholder')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleLogin();
                                    }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" />
                                <span className="ml-2 text-gray-600 dark:text-gray-400">{t('rememberMe')}</span>
                            </label>
                            <a href="#" className="font-medium text-primary hover:text-indigo-500">{t('forgotPassword')}</a>
                        </div>

                        <button 
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? '...' : <>{t('login')} <ArrowRight size={18} className="ml-2" /></>}
                        </button>
                    </div>

                </div>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                    &copy; {new Date().getFullYear()} VinERP-POS. All rights reserved.
                </p>
            </div>
        </div>
      </div>
    );
  }

  // Main App Router (Simple Switch)
  const renderPage = () => {
    switch (activePage) {
        case 'dashboard': return <Dashboard />;
        case 'pos': return <POS />;
        case 'products': return <Inventory />;
        case 'sales': return <Sales />;
        case 'purchases': return <Purchases />;
        case 'returns': return <Returns />;
        case 'finance': return <Finance />;
        case 'accounting': return <Accounting />;
        case 'transfer': return <StockTransfer />;
        case 'partners': return <Partners />;
        case 'admin': return <Admin />;
        case 'hr': return <HR />;
        case 'reports': return <Reports />; 
        default: return <Dashboard />;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
        {renderPage()}
    </Layout>
  );
};

const App = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
