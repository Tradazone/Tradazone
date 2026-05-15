// @ts-nocheck
/**
 * src/config/env.js
 *
 * Single source of truth for environment-driven configuration used across
 * the Auth module (AuthContext, SignIn, SignUp, Onboarding, PrivateRoute).
 *
 * All values are derived from Vite build-time env variables defined in
 * .env.development | .env.staging | .env.production
 *
 * Rules:
 *  - VITE_APP_ENV   : 'development' | 'staging' | 'production'
 *  - VITE_APP_NAME  : display name shown in banners
 *  - VITE_BASE_PATH : router basename / asset base path
 *  - VITE_API_URL   : backend API root
 */

const RAW_ENV = import.meta.env.VITE_APP_ENV || 'development';

/** Normalised environment name. Always one of the three known values. */
export const APP_ENV = ['development', 'staging', 'production'].includes(RAW_ENV)
    ? RAW_ENV
    : 'development';

export const IS_DEVELOPMENT = APP_ENV === 'development';
export const IS_STAGING     = APP_ENV === 'staging';
export const IS_PRODUCTION  = APP_ENV === 'production';

/** Human-readable app name, used in banners and page titles. */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Tradazone';

/**
 * localStorage key prefix scoped to the current environment.
 * Prevents staging sessions from bleeding into production storage and
 * vice-versa when both are opened in the same browser profile.
 *
 *   development → 'tradazone_dev'
 *   staging     → 'tradazone_staging'
 *   production  → 'tradazone'
 */
export const STORAGE_PREFIX = IS_PRODUCTION
    ? 'tradazone'
    : `tradazone_${APP_ENV}`;

/**
 * Auth session TTL in milliseconds.
 *   staging/development : 1 hour  (short — avoids stale test sessions)
 *   production          : 7 days
 */
export const SESSION_TTL_MS = IS_PRODUCTION
    ? 7 * 24 * 60 * 60 * 1000   // 7 days
    : 60 * 60 * 1000;            // 1 hour

/**
 * Whether the mock wallet fallback is permitted.
 * The Starknet connect flow falls back to a hardcoded mock address when no
 * wallet extension is detected. This must NEVER fire in production.
 */
export const ALLOW_MOCK_WALLET = !IS_PRODUCTION;
