// @ts-nocheck
import React from 'react';

/**
 * LoadingSpinner — globally accessible, centered loading indicator.
 * 
 * Part of the App Routing improvement (Issue #55, reported by user as #58).
 * Used as a Suspense fallback in App.jsx to provide visual feedback 
 * during code-splitting chunk retrieval.
 * 
 * Issue #38: Exposes `role="status"` with `aria-live` and visible status text so
 * this loading state is announced to assistive technologies (complements `alt`
 * on routed pages that render images — e.g. Logo, auth illustrations).
 * 
 * Design matches the micro-spinner in src/components/forms/Button.jsx 
 * but scaled and centered for page-level state.
 */
function LoadingSpinner() {
    return (
        <div
            className="flex items-center justify-center min-h-[400px] w-full p-8"
            data-testid="app-loading-spinner"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <div className="flex flex-col items-center gap-4">
                <span className="w-12 h-12 border-4 border-coin-gray border-t-brand rounded-full animate-spin-ring" aria-hidden="true" />
                <p className="text-[15px] font-medium text-t-secondary animate-pulse">Loading Tradazone...</p>
            </div>
        </div>
    );
}

export default LoadingSpinner;
