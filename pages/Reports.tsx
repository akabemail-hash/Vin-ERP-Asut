import React, { useState, useMemo } from 'react';
import { useStore } from '../context/StoreContext';
import { getTranslation } from '../utils/i18n';
import { FileText, Calendar, Filter, Download, Package, Wallet, Landmark, ChevronDown, Printer, ShoppingCart, Truck, RefreshCcw, Eye, X, TrendingUp, DollarSign, TrendingDown, Activity } from 'lucide-react';
import { Pagination } from '../components/Pagination';

export const Reports = () => {

const { language, products, invoices, locations, transactions, customers, suppliers, settings, categories } = useStore();
const t = (key: string) => getTranslation(language, key);

const [activeTab, setActiveTab] = useState<'summary' | 'stock' | 'sales' | 'purchase' | 'sales_return' | 'purchase_return' | 'cash' | 'bank'>('summary');

const [currentPage, setCurrentPage] = useState(1);
const pageSize = 10;

const today = new Date().toISOString().split('T')[0];
const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const [startDate, setStartDate] = useState(firstDayOfMonth);
const [endDate, setEndDate] = useState(today);
const [selectedLocation, setSelectedLocation] = useState('');

const [transType, setTransType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
const [selectedPartnerId, setSelectedPartnerId] = useState('');
const [partnerSearch, setPartnerSearch] = useState('');
const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);

const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

React.useEffect(() => {
setCurrentPage(1);
}, [activeTab, startDate, endDate, selectedLocation, transType, selectedPartnerId, paymentFilter]);

/* SUMMARY */

const summaryData = useMemo(() => {

if (activeTab !== 'summary') return null;

const dateCheck = (date: string) => date >= startDate && date <= endDate + 'T23:59:59';

const salesInvoices = invoices.filter(i => i.type === 'SALE' && dateCheck(i.date));
const totalSales = salesInvoices.reduce((sum, i) => sum + i.total, 0);

const totalSalesReturn = invoices
.filter(i => i.type === 'SALE_RETURN' && dateCheck(i.date))
.reduce((sum, i) => sum + i.total, 0);

const totalPurchases = invoices
.filter(i => i.type === 'PURCHASE' && dateCheck(i.date))
.reduce((sum, i) => sum + i.total, 0);

const totalPurchReturn = invoices
.filter(i => i.type === 'PURCHASE_RETURN' && dateCheck(i.date))
.reduce((sum, i) => sum + i.total, 0);

const cashExpenses = transactions
.filter(t => t.type === 'EXPENSE' && t.source === 'CASH_REGISTER' && dateCheck(t.date) && !t.relatedInvoiceId)
.reduce((sum, t) => sum + t.amount, 0);

const netSales = totalSales - totalSalesReturn;
const netPurchases = totalPurchases - totalPurchReturn;

const totalExpenses = netPurchases + cashExpenses;

const netResult = netSales - totalExpenses;

return {
totalSales,
totalSalesReturn,
totalPurchases,
totalPurchReturn,
cashExpenses,
netResult
};

}, [invoices, transactions, startDate, endDate, activeTab]);

/* STOCK REPORT */

const stockReportData = useMemo(() => {

return products.filter(p => {

if (selectedLocation) {
if (!p.locationId) return false;
return p.locationId === selectedLocation;
}

return true;

});

}, [products, selectedLocation]);

const totalStockValue = useMemo(() => {

return stockReportData.reduce((sum, p) => {

const qty = Number(p.stock) || 0;
const cost = Number(p.stockValueBuy) || 0;

return sum + qty * cost;

}, 0);

}, [stockReportData]);

/* INVOICE REPORT */

const invoiceReportData = useMemo(() => {

let type = '';

if (activeTab === 'sales') type = 'SALE';
else if (activeTab === 'purchase') type = 'PURCHASE';
else if (activeTab === 'sales_return') type = 'SALE_RETURN';
else if (activeTab === 'purchase_return') type = 'PURCHASE_RETURN';
else return [];

return invoices.filter(inv => {

const dateMatch = inv.date >= startDate && inv.date <= endDate + 'T23:59:59';
const typeMatch = inv.type === type;
const partnerMatch = selectedPartnerId ? inv.partnerId === selectedPartnerId : true;
const paymentMatch = paymentFilter === 'ALL' || inv.paymentMethod === paymentFilter;

return dateMatch && typeMatch && partnerMatch && paymentMatch;

}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

}, [invoices, activeTab, startDate, endDate, selectedPartnerId, paymentFilter]);

/* FINANCE */

const financeReportData = useMemo(() => {

let source = '';

if (activeTab === 'cash') source = 'CASH_REGISTER';
else if (activeTab === 'bank') source = 'BANK';
else return [];

return transactions.filter(tr => {

const dateMatch = tr.date >= startDate && tr.date <= endDate + 'T23:59:59';
const sourceMatch = tr.source === source;
const typeMatch = transType === 'ALL' || tr.type === transType;

return dateMatch && sourceMatch && typeMatch;

}).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

}, [transactions, activeTab, startDate, endDate, transType]);

const currentData =
activeTab === 'stock'
? stockReportData
: ['sales','purchase','sales_return','purchase_return'].includes(activeTab)
? invoiceReportData
: financeReportData;

const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

const handleExport = () => {

const csvContent =
"data:text/csv;charset=utf-8," +
currentData.map(row => Object.values(row).join(",")).join("\n");

const encodedUri = encodeURI(csvContent);
const link = document.createElement("a");

link.setAttribute("href", encodedUri);
link.setAttribute("download", `${activeTab}_report.csv`);

document.body.appendChild(link);

link.click();

document.body.removeChild(link);

};

return (

<div className="space-y-6">

<h2 className="text-2xl font-bold text-gray-900 dark:text-white">
{t('reports')}
</h2>

{/* STOCK VALUE CARD */}

{activeTab === 'stock' && (

<div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border flex justify-between items-center">

<div className="flex items-center space-x-2">

<Package size={20} className="text-primary"/>

<span className="font-bold">
Total Stock Value
</span>

</div>

<div className="text-xl font-bold text-primary">

{settings.currency}{totalStockValue.toFixed(2)}

</div>

</div>

)}

</div>

);

};
