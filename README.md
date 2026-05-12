# Tradazone — App

React application for the Tradazone crypto invoicing and payment platform.

**Production URL:** https://app.tradazone.com  
**Repository:** `tradazone` (this repo)  
**Part of:** [Tradazone Platform](https://tradazone.com)

---

## Related Repositories

| Repository | Purpose | Domain |
|---|---|---|
| `tradazone` (this) | React application | app.tradazone.com |
| `tradazone-api` | Backend API | api.tradazone.com |
| `tradazone-site` | Marketing website | tradazone.com |

---

## Tech Stack

- **React 19** + React Router 7
- **Vite 8** — build tool and dev server
- **Tailwind CSS 3** — styling
- **Blockchain SDKs:** ethers.js (EVM), stellar-sdk (Stellar), starknet.js (Starknet)
- **EmailJS** — transactional email (invoices, receipts)
- **GitHub Actions** → **GitHub Pages** — CI/CD

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- A browser wallet: MetaMask, Freighter, Lobstr, Argent, or Braavos

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Blockora-dex/Tradazone.git
cd Tradazone

# 2. Install dependencies
npm install

# 3. Copy env template and fill in values
cp .env.example .env.local

# 4. Start dev server
npm run dev
```

The app runs at http://localhost:5173.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_APP_ENV` | Yes | `development` \| `staging` \| `production` |
| `VITE_BASE_PATH` | Yes | Router base path (always `/` with custom domain) |
| `VITE_API_URL` | Yes | Backend API URL (`http://localhost:3000/api` for dev) |
| `VITE_APP_NAME` | No | Display name (default: `Tradazone`) |
| `VITE_EMAILJS_SERVICE_ID` | Yes | EmailJS service ID |
| `VITE_EMAILJS_PUBLIC_KEY` | Yes | EmailJS public key |
| `VITE_EMAILJS_TEMPLATE_INVOICE` | Yes | EmailJS invoice template ID |
| `VITE_EMAILJS_TEMPLATE_RECEIPT` | Yes | EmailJS receipt template ID |
| `VITE_WEBHOOK_URL` | No | Checkout lifecycle webhook endpoint |
| `VITE_SEP38_URL` | No | Stellar SEP-38 anchor quote server URL |

### Running the Backend API Locally

To connect to the real API locally, clone and run [tradazone-api](https://github.com/Blockora-dex/tradazone-api):

```bash
# In a separate terminal
git clone https://github.com/Blockora-dex/tradazone-api.git
cd tradazone-api
npm install
cp .env.example .env
npm run dev   # starts on port 3000
```

Then set `VITE_API_URL=http://localhost:3000/api` in your `.env.local`.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Production build to `./dist` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest unit tests |

---

## Deployment

### GitHub Pages (Automatic)

Every push to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:

1. Installs dependencies (`npm ci`)
2. Builds with production env vars injected from GitHub Secrets
3. Deploys `./dist` to GitHub Pages

The `public/CNAME` file tells GitHub Pages to serve the site at `app.tradazone.com`.

### GitHub Actions Secrets

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VITE_EMAILJS_SERVICE_ID` | Your EmailJS service ID |
| `VITE_EMAILJS_PUBLIC_KEY` | Your EmailJS public key |
| `VITE_EMAILJS_TEMPLATE_INVOICE` | Invoice template ID |
| `VITE_EMAILJS_TEMPLATE_RECEIPT` | Receipt template ID |
| `VITE_WEBHOOK_URL` | Optional webhook endpoint |
| `VITE_SEP38_URL` | Optional SEP-38 URL |

### Custom Domain DNS Setup

In your DNS provider, add:

```
Type   Name    Value
CNAME  app     blockora-dex.github.io
```

Then in **GitHub repo → Settings → Pages → Custom domain**, enter `app.tradazone.com` and enable **Enforce HTTPS**.

---

## Architecture

```
src/
├── components/        # Shared UI (forms, layout, tables, routing guards)
├── config/            # Environment config (env.js)
├── context/           # React context providers (Auth, Data, Theme)
├── features/          # Feature modules by domain
│   ├── auth/          #   Sign in / sign up
│   ├── dashboard/     #   Home dashboard
│   ├── customers/     #   Customer management
│   ├── invoices/      #   Invoice creation and tracking
│   ├── checkouts/     #   Checkout link management
│   ├── items/         #   Product/service catalog
│   └── settings/      #   Profile, payments, notifications, password
├── hooks/             # Custom React hooks
├── security/          # CSP enforcement
├── services/          # Integrations (api, blockchainMonitor, emailService, webhook)
├── stellar/           # Stellar SEP-38 client
└── utils/             # Utility functions
```

### Authentication

Wallet-based authentication via `src/context/AuthContext.jsx`. Supported wallets:

| Network | Wallets |
|---|---|
| EVM (Ethereum) | MetaMask, Phantom, Coinbase Wallet, Base (EIP-6963) |
| Stellar | Freighter, Lobstr |
| Starknet | Argent, Braavos |

Sessions are stored in localStorage with a 7-day TTL in production.

### Payment Detection

Real-time blockchain payment detection runs client-side via `src/services/blockchainMonitor.js`:

- **Ethereum** — event-driven via ethers.js block listener
- **Starknet** — 10-second polling
- **Stellar** — real-time Horizon API streaming

### API Layer

`src/services/api.js` is the centralized API gateway. It currently uses an in-memory mock for all endpoints. To migrate to the real `tradazone-api` backend, replace each mock function body with its `apiFetch()` call — migration comments are already inline in the file.

---

## Contributing

1. Branch from `main`
2. Make changes
3. `npm run lint` and `npm test` must pass
4. Open a pull request

---

## License

Private — Tradazone © 2025
