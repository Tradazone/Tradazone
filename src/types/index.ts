// ── Wallet ─────────────────────────────────────────────────────────────────

export type WalletType = 'evm' | 'starknet' | 'stellar';

export type Network = 'Ethereum' | 'Starknet' | 'Stellar';

export interface WalletState {
  address:     string;
  balance:     string;
  currency:    string;
  isConnected: boolean;
  chainId:     string;
}

// ── Auth / Session ──────────────────────────────────────────────────────────

export interface Session {
  user:      UserData;
  expiresAt: number;
}

export interface UserData {
  id:                 string | null;
  name:               string;
  email:              string;
  avatar:             string | null;
  isAuthenticated:    boolean;
  walletAddress:      string | null;
  walletType:         WalletType | null;
  phone:              string;
  company:            string;
  address:            string;
  profileDescription: string;
}

// ── Business entities ───────────────────────────────────────────────────────

export interface Customer {
  id:           string;
  name:         string;
  email:        string;
  phone:        string;
  company:      string;
  address:      string;
  description:  string;
  totalSpent:   string;
  currency:     string;
  invoiceCount: number;
  createdAt:    string;
}

export interface InvoiceItem {
  name:     string;
  quantity: number;
  price:    string;
}

export interface Invoice {
  id:             string;
  customer:       string;
  customerId:     string;
  amount:         string;
  currency:       string;
  status:         InvoiceStatus;
  dueDate:        string;
  items:          InvoiceItem[];
  sentAt:         string | null;
  paidAt:         string | null;
  emailStatus:    string;
  paymentAddress: string;
  txHash:         string;
  txNetwork:      string;
  txAmount:       string;
  txCurrency:     string;
  createdAt:      string;
}

export type InvoiceStatus = 'pending' | 'sent' | 'paid' | 'overdue' | 'unpaid';

export interface Item {
  id:          string;
  name:        string;
  description: string;
  type:        'service' | 'product';
  price:       string;
  currency:    string;
  unit:        string;
  createdAt?:  string;
}

export interface Checkout {
  id:          string;
  title:       string;
  description: string;
  amount:      string;
  currency:    string;
  status:      CheckoutStatus;
  paymentLink: string;
  views:       number;
  payments:    number;
  createdAt:   string;
  updatedAt?:  string;
}

export type CheckoutStatus = 'active' | 'paid' | 'inactive';

// ── Tx details (used when marking invoices/checkouts paid) ──────────────────

export interface TxDetails {
  hash:     string;
  network:  string;
  amount:   string;
  currency: string;
}

// ── Filter / sort ───────────────────────────────────────────────────────────

export interface SortConfig {
  field: string;
  dir:   'asc' | 'desc';
}

export interface DataFilters {
  search:    string;
  sort:      SortConfig;
  status:    string;
  dateFrom:  string;
  dateTo:    string;
  amountMin: string;
  amountMax: string;
}

// ── Email payloads ──────────────────────────────────────────────────────────

export interface InvoiceEmailData {
  to_name:              string;
  to_email:             string;
  invoice_id:           string;
  invoice_amount:       string;
  invoice_currency:     string;
  invoice_due_date:     string;
  payment_link:         string;
  invoice_preview_link: string;
  sender_name:          string;
  item_description:     string;
}

export interface ReceiptEmailData {
  to_name:     string;
  to_email:    string;
  invoice_id:  string;
  tx_hash:     string;
  tx_amount:   string;
  tx_currency: string;
  tx_network:  string;
  paid_at:     string;
  sender_name: string;
}

export interface PaymentNotificationData {
  to_name:          string;
  to_email:         string;
  invoice_id:       string;
  invoice_customer: string;
  tx_hash:          string;
  tx_amount:        string;
  tx_currency:      string;
  tx_network:       string;
  paid_at:          string;
}
