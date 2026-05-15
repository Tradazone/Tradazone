# Tradazone

**Tradazone is a crypto-native invoicing and payment platform built for modern merchants.** It lets you send invoices, create instant payment links, and accept cryptocurrency payments — all without a bank account, payment processor, or intermediary.

> **Live app:** [tradazone.github.io/Tradazone](https://tradazone.github.io/Tradazone/)

---

## What Tradazone does

Traditional payment platforms (Stripe, PayPal, Square) require merchants to register a business, wait weeks for approval, and pay 2–3% on every transaction. Tradazone removes all of that. You connect your wallet, create an invoice or checkout link, share it, and get paid directly in crypto — **the funds go straight to your wallet, with zero intermediaries and zero platform fees.**

---

## Crypto payments are the core

Every payment flow in Tradazone is built around on-chain crypto transactions:

| Network | Currency | Wallets supported |
|---|---|---|
| **Ethereum** | ETH | MetaMask, Phantom, Base, WalletConnect v2 |
| **Starknet** | STRK | Argent X, Braavos |
| **Stellar** | XLM | LOBSTR |

When a customer pays an invoice or checkout link, the transaction is sent **directly from their wallet to yours** — verified on-chain by a Supabase Edge Function. There is no custodial account, no settlement delay, no conversion to fiat. The merchant receives full payment instantly in their own wallet.

Live crypto-to-fiat conversion is displayed at payment time so customers always know the exact amount in their local currency (USD, EUR, GBP, NGN).

---

## Features

### For merchants
- **Invoices** — Create professional invoices with line items, due dates, and automatic crypto price conversion. Send by email with a direct "Pay here" link.
- **Checkout links** — One-click shareable payment pages. Share via link, QR code, WhatsApp, or email.
- **Dashboard** — Live revenue summary, invoice status breakdown (paid / pending / overdue), and a revenue-over-time chart.
- **Customers** — Customer address book linked to invoice history and total spend.
- **Items & Services** — Reusable product/service catalogue for quick invoice creation.
- **Notification preferences** — Control which email notifications you receive per category.

### For payers
- Open a checkout or invoice link — **no account required**.
- Choose a cryptocurrency (ETH, STRK, or XLM).
- See the live fiat equivalent in real time (USD, EUR, GBP, NGN).
- Connect a wallet and confirm payment in one click.
- Receive a downloadable PDF receipt immediately after the transaction is confirmed on-chain.

---

## Infrastructure

| Concern | Solution |
|---|---|
| Backend & database | Supabase (Postgres + RLS) — data isolated per wallet address |
| Auth | SIWE for EVM · address-claim for Starknet/Stellar · Supabase JWT sessions |
| Email | Resend via Edge Function — API key never in the browser bundle |
| Crypto prices | Edge Function proxy of CoinGecko — no CORS, server-side cache |
| Payment monitoring | Alchemy webhooks (EVM) + Supabase cron (Starknet/Stellar) |
| Error tracking | Sentry with source map upload in CI |
| Analytics | PostHog — page views, checkout creation, invoice sends, payment completions |
| Mobile wallets | WalletConnect v2 as EVM fallback for mobile users |
| Uptime monitoring | UptimeRobot pinging `/health.json` every 5 minutes |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript (strict), Tailwind CSS, Vite 8 |
| Backend | Supabase (Postgres, Auth, Edge Functions, Storage) |
| Blockchain — EVM | ethers.js v6, WalletConnect v2 |
| Blockchain — Starknet | starknet.js v9, get-starknet |
| Blockchain — Stellar | stellar-sdk v13, LOBSTR Signer API |
| Email | Resend (via Supabase Edge Function) |
| Analytics | PostHog |
| Error tracking | Sentry React SDK |
| Charts | Chart.js v4 (lazy-loaded into its own bundle chunk) |
| Testing | Vitest (unit) · Playwright (E2E) · Storybook (components) |
| CI/CD | GitHub Actions → GitHub Pages |

---

## Getting started

### Prerequisites
- Node.js 20+
- A Supabase project — [supabase.com](https://supabase.com)
- A Resend account — [resend.com](https://resend.com) (for email)
- A WalletConnect project ID — [cloud.walletconnect.com](https://cloud.walletconnect.com) (free)

### Local development

```bash
git clone https://github.com/Tradazone/Tradazone.git
cd Tradazone
npm install
```

Create a `.env.local` file (copy from `.env.development`) and fill in:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WALLETCONNECT_PROJECT_ID=your-wc-project-id
```

Then:

```bash
npm run dev
```

### Supabase setup

1. **Run the SQL migrations** in Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql` — all tables + RLS policies
   - `supabase/migrations/002_notification_preferences.sql` — notification prefs column

2. **Deploy Edge Functions** from `supabase/functions/`:
   - `auth-wallet` — wallet auth + session issuance
   - `send-email` — Resend email delivery
   - `prices` — CoinGecko rate proxy
   - `verify-payment` — on-chain tx verification
   - `payment-webhook` — Alchemy EVM webhook receiver
   - `monitor-payments` — Starknet + Stellar polling (run via Supabase cron)

3. **Add Edge Function secrets** in the Supabase dashboard:

   | Secret | Where to get it |
   |---|---|
   | `APP_JWT_SECRET` | Project Settings → API → JWT Secret |
   | `RESEND_API_KEY` | Resend dashboard |
   | `ALCHEMY_API_KEY` | Alchemy dashboard |
   | `ALCHEMY_SIGNING_KEY` | Alchemy Notify → webhook config |

4. **Schedule the cron job** (Supabase SQL Editor, requires `pg_cron` + `pg_net` extensions):

   ```sql
   select cron.schedule(
     'monitor-payments', '* * * * *',
     $$ select net.http_post(
       url:='https://YOUR_PROJECT.supabase.co/functions/v1/monitor-payments',
       headers:='{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
       body:='{}'::jsonb
     ); $$
   );
   ```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_WALLETCONNECT_PROJECT_ID` | ✅ | WalletConnect v2 project ID |
| `VITE_SENTRY_DSN` | Optional | Sentry DSN for error tracking |
| `VITE_POSTHOG_KEY` | Optional | PostHog project API key for analytics |

All secrets for production are stored in **GitHub Actions → Settings → Secrets**.

---

## Development scripts

```bash
npm run dev          # start dev server at localhost:5173
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # TypeScript strict type-check
npm test             # Vitest unit tests
npm run test:e2e     # Playwright end-to-end tests (requires running dev server)
npm run storybook    # Storybook component explorer at localhost:6006
```

---

## CI/CD pipeline

Every push to `main` triggers:

```
lint → typecheck → unit tests → build + bundle size check → deploy to GitHub Pages
```

Pull requests and the `staging` branch run the same gates but produce a downloadable build artifact instead of deploying to production.

**Bundle size limits (enforced in CI):**
- Any single JS chunk > 1100 KB fails the build
- Blockchain SDKs (stellar, starknet, ethereum), Chart.js, WalletConnect, and Supabase are each in their own lazy-loaded chunk and only downloaded when needed

---

## Project structure

```
src/
├── components/        # Shared UI (Button, Input, StatusBadge, EmptyState, …)
├── context/           # React contexts (AuthContext, DataContext, ThemeContext)
├── features/          # Feature modules (auth, checkouts, customers, invoices, items, settings)
├── hooks/             # Custom hooks (useLobstr, useFocusTrap, useDebounce, …)
├── lib/               # Supabase client (supabase.ts)
├── services/          # Data layer (supabaseData, emailService, priceService, api)
├── stories/           # Storybook component stories
├── types/             # Shared TypeScript interfaces (Customer, Invoice, Checkout, …)
└── utils/             # Currency, date, receipt, wallet utilities

supabase/
├── functions/         # Deno Edge Functions
└── migrations/        # SQL schema migrations

e2e/                   # Playwright E2E test flows
.storybook/            # Storybook configuration
.husky/                # Git hooks (pre-commit: lint + typecheck)
```

---

## Pre-commit hooks

Husky runs on every `git commit`:
- ESLint on all staged TypeScript files
- `tsc --noEmit` type-check

Commits with lint errors or type errors are blocked before they can be pushed.

---

## License

MIT

Built by the Tradazone team.
