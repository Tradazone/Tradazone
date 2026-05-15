/// <reference types="vite/client" />
/**
 * supabaseData.ts — all Supabase CRUD operations.
 * Handles snake_case ↔ camelCase mapping between the DB and the app.
 */

import { supabase } from '../lib/supabase';
import type { Customer, Item, Invoice, Checkout } from '../types';

// ── DB row types (snake_case) ──────────────────────────────────────────────

type DbRow = Record<string, unknown>;

// ── Mappers ────────────────────────────────────────────────────────────────

const customerFromDb = (row: DbRow): Customer => ({
  id:           String(row.id ?? ''),
  name:         String(row.name ?? ''),
  email:        String(row.email        ?? ''),
  phone:        String(row.phone        ?? ''),
  company:      String(row.company      ?? ''),
  address:      String(row.address      ?? ''),
  description:  String(row.description  ?? ''),
  totalSpent:   String(row.total_spent  ?? '0'),
  currency:     String(row.currency     ?? 'STRK'),
  invoiceCount: Number(row.invoice_count ?? 0),
  createdAt:    String(row.created_at   ?? ''),
});

const customerToDb = (obj: Customer, walletAddress: string): DbRow => ({
  id:            obj.id,
  user_wallet:   walletAddress,
  name:          obj.name,
  email:         obj.email        || '',
  phone:         obj.phone        || '',
  company:       obj.company      || '',
  address:       obj.address      || '',
  description:   obj.description  || '',
  total_spent:   obj.totalSpent   || '0',
  currency:      obj.currency     || 'STRK',
  invoice_count: obj.invoiceCount || 0,
});

const itemFromDb = (row: DbRow): Item => ({
  id:          String(row.id          ?? ''),
  name:        String(row.name        ?? ''),
  description: String(row.description ?? ''),
  type:        (row.type as Item['type']) || 'service',
  price:       String(row.price       ?? '0'),
  currency:    String(row.currency    ?? 'USD'),
  unit:        String(row.unit        ?? 'unit'),
  createdAt:   String(row.created_at  ?? ''),
});

const itemToDb = (obj: Item, walletAddress: string): DbRow => ({
  id:          obj.id,
  user_wallet: walletAddress,
  name:        obj.name,
  description: obj.description || '',
  type:        obj.type        || 'service',
  price:       obj.price,
  currency:    obj.currency    || 'USD',
  unit:        obj.unit        || 'unit',
});

const invoiceFromDb = (row: DbRow): Invoice => ({
  id:             String(row.id              ?? ''),
  customer:       String(row.customer        ?? ''),
  customerId:     String(row.customer_id     ?? ''),
  amount:         String(row.amount          ?? '0'),
  currency:       String(row.currency        ?? 'STRK'),
  status:         (row.status as Invoice['status']) || 'pending',
  dueDate:        String(row.due_date        ?? ''),
  items:          (row.items as Invoice['items']) || [],
  sentAt:         row.sent_at  ? String(row.sent_at)  : null,
  paidAt:         row.paid_at  ? String(row.paid_at)  : null,
  emailStatus:    String(row.email_status    ?? 'pending'),
  paymentAddress: String(row.payment_address ?? ''),
  txHash:         String(row.tx_hash         ?? ''),
  txNetwork:      String(row.tx_network      ?? ''),
  txAmount:       String(row.tx_amount       ?? ''),
  txCurrency:     String(row.tx_currency     ?? ''),
  createdAt:      String(row.created_at      ?? ''),
});

const invoiceToDb = (obj: Invoice, walletAddress: string): DbRow => ({
  id:              obj.id,
  user_wallet:     walletAddress,
  customer_id:     obj.customerId     || null,
  customer:        obj.customer       || '',
  amount:          obj.amount         || '0',
  currency:        obj.currency       || 'STRK',
  status:          obj.status         || 'pending',
  due_date:        obj.dueDate        || null,
  items:           obj.items          || [],
  sent_at:         obj.sentAt         || null,
  paid_at:         obj.paidAt         || null,
  email_status:    obj.emailStatus    || 'pending',
  payment_address: obj.paymentAddress || '',
  tx_hash:         obj.txHash         || '',
  tx_network:      obj.txNetwork      || '',
  tx_amount:       obj.txAmount       || '',
  tx_currency:     obj.txCurrency     || '',
});

const checkoutFromDb = (row: DbRow): Checkout => ({
  id:          String(row.id          ?? ''),
  title:       String(row.title       ?? ''),
  description: String(row.description ?? ''),
  amount:      String(row.amount      ?? '0'),
  currency:    String(row.currency    ?? 'STRK'),
  status:      (row.status as Checkout['status']) || 'active',
  paymentLink: String(row.payment_link ?? ''),
  views:       Number(row.views       ?? 0),
  payments:    Number(row.payments    ?? 0),
  createdAt:   String(row.created_at  ?? ''),
  updatedAt:   row.updated_at ? String(row.updated_at) : undefined,
});

const checkoutToDb = (obj: Checkout, walletAddress: string): DbRow => ({
  id:           obj.id,
  user_wallet:  walletAddress,
  title:        obj.title,
  description:  obj.description || '',
  amount:       obj.amount,
  currency:     obj.currency    || 'STRK',
  status:       obj.status      || 'active',
  payment_link: obj.paymentLink || '',
  views:        obj.views       || 0,
  payments:     obj.payments    || 0,
});

// ── Helper ─────────────────────────────────────────────────────────────────

function handleError(context: string, error: unknown): void {
  if (error) {
    if (import.meta.env.DEV) console.error(`[supabaseData] ${context}:`, (error as Error).message);
    throw error;
  }
}

// ── Customers ──────────────────────────────────────────────────────────────

export const customersService = {
  async list(walletAddress: string): Promise<Customer[]> {
    const { data, error } = await supabase.from('customers').select('*')
      .eq('user_wallet', walletAddress).order('created_at', { ascending: false });
    handleError('customers.list', error);
    return (data ?? []).map(r => customerFromDb(r as DbRow));
  },
  async upsert(walletAddress: string, customer: Customer): Promise<void> {
    const { error } = await supabase.from('customers').upsert(customerToDb(customer, walletAddress));
    handleError('customers.upsert', error);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    handleError('customers.delete', error);
  },
};

// ── Items ──────────────────────────────────────────────────────────────────

export const itemsService = {
  async list(walletAddress: string): Promise<Item[]> {
    const { data, error } = await supabase.from('items').select('*')
      .eq('user_wallet', walletAddress).order('created_at', { ascending: false });
    handleError('items.list', error);
    return (data ?? []).map(r => itemFromDb(r as DbRow));
  },
  async upsert(walletAddress: string, item: Item): Promise<void> {
    const { error } = await supabase.from('items').upsert(itemToDb(item, walletAddress));
    handleError('items.upsert', error);
  },
  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase.from('items').delete().in('id', ids);
    handleError('items.bulkDelete', error);
  },
};

// ── Invoices ───────────────────────────────────────────────────────────────

export const invoicesService = {
  async list(walletAddress: string): Promise<Invoice[]> {
    const { data, error } = await supabase.from('invoices').select('*')
      .eq('user_wallet', walletAddress).order('created_at', { ascending: false });
    handleError('invoices.list', error);
    return (data ?? []).map(r => invoiceFromDb(r as DbRow));
  },
  async upsert(walletAddress: string, invoice: Invoice): Promise<void> {
    const { error } = await supabase.from('invoices').upsert(invoiceToDb(invoice, walletAddress));
    handleError('invoices.upsert', error);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    handleError('invoices.delete', error);
  },
  async getPublic(id: string): Promise<Invoice | null> {
    const { data, error } = await supabase.from('invoices').select('*').eq('id', id).single();
    handleError('invoices.getPublic', error);
    return data ? invoiceFromDb(data as DbRow) : null;
  },
};

// ── Checkouts ──────────────────────────────────────────────────────────────

export const checkoutsService = {
  async list(walletAddress: string): Promise<Checkout[]> {
    const { data, error } = await supabase.from('checkouts').select('*')
      .eq('user_wallet', walletAddress).order('created_at', { ascending: false });
    handleError('checkouts.list', error);
    return (data ?? []).map(r => checkoutFromDb(r as DbRow));
  },
  async upsert(walletAddress: string, checkout: Checkout): Promise<void> {
    const { error } = await supabase.from('checkouts').upsert(checkoutToDb(checkout, walletAddress));
    handleError('checkouts.upsert', error);
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('checkouts').delete().eq('id', id);
    handleError('checkouts.delete', error);
  },
  async getPublic(id: string): Promise<Checkout | null> {
    const { data, error } = await supabase.from('checkouts').select('*').eq('id', id).single();
    handleError('checkouts.getPublic', error);
    return data ? checkoutFromDb(data as DbRow) : null;
  },
  async incrementViews(id: string): Promise<void> {
    const { data: current } = await supabase.from('checkouts').select('views').eq('id', id).single();
    if (!current) return;
    await supabase.from('checkouts').update({ views: ((current as DbRow).views as number || 0) + 1 }).eq('id', id);
  },
};

// ── Users (profile) ────────────────────────────────────────────────────────

interface UserProfile { name?: string; email?: string; phone?: string; company?: string; address?: string; description?: string; walletType?: string; }

export const usersService = {
  async upsert(userId: string, walletAddress: string, profile: UserProfile): Promise<void> {
    const { error } = await supabase.from('users').upsert({
      id: userId, wallet_address: walletAddress,
      name:        profile.name        || '',
      email:       profile.email       || '',
      phone:       profile.phone       || '',
      company:     profile.company     || '',
      address:     profile.address     || '',
      description: profile.description || '',
      wallet_type: profile.walletType  || 'starknet',
    });
    handleError('users.upsert', error);
  },
};

// ── Local → Supabase migration (one-time) ─────────────────────────────────

export async function migrateLocalDataToSupabase(walletAddress: string): Promise<boolean> {
  const KEYS = {
    customers: 'tradazone_customers',
    invoices:  'tradazone_invoices',
    checkouts: 'tradazone_checkouts',
    items:     'tradazone_items',
    migrated:  'tradazone_migrated_to_supabase',
  };
  if (localStorage.getItem(KEYS.migrated) === 'true') return false;
  try {
    const localCustomers = JSON.parse(localStorage.getItem(KEYS.customers) ?? '[]') as Customer[];
    const localInvoices  = JSON.parse(localStorage.getItem(KEYS.invoices)  ?? '[]') as Invoice[];
    const localCheckouts = JSON.parse(localStorage.getItem(KEYS.checkouts) ?? '[]') as Checkout[];
    const localItems     = JSON.parse(localStorage.getItem(KEYS.items)     ?? '[]') as Item[];
    const hasData = localCustomers.length + localInvoices.length + localCheckouts.length + localItems.length > 0;
    if (!hasData) { localStorage.setItem(KEYS.migrated, 'true'); return false; }
    await Promise.all([
      ...localCustomers.map(c   => customersService.upsert(walletAddress, c)),
      ...localInvoices.map(inv  => invoicesService.upsert(walletAddress, inv)),
      ...localCheckouts.map(chk => checkoutsService.upsert(walletAddress, chk)),
      ...localItems.map(i       => itemsService.upsert(walletAddress, i)),
    ]);
    localStorage.setItem(KEYS.migrated, 'true');
    if (import.meta.env.DEV) console.log('[supabaseData] Local data migrated to Supabase.');
    return true;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[supabaseData] Migration failed:', (err as Error).message);
    return false;
  }
}
