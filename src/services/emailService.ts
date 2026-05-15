/// <reference types="vite/client" />
/**
 * emailService.ts — sends transactional emails via the send-email Edge Function.
 * The Resend API key never touches the browser bundle.
 */

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`
  : null;

const APP_BASE = 'https://tradazone.github.io/Tradazone';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

interface EmailResult { success: boolean; error?: string; }
interface InvoiceLike { id: string; customer: string; amount: string; currency: string; dueDate: string; items?: Array<{ name: string }>; customerEmail?: string; senderEmail?: string; senderName?: string; }
interface TxLike     { hash?: string; amount?: string; currency?: string; network?: string; }

async function send(type: string, data: Record<string, string>): Promise<EmailResult> {
  if (!FUNCTIONS_URL) {
    if (import.meta.env.DEV) console.warn('[emailService] VITE_SUPABASE_URL not set — email skipped');
    return { success: false, error: 'Email service not configured' };
  }
  try {
    const res = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
      body: JSON.stringify({ type, data }),
    });
    const body = await res.json() as { success?: boolean; id?: string; error?: string };
    if (!res.ok) {
      if (import.meta.env.DEV) console.error('[emailService]', type, 'failed:', body.error);
      return { success: false, error: body.error ?? 'Email send failed' };
    }
    if (import.meta.env.DEV) console.log('[emailService]', type, 'sent — id:', body.id);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (import.meta.env.DEV) console.error('[emailService] network error:', msg);
    return { success: false, error: msg };
  }
}

export async function sendInvoiceToCustomer(invoice: InvoiceLike): Promise<EmailResult> {
  return send('invoice', {
    to_name: invoice.customer, to_email: invoice.customerEmail ?? '',
    invoice_id: invoice.id, invoice_amount: invoice.amount, invoice_currency: invoice.currency,
    invoice_due_date: invoice.dueDate,
    payment_link: `${APP_BASE}/pay/invoice/${invoice.id}`,
    invoice_preview_link: `${APP_BASE}/invoice/${invoice.id}`,
    sender_name: invoice.senderName ?? 'Tradazone',
    item_description: invoice.items?.[0]?.name ?? '',
  });
}

export async function sendInvoiceConfirmationToSender(invoice: InvoiceLike): Promise<EmailResult> {
  return send('invoice', {
    to_name: invoice.senderName ?? 'Tradazone', to_email: invoice.senderEmail ?? '',
    invoice_id: invoice.id, invoice_amount: invoice.amount, invoice_currency: invoice.currency,
    invoice_due_date: invoice.dueDate,
    payment_link: `${APP_BASE}/pay/invoice/${invoice.id}`,
    invoice_preview_link: `${APP_BASE}/invoice/${invoice.id}`,
    sender_name: invoice.senderName ?? 'Tradazone',
    item_description: invoice.items?.[0]?.name ?? '',
  });
}

export async function sendPaymentReceivedToSender(invoice: InvoiceLike, tx: TxLike): Promise<EmailResult> {
  return send('payment-notification', {
    to_name: invoice.senderName ?? 'Tradazone', to_email: invoice.senderEmail ?? '',
    invoice_id: invoice.id, invoice_customer: invoice.customer,
    tx_hash: tx.hash ?? '', tx_amount: tx.amount ?? '', tx_currency: tx.currency ?? '',
    tx_network: tx.network ?? '', paid_at: new Date().toLocaleString(),
  });
}

export async function sendPaymentReceiptToCustomer(invoice: InvoiceLike, tx: TxLike): Promise<EmailResult> {
  return send('receipt', {
    to_name: invoice.customer, to_email: invoice.customerEmail ?? '',
    invoice_id: invoice.id,
    tx_hash: tx.hash ?? '', tx_amount: tx.amount ?? '', tx_currency: tx.currency ?? '',
    tx_network: tx.network ?? '', paid_at: new Date().toLocaleString(),
    sender_name: invoice.senderName ?? 'Tradazone',
  });
}
