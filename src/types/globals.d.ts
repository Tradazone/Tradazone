// Global type augmentations for wallet browser extensions

interface Window {
  ethereum?:         unknown;
  starknet?:         unknown;
  starknet_argentX?: unknown;
  lobstr?:           unknown;
  coinbaseWalletExtension?: unknown;
  phantom?:          { ethereum?: unknown };
}
