import BigNumber from "bignumber.js";

export const maxU64 = new BigNumber(2).pow(64).minus(1);
export const WAD = new BigNumber(10).pow(18);

export const msPerYear = 31556952000; // Approx. 1000 * 60 * 60 * 24 * 365;
