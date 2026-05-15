// Supabase Edge Function — prices
//
// Proxies CoinGecko to avoid browser CORS restrictions and rate limiting.
// Caches the result for 60 seconds using a module-level variable (persists
// across warm invocations of the same Edge Function instance).
//
// GET /functions/v1/prices → { ETH, STRK, XLM } keyed by fiat currency

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,starknet,stellar&vs_currencies=usd,eur,gbp,ngn';

const FALLBACK = {
  ETH:  { usd: 3000,  eur: 2800,  gbp: 2400,  ngn: 4_500_000 },
  STRK: { usd: 1.5,   eur: 1.4,   gbp: 1.2,   ngn: 2_250     },
  XLM:  { usd: 0.1,   eur: 0.093, gbp: 0.079, ngn: 150       },
};

let cached: typeof FALLBACK | null = null;
let cachedAt = 0;
const TTL = 60_000; // 60 seconds

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const now = Date.now();
  if (cached && now - cachedAt < TTL) {
    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' },
    });
  }

  try {
    const resp = await fetch(COINGECKO_URL, {
      headers: { 'Accept': 'application/json' },
    });

    if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);

    const data = await resp.json();
    cached = {
      ETH:  data.ethereum || FALLBACK.ETH,
      STRK: data.starknet || FALLBACK.STRK,
      XLM:  data.stellar  || FALLBACK.XLM,
    };
    cachedAt = now;

    return new Response(JSON.stringify(cached), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[prices] CoinGecko fetch failed:', msg, '— returning fallback');
    return new Response(JSON.stringify(cached ?? FALLBACK), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'FALLBACK' },
    });
  }
});
