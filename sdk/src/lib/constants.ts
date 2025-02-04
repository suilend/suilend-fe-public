import BigNumber from "bignumber.js";

export const WAD = new BigNumber(10).pow(18);
export const msPerYear = 31556952000; // Approx. 1000 * 60 * 60 * 24 * 365; // Used by external dependencies (e.g. msafe-sui-app-store)
