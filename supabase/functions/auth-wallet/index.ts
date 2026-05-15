// Supabase Edge Function — wallet authentication (v4, native session)
//
// Uses Supabase's own signInWithPassword so PostgREST accepts the tokens natively.
// A deterministic per-wallet password is derived server-side using APP_JWT_SECRET
// as the HMAC key — never exposed to the client.
//
// POST { action: 'nonce', address, walletType }
//   → { nonce }
//
// POST { action: 'verify', address, signature, walletType }
//   → { access_token, refresh_token }  ← real Supabase session, auto-refresh works

import { createClient } from 'npm:@supabase/supabase-js@2';
import { ethers } from 'npm:ethers@6';

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

// Derive a stable, secret password for a wallet address.
// HMAC(APP_JWT_SECRET, normalizedAddress) — only computable server-side.
async function derivePassword(address: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(address.toLowerCase()),
  );
  let binary = '';
  for (const b of new Uint8Array(sig)) binary += String.fromCharCode(b);
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl    = Deno.env.get('SUPABASE_URL')              ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey        = Deno.env.get('SUPABASE_ANON_KEY')         ?? '';
    const appSecret      = Deno.env.get('APP_JWT_SECRET')            ?? '';

    if (!serviceRoleKey) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, 500);
    if (!appSecret)      return json({ error: 'APP_JWT_SECRET not set — add it in Edge Function secrets' }, 500);

    // Admin client — bypasses RLS, used for user management
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Anon client — issues real Supabase sessions via signInWithPassword
    const anon = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: Record<string, string>;
    try { body = await req.json(); }
    catch { return json({ error: 'Invalid JSON body' }, 400); }

    const { action, address, walletType, signature } = body;
    if (!action || !address) return json({ error: 'Missing: action, address' }, 400);

    const normalizedAddress = address.toLowerCase();

    // ── nonce ──────────────────────────────────────────────────────────────

    if (action === 'nonce') {
      const nonce     = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { error } = await admin.from('auth_nonces').upsert({
        address:    normalizedAddress,
        nonce,
        expires_at: expiresAt,
      });
      if (error) return json({ error: `nonce upsert: ${error.message}` }, 500);

      return json({ nonce });
    }

    // ── verify ─────────────────────────────────────────────────────────────

    if (action === 'verify') {
      if (!signature) return json({ error: 'Missing signature' }, 400);

      // 1. Load & validate nonce
      const { data: nonceRow, error: nonceErr } = await admin
        .from('auth_nonces')
        .select('nonce, expires_at')
        .eq('address', normalizedAddress)
        .single();

      if (nonceErr || !nonceRow) {
        return json({ error: 'No pending nonce — restart the auth flow' }, 400);
      }
      if (new Date(nonceRow.expires_at) < new Date()) {
        await admin.from('auth_nonces').delete().eq('address', normalizedAddress);
        return json({ error: 'Nonce expired — please try again' }, 400);
      }

      // 2. Verify EVM signature; other wallet types use address-claim
      if (walletType === 'evm') {
        const message =
          `Sign this message to authenticate with Tradazone.\n\nWallet: ${address}\nNonce: ${nonceRow.nonce}`;
        let recovered: string;
        try   { recovered = ethers.verifyMessage(message, signature); }
        catch (e: unknown) {
          return json({ error: `Bad signature: ${(e as Error).message}` }, 401);
        }
        if (recovered.toLowerCase() !== normalizedAddress) {
          return json({ error: 'Signature does not match address' }, 401);
        }
      }

      // 3. Consume nonce
      await admin.from('auth_nonces').delete().eq('address', normalizedAddress);

      // 4. Derive deterministic password (never leaves the server)
      const syntheticEmail = `${normalizedAddress}@wallet.tradazone.com`;
      const password       = await derivePassword(normalizedAddress, appSecret);

      // 5. Find or create the auth user, then sign in with derived password

      // Fast path: try sign-in first (returning user with correct password)
      const { data: signIn1, error: err1 } = await anon.auth.signInWithPassword({
        email: syntheticEmail, password,
      });

      let signInData: { session: { access_token: string; refresh_token: string } | null } | null = null;

      if (!err1 && signIn1?.session) {
        signInData = signIn1;
      } else {
        // Slow path: create or repair the account
        const { error: createErr } = await admin.auth.admin.createUser({
          email:         syntheticEmail,
          password,
          user_metadata: { wallet_address: address, wallet_type: walletType ?? 'starknet' },
          email_confirm: true,
        });

        if (createErr) {
          // User already exists but with a different password (legacy account) —
          // look them up via the GoTrue admin REST API and reset the password.
          if (createErr.message?.toLowerCase().includes('already')) {
            const usersResp = await fetch(
              `${supabaseUrl}/auth/v1/admin/users?filter=${encodeURIComponent(syntheticEmail)}`,
              { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } },
            );
            const usersJson = await usersResp.json();
            const existingId = usersJson?.users?.[0]?.id;
            if (!existingId) return json({ error: 'User exists but could not find ID' }, 500);

            await admin.auth.admin.updateUserById(existingId, {
              password,
              user_metadata: { wallet_address: address, wallet_type: walletType ?? 'starknet' },
            });
          } else {
            return json({ error: `createUser: ${createErr.message}` }, 500);
          }
        } else {
          // New user created — persist wallet profile row (best-effort)
          await admin.from('users').upsert({
            wallet_address: address,
            wallet_type:    walletType ?? 'starknet',
          }).then(() => {}).catch(() => {});
        }

        // Sign in with the now-correct password
        const { data: fresh, error: freshErr } = await anon.auth.signInWithPassword({
          email: syntheticEmail, password,
        });
        if (freshErr || !fresh?.session) {
          return json({ error: `signIn: ${freshErr?.message ?? 'no session'}` }, 500);
        }
        signInData = fresh;
      }

      if (!signInData?.session) {
        return json({ error: 'Failed to obtain session' }, 500);
      }

      return json({
        access_token:  signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      });
    }

    return json({ error: `Unknown action: ${action}` }, 400);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[auth-wallet] unhandled:', msg);
    return json({ error: msg }, 500);
  }
});
