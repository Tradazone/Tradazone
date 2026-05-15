// @ts-nocheck
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// Polyfill import.meta.env for modules that read Vite env vars at import time
if (!import.meta.env) {
  Object.defineProperty(import.meta, 'env', {
    value: { VITE_APP_ENV: 'development', VITE_APP_NAME: 'Tradazone', BASE_URL: '/' },
    writable: true,
  });
} else {
  import.meta.env.VITE_APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
  import.meta.env.VITE_APP_NAME = import.meta.env.VITE_APP_NAME || 'Tradazone';
  import.meta.env.BASE_URL = import.meta.env.BASE_URL || '/';
}

// Fix for happy-dom/jsdom localStorage.clear is not a function
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    length: 0,
    key: (index) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
/* globals: global */
/* vi intentionally unused - required for global polyfill */
Object.defineProperty(global, 'vi', { value: vi });
global.localStorage = localStorageMock;
