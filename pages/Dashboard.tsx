
import React from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { DollarSign, TrendingUp, TrendingDown, Package, User, ArrowUpRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const Dashboard = () => {
  const { invoices, products, customers, transactions, language, settings } = useStore();
  const t = (key: string) => getTranslation(language, key);

  const totalSales = invoices.filter(i => i.type === 'SALE').reduce((sum, i) => sum + i.total, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const cashBalance = transactions.filter(t => t.source === 'CASH_REGISTER').reduce((acc, t) => t.type === 'INCOME' ? acc + t.amount : acc - t.amount, 0);

  // Mock Data for Chart
  const chartData = [
    { name: 'Mon', sales: 400 },
    { name: 'Tue', sales: 300 },
    { name: 'Wed', sales: 550 },
    { name: 'Thu', sales: 450 },
    { name: 'Fri', sales: 600 },
    { name: 'Sat', sales: 800 },
    { name: 'Sun', sales: 200 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{t('dashboard')}</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('dashboardOverview')}</p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-1 rounded-md border border-gray-200 dark:border-gray-700 shadow-sm">
              {t('today')}: {new Date().toLocaleDateString()}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title={t('totalSales')} 
            value={`${settings.currency}${totalSales.toFixed(2)}`} 
            icon={<DollarSign className="text-white" size={24} />} 
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600" 
            trendLabel={t('new')}
            trendValue="+12.5%"
            t={t}
        />
        <StatCard 
            title={t('cashRegister')} 
            value={`${settings.currency}${cashBalance.toFixed(2)}`} 
            icon={<TrendingUp className="text-white" size={24} />} 
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600" 
            trendLabel={t('new')}
            trendValue="+5.2%"
            t={t}
        />
        <StatCard 
            title={t('totalStock')} 
            value={totalStock} 
            icon={<Package className="text-white" size={24} />} 
            gradient="bg-gradient-to-br from-purple-500 to-violet-600" 
            trendValue="Stable"
            t={t}
        />
        <StatCard 
            title={t('customers')} 
            value={customers.length} 
            icon={<User className="text-white" size={24} />} 
            gradient="bg-gradient-to-br from-orange-400 to-red-500" 
            trendLabel={t('new')}
            trendValue="+3"
            t={t}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('weeklySales')}</h3>
            </div>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 12 }} 
                            dy={10}
                        />
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 12 }} 
                        />
                        <Tooltip 
                            cursor={{ fill: '#f3f4f6' }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Bar 
                            dataKey="sales" 
                            fill="#6366f1" 
                            radius={[4, 4, 0, 0]} 
                            barSize={40}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-6">{t('recentTransactions')}</h3>
            <div className="space-y-4">
                {transactions.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-10">{t('noTransactions')}</p>
                ) : (
                    transactions.slice(-6).reverse().map(t => (
                        <div key={t.id} className="flex justify-between items-start pb-4 border-b border-gray-50 dark:border-gray-700 last:border-0 last:pb-0">
                            <div className="flex items-start">
                                <div className={`p-2 rounded-full mr-3 ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'INCOME' ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                                </div>
                                <div>
                                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200 line-clamp-1">{t.description}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.date).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <span className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'INCOME' ? '+' : '-'}{settings.currency}{t.amount.toFixed(2)}
                            </span>
                        </div>
                    ))
                )}
            </div>
            <button className="w-full mt-6 py-2 text-sm text-center text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg transition-colors">
                {t('viewAllTransactions')}
            </button>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, gradient, trendValue, trendLabel, t }: any) => (
    <div className={`p-6 rounded-xl shadow-lg text-white ${gradient} relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}>
        <div className="relative z-10 flex justify-between items-start">
            <div>
                <p className="text-blue-100 text-sm font-medium mb-1">{title}</p>
                <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
            </div>
            <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                {icon}
            </div>
        </div>
        <div className="relative z-10 mt-4 flex items-center text-xs font-medium text-blue-50">
            {trendValue && (
                <>
                    <span className="bg-white/20 px-2 py-0.5 rounded mr-2 flex items-center">
                        <ArrowUpRight size={12} className="mr-1"/> {trendValue} {trendLabel}
                    </span>
                    <span>{t('fromLastMonth')}</span>
                </>
            )}
        </div>
        {/* Decorative Circle */}
        <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full group-hover:scale-110 transition-transform duration-500"></div>
    </div>
);
