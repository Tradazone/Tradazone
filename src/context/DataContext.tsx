/// <reference types="vite/client" />
/**
 * DataContext.tsx
 *
 * Central data provider for customers, invoices, checkouts, and items.
 * Primary store: Supabase. Strategy: optimistic updates.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import {
  customersService,
  itemsService,
  invoicesService,
  checkoutsService,
  migrateLocalDataToSupabase,
} from '../services/supabaseData';
import { dispatchWebhook } from '../services/webhook';
import { getCurrencyPreference } from '../utils/currencyPreference';
import { toUtcMidnightIso } from '../utils/date';
import { safeAdd, calculateItemsTotal } from '../utils/currency';
import {
  CUSTOMER_FILTER_CONFIG,
  INVOICE_FILTER_CONFIG,
  ITEM_FILTER_CONFIG,
  CHECKOUT_FILTER_CONFIG,
} from './filterConfigs';
import type {
  Customer,
  Invoice,
  Item,
  Checkout,
  InvoiceItem,
  TxDetails,
  DataFilters,
  UserData,
} from '../types';

// ── Context types ──────────────────────────────────────────────────────────

interface PendingOps {
  customers: boolean;
  invoices:  boolean;
  checkouts: boolean;
  items:     boolean;
}

interface AddInvoiceData {
  customerId: string;
  dueDate:    string;
  items:      Array<{ itemId: string; quantity: string; price: string }>;
}

interface DataContextValue {
  customers:                 Customer[];
  invoices:                  Invoice[];
  checkouts:                 Checkout[];
  items:                     Item[];
  dataLoading:               boolean;
  addCustomer:               (data: Partial<Customer>) => Customer | null;
  updateCustomer:            (id: string, updates: Partial<Customer>) => void;
  deleteCustomer:            (id: string) => void;
  updateCustomerDescription: (id: string, description: string) => void;
  addItem:                   (data: Partial<Item>) => Item;
  updateItem:                (id: string, updates: Partial<Item>) => void;
  deleteItems:               (ids: string[]) => void;
  addInvoice:                (data: AddInvoiceData) => Invoice | null;
  updateInvoice:             (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice:             (id: string) => void;
  sendInvoice:               (id: string) => void;
  markInvoicePaid:           (id: string, txDetails: TxDetails) => void;
  addCheckout:               (data: Partial<Checkout>) => Checkout | null;
  deleteCheckout:            (id: string) => void;
  markCheckoutPaid:          (id: string, customerId: string | null, walletType?: string) => void;
  recordCheckoutView:        (id: string) => void;
}

interface CheckoutContextValue {
  checkouts:         Checkout[];
  addCheckout:       (data: Partial<Checkout>) => Checkout | null;
  markCheckoutPaid:  (id: string, customerId: string | null, walletType?: string) => void;
  recordCheckoutView:(id: string) => void;
}

const DataContext    = createContext<DataContextValue | null>(null);
const CheckoutContext = createContext<CheckoutContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  // AuthContext uses @ts-nocheck so we cast here
  const { user } = useAuth() as { user: UserData };
  const walletAddress  = user?.walletAddress  ?? null;
  const isAuthenticated = user?.isAuthenticated ?? false;

  const [customers,   setCustomers]  = useState<Customer[]>([]);
  const [invoices,    setInvoices]   = useState<Invoice[]>([]);
  const [checkouts,   setCheckouts]  = useState<Checkout[]>([]);
  const [items,       setItems]      = useState<Item[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const invoiceCountRef  = useRef(0);
  const checkoutCountRef = useRef(0);

  const pendingOperations = useRef<PendingOps>({
    customers: false, invoices: false, checkouts: false, items: false,
  });

  const releaseOperation = useCallback((key: keyof PendingOps) => {
    const clear = () => { pendingOperations.current[key] = false; };
    if (typeof queueMicrotask === 'function') queueMicrotask(clear);
    else Promise.resolve().then(clear);
  }, []);

  // ── Fetch from Supabase on auth ──────────────────────────────────────────

  useEffect(() => {
    if (!isAuthenticated || !walletAddress) { setDataLoading(false); return; }
    let cancelled = false;
    async function fetchAll() {
      setDataLoading(true);
      try {
        await migrateLocalDataToSupabase(walletAddress as string);
        const [cust, inv, chk, itm] = await Promise.all([
          customersService.list(walletAddress as string),
          invoicesService.list(walletAddress as string),
          checkoutsService.list(walletAddress as string),
          itemsService.list(walletAddress as string),
        ]);
        if (cancelled) return;
        setCustomers(cust);
        setInvoices(inv);
        setCheckouts(chk);
        setItems(itm);
        invoiceCountRef.current  = inv.length;
        checkoutCountRef.current = chk.length;
      } catch (err) {
        if (import.meta.env.DEV) console.error('[DataContext] Supabase fetch failed:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [isAuthenticated, walletAddress]);

  // ── Customers ────────────────────────────────────────────────────────────

  const addCustomer = useCallback((data: Partial<Customer>): Customer | null => {
    if (pendingOperations.current.customers) {
      if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addCustomer ignored.');
      return null;
    }
    try {
      pendingOperations.current.customers = true;
      const newCustomer: Customer = {
        id:           `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name:         data.name         ?? '',
        email:        data.email        ?? '',
        phone:        data.phone        ?? '',
        company:      data.company      ?? '',
        address:      data.address      ?? '',
        description:  data.description  ?? '',
        totalSpent:   '0',
        currency:     'STRK',
        invoiceCount: 0,
        createdAt:    new Date().toISOString(),
      };
      setCustomers(prev => [newCustomer, ...prev]);
      if (walletAddress) customersService.upsert(walletAddress, newCustomer).catch(console.error);
      return newCustomer;
    } finally {
      releaseOperation('customers');
    }
  }, [walletAddress, releaseOperation]);

  const updateCustomer = useCallback((customerId: string, updates: Partial<Customer>) => {
    setCustomers(prev => {
      const next = prev.map(c => c.id === customerId ? { ...c, ...updates } : c);
      const updated = next.find(c => c.id === customerId);
      if (walletAddress && updated) customersService.upsert(walletAddress, updated).catch(console.error);
      return next;
    });
  }, [walletAddress]);

  const updateCustomerDescription = useCallback((customerId: string, description: string) => {
    updateCustomer(customerId, { description });
  }, [updateCustomer]);

  const deleteCustomer = useCallback((customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    customersService.delete(customerId).catch(console.error);
  }, []);

  // ── Items ────────────────────────────────────────────────────────────────

  const addItem = useCallback((data: Partial<Item>): Item => {
    const newItem: Item = {
      id:          `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name:        data.name        ?? '',
      description: data.description ?? '',
      type:        (data.type as Item['type']) ?? 'service',
      price:       data.price       ?? '0',
      currency:    data.currency    ?? 'USD',
      unit:        data.unit        ?? 'unit',
    };
    setItems(prev => [newItem, ...prev]);
    if (walletAddress) itemsService.upsert(walletAddress, newItem).catch(console.error);
    return newItem;
  }, [walletAddress]);

  const updateItem = useCallback((itemId: string, updates: Partial<Item>) => {
    setItems(prev => {
      const next = prev.map(i => i.id === itemId ? { ...i, ...updates } : i);
      const updated = next.find(i => i.id === itemId);
      if (walletAddress && updated) itemsService.upsert(walletAddress, updated).catch(console.error);
      return next;
    });
  }, [walletAddress]);

  const deleteItems = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
    itemsService.bulkDelete(ids).catch(console.error);
  }, []);

  // ── Invoices ─────────────────────────────────────────────────────────────

  const addInvoice = useCallback((data: AddInvoiceData): Invoice | null => {
    if (pendingOperations.current.invoices) {
      if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addInvoice ignored.');
      return null;
    }
    try {
      pendingOperations.current.invoices = true;
      const customer = customers.find(c => c.id === data.customerId);
      const resolvedItems: InvoiceItem[] = (data.items ?? []).map(di => {
        const found = items.find(i => i.id === di.itemId);
        return {
          name:     found ? found.name : 'Custom Item',
          quantity: parseInt(di.quantity, 10) || 1,
          price:    di.price || (found ? found.price : '0'),
        };
      });
      const total = calculateItemsTotal(resolvedItems, 2) as number;
      const newInvoice: Invoice = {
        id:             `INV-${String(++invoiceCountRef.current).padStart(3, '0')}`,
        customer:       customer ? customer.name : 'Unknown',
        customerId:     data.customerId,
        amount:         total.toLocaleString(),
        currency:       getCurrencyPreference() as string,
        status:         'pending',
        dueDate:        toUtcMidnightIso(data.dueDate) as string,
        createdAt:      new Date().toISOString(),
        items:          resolvedItems,
        sentAt:         null,
        paidAt:         null,
        emailStatus:    'pending',
        paymentAddress: '',
        txHash:         '',
        txNetwork:      '',
        txAmount:       '',
        txCurrency:     '',
      };
      setInvoices(prev => [newInvoice, ...prev]);
      if (walletAddress) invoicesService.upsert(walletAddress, newInvoice).catch(console.error);
      return newInvoice;
    } finally {
      releaseOperation('invoices');
    }
  }, [customers, items, walletAddress, releaseOperation]);

  const updateInvoice = useCallback((invoiceId: string, updates: Partial<Invoice>) => {
    setInvoices(prev => {
      const next = prev.map(inv => inv.id === invoiceId ? { ...inv, ...updates } : inv);
      const updated = next.find(inv => inv.id === invoiceId);
      if (walletAddress && updated) invoicesService.upsert(walletAddress, updated).catch(console.error);
      return next;
    });
  }, [walletAddress]);

  const sendInvoice = useCallback((invoiceId: string) => {
    updateInvoice(invoiceId, { status: 'sent', sentAt: new Date().toISOString(), emailStatus: 'sent' });
  }, [updateInvoice]);

  const markInvoicePaid = useCallback((invoiceId: string, txDetails: TxDetails) => {
    const paidInvoice = invoices.find(inv => inv.id === invoiceId);
    const added = parseFloat(paidInvoice?.amount?.replace(/,/g, '') ?? '0') || 0;
    updateInvoice(invoiceId, {
      status:     'paid',
      paidAt:     new Date().toISOString(),
      txHash:     txDetails.hash,
      txNetwork:  txDetails.network,
      txAmount:   txDetails.amount,
      txCurrency: txDetails.currency,
    });
    if (paidInvoice?.customerId) {
      setCustomers(prev => {
        const next = prev.map(c => {
          if (c.id !== paidInvoice.customerId) return c;
          const prevSpent = parseFloat(c.totalSpent.replace(/,/g, '')) || 0;
          const updated = {
            ...c,
            totalSpent: (safeAdd(prevSpent, added, 2) as number).toLocaleString(undefined, {
              minimumFractionDigits: 0, maximumFractionDigits: 2,
            }),
          };
          if (walletAddress) customersService.upsert(walletAddress, updated).catch(console.error);
          return updated;
        });
        return next;
      });
    }
  }, [invoices, walletAddress, updateInvoice]);

  const deleteInvoice = useCallback((invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    invoicesService.delete(invoiceId).catch(console.error);
  }, []);

  // ── Checkouts ────────────────────────────────────────────────────────────

  const addCheckout = useCallback((data: Partial<Checkout>): Checkout | null => {
    if (pendingOperations.current.checkouts) {
      if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addCheckout ignored.');
      return null;
    }
    try {
      pendingOperations.current.checkouts = true;
      const id = `CHK-${String(++checkoutCountRef.current).padStart(3, '0')}`;
      const newCheckout: Checkout = {
        id,
        title:       data.title       ?? '',
        description: data.description ?? '',
        amount:      data.amount      ?? '0',
        currency:    data.currency    ?? 'STRK',
        status:      'active',
        createdAt:   new Date().toISOString(),
        paymentLink: `https://tradazone.github.io/Tradazone/pay/${id}`,
        views:       0,
        payments:    0,
      };
      setCheckouts(prev => [newCheckout, ...prev]);
      if (walletAddress) checkoutsService.upsert(walletAddress, newCheckout).catch(console.error);
      dispatchWebhook('checkout.created', {
        id: newCheckout.id, title: newCheckout.title,
        amount: newCheckout.amount, currency: newCheckout.currency,
        paymentLink: newCheckout.paymentLink,
      });
      return newCheckout;
    } finally {
      releaseOperation('checkouts');
    }
  }, [walletAddress, releaseOperation]);

  const deleteCheckout = useCallback((checkoutId: string) => {
    setCheckouts(prev => prev.filter(c => c.id !== checkoutId));
    checkoutsService.delete(checkoutId).catch(console.error);
  }, []);

  const markCheckoutPaid = useCallback((checkoutId: string, customerId: string | null, walletType = '') => {
    const paidCheckout = checkouts.find(c => c.id === checkoutId);
    const added = parseFloat(paidCheckout?.amount ?? '0') || 0;
    setCheckouts(prev => {
      const next = prev.map(c =>
        c.id === checkoutId
          ? { ...c, status: 'paid' as Checkout['status'], payments: c.payments + 1, updatedAt: new Date().toISOString() }
          : c
      );
      const updated = next.find(c => c.id === checkoutId);
      if (walletAddress && updated) checkoutsService.upsert(walletAddress, updated).catch(console.error);
      return next;
    });
    if (customerId) {
      setCustomers(prev => {
        const next = prev.map(c => {
          if (c.id !== customerId) return c;
          const prevSpent = parseFloat(c.totalSpent.replace(/,/g, '')) || 0;
          const updated = {
            ...c,
            totalSpent: (safeAdd(prevSpent, added, 2) as number).toLocaleString(undefined, {
              minimumFractionDigits: 0, maximumFractionDigits: 2,
            }),
            invoiceCount: c.invoiceCount + 1,
          };
          if (walletAddress) customersService.upsert(walletAddress, updated).catch(console.error);
          return updated;
        });
        return next;
      });
    }
    if (paidCheckout) {
      dispatchWebhook('checkout.paid', {
        id: paidCheckout.id, title: paidCheckout.title,
        amount: paidCheckout.amount, currency: paidCheckout.currency,
        customerId, walletType,
      });
    }
  }, [checkouts, walletAddress]);

  const recordCheckoutView = useCallback((checkoutId: string) => {
    const target = checkouts.find(c => c.id === checkoutId);
    if (!target) return;
    const nextViews = (target.views || 0) + 1;
    setCheckouts(prev => prev.map(c => c.id === checkoutId ? { ...c, views: nextViews } : c));
    checkoutsService.incrementViews(checkoutId).catch(console.error);
    dispatchWebhook('checkout.viewed', {
      id: target.id, title: target.title,
      amount: target.amount, currency: target.currency, views: nextViews,
    });
  }, [checkouts]);

  // ── Context values ────────────────────────────────────────────────────────

  const dataContextValue = useMemo<DataContextValue>(() => ({
    customers, invoices, checkouts, items, dataLoading,
    addCustomer, updateCustomer, deleteCustomer, updateCustomerDescription,
    addItem, updateItem, deleteItems,
    addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid,
    addCheckout, deleteCheckout, markCheckoutPaid, recordCheckoutView,
  }), [
    customers, invoices, checkouts, items, dataLoading,
    addCustomer, updateCustomer, deleteCustomer, updateCustomerDescription,
    addItem, updateItem, deleteItems,
    addInvoice, updateInvoice, deleteInvoice, sendInvoice, markInvoicePaid,
    addCheckout, deleteCheckout, markCheckoutPaid, recordCheckoutView,
  ]);

  const checkoutContextValue = useMemo<CheckoutContextValue>(
    () => ({ checkouts, addCheckout, markCheckoutPaid, recordCheckoutView }),
    [checkouts, addCheckout, markCheckoutPaid, recordCheckoutView],
  );

  return (
    <DataContext.Provider value={dataContextValue}>
      <CheckoutContext.Provider value={checkoutContextValue}>
        {children}
      </CheckoutContext.Provider>
    </DataContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

export function useData(): DataContextValue {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}

export function useCheckoutData(): CheckoutContextValue {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckoutData must be used within a DataProvider');
  return context;
}

// ── Filter hooks ───────────────────────────────────────────────────────────

export function useDataFilters(type: string) {
  const [filters, setFilters] = useState<DataFilters>({
    search: '', sort: { field: 'createdAt', dir: 'desc' },
    status: 'all', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tradazone_filters_${type}`);
      if (saved) setFilters(JSON.parse(saved) as DataFilters);
    } catch { /* ignore */ }
  }, [type]);

  const setFiltersWithSave = useCallback((newFilters: DataFilters) => {
    setFilters(newFilters);
    try { localStorage.setItem(`tradazone_filters_${type}`, JSON.stringify(newFilters)); }
    catch { /* ignore */ }
  }, [type]);

  const resetFilters = useCallback(() => {
    setFiltersWithSave({
      search: '', sort: { field: 'createdAt', dir: 'desc' },
      status: 'all', dateFrom: '', dateTo: '', amountMin: '', amountMax: '',
    });
  }, [setFiltersWithSave]);

  return { filters, setFilters: setFiltersWithSave, resetFilters };
}

interface FilterConfig {
  searchableFields: string[];
  statusField?:     string;
  dateFields?:      { from: string };
  amountField?:     string;
}

export function useFilteredData<T extends Record<string, unknown>>(
  { data = [], filters, config }: { data: T[]; filters: DataFilters; config: FilterConfig }
): T[] {
  return useMemo(() => {
    let result = [...data];
    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter(item =>
        config.searchableFields.some(field =>
          String(item[field] ?? '').toLowerCase().includes(query)
        )
      );
    }
    if (config.statusField && filters.status !== 'all') {
      result = result.filter(item => item[config.statusField!] === filters.status);
    }
    if (config.dateFields) {
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate   = filters.dateTo   ? new Date(filters.dateTo)   : null;
      result = result.filter(item => {
        const itemDate = new Date(item[config.dateFields!.from] as string);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate   && itemDate > toDate)   return false;
        return true;
      });
    }
    if (config.amountField && (filters.amountMin || filters.amountMax)) {
      const min = parseFloat(filters.amountMin) || 0;
      const max = parseFloat(filters.amountMax) || Infinity;
      result = result.filter(item => {
        const amount = parseFloat((String(item[config.amountField!] ?? '0')).replace(/,/g, ''));
        return amount >= min && amount <= max;
      });
    }
    if (filters.sort.field) {
      result.sort((a, b) => {
        let aVal: unknown = a[filters.sort.field];
        let bVal: unknown = b[filters.sort.field];
        if (!isNaN(parseFloat(String(aVal))) && !isNaN(parseFloat(String(bVal)))) {
          aVal = parseFloat(String(aVal));
          bVal = parseFloat(String(bVal));
        } else {
          const aDate = new Date(String(aVal));
          const bDate = new Date(String(bVal));
          aVal = isNaN(aDate.getTime()) ? String(aVal ?? '').toLowerCase() : aDate;
          bVal = isNaN(bDate.getTime()) ? String(bVal ?? '').toLowerCase() : bDate;
        }
        if ((aVal as never) < (bVal as never)) return filters.sort.dir === 'asc' ? -1 :  1;
        if ((aVal as never) > (bVal as never)) return filters.sort.dir === 'asc' ?  1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, filters, config]);
}

export const FILTER_CONFIGS = {
  customers: CUSTOMER_FILTER_CONFIG,
  invoices:  INVOICE_FILTER_CONFIG,
  items:     ITEM_FILTER_CONFIG,
  checkouts: CHECKOUT_FILTER_CONFIG,
};
