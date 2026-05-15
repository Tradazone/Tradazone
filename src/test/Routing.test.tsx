// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Suspense, lazy } from 'react';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// Mock a component that takes time to load
const LazyComponent = lazy(() => new Promise((resolve) => {
    setTimeout(() => resolve({ default: () => <div data-testid="loaded">Loaded</div> }), 100);
}));

describe('App Routing - Loading Spinner', () => {
    it('shows the loading spinner during lazy-load transitions', async () => {
        render(
            <Suspense fallback={<LoadingSpinner />}>
                <LazyComponent />
            </Suspense>
        );

        // Check if the spinner is visible initially
        const spinner = screen.getByTestId('app-loading-spinner');
        expect(spinner).toBeTruthy();
        expect(screen.getByText('Loading Tradazone...')).toBeTruthy();

        // After the promise resolves, the component should show
        const loaded = await screen.findByTestId('loaded', {}, { timeout: 1000 });
        expect(loaded).toBeTruthy();
    });
});
