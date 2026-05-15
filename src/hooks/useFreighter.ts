// @ts-nocheck
import { useState, useCallback } from "react";
import { isConnected, requestAccess, getNetwork } from "@stellar/freighter-api";
import { waitForFreighter } from "../utils/detectFreighter";

export function useFreighter() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [publicKey, setPublicKey] = useState(null);
  const [network, setNetwork] = useState(null);

  const connect = useCallback(async () => {
    // Guard: prevent double-clicks / overlapping calls
    if (isConnecting) return null;

    setError(null);
    setIsConnecting(true);

    try {
      // Step 1: Wait for Freighter extension to inject into the page.
      // The v6 API uses window.freighter internally — we wait for that.
      const detected = await waitForFreighter(3000);
      if (!detected) {
        throw new Error("NOT_INSTALLED");
      }

      // Step 2: isConnected() in v6 returns { isConnected: boolean }
      // It checks window.freighter internally.
      const connectionResult = await isConnected();
      if (!connectionResult?.isConnected) {
        throw new Error("LOCKED");
      }

      // Step 3: requestAccess() in v6 returns { address: string, error?: string }
      // It fires the extension popup and asks the user to grant access.
      const accessResult = await requestAccess();

      // If there's an error, or the address is empty/undefined, the user denied
      if (accessResult?.error) {
        throw new Error("ACCESS_DENIED");
      }
      if (!accessResult?.address) {
        throw new Error("ACCESS_DENIED");
      }

      const { address } = accessResult;

      // Step 4: getNetwork() in v6 returns { network: string, networkPassphrase: string, error?: string }
      let currentNetwork = "UNKNOWN";
      try {
        const netResult = await getNetwork();
        if (netResult?.network) {
          currentNetwork = netResult.network; // e.g. "PUBLIC", "TESTNET"
        }
      } catch {
        // Non-critical — don't fail if network detection fails
      }

      setPublicKey(address);
      setNetwork(currentNetwork);
      console.log(`[Freighter] Connected (${currentNetwork}):`, address);
      return { success: true, address, network: currentNetwork };

    } catch (err) {
      console.error("[Freighter] Error:", err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  return { connect, isConnecting, publicKey, network, error };
}
