// Run global lint + typecheck rather than per-file to avoid Windows
// "command line too long" errors on large staged file sets.
export default {
  'src/**/*.{ts,tsx,js,jsx}': () => [
    'npm run lint',
    'npm run typecheck',
  ],
};
