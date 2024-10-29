import BigNumber from "bignumber.js";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Action } from "@suilend/sdk/types";

import { SubmitButtonState } from "@/components/dashboard/actions-modal/ActionsModalTabContent";
import { AppData } from "@/contexts/AppContext";
import {
  NORMALIZED_ETH_COINTYPES,
  NORMALIZED_STABLECOIN_COINTYPES,
  isEth,
  isStablecoin,
  isSui,
} from "@/lib/coinType";
import { SUI_GAS_MIN, msPerYear } from "@/lib/constants";
import { formatList } from "@/lib/format";
import { LOOPING_WARNING_MESSAGE } from "@/lib/looping";

const getMaxCalculations = (
  action: Action,
  reserve: ParsedReserve,
  balance: BigNumber,
  data: AppData,
  obligation: ParsedObligation | null,
) => {
  const MIN_AVAILABLE_AMOUNT = new BigNumber(100).div(
    10 ** reserve.mintDecimals,
  );

  if (action === Action.DEPOSIT) {
    // Calculate safe deposit limit (subtract 10 mins of deposit APR from cap)
    const tenMinsDepositAprPercent = reserve.depositAprPercent
      .div(msPerYear)
      .times(10 * 60 * 1000);

    const safeDepositLimit = reserve.config.depositLimit.minus(
      reserve.depositedAmount.times(tenMinsDepositAprPercent.div(100)),
    );
    const safeDepositLimitUsd = reserve.config.depositLimitUsd.minus(
      reserve.depositedAmount
        .times(reserve.maxPrice)
        .times(tenMinsDepositAprPercent.div(100)),
    );

    const result = [
      {
        reason: `Insufficient ${reserve.symbol} balance`,
        isDisabled: true,
        value: balance,
      },
      {
        reason: "Exceeds reserve deposit limit",
        isDisabled: true,
        value: BigNumber.max(
          safeDepositLimit.minus(reserve.depositedAmount),
          0,
        ),
      },
      {
        reason: "Exceeds reserve USD deposit limit",
        isDisabled: true,
        value: BigNumber.max(
          safeDepositLimitUsd
            .minus(reserve.depositedAmount.times(reserve.maxPrice))
            .div(reserve.maxPrice),
          0,
        ),
      },
    ];
    if (isSui(reserve.coinType))
      result.push({
        reason: `${SUI_GAS_MIN} SUI should be saved for gas`,
        isDisabled: true,
        value: balance.minus(SUI_GAS_MIN),
      });

    return result;
  } else if (action === Action.BORROW) {
    const borrowFee = reserve.config.borrowFeeBps / 10000;

    return [
      {
        reason: "Insufficient liquidity to borrow",
        isDisabled: true,
        value: reserve.availableAmount
          .minus(MIN_AVAILABLE_AMOUNT)
          .div(1 + borrowFee),
      },
      {
        reason: "Over reserve borrow limit",
        isDisabled: true,
        value: reserve.config.borrowLimit
          .minus(reserve.borrowedAmount)
          .div(1 + borrowFee),
      },
      {
        reason: "Exceeds reserve USD borrow limit",
        isDisabled: true,
        value: reserve.config.borrowLimitUsd
          .minus(reserve.borrowedAmount.times(reserve.price))
          .div(reserve.price)
          .div(1 + borrowFee),
      },
      {
        reason: "Borrows cannot exceed borrow limit",
        isDisabled: true,
        value:
          !obligation ||
          obligation.maxPriceWeightedBorrowsUsd.gt(
            obligation.minPriceBorrowLimitUsd,
          )
            ? new BigNumber(0)
            : obligation.minPriceBorrowLimitUsd
                .minus(obligation.maxPriceWeightedBorrowsUsd)
                .div(
                  reserve.maxPrice.times(
                    reserve.config.borrowWeightBps / 10000,
                  ),
                )
                .div(1 + borrowFee),
      },
      {
        reason: "Pool outflow rate limit surpassed",
        isDisabled: true,
        value: data.lendingMarket.rateLimiter.remainingOutflow
          .div(reserve.maxPrice)
          .div(reserve.config.borrowWeightBps / 10000)
          .div(1 + borrowFee),
      },
    ];
  } else if (action === Action.WITHDRAW) {
    const depositPosition = obligation?.deposits.find(
      (deposit) => deposit.coinType === reserve.coinType,
    );
    const depositedAmount =
      depositPosition?.depositedAmount ?? new BigNumber(0);

    return [
      {
        reason: "Withdraws cannot exceed deposits",
        isDisabled: true,
        value: depositedAmount,
      },
      {
        reason: "Insufficient liquidity to withdraw",
        isDisabled: true,
        value: reserve.availableAmount.minus(MIN_AVAILABLE_AMOUNT),
      },
      {
        reason: "Pool outflow rate limit surpassed",
        isDisabled: true,
        value: data.lendingMarket.rateLimiter.remainingOutflow.div(
          reserve.maxPrice,
        ),
      },
      {
        reason: "Withdraw is unhealthy",
        isDisabled: true,
        value:
          !obligation ||
          obligation.maxPriceWeightedBorrowsUsd.gt(
            obligation.minPriceBorrowLimitUsd,
          )
            ? new BigNumber(0)
            : reserve.config.openLtvPct > 0
              ? obligation.minPriceBorrowLimitUsd
                  .minus(obligation.maxPriceWeightedBorrowsUsd)
                  .div(reserve.minPrice)
                  .div(reserve.config.openLtvPct / 100)
              : Infinity,
      },
    ];
  } else if (action === Action.REPAY) {
    const borrowPosition = obligation?.borrows.find(
      (borrow) => borrow.coinType === reserve.coinType,
    );
    const borrowedAmount = borrowPosition?.borrowedAmount ?? new BigNumber(0);

    const result = [
      {
        reason: `Insufficient ${reserve.symbol} balance`,
        isDisabled: true,
        value: balance,
      },
      {
        reason: "Repay amount exceeds borrowed amount",
        isDisabled: false,
        value: borrowedAmount,
      },
    ];
    if (isSui(reserve.coinType))
      result.push({
        reason: `${SUI_GAS_MIN} SUI should be saved for gas`,
        isDisabled: true,
        value: balance.minus(SUI_GAS_MIN),
      });

    return result;
  }

  return [];
};

export const getMaxValue =
  (
    action: Action,
    reserve: ParsedReserve,
    balance: BigNumber,
    data: AppData,
    obligation: ParsedObligation | null,
  ) =>
  () => {
    const maxCalculations = getMaxCalculations(
      action,
      reserve,
      balance,
      data,
      obligation,
    );

    return BigNumber.max(
      new BigNumber(0),
      BigNumber.min(
        ...Object.values(maxCalculations).map((calc) => calc.value),
      ),
    );
  };

const getObligationDepositedAmount = (
  coinType: string,
  obligation: ParsedObligation | null,
) =>
  obligation?.deposits.find((d) => d.coinType === coinType)?.depositedAmount ??
  new BigNumber(0);
const getObligationBorrowedAmount = (
  coinType: string,
  obligation: ParsedObligation | null,
) =>
  obligation?.borrows.find((b) => b.coinType === coinType)?.borrowedAmount ??
  new BigNumber(0);

export const getSubmitButtonNoValueState =
  (
    action: Action,
    reserves: ParsedReserve[],
    reserve: ParsedReserve,
    obligation: ParsedObligation | null,
  ) =>
  (): SubmitButtonState | undefined => {
    if (action === Action.DEPOSIT) {
      if (reserve.depositedAmount.gte(reserve.config.depositLimit))
        return {
          isDisabled: true,
          title: "Reserve deposit limit reached",
        };
      if (
        new BigNumber(reserve.depositedAmountUsd).gte(
          reserve.config.depositLimitUsd,
        )
      )
        return {
          isDisabled: true,
          title: "Reserve USD deposit limit reached",
        };
      if (getObligationBorrowedAmount(reserve.coinType, obligation).gt(0))
        return { isDisabled: true, title: "Cannot deposit borrowed asset" };
      if (
        obligation &&
        obligation.deposits.length >= 5 &&
        !obligation.deposits.find((d) => d.coinType === reserve.coinType)
      )
        return {
          isDisabled: true,
          title: "Max deposits reached",
          description: "Cannot have more than 5 unique deposits at a time",
        };
      return undefined;
    } else if (action === Action.BORROW) {
      if (reserve.borrowedAmount.gte(reserve.config.borrowLimit))
        return {
          isDisabled: true,
          title: "Reserve borrow limit reached",
        };
      if (
        new BigNumber(reserve.borrowedAmount.times(reserve.price)).gte(
          reserve.config.borrowLimitUsd,
        )
      )
        return {
          isDisabled: true,
          title: "Reserve USD borrow limit reached",
        };
      if (getObligationDepositedAmount(reserve.coinType, obligation).gt(0))
        return { isDisabled: true, title: "Cannot borrow deposited asset" };
      if (
        obligation &&
        obligation.borrows.length >= 5 &&
        !obligation.borrows.find((b) => b.coinType === reserve.coinType)
      )
        return {
          isDisabled: true,
          title: "Max borrows reached",
          description: "Cannot have more than 5 unique borrows at a time",
        };

      // Isolated
      if (!reserve.config.isolated) {
        const isolatedReservesWithBorrows = reserves
          .filter((r) => r.config.isolated)
          .filter((r) => hasReserveBorrows(r, obligation));
        if (isolatedReservesWithBorrows.length > 0)
          return { isDisabled: true, title: `Cannot borrow ${reserve.symbol}` };
      } else {
        const otherReservesWithBorrows = reserves
          .filter((r) => r.coinType !== reserve.coinType)
          .filter((r) => hasReserveBorrows(r, obligation));
        if (otherReservesWithBorrows.length > 0)
          return { isDisabled: true, title: `Cannot borrow ${reserve.symbol}` };
      }

      return undefined;
    }
  };

export const getSubmitButtonState =
  (
    action: Action,
    reserve: ParsedReserve,
    balance: BigNumber,
    data: AppData,
    obligation: ParsedObligation | null,
  ) =>
  (value: string): SubmitButtonState | undefined => {
    const maxCalculations = getMaxCalculations(
      action,
      reserve,
      balance,
      data,
      obligation,
    );

    for (const calc of maxCalculations) {
      if (new BigNumber(value).gt(calc.value))
        return { isDisabled: calc.isDisabled, title: calc.reason };
    }
    return undefined;
  };

const hasReserveBorrows = (
  reserve: ParsedReserve,
  obligation: ParsedObligation | null,
) =>
  (
    obligation?.borrows.find((b) => b.coinType === reserve.coinType)
      ?.borrowedAmount ?? new BigNumber(0)
  ).gt(0);

export const getSubmitWarningMessages =
  (
    action: Action,
    reserves: ParsedReserve[],
    reserve: ParsedReserve,
    obligation: ParsedObligation | null,
  ) =>
  () => {
    const result = [];

    if (action === Action.DEPOSIT) {
      if (isStablecoin(reserve.coinType)) {
        for (const stablecoinCoinType of NORMALIZED_STABLECOIN_COINTYPES) {
          if (stablecoinCoinType === reserve.coinType) continue;

          if (
            getObligationBorrowedAmount(stablecoinCoinType, obligation).gt(0)
          ) {
            result.push(LOOPING_WARNING_MESSAGE("depositing", reserve.symbol));
            break;
          }
        }
      } else if (isEth(reserve.coinType)) {
        for (const ethCoinType of NORMALIZED_ETH_COINTYPES) {
          if (ethCoinType === reserve.coinType) continue;

          if (getObligationBorrowedAmount(ethCoinType, obligation).gt(0)) {
            result.push(LOOPING_WARNING_MESSAGE("depositing", reserve.symbol));
            break;
          }
        }
      }
    } else if (action === Action.BORROW) {
      if (isStablecoin(reserve.coinType)) {
        for (const stablecoinCoinType of NORMALIZED_STABLECOIN_COINTYPES) {
          if (stablecoinCoinType === reserve.coinType) continue;

          if (
            getObligationDepositedAmount(stablecoinCoinType, obligation).gt(0)
          ) {
            result.push(LOOPING_WARNING_MESSAGE("borrowing", reserve.symbol));
            break;
          }
        }
      } else if (isEth(reserve.coinType)) {
        for (const ethCoinType of NORMALIZED_ETH_COINTYPES) {
          if (ethCoinType === reserve.coinType) continue;

          if (getObligationDepositedAmount(ethCoinType, obligation).gt(0)) {
            result.push(LOOPING_WARNING_MESSAGE("borrowing", reserve.symbol));
            break;
          }
        }
      }

      if (!reserve.config.isolated) {
        const isolatedReservesWithBorrows = reserves
          .filter((r) => r.config.isolated)
          .filter((r) => hasReserveBorrows(r, obligation));
        if (isolatedReservesWithBorrows.length > 0)
          result.push(
            `You cannot borrow ${reserve.symbol} as you're already borrowing ${isolatedReservesWithBorrows[0].symbol}, which is an isolated asset.`,
          );
      } else {
        const otherReservesWithBorrows = reserves
          .filter((r) => r.coinType !== reserve.coinType)
          .filter((r) => hasReserveBorrows(r, obligation));
        if (otherReservesWithBorrows.length > 0)
          result.push(
            `You cannot borrow ${reserve.symbol} (an isolated asset) as you're already borrowing ${formatList(otherReservesWithBorrows.map((r) => r.symbol))}.`,
          );
      }
    }

    return result;
  };
