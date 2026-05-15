// @ts-nocheck
import { IS_STAGING, APP_NAME } from '../../config/env';

/**
 * StagingBanner — A reusable banner component that displays a warning
 * when the application is running in the staging environment.
 *
 * This fulfills DevOps & Infrastructure requirements for environmental
 * visibility in components like SignIn, ConnectWalletModal, and ProfileSettings.
 */
function StagingBanner() {
  if (!IS_STAGING) return null;

  return (
    <div
      role="banner"
      data-testid="staging-banner"
      className="w-full bg-amber-400 text-amber-900 text-[10px] lg:text-xs font-semibold text-center py-1.5 px-4"
    >
      ⚠️ {APP_NAME} — STAGING ENVIRONMENT. Data is not real and may be reset
      at any time.
    </div>
  );
}

export default StagingBanner;
