// Supabase Edge Function — verify-payment
//
// Called by the frontend after the user's wallet confirms a transaction.
// Verifies the tx exists on-chain and marks the checkout / invoice as paid
// in Supabase using the service role key (bypasses RLS).
//
// POST {
//   entity:   'checkout' | 'invoice'
//   id:       string          — checkout or invoice ID
//   txHash:   string          — transaction hash returned by the wallet
//   network:  'evm' | 'starknet' | 'stellar'
//   amount:   string          — crypto amount paid
//   currency: string          — 'ETH' | 'STRK' | 'XLM'
// }
// → { success: true } | { success: false, error: string }

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

// ── On-chain tx verification ───────────────────────────────────────────────

async function verifyEvm(txHash: string, alchemyKey: string): Promise<boolean> {
  // Use Alchemy RPC when available, fall back to public endpoint
  const rpcUrl = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://cloudflare-eth.com';
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      }),
    });
    const data = await res.json();
    return data?.result?.status === '0x1';
  } catch {
    return false;
  }
}

async function verifyStarknet(txHash: string): Promise<boolean> {
  try {
    const res = await fetch('https://starknet-mainnet.public.blastapi.io', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1,
        method: 'starknet_getTransactionReceipt',
        params: [txHash],
      }),
    });
    const data = await res.json();
    const status = data?.result?.execution_status ?? data?.result?.status ?? '';
    return status === 'SUCCEEDED' || status === 'ACCEPTED_ON_L2' || status === 'ACCEPTED_ON_L1';
  } catch {
    return false;
  }
}

async function verifyStellar(txHash: string): Promise<boolean> {
  try {
    const res = await fetch(`https://horizon.stellar.org/transactions/${txHash}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data?.successful === true;
  } catch {
    return false;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')              ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const alchemyKey     = Deno.env.get('ALCHEMY_API_KEY')           ?? '';

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return json({ success: false, error: 'Invalid JSON' }, 400); }

    const { entity, id, txHash, network, amount, currency } = body;
    if (!entity || !id || !txHash || !network) {
      return json({ success: false, error: 'Missing required fields: entity, id, txHash, network' }, 400);
    }

    // Verify on-chain
    let confirmed = false;
    if (network === 'evm')      confirmed = await verifyEvm(txHash, alchemyKey);
    else if (network === 'starknet') confirmed = await verifyStarknet(txHash);
    else if (network === 'stellar')  confirmed = await verifyStellar(txHash);

    if (!confirmed) {
      // Not yet confirmed — client should poll again
      return json({ success: false, pending: true, error: 'Transaction not yet confirmed on-chain' });
    }

    // Mark as paid in Supabase
    const table  = entity === 'checkout' ? 'checkouts' : 'invoices';
    const update = entity === 'checkout'
      ? { status: 'paid', payments: 1, updated_at: new Date().toISOString() }
      : {
          status:     'paid',
          paid_at:    new Date().toISOString(),
          tx_hash:    txHash,
          tx_network: network === 'evm' ? 'Ethereum' : network === 'starknet' ? 'Starknet' : 'Stellar',
          tx_amount:  amount  ?? '',
          tx_currency: currency ?? '',
        };

    const { error: updateErr } = await admin.from(table).update(update).eq('id', id);
    if (updateErr) {
      console.error('[verify-payment] DB update failed:', updateErr.message);
      return json({ success: false, error: `DB update: ${updateErr.message}` }, 500);
    }

    return json({ success: true, confirmed: true });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[verify-payment] unhandled:', msg);
    return json({ success: false, error: msg }, 500);
  }
});
