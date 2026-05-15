// Supabase Edge Function — monitor-payments
//
// Run on a schedule (pg_cron every minute) to poll Starknet and Stellar
// for payments to merchant wallet addresses. Marks matching pending
// checkouts and invoices as paid in Supabase.
//
// To schedule, run in Supabase SQL Editor:
//
//   select cron.schedule(
//     'monitor-payments',
//     '* * * * *',
//     $$
//       select net.http_post(
//         url:='https://wsspbztgrhvbayrjfnaj.supabase.co/functions/v1/monitor-payments',
//         headers:='{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
//         body:='{}'::jsonb
//       );
//     $$
//   );

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ── Starknet: check recent transactions to a wallet ────────────────────────

async function checkStarknetPayment(address: string): Promise<{ found: boolean; txHash: string; amount: string }> {
  try {
    const res = await fetch('https://starknet-mainnet.public.blastapi.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'starknet_getBlockWithTxs',
        params: ['latest'],
      }),
    });
    const data = await res.json();
    const txs: Array<Record<string, unknown>> = data?.result?.transactions ?? [];

    for (const tx of txs) {
      // Look for STRK transfers where calldata includes the target address
      const calldata = JSON.stringify(tx);
      if (calldata.toLowerCase().includes(address.toLowerCase())) {
        return {
          found:  true,
          txHash: String(tx.transaction_hash ?? ''),
          amount: '0', // exact amount parsing requires event logs
        };
      }
    }
  } catch {
    // Network error — skip silently
  }
  return { found: false, txHash: '', amount: '' };
}

// ── Stellar: check recent payments to a wallet ─────────────────────────────

async function checkStellarPayment(address: string): Promise<{ found: boolean; txHash: string; amount: string }> {
  try {
    const res = await fetch(
      `https://horizon.stellar.org/accounts/${address}/payments?order=desc&limit=5`,
    );
    if (!res.ok) return { found: false, txHash: '', amount: '' };
    const data = await res.json();
    const records: Array<Record<string, unknown>> = data?._embedded?.records ?? [];

    for (const record of records) {
      if (record.type !== 'payment') continue;
      if (record.asset_type !== 'native') continue; // XLM only
      if ((record.to as string)?.toLowerCase() !== address.toLowerCase()) continue;

      const createdAt = new Date(record.created_at as string);
      const ageMs     = Date.now() - createdAt.getTime();
      if (ageMs > 120_000) continue; // only consider payments in the last 2 minutes

      return {
        found:  true,
        txHash: String(record.transaction_hash ?? ''),
        amount: String(record.amount ?? '0'),
      };
    }
  } catch {
    // Network error — skip silently
  }
  return { found: false, txHash: '', amount: '' };
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')              ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch all pending checkouts and invoices
    const [{ data: checkouts }, { data: invoices }] = await Promise.all([
      admin.from('checkouts').select('id, user_wallet, amount, currency').eq('status', 'active'),
      admin.from('invoices').select('id, user_wallet, amount, currency').in('status', ['pending', 'sent']),
    ]);

    let marked = 0;

    // Group by wallet address to minimise RPC calls
    const wallets = new Set([
      ...(checkouts ?? []).map(c => c.user_wallet),
      ...(invoices  ?? []).map(i => i.user_wallet),
    ]);

    for (const wallet of wallets) {
      if (!wallet) continue;

      // Check Starknet (STRK)
      const strk = await checkStarknetPayment(wallet);
      if (strk.found) {
        const matches = [
          ...(checkouts ?? []).filter(c => c.user_wallet === wallet && c.currency === 'STRK'),
          ...(invoices  ?? []).filter(i => i.user_wallet === wallet && i.currency === 'STRK'),
        ];
        for (const m of matches) {
          const table  = 'id' in m && (checkouts ?? []).includes(m as never) ? 'checkouts' : 'invoices';
          const update = table === 'checkouts'
            ? { status: 'paid', payments: 1, updated_at: new Date().toISOString() }
            : { status: 'paid', paid_at: new Date().toISOString(), tx_hash: strk.txHash, tx_network: 'Starknet', tx_currency: 'STRK', tx_amount: strk.amount };
          await admin.from(table).update(update).eq('id', m.id);
          marked++;
        }
      }

      // Check Stellar (XLM)
      const xlm = await checkStellarPayment(wallet);
      if (xlm.found) {
        const matches = [
          ...(checkouts ?? []).filter(c => c.user_wallet === wallet && c.currency === 'XLM'),
          ...(invoices  ?? []).filter(i => i.user_wallet === wallet && i.currency === 'XLM'),
        ];
        for (const m of matches) {
          const table  = (checkouts ?? []).some(c => c.id === m.id) ? 'checkouts' : 'invoices';
          const update = table === 'checkouts'
            ? { status: 'paid', payments: 1, updated_at: new Date().toISOString() }
            : { status: 'paid', paid_at: new Date().toISOString(), tx_hash: xlm.txHash, tx_network: 'Stellar', tx_currency: 'XLM', tx_amount: xlm.amount };
          await admin.from(table).update(update).eq('id', m.id);
          marked++;
        }
      }
    }

    return json({ success: true, wallets: wallets.size, marked });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[monitor-payments] unhandled:', msg);
    return json({ error: msg }, 500);
  }
});
