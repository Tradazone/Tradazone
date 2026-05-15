import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Read VITE_BASE_PATH from the active .env file so the build base matches
  // the deployment target automatically:
  //   GitHub Pages  → VITE_BASE_PATH=/Tradazone/  (set in deploy.yml)
  //   Custom domain → VITE_BASE_PATH=/             (set when app.tradazone.com is live)
  const env = loadEnv(mode, process.cwd(), '')
  const base = env.VITE_BASE_PATH || '/'

  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        output: {
          // Vite 8 (Rolldown) requires manualChunks to be a function, not an object.
          manualChunks(id) {
            if (id.includes('/node_modules/')) {
              if (id.includes('/chart.js/') || id.includes('/react-chartjs-2/')) return 'charts';
              if (id.includes('/stellar-sdk/')) return 'stellar';
              if (id.includes('/starknet/')) return 'starknet';
              if (id.includes('/ethers/')) return 'ethereum';
              if (id.includes('/@supabase/')) return 'supabase';
            if (id.includes('/@walletconnect/') || id.includes('/walletconnect/')) return 'walletconnect';
            if (id.includes('/posthog-js/')) return 'analytics';
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) return 'vendor';
            }
          },
        },
      },
    },
  }
})
