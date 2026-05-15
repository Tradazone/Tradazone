// Supabase Edge Function — send-email
//
// Sends transactional emails via Resend. Keeps the API key server-side.
//
// POST { type: 'invoice' | 'receipt' | 'payment-notification', data: {...} }
//   → { success: true } | { error: string }

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FROM = 'Tradazone <onboarding@resend.dev>';
const RESEND_URL = 'https://api.resend.com/emails';

const LOGO_URL = 'https://wsspbztgrhvbayrjfnaj.supabase.co/storage/v1/object/public/assets/Logo%20White.png';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Email templates ────────────────────────────────────────────────────────

function invoiceHtml(d: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice from Tradazone</title>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F5F6FA; margin: 0; padding: 0; color: #1E293B; -webkit-font-smoothing: antialiased; }
        table { border-collapse: collapse; }
        .wrapper { width: 100%; background-color: #F5F6FA; padding: 40px 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E2E8F0; }
        .header { background-color: #3C3CEF; text-align: center; padding: 24px; }
        .header img { height: 32px; display: block; margin: 0 auto; }
        .greeting-section { padding: 40px 32px 32px 32px; text-align: center; }
        .greeting { font-size: 18px; font-weight: 500; margin: 0 0 12px 0; color: #1E293B; }
        .subtitle { font-size: 15px; color: #64748B; margin: 0; }
        .details-header { background-color: #B6B6F8; padding: 16px; font-weight: 500; text-align: center; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; color: #1E293B; font-size: 16px; }
        .details-table { width: 100%; }
        .details-row { border-bottom: 1px solid #E2E8F0; }
        .details-cell { padding: 20px 32px; font-size: 15px; }
        .details-label { text-align: left; color: #1E293B; }
        .details-value { text-align: right; font-weight: 500; color: #1E293B; }
        .value-currency { color: #B6B6F8; margin-left: 4px; }
        .action-container { padding: 32px; border-bottom: 1px solid #E2E8F0; }
        .btn-pay { display: block; background-color: #3C3CEF; color: #FFFFFF; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 500; text-align: center; margin: 0 auto; }
        .btn-download-container { text-align: center; margin-top: 24px; padding-bottom: 8px; }
        .btn-download { color: #64748B; text-decoration: none; font-size: 15px; }
        .footer { padding: 32px; text-align: center; font-size: 14px; color: #64748B; background-color: #F8F9FA; }
        .footer a { color: #64748B; text-decoration: none; }
    </style>
</head>
<body>
    <table class="wrapper" role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center">
                <table class="container" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                    <tr>
                        <td class="header">
                            <img src="${LOGO_URL}" alt="Tradazone">
                        </td>
                    </tr>
                    <tr>
                        <td class="greeting-section">
                            <p class="greeting">Hi ${d.to_name}</p>
                            <p class="subtitle">Please find your invoice details below.</p>
                        </td>
                    </tr>
                    <tr>
                        <td class="details-header">Invoice details</td>
                    </tr>
                    <tr>
                        <td>
                            <table class="details-table" role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr class="details-row">
                                    <td class="details-cell details-label">Item and Services</td>
                                    <td class="details-cell details-value">${d.item_description}</td>
                                </tr>
                                <tr class="details-row">
                                    <td class="details-cell details-label">Invoice ID:</td>
                                    <td class="details-cell details-value">${d.invoice_id}</td>
                                </tr>
                                <tr class="details-row">
                                    <td class="details-cell details-label">Amount Due:</td>
                                    <td class="details-cell details-value">${d.invoice_amount}<span class="value-currency">${d.invoice_currency}</span></td>
                                </tr>
                                <tr class="details-row">
                                    <td class="details-cell details-label">Due Date:</td>
                                    <td class="details-cell details-value">${d.invoice_due_date}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="action-container">
                            <a href="${d.payment_link}" class="btn-pay" style="color: #ffffff;">Pay here</a>
                            <div class="btn-download-container">
                                <a href="${d.invoice_preview_link}" class="btn-download">Download invoice as PDF</a>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td class="footer">
                            <p style="margin: 0 0 16px 0;">If you have questions or issues with this payment, contact us at <a href="mailto:support@tradazone.com">support@tradazone.com</a> or simply reply to this email.</p>
                            <p style="margin: 0;"><a href="https://tradazone.com">Tradazone.com</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function receiptHtml(d: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f4f4f5; margin: 0; padding: 32px 0; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #16a34a; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
  .body { padding: 32px; }
  .badge { display: inline-block; background: #dcfce7; color: #16a34a; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .label { color: #6b7280; font-size: 13px; }
  .value { font-size: 13px; font-weight: 600; color: #111827; }
  .mono { font-family: monospace; font-size: 11px; word-break: break-all; color: #4f46e5; }
  .footer { padding: 20px 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid #f0f0f0; }
</style></head>
<body>
  <div class="card">
    <div class="header"><h1>Payment Confirmed</h1></div>
    <div class="body">
      <p style="color:#374151;margin-top:0">Hi ${d.to_name}, your payment was received.</p>
      <div class="badge">✓ Payment complete</div>
      <div class="row"><span class="label">Invoice</span><span class="value">${d.invoice_id}</span></div>
      <div class="row"><span class="label">Amount</span><span class="value">${d.tx_amount} ${d.tx_currency}</span></div>
      <div class="row"><span class="label">Network</span><span class="value">${d.tx_network}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${d.paid_at}</span></div>
      ${d.tx_hash ? `<div class="row"><span class="label">Tx hash</span><span class="value mono">${d.tx_hash}</span></div>` : ''}
    </div>
    <div class="footer">Sent via Tradazone · Keep this email as your payment receipt.</div>
  </div>
</body></html>`;
}

function paymentNotificationHtml(d: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; background: #f4f4f5; margin: 0; padding: 32px 0; }
  .card { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
  .header { background: #4f46e5; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 700; }
  .body { padding: 32px; }
  .amount { font-size: 28px; font-weight: 800; color: #16a34a; margin: 20px 0; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .label { color: #6b7280; font-size: 13px; }
  .value { font-size: 13px; font-weight: 600; color: #111827; }
  .mono { font-family: monospace; font-size: 11px; word-break: break-all; color: #4f46e5; }
  .footer { padding: 20px 32px; color: #9ca3af; font-size: 12px; border-top: 1px solid #f0f0f0; }
</style></head>
<body>
  <div class="card">
    <div class="header"><h1>💰 Payment Received</h1></div>
    <div class="body">
      <p style="color:#374151;margin-top:0">You received a payment for invoice <strong>${d.invoice_id}</strong>.</p>
      <div class="amount">${d.tx_amount} ${d.tx_currency}</div>
      <div class="row"><span class="label">From</span><span class="value">${d.invoice_customer}</span></div>
      <div class="row"><span class="label">Network</span><span class="value">${d.tx_network}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${d.paid_at}</span></div>
      ${d.tx_hash ? `<div class="row"><span class="label">Tx hash</span><span class="value mono">${d.tx_hash}</span></div>` : ''}
    </div>
    <div class="footer">Sent via Tradazone</div>
  </div>
</body></html>`;
}

// ── Notification preference check ──────────────────────────────────────────

// Maps email type → preference key in notification_preferences JSONB
const TYPE_TO_PREF: Record<string, string> = {
  'invoice':              'invoices',
  'receipt':              'payments',
  'payment-notification': 'payments',
};

async function isEmailAllowed(
  supabaseUrl: string,
  serviceKey:  string,
  walletAddress: string | undefined,
  emailType: string,
): Promise<boolean> {
  if (!walletAddress) return true; // No user context → allow
  const prefKey = TYPE_TO_PREF[emailType];
  if (!prefKey) return true;

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/users?wallet_address=eq.${encodeURIComponent(walletAddress)}&select=notification_preferences`,
      { headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` } },
    );
    const rows = await res.json() as Array<{ notification_preferences?: Record<string, boolean> }>;
    const prefs = rows?.[0]?.notification_preferences;
    if (!prefs) return true; // No prefs set → allow
    return prefs[prefKey] !== false; // Default allow unless explicitly false
  } catch {
    return true; // On error, allow
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey      = Deno.env.get('RESEND_API_KEY')           ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')              ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (!apiKey) return json({ error: 'RESEND_API_KEY not set' }, 500);

    let body: { type: string; data: Record<string, string>; merchant_wallet?: string };
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { type, data, merchant_wallet } = body;
    if (!type || !data) return json({ error: 'Missing type or data' }, 400);

    // Check notification preferences before sending
    const allowed = await isEmailAllowed(supabaseUrl, serviceKey, merchant_wallet, type);
    if (!allowed) {
      return json({ success: true, skipped: true, reason: 'notification preference disabled' });
    }

    let subject = '';
    let html    = '';
    let to      = '';

    switch (type) {
      case 'invoice':
        subject = `Invoice ${data.invoice_id} from ${data.sender_name}`;
        html    = invoiceHtml(data);
        to      = data.to_email;
        break;

      case 'receipt':
        subject = `Payment confirmed — Invoice ${data.invoice_id}`;
        html    = receiptHtml(data);
        to      = data.to_email;
        break;

      case 'payment-notification':
        subject = `Payment received — Invoice ${data.invoice_id}`;
        html    = paymentNotificationHtml(data);
        to      = data.to_email;
        break;

      default:
        return json({ error: `Unknown email type: ${type}` }, 400);
    }

    if (!to) return json({ error: 'Missing to_email in data' }, 400);

    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    const resBody = await res.json();

    if (!res.ok) {
      console.error('[send-email] Resend error:', resBody);
      return json({ error: resBody?.message ?? 'Email send failed' }, res.status);
    }

    return json({ success: true, id: resBody.id });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email] unhandled:', msg);
    return json({ error: msg }, 500);
  }
});
