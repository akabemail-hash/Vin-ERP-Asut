
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Language, User, Product, Category, Brand, Unit, Location, 
  CashRegister, Invoice, Transaction, AppSettings, 
  Customer, Supplier, Employee, LeaveRequest, 
  TransferDocument, Account, Role, Permission, UserRole,
  BankAccount, ExpenseCategory,
  PaymentMethod
} from '../types';

// Initial Empty States
const INITIAL_SETTINGS: AppSettings = {
  currency: '$',
  allowNegativeStock: true,
  themeColor: 'blue',
  baseFontSize: 14,
  companyName: 'VinERP Corp',
  companyVoen: '',
  companyPhone: '',
  companyLogo: '',
  kassaConfig: { ip: '', selectedBrand: '' }
};

interface StoreContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser: User | null;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (id: string, data: Partial<User>) => void;
  checkPermission: (perm: Permission) => boolean;
  
  settings: AppSettings;
  updateSettings: (s: AppSettings) => void;
  darkMode: boolean;
  toggleTheme: () => void;

  products: Product[];
  addProduct: (p: Product) => void;
  addProducts: (ps: Product[]) => void;
  updateProduct: (p: Product) => void;
  
  categories: Category[];
  addCategory: (c: Category) => void;
  updateCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  brands: Brand[];
  addBrand: (b: Brand) => void;
  updateBrand: (b: Brand) => void;
  deleteBrand: (id: string) => void;

  units: Unit[];
  addUnit: (u: Unit) => void;
  updateUnit: (u: Unit) => void;
  deleteUnit: (id: string) => void;

  customers: Customer[];
  addCustomer: (c: Customer) => void;
  updateCustomer: (c: Customer) => void;
  deleteCustomer: (id: string) => void;

  suppliers: Supplier[];
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  deleteSupplier: (id: string) => void;

  invoices: Invoice[];
  addInvoice: (i: Invoice) => boolean;
  updateInvoice: (i: Invoice) => boolean;
  deleteInvoice: (id: string) => void;

  transactions: Transaction[];
  addTransaction: (t: Transaction) => void;
  updateTransaction: (t: Transaction) => void;
  deleteTransaction: (id: string) => void;

  expenseCategories: ExpenseCategory[];
  addExpenseCategory: (name: string) => void;
  updateExpenseCategory: (id: string, name: string) => void;
  deleteExpenseCategory: (id: string) => void;

  banks: BankAccount[];
  addBank: (b: BankAccount) => void;
  updateBank: (b: BankAccount) => void;
  deleteBank: (id: string) => void;

  users: User[];
  addUser: (u: User) => void;
  updateUser: (u: User) => void;
  deleteUser: (id: string) => void;

  roles: Role[];
  addRole: (r: Role) => void;
  updateRole: (r: Role) => void;
  deleteRole: (id: string) => void;

  locations: Location[];
  addLocation: (l: Location) => void;
  updateLocation: (l: Location) => void;
  deleteLocation: (id: string) => void;

  cashRegisters: CashRegister[];
  addCashRegister: (cr: CashRegister) => void;
  updateCashRegister: (cr: CashRegister) => void;
  deleteCashRegister: (id: string) => void;

  kassaBrands: string[];
  addKassaBrand: (name: string) => void;
  updateKassaBrand: (oldName: string, newName: string) => void;
  deleteKassaBrand: (name: string) => void;

  employees: Employee[];
  addEmployee: (e: Employee) => void;
  updateEmployee: (e: Employee) => void;
  deleteEmployee: (id: string) => void;

  leaves: LeaveRequest[];
  addLeave: (l: LeaveRequest) => void;
  updateLeave: (l: LeaveRequest) => void;
  deleteLeave: (id: string) => void;

  transfers: TransferDocument[];
  addTransfer: (t: TransferDocument) => boolean;
  updateTransfer: (t: TransferDocument) => boolean;
  deleteTransfer: (id: string) => void;

  accounts: Account[];
  addAccount: (a: Account) => void;
  updateAccount: (a: Account) => void;
  deleteAccount: (id: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Helper to map DB user (snake_case) to App User (camelCase)
const mapUser = (u: any): User => ({
    id: u.id,
    username: u.username,
    password: u.password,
    firstName: u.first_name,
    lastName: u.last_name,
    phone: u.phone,
    roleId: u.role_id,
    role: (u.role_id === 'admin_role' || u.role_id?.includes('admin')) ? UserRole.ADMIN : UserRole.STAFF,
    allowedStoreIds: u.allowed_store_ids || [], // Default to empty array if null
    allowedWarehouseIds: u.allowed_warehouse_ids || [], // Default to empty array if null
    assignedCashRegisterId: u.assigned_cash_register_id
});

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [kassaBrands, setKassaBrands] = useState<string[]>(['Epson', 'Sunmi', 'Star', 'Generic']);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [transfers, setTransfers] = useState<TransferDocument[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    try {
      const { data: sData } = await supabase.from('settings').select('*').single();
      if(sData) {
          setSettings({
              ...sData,
              kassaConfig: sData.kassa_config || { ip: '', selectedBrand: '' }
          });
      }

      const { data: rData } = await supabase.from('roles').select('*');
      if(rData) setRoles(rData);

      const { data: uData } = await supabase.from('app_users').select('*');
      if(uData) {
          setUsers(uData.map(mapUser));
      }

      const { data: lData } = await supabase.from('locations').select('*');
      if(lData) setLocations(lData);

      const { data: catData } = await supabase.from('categories').select('*');
      if(catData) setCategories(catData);

      const { data: brData } = await supabase.from('brands').select('*');
      if(brData) setBrands(brData);

      const { data: unData } = await supabase.from('units').select('*');
      if(unData) setUnits(unData);

      // Fetch Products with Stocks
      const { data: pData } = await supabase.from('products').select(`*, stocks:product_stocks(*)`);
      if(pData) {
          const formattedProducts = pData.map((p: any) => {
              const stocksObj: Record<string, number> = {};
              if(p.stocks && Array.isArray(p.stocks)) {
                  p.stocks.forEach((s: any) => {
                      stocksObj[s.location_id] = s.quantity;
                  });
              }
              return { 
                  ...p, 
                  brandId: p.brand_id,
                  categoryId: p.category_id,
                  unitId: p.unit_id,
                  salesPrice: p.sales_price,
                  purchasePrice: p.purchase_price,
                  vatRate: p.vat_rate,
                  vatIncluded: p.vat_included,
                  stocks: stocksObj 
              };
          });
          setProducts(formattedProducts);
      }

      const { data: cData } = await supabase.from('customers').select('*');
      if(cData) setCustomers(cData.map((c: any) => ({
          ...c,
          discountRate: c.discount_rate,
          dueDay: c.due_day
      })));

      const { data: supData } = await supabase.from('suppliers').select('*');
      if(supData) setSuppliers(supData.map((s: any) => ({
          ...s,
          contactPerson: s.contact_person
      })));

      // Fetch Invoices with Items
      const { data: iData } = await supabase.from('invoices').select(`*, items:invoice_items(*)`).order('date', {ascending: false});
      if(iData) setInvoices(iData.map((i: any) => ({
          ...i,
          partnerId: i.partner_id,
          partnerName: i.partner_name,
          paidAmount: i.paid_amount,
          paymentMethod: i.payment_method,
          bankId: i.bank_id,
          locationId: i.location_id,
          parentInvoiceId: i.parent_invoice_id,
          cashAmount: i.cash_amount,
          cardAmount: i.card_amount,
          tenderedAmount: i.tendered_amount,
          changeAmount: i.change_amount,
          fiscalDocumentId: i.fiscal_document_id,
          fiscalShortDocumentId: i.fiscal_short_document_id,
          items: i.items.map((item: any) => ({
              ...item,
              productId: item.product_id,
              productName: item.product_name,
              returnedQuantity: item.returned_quantity
          }))
      })));

      const { data: tData } = await supabase.from('transaction_logs').select('*').order('date', {ascending: false});
      if(tData) setTransactions(tData.map((t: any) => ({
          ...t,
          expenseCategoryId: t.expense_category_id,
          relatedInvoiceId: t.related_invoice_id,
          partnerId: t.partner_id,
          bankId: t.bank_id,
          cashRegisterId: t.cash_register_id,
          user: t.user_name
      })));

      const { data: bData } = await supabase.from('bank_accounts').select('*');
      if(bData) setBanks(bData.map((b: any) => ({
          ...b,
          accountNumber: b.account_number,
          initialBalance: b.initial_balance
      })));

      const { data: exData } = await supabase.from('expense_categories').select('*');
      if(exData) setExpenseCategories(exData);

      const { data: crData } = await supabase.from('cash_registers').select('*');
      if(crData) setCashRegisters(crData.map((c: any) => ({
          ...c,
          storeId: c.store_id,
          ipAddress: c.ip_address
      })));

      const { data: empData } = await supabase.from('employees').select('*');
      if(empData) setEmployees(empData.map((e: any) => ({
          ...e,
          firstName: e.first_name,
          lastName: e.last_name,
          jobTitle: e.job_title,
          joinDate: e.join_date,
          isActive: e.is_active
      })));

      const { data: lreqData } = await supabase.from('leave_requests').select('*');
      if(lreqData) setLeaves(lreqData.map((l: any) => ({
          ...l,
          employeeId: l.employee_id,
          startDate: l.start_date,
          endDate: l.end_date
      })));

      // Transfers
      const { data: trfData } = await supabase.from('transfer_documents').select(`*, items:transfer_items(*)`);
      if(trfData) setTransfers(trfData.map((t: any) => ({
          ...t,
          sourceLocationId: t.source_location_id,
          targetLocationId: t.target_location_id,
          items: t.items.map((i: any) => ({
              ...i,
              productId: i.product_id,
              productName: i.product_name,
              transferId: i.transfer_id
          }))
      })));

      const { data: accData } = await supabase.from('accounts').select('*');
      if(accData) setAccounts(accData.map((a: any) => ({
          ...a,
          parentId: a.parent_id,
          systemLink: a.system_link,
          systemLinkId: a.system_link_id,
          manualBalance: a.manual_balance
      })));

    } catch (error) {
      console.error("Error loading data from Supabase:", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- AUTH ---
  const login = async (u: string, p: string) => {
    try {
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('username', u)
            .eq('password', p)
            .maybeSingle();

        if (error) {
            console.error("Login DB Error:", error);
            return false;
        }

        if (data) {
            const mappedUser = mapUser(data);
            setCurrentUser(mappedUser);
            return true;
        }
    } catch (err) {
        console.error("Login Exception:", err);
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const updateUserProfile = async (id: string, data: Partial<User>) => {
      // Map back to DB Columns
      const dbData: any = {};
      if(data.firstName) dbData.first_name = data.firstName;
      if(data.lastName) dbData.last_name = data.lastName;
      if(data.phone) dbData.phone = data.phone;
      if(data.password) dbData.password = data.password;

      await supabase.from('app_users').update(dbData).eq('id', id);
      fetchData();
  };

  const checkPermission = (perm: Permission): boolean => {
      if (!currentUser) return false;
      const role = roles.find(r => r.id === currentUser.roleId);
      if (!role) return false;
      return role.permissions.includes(perm);
  };

  const toggleTheme = () => {
      setDarkMode(!darkMode);
      if(!darkMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  };

  const updateSettings = async (s: AppSettings) => {
      setSettings(s);
      const targetId = s.id || '00000'; // Default to seed ID if missing
      await supabase.from('settings').update({
          company_name: s.companyName,
          company_voen: s.companyVoen,
          company_phone: s.companyPhone,
          currency: s.currency,
          theme_color: s.themeColor,
          allow_negative_stock: s.allowNegativeStock,
          base_font_size: s.baseFontSize,
          kassa_config: s.kassaConfig
      }).eq('id', targetId); 
  };

  // --- CRUD WRAPPERS ---

  // PRODUCTS
  const addProduct = async (p: Product) => {
      const { data, error } = await supabase.from('products').insert([{
          id: p.id, code: p.code, barcode: p.barcode, name: p.name, 
          brand_id: p.brandId, category_id: p.categoryId, unit_id: p.unitId,
          sales_price: p.salesPrice, purchase_price: p.purchasePrice,
          vat_rate: p.vatRate, vat_included: p.vatIncluded, image: p.image, stock: p.stock
      }]).select().single();
      
      if(error) { console.error(error); return; }

      if(p.stocks) {
          const stocks = Object.keys(p.stocks).map(locId => ({
              product_id: p.id, location_id: locId, quantity: p.stocks[locId]
          }));
          if(stocks.length > 0) await supabase.from('product_stocks').insert(stocks);
      }
      fetchData();
  };
  const addProducts = async (ps: Product[]) => {
      for(const p of ps) await addProduct(p);
  };
  const updateProduct = async (p: Product) => {
      await supabase.from('products').update({
          code: p.code, barcode: p.barcode, name: p.name, 
          brand_id: p.brandId, category_id: p.categoryId, unit_id: p.unitId,
          sales_price: p.salesPrice, purchase_price: p.purchasePrice,
          vat_rate: p.vatRate, stock: p.stock
      }).eq('id', p.id);
      fetchData();
  };

  // CATEGORIES
  const addCategory = async (c: Category) => { await supabase.from('categories').insert([c]); fetchData(); };
  const updateCategory = async (c: Category) => { await supabase.from('categories').update(c).eq('id', c.id); fetchData(); };
  const deleteCategory = async (id: string) => { await supabase.from('categories').delete().eq('id', id); fetchData(); };

  // BRANDS
  const addBrand = async (b: Brand) => { await supabase.from('brands').insert([b]); fetchData(); };
  const updateBrand = async (b: Brand) => { await supabase.from('brands').update(b).eq('id', b.id); fetchData(); };
  const deleteBrand = async (id: string) => { await supabase.from('brands').delete().eq('id', id); fetchData(); };

  // UNITS
  const addUnit = async (u: Unit) => { await supabase.from('units').insert([{ id: u.id, name: u.name, short_name: u.shortName }]); fetchData(); };
  const updateUnit = async (u: Unit) => { await supabase.from('units').update({ name: u.name, short_name: u.shortName }).eq('id', u.id); fetchData(); };
  const deleteUnit = async (id: string) => { await supabase.from('units').delete().eq('id', id); fetchData(); };

  // CUSTOMERS
  const addCustomer = async (c: Customer) => { await supabase.from('customers').insert([{
      id: c.id, name: c.name, type: c.type, discount_rate: c.discountRate, 
      due_day: c.dueDay, phone: c.phone, email: c.email, address: c.address, balance: c.balance
  }]); fetchData(); };
  const updateCustomer = async (c: Customer) => { await supabase.from('customers').update({
      name: c.name, type: c.type, discount_rate: c.discountRate, 
      phone: c.phone, email: c.email, address: c.address, balance: c.balance
  }).eq('id', c.id); fetchData(); };
  const deleteCustomer = async (id: string) => { await supabase.from('customers').delete().eq('id', id); fetchData(); };

  // SUPPLIERS
  const addSupplier = async (s: Supplier) => { await supabase.from('suppliers').insert([{
      id: s.id, name: s.name, phone: s.phone, email: s.email, 
      address: s.address, balance: s.balance, contact_person: s.contactPerson
  }]); fetchData(); };
  const updateSupplier = async (s: Supplier) => { await supabase.from('suppliers').update({
      name: s.name, phone: s.phone, email: s.email, 
      address: s.address, balance: s.balance, contact_person: s.contactPerson
  }).eq('id', s.id); fetchData(); };
  const deleteSupplier = async (id: string) => { await supabase.from('suppliers').delete().eq('id', id); fetchData(); };

  // INVOICES & STOCK UPDATES
  const addInvoice = (invoice: Invoice) => {
      const insertAsync = async () => {
          const { error: invErr } = await supabase.from('invoices').insert([{
              id: invoice.id, type: invoice.type, partner_id: invoice.partnerId, partner_name: invoice.partnerName,
              date: invoice.date, subtotal: invoice.subtotal, tax: invoice.tax, discount: invoice.discount, total: invoice.total,
              paid_amount: invoice.paidAmount, payment_method: invoice.paymentMethod, bank_id: invoice.bankId,
              location_id: invoice.locationId, status: invoice.status, parent_invoice_id: invoice.parentInvoiceId,
              cash_amount: invoice.cashAmount, card_amount: invoice.cardAmount, tendered_amount: invoice.tenderedAmount, change_amount: invoice.changeAmount,
              fiscal_document_id: invoice.fiscalDocumentId, fiscal_short_document_id: invoice.fiscalShortDocumentId
          }]);
          
          if(invErr) { console.error(invErr); return false; }

          const items = invoice.items.map(i => ({
              invoice_id: invoice.id, product_id: i.productId, product_name: i.productName,
              quantity: i.quantity, price: i.price, total: i.total, returned_quantity: i.returnedQuantity
          }));
          await supabase.from('invoice_items').insert(items);

          const stockMultiplier = (invoice.type === 'SALE' || invoice.type === 'PURCHASE_RETURN') ? -1 : 1;
          for(const item of invoice.items) {
              const prod = products.find(p => p.id === item.productId);
              if(prod) {
                  const change = (item.returnedQuantity ?? item.quantity) * stockMultiplier;
                  const newTotal = prod.stock + change;
                  await supabase.from('products').update({stock: newTotal}).eq('id', prod.id);

                  const locId = invoice.locationId || 'loc-1';
                  const currentLocStock = prod.stocks[locId] || 0;
                  const newLocStock = currentLocStock + change;
                  
                  const { data: stockRec } = await supabase.from('product_stocks').select('id').eq('product_id', prod.id).eq('location_id', locId).single();
                  if(stockRec) {
                      await supabase.from('product_stocks').update({ quantity: newLocStock }).eq('id', stockRec.id);
                  } else {
                      await supabase.from('product_stocks').insert({ product_id: prod.id, location_id: locId, quantity: newLocStock });
                  }
              }
          }

          if (invoice.paymentMethod !== PaymentMethod.CREDIT) {
              const transType = (invoice.type === 'SALE' || invoice.type === 'PURCHASE_RETURN') ? 'INCOME' : 'EXPENSE';
              await addTransaction({
                  id: `TRX-${Date.now()}`,
                  date: invoice.date,
                  type: transType,
                  category: invoice.type,
                  amount: invoice.total,
                  description: `Invoice #${invoice.id}`,
                  source: invoice.paymentMethod === PaymentMethod.CARD ? 'BANK' : 'CASH_REGISTER',
                  bankId: invoice.bankId,
                  partnerId: invoice.partnerId,
                  relatedInvoiceId: invoice.id,
                  user: currentUser?.username || 'sys'
              });
          }

          fetchData();
      };
      insertAsync();
      return true;
  };

  const updateInvoice = (inv: Invoice) => {
      const updateAsync = async () => {
          await supabase.from('invoices').update({ status: inv.status, paid_amount: inv.paidAmount }).eq('id', inv.id);
          fetchData();
      };
      updateAsync();
      return true;
  };

  const deleteInvoice = (id: string) => {
      const delAsync = async () => {
          await supabase.from('invoices').delete().eq('id', id);
          fetchData();
      };
      delAsync();
  };

  // TRANSACTIONS
  const addTransaction = async (t: Transaction) => {
      await supabase.from('transaction_logs').insert([{
          id: t.id, date: t.date, type: t.type, category: t.category, expense_category_id: t.expenseCategoryId,
          related_invoice_id: t.relatedInvoiceId, partner_id: t.partnerId, amount: t.amount,
          description: t.description, source: t.source, bank_id: t.bankId, user_name: t.user
      }]);
      fetchData();
  };
  const updateTransaction = async (t: Transaction) => {
      await supabase.from('transaction_logs').update({
          date: t.date, type: t.type, category: t.category, amount: t.amount, description: t.description
      }).eq('id', t.id);
      fetchData();
  };
  const deleteTransaction = async (id: string) => {
      await supabase.from('transaction_logs').delete().eq('id', id);
      fetchData();
  };

  // OTHERS
  const addExpenseCategory = async (name: string) => { await supabase.from('expense_categories').insert([{ id: Date.now().toString(), name }]); fetchData(); };
  const updateExpenseCategory = async (id: string, name: string) => { await supabase.from('expense_categories').update({name}).eq('id', id); fetchData(); };
  const deleteExpenseCategory = async (id: string) => { await supabase.from('expense_categories').delete().eq('id', id); fetchData(); };

  const addBank = async (b: BankAccount) => { await supabase.from('bank_accounts').insert([{
      id: b.id, name: b.name, account_number: b.accountNumber, iban: b.iban, currency: b.currency, initial_balance: b.initialBalance
  }]); fetchData(); };
  const updateBank = async (b: BankAccount) => { await supabase.from('bank_accounts').update({
      name: b.name, account_number: b.accountNumber, iban: b.iban, initial_balance: b.initialBalance
  }).eq('id', b.id); fetchData(); };
  const deleteBank = async (id: string) => { await supabase.from('bank_accounts').delete().eq('id', id); fetchData(); };

  const addUser = async (u: User) => { await supabase.from('app_users').insert([{
      id: u.id, username: u.username, password: u.password, first_name: u.firstName, last_name: u.lastName,
      phone: u.phone, role_id: u.roleId, allowed_store_ids: u.allowedStoreIds, allowed_warehouse_ids: u.allowedWarehouseIds,
      assigned_cash_register_id: u.assignedCashRegisterId
  }]); fetchData(); };
  const updateUser = async (u: User) => { await supabase.from('app_users').update({
      username: u.username, password: u.password, first_name: u.firstName, last_name: u.lastName, phone: u.phone,
      role_id: u.roleId, allowed_store_ids: u.allowedStoreIds, allowed_warehouse_ids: u.allowedWarehouseIds, 
      assigned_cash_register_id: u.assignedCashRegisterId
  }).eq('id', u.id); fetchData(); };
  const deleteUser = async (id: string) => { await supabase.from('app_users').delete().eq('id', id); fetchData(); };

  const addRole = async (r: Role) => { await supabase.from('roles').insert([{ id: r.id, name: r.name, permissions: r.permissions }]); fetchData(); };
  const updateRole = async (r: Role) => { await supabase.from('roles').update({ name: r.name, permissions: r.permissions }).eq('id', r.id); fetchData(); };
  const deleteRole = async (id: string) => { await supabase.from('roles').delete().eq('id', id); fetchData(); };

  const addLocation = async (l: Location) => { await supabase.from('locations').insert([{
      id: l.id, name: l.name, type: l.type, linked_warehouse_ids: l.linkedWarehouseIds
  }]); fetchData(); };
  const updateLocation = async (l: Location) => { await supabase.from('locations').update({
      name: l.name, type: l.type, linked_warehouse_ids: l.linkedWarehouseIds
  }).eq('id', l.id); fetchData(); };
  const deleteLocation = async (id: string) => { await supabase.from('locations').delete().eq('id', id); fetchData(); };

  const addCashRegister = async (cr: CashRegister) => { await supabase.from('cash_registers').insert([{
      id: cr.id, name: cr.name, store_id: cr.storeId, brand: cr.brand, ip_address: cr.ipAddress
  }]); fetchData(); };
  const updateCashRegister = async (cr: CashRegister) => { await supabase.from('cash_registers').update({
      name: cr.name, store_id: cr.storeId, brand: cr.brand, ip_address: cr.ipAddress
  }).eq('id', cr.id); fetchData(); };
  const deleteCashRegister = async (id: string) => { await supabase.from('cash_registers').delete().eq('id', id); fetchData(); };

  const addKassaBrand = (name: string) => setKassaBrands(prev => [...prev, name]);
  const updateKassaBrand = (oldName: string, newName: string) => setKassaBrands(prev => prev.map(b => b === oldName ? newName : b));
  const deleteKassaBrand = (name: string) => setKassaBrands(prev => prev.filter(b => b !== name));

  const addEmployee = async (e: Employee) => { await supabase.from('employees').insert([{
      id: e.id, first_name: e.firstName, last_name: e.lastName, phone: e.phone, email: e.email,
      job_title: e.jobTitle, salary: e.salary, description: e.description, join_date: e.joinDate, is_active: e.isActive
  }]); fetchData(); };
  const updateEmployee = async (e: Employee) => { await supabase.from('employees').update({
      first_name: e.firstName, last_name: e.lastName, salary: e.salary, job_title: e.jobTitle
  }).eq('id', e.id); fetchData(); };
  const deleteEmployee = async (id: string) => { await supabase.from('employees').delete().eq('id', id); fetchData(); };

  const addLeave = async (l: LeaveRequest) => { await supabase.from('leave_requests').insert([{
      id: l.id, employee_id: l.employeeId, type: l.type, start_date: l.startDate, end_date: l.endDate, reason: l.reason, status: l.status
  }]); fetchData(); };
  const updateLeave = async (l: LeaveRequest) => { await supabase.from('leave_requests').update({
      status: l.status, reason: l.reason
  }).eq('id', l.id); fetchData(); };
  const deleteLeave = async (id: string) => { await supabase.from('leave_requests').delete().eq('id', id); fetchData(); };

  const addTransfer = (t: TransferDocument) => {
      const asyncAdd = async () => {
          await supabase.from('transfer_documents').insert([{
              id: t.id, date: t.date, source_location_id: t.sourceLocationId, target_location_id: t.targetLocationId, note: t.note
          }]);
          const items = t.items.map(i => ({ transfer_id: t.id, product_id: i.productId, product_name: i.productName, quantity: i.quantity }));
          await supabase.from('transfer_items').insert(items);
          
          for(const item of t.items) {
              const prod = products.find(p => p.id === item.productId);
              if(prod) {
                  const srcQty = (prod.stocks[t.sourceLocationId] || 0) - item.quantity;
                  const { data: srcRec } = await supabase.from('product_stocks').select('id').eq('product_id', prod.id).eq('location_id', t.sourceLocationId).single();
                  if(srcRec) await supabase.from('product_stocks').update({quantity: srcQty}).eq('id', srcRec.id);
                  else await supabase.from('product_stocks').insert({product_id: prod.id, location_id: t.sourceLocationId, quantity: srcQty});

                  const tgtQty = (prod.stocks[t.targetLocationId] || 0) + item.quantity;
                  const { data: tgtRec } = await supabase.from('product_stocks').select('id').eq('product_id', prod.id).eq('location_id', t.targetLocationId).single();
                  if(tgtRec) await supabase.from('product_stocks').update({quantity: tgtQty}).eq('id', tgtRec.id);
                  else await supabase.from('product_stocks').insert({product_id: prod.id, location_id: t.targetLocationId, quantity: tgtQty});
              }
          }
          fetchData();
      };
      asyncAdd();
      return true;
  };
  const updateTransfer = (t: TransferDocument) => { return true; }; 
  const deleteTransfer = async (id: string) => { await supabase.from('transfer_documents').delete().eq('id', id); fetchData(); };

  const addAccount = async (a: Account) => { 
      const { error } = await supabase.from('accounts').insert([{
          id: a.id, 
          code: a.code, 
          name: a.name, 
          level: a.level, 
          parent_id: a.parentId || null, 
          system_link: a.systemLink, 
          system_link_id: a.systemLinkId || null, 
          manual_balance: a.manualBalance || 0
      }]); 
      if(error) console.error("Error adding account:", error);
      fetchData(); 
  };
  
  const updateAccount = async (a: Account) => { 
      const { error } = await supabase.from('accounts').update({
          code: a.code, 
          name: a.name, 
          system_link: a.systemLink, 
          system_link_id: a.systemLinkId || null, 
          manual_balance: a.manualBalance || 0
      }).eq('id', a.id); 
      if(error) console.error("Error updating account:", error);
      fetchData(); 
  };
  const deleteAccount = async (id: string) => { await supabase.from('accounts').delete().eq('id', id); fetchData(); };

  return (
    <StoreContext.Provider value={{
      language, setLanguage, currentUser, login, logout, updateUserProfile, checkPermission,
      settings, updateSettings, darkMode, toggleTheme,
      products, addProduct, addProducts, updateProduct,
      categories, addCategory, updateCategory, deleteCategory,
      brands, addBrand, updateBrand, deleteBrand,
      units, addUnit, updateUnit, deleteUnit,
      customers, addCustomer, updateCustomer, deleteCustomer,
      suppliers, addSupplier, updateSupplier, deleteSupplier,
      invoices, addInvoice, updateInvoice, deleteInvoice,
      transactions, addTransaction, updateTransaction, deleteTransaction,
      expenseCategories, addExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
      banks, addBank, updateBank, deleteBank,
      users, addUser, updateUser, deleteUser,
      roles, addRole, updateRole, deleteRole,
      locations, addLocation, updateLocation, deleteLocation,
      cashRegisters, addCashRegister, updateCashRegister, deleteCashRegister,
      kassaBrands, addKassaBrand, updateKassaBrand, deleteKassaBrand,
      employees, addEmployee, updateEmployee, deleteEmployee,
      leaves, addLeave, updateLeave, deleteLeave,
      transfers, addTransfer, updateTransfer, deleteTransfer,
      accounts, addAccount, updateAccount, deleteAccount
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
