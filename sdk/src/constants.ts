import BigNumber from "bignumber.js";

export const maxU64 = new BigNumber(2).pow(64).minus(1);
export const WAD = new BigNumber(10).pow(18);

export const RESERVES_CUSTOM_ORDER = [
  "sSUI",
  "mSUI",
  "SUI",
  "USDC",
  "wUSDC",
  "USDT",
  "suiETH",
  "WETH",
  "SOL",
  "AUSD",
  "DEEP",
  "FUD",
];
