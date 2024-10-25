import BigNumber from "bignumber.js";

import { ParsedObligation } from "@suilend/sdk/parsers";

import { AppData } from "@/contexts/AppContext";
import {
  NORMALIZED_ETH_COINTYPES,
  NORMALIZED_STABLECOIN_COINTYPES,
  isEth,
  isStablecoin,
} from "@/lib/coinType";

const LOOPING_DEFINITION =
  "depositing and borrowing the same asset, different stablecoin assets, or different ETH assets";
const REWARDS_DEFINITION = "rewards (including Suilend Points)";

export const IS_LOOPING_MESSAGE = `You are looping (defined as ${LOOPING_DEFINITION}). Wallets with looped positions are not eligible for ${REWARDS_DEFINITION}.`;
export const WAS_LOOPING_MESSAGE = (
  <>
    You were looping in the past (defined as {LOOPING_DEFINITION}).
    <br />
    <br />
    Restore eligibility for {REWARDS_DEFINITION} by interacting with each asset
    (deposit or withdraw any amount for deposits, borrow or repay any amount for
    borrows).
    <br />
    <br />
    You can automate this process by clicking the button below.
  </>
);

export const LOOPING_WARNING_MESSAGE = (action: string, symbol: string) =>
  `Note that by ${action} ${symbol} you will be looping (defined as ${LOOPING_DEFINITION}) and no longer eligible for ${REWARDS_DEFINITION}.`;

export const getLoopedAssetCoinTypes = (
  data: AppData,
  obligation: ParsedObligation | null,
) => {
  const result: string[][] = [];
  data.lendingMarket.reserves.forEach((reserve) => {
    const outCoinTypes = (() => {
      if (isStablecoin(reserve.coinType))
        return NORMALIZED_STABLECOIN_COINTYPES;
      if (isEth(reserve.coinType)) return NORMALIZED_ETH_COINTYPES;
      return [reserve.coinType];
    })();

    outCoinTypes.forEach((outCoinType) => {
      const depositedAmount =
        obligation?.deposits.find((d) => d.coinType === reserve.coinType)
          ?.depositedAmount ?? new BigNumber(0);
      const borrowedAmount =
        obligation?.borrows.find((b) => b.coinType === outCoinType)
          ?.borrowedAmount ?? new BigNumber(0);

      if (depositedAmount.gt(0) && borrowedAmount.gt(0))
        result.push([reserve.coinType, outCoinType]);
    });
  });

  return result;
};
export const getIsLooping = (
  data: AppData,
  obligation: ParsedObligation | null,
) => {
  const loopedAssetCoinTypes = getLoopedAssetCoinTypes(data, obligation);
  return loopedAssetCoinTypes.length > 0;
};

export const getZeroSharePositions = (obligation: ParsedObligation | null) => ({
  deposits: (obligation?.deposits || []).filter(
    (d) =>
      d.depositedAmount.gt(0) &&
      new BigNumber(d.userRewardManager.share.toString()).eq(0),
  ),
  borrows: (obligation?.borrows || []).filter(
    (b) =>
      b.borrowedAmount.gt(0) &&
      new BigNumber(b.userRewardManager.share.toString()).eq(0),
  ),
});
export const getWasLooping = (
  data: AppData,
  obligation: ParsedObligation | null,
) => {
  const isLooping = getIsLooping(data, obligation);
  const { deposits: zeroShareDeposits, borrows: zeroShareBorrows } =
    getZeroSharePositions(obligation);

  return (
    !isLooping && (zeroShareDeposits.length > 0 || zeroShareBorrows.length > 0)
  );
};
