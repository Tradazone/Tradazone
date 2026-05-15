// Supabase Edge Function — payment-webhook
//
// Receives Alchemy webhook events for EVM address activity.
// When a confirmed transfer arrives at a merchant address, matches it to a
// pending checkout or invoice in Supabase and marks it as paid.
//
// Configure in Alchemy Notify:
//   Webhook URL: https://wsspbztgrhvbayrjfnaj.supabase.co/functions/v1/payment-webhook
//   Type: Address Activity
//   Secret: stored as ALCHEMY_SIGNING_KEY edge-function secret

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alchemy-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Verify Alchemy HMAC signature
async function verifyAlchemySignature(
  body: string,
  signature: string,
  signingKey: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)!.map(b => parseInt(b, 16)),
    );
    return crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(body));
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')              ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const signingKey     = Deno.env.get('ALCHEMY_SIGNING_KEY')       ?? '';

    const rawBody = await req.text();

    // Verify Alchemy signature when key is configured
    if (signingKey) {
      const sig = req.headers.get('x-alchemy-signature') ?? '';
      const valid = await verifyAlchemySignature(rawBody, sig, signingKey);
      if (!valid) {
        console.warn('[payment-webhook] Invalid Alchemy signature');
        return json({ error: 'Invalid signature' }, 401);
      }
    }

    const payload = JSON.parse(rawBody);
    const activities: Array<Record<string, unknown>> = payload?.event?.activity ?? [];

    if (activities.length === 0) return json({ received: true, matched: 0 });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let matched = 0;

    for (const activity of activities) {
      // Only process confirmed external transactions (not internal/token)
      if (activity.category !== 'external' && activity.category !== 'erc20') continue;
      if (activity.fromAddress === activity.toAddress) continue;

      const toAddress   = (activity.toAddress as string)?.toLowerCase() ?? '';
      const txHash      = (activity.hash as string) ?? '';
      const valueEth    = String(activity.value ?? '0');

      if (!toAddress || !txHash) continue;

      // Find pending checkout with matching merchant wallet
      const { data: checkout } = await admin
        .from('checkouts')
        .select('id, user_wallet, amount')
        .eq('status', 'active')
        .limit(50);

      // Find pending invoice
      const { data: invoice } = await admin
        .from('invoices')
        .select('id, user_wallet, amount, customer_id, customer')
        .in('status', ['pending', 'sent'])
        .limit(50);

      // Match by user_wallet address
      const matchedCheckout = (checkout ?? []).find(
        c => c.user_wallet?.toLowerCase() === toAddress,
      );
      const matchedInvoice = (invoice ?? []).find(
        i => i.user_wallet?.toLowerCase() === toAddress,
      );

      if (matchedCheckout) {
        await admin.from('checkouts').update({
          status:     'paid',
          payments:   1,
          updated_at: new Date().toISOString(),
        }).eq('id', matchedCheckout.id);
        matched++;
        console.log(`[payment-webhook] Checkout ${matchedCheckout.id} marked paid — tx: ${txHash}`);
      }

      if (matchedInvoice) {
        await admin.from('invoices').update({
          status:      'paid',
          paid_at:     new Date().toISOString(),
          tx_hash:     txHash,
          tx_network:  'Ethereum',
          tx_amount:   valueEth,
          tx_currency: 'ETH',
        }).eq('id', matchedInvoice.id);
        matched++;
        console.log(`[payment-webhook] Invoice ${matchedInvoice.id} marked paid — tx: ${txHash}`);
      }
    }

    return json({ received: true, matched });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[payment-webhook] unhandled:', msg);
    return json({ error: msg }, 500);
  }
});
