/// <reference types="vite/client" />
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App.jsx';

// PostHog analytics — only active when VITE_POSTHOG_KEY is set.
// Works on GitHub Pages with no server. Get a free key at posthog.com.
if (import.meta.env.VITE_POSTHOG_KEY) {
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host:        'https://app.posthog.com',
      capture_pageview: true,
      autocapture:      true,
      persistence:      'localStorage',
    });
  }).catch(() => {});
}

// Sentry — only active when VITE_SENTRY_DSN is set (not in development unless configured)
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:              import.meta.env.VITE_SENTRY_DSN,
    environment:      import.meta.env.VITE_APP_ENV ?? 'production',
    release:          `tradazone@${import.meta.env.VITE_APP_VERSION ?? '0.0.0'}`,
    tracesSampleRate: 0.2,   // 20% of transactions for performance monitoring
    replaysOnErrorSampleRate: 1.0,  // 100% of sessions with errors
    replaysSessionSampleRate: 0.05, // 5% of all sessions
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText:   false,
        blockAllMedia: false,
      }),
    ],
  });
}

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
