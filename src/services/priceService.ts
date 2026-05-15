/// <reference types="vite/client" />
/**
 * priceService.ts — fetches live crypto/fiat rates via the Supabase prices proxy.
 */

const PRICES_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prices`
  : null;

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

type FiatRates = { usd: number; eur: number; gbp: number; ngn: number };
type Rates     = { ETH: FiatRates; STRK: FiatRates; XLM: FiatRates };

const FALLBACK: Rates = {
  ETH:  { usd: 3000,  eur: 2800,  gbp: 2400,  ngn: 4_500_000 },
  STRK: { usd: 1.5,   eur: 1.4,   gbp: 1.2,   ngn: 2_250     },
  XLM:  { usd: 0.1,   eur: 0.093, gbp: 0.079, ngn: 150       },
};

const CACHE_TTL = 60_000;
let ratesCache: Rates | null = null;
let cacheTimestamp = 0;

export const priceService = {
  getRates: async (): Promise<Rates> => {
    const now = Date.now();
    if (ratesCache && now - cacheTimestamp < CACHE_TTL) return ratesCache;
    if (!PRICES_URL) {
      if (import.meta.env.DEV) console.warn('[priceService] VITE_SUPABASE_URL not set — using fallback');
      return FALLBACK;
    }
    try {
      const res = await fetch(PRICES_URL, {
        headers: { 'Authorization': `Bearer ${ANON_KEY}`, 'apikey': ANON_KEY },
      });
      if (!res.ok) throw new Error(`prices function returned ${res.status}`);
      const data = await res.json() as Rates;
      ratesCache = data;
      cacheTimestamp = now;
      return ratesCache;
    } catch (err: unknown) {
      if (import.meta.env.DEV) console.error('[priceService] fetch failed:', err instanceof Error ? err.message : err);
      return ratesCache ?? FALLBACK;
    }
  },

  convertFiatToCrypto: async (amount: number, cryptoSymbol: string, fiatCurrency = 'usd'): Promise<number> => {
    const rates = await priceService.getRates();
    const cryptoRates = rates[cryptoSymbol as keyof Rates];
    if (!cryptoRates) return 0;
    const key  = fiatCurrency.toLowerCase() as keyof FiatRates;
    const rate = cryptoRates[key] ?? cryptoRates.usd;
    if (!rate) return 0;
    return parseFloat((amount / rate).toFixed(6));
  },

  getFiatRate: async (from: string, to: string): Promise<number> => {
    if (from === to) return 1;
    const rates = await priceService.getRates();
    const ref = rates.STRK;
    if (!ref) return 1;
    const fromRate = ref[from.toLowerCase() as keyof FiatRates];
    const toRate   = ref[to.toLowerCase()   as keyof FiatRates];
    if (!fromRate || !toRate) return 1;
    return toRate / fromRate;
  },
};
