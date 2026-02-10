
export type Language = 'en' | 'tr' | 'az' | 'ru' | 'uz';

// Permissions Keys
export type Permission = 
  | 'view_dashboard'
  | 'view_pos'
  | 'view_pos_returns' // New permission
  | 'view_products'
  | 'view_sales'
  | 'view_purchases'
  | 'view_returns'
  | 'view_finance'
  | 'view_accounting'
  | 'view_transfer'
  | 'view_hr'
  | 'view_partners'
  | 'view_reports'
  | 'view_admin'
  | 'manage_users';
 
export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface CashRegister {
  id: string;
  name: string;
  storeId: string;
  ipAddress?: string; // New: Device IP
  brand?: string;     // New: Device Brand (e.g., Epson, Sunmi)
}

export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  username: string;
  role: UserRole; // Kept for backward compatibility, but UI will use roleId
  roleId?: string; // Link to Role
  permissions?: string[]; // Legacy or override
  
  // Access Control
  allowedStoreIds?: string[];
  allowedWarehouseIds?: string[];
  assignedCashRegisterId?: string; // Specific register assignment

  discountLimit?: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  password?: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  jobTitle: string; 
  salary: number;
  description?: string; 
  joinDate: string;
  isActive: boolean;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: 'VACATION' | 'SICK' | 'UNPAID' | 'OTHER';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export interface Brand {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'WAREHOUSE' | 'STORE';
  linkedWarehouseIds?: string[]; // For Stores: Which warehouses supply this store?
}

export interface Unit {
  id: string;
  name: string;
  shortName: string;
}

export interface AppSettings {
  id?: string;
  currency: string;
  allowNegativeStock: boolean;
  defaultBankId?: string; 
  themeColor: 'blue' | 'purple' | 'green' | 'red';
  baseFontSize: number; 
  companyName: string;
  companyVoen: string;
  companyPhone: string;
  companyLogo: string;
  kassaConfig: {
    ip: string;
    selectedBrand: string;
  };
}

export interface BankAccount {
  id: string;
  name: string; 
  accountNumber: string;
  iban?: string;
  currency: string;
  initialBalance: number;
}

export interface Product {
  id: string;
  code: string;
  barcode: string;
  name: string;
  brandId: string;
  categoryId: string;
  unitId: string;
  salesPrice: number;
  purchasePrice: number;
  vatRate: number; 
  vatIncluded: boolean;
  image: string;
  stock: number; 
  stocks: Record<string, number>; 
}

export interface Customer {
  id: string;
  name: string;
  type: 'general' | 'individual' | 'corporate';
  discountRate: number;
  dueDay?: number;
  phone?: string;
  balance: number;
  email?: string;
  address?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  balance: number;
  email?: string;
  address?: string;
  contactPerson?: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  returnedQuantity: number; 
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  CREDIT = 'CREDIT',
  MIXED = 'MIXED'
}

export interface Invoice {
  id: string;
  type: 'SALE' | 'PURCHASE' | 'SALE_RETURN' | 'PURCHASE_RETURN';
  partnerId: string; 
  partnerName: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount?: number; // Track how much has been paid
  paymentMethod: PaymentMethod;
  bankId?: string; 
  // Split Payment Details
  cashAmount?: number;
  cardAmount?: number;
  
  // Cash Payment Details (Change Calculation)
  tenderedAmount?: number;
  changeAmount?: number;
  
  notes?: string;
  parentInvoiceId?: string; 
  locationId?: string;
  status?: 'PAID' | 'UNPAID' | 'PARTIAL'; // Added PARTIAL

  // Fiscal Data
  fiscalDocumentId?: string;
  fiscalShortDocumentId?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string; 
  expenseCategoryId?: string; 
  relatedInvoiceId?: string; 
  partnerId?: string; 
  amount: number;
  description: string;
  source: 'CASH_REGISTER' | 'BANK';
  bankId?: string; 
  cashRegisterId?: string; // Which specific register
  user: string; 
}

export interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface TransferDocument {
  id: string;
  date: string;
  sourceLocationId: string;
  targetLocationId: string;
  items: TransferItem[];
  note?: string;
}

// --- ACCOUNTING TYPES ---
export type SystemLinkType = 'NONE' | 'INVENTORY' | 'CASH' | 'CASH_REGISTER' | 'BANK' | 'EXPENSE' | 'SALES' | 'CUSTOMER_AR' | 'SUPPLIER_AP';

export interface Account {
  id: string;
  code: string; 
  name: string;
  level: number; 
  parentId?: string; 
  systemLink: SystemLinkType;
  systemLinkId?: string; 
  manualBalance?: number; 
}
