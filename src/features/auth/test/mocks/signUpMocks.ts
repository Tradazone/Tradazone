// @ts-nocheck
/**
 * signUpMocks.js
 * 
 * Centralized mock data scenarios for SignUp tests.
 * This file provides reusable mock responses for wallet connections,
 * webhook dispatches, and user data to ensure comprehensive test coverage.
 */

// --- SUCCESS CASES ---

/** Valid full response for a successful wallet connection */
export const MOCK_WALLET_SUCCESS = {
  walletAddress: '0x123abc456def7890123456789012345678901234',
  walletType: 'starknet',
  name: 'Argent User',
};

/** Response with optional fields missing (e.g., name is null) */
export const MOCK_WALLET_PARTIAL = {
  walletAddress: '0x9876543210fedcba09876543210fedcba0987654',
  walletType: 'evm',
  name: null, // Optional field missing
};

/** Successful webhook dispatch response */
export const MOCK_WEBHOOK_SUCCESS = {
  ok: true,
  status: 200,
};

// --- FAILURE CASES ---

/** API returns a 400 Bad Request error */
export const MOCK_WEBHOOK_ERROR_400 = {
  ok: false,
  status: 400,
  error: 'Bad Request',
};

/** API returns a 500 Internal Server Error */
export const MOCK_WEBHOOK_ERROR_500 = {
  ok: false,
  status: 500,
  error: 'Internal Server Error',
};

/** Simulated network failure (promise rejection) */
export const MOCK_NETWORK_FAILURE = new Error('Network request failed');

/** Wallet connection rejected by user */
export const MOCK_WALLET_REJECTED = new Error('User rejected the request');

/** Wallet extension not installed */
export const MOCK_WALLET_NOT_INSTALLED = new Error('Wallet extension not found');

// --- EDGE CASES ---

/** Empty response object to test robustness against unexpected empty payloads */
export const MOCK_EMPTY_RESPONSE = {};

/** Unexpected data shape to ensure the component doesn't crash on API contract changes */
export const MOCK_UNEXPECTED_SHAPE = {
  metadata: {
    foo: 'bar',
    baz: 123
  },
  legacy_id: 999
};

/** Null or undefined fields to verify null-safety in UI components */
export const MOCK_NULL_FIELDS = {
  walletAddress: null,
  walletType: undefined,
  id: null
};

// --- PERFORMANCE CASE ---

/**
 * Delayed response to simulate high latency and test loading states/spinners.
 * @param {number} ms Delay in milliseconds
 * @param {any} response The data to resolve with after the delay
 */
export const simulateDelayedResponse = (ms = 1000, response = MOCK_WEBHOOK_SUCCESS) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(response), ms);
  });
};
