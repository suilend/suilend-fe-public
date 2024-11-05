import { useMemo } from "react";

import BigNumber from "bignumber.js";

import { Action, Side } from "@suilend/sdk/types";

import ActionsModalContainer from "@/components/dashboard/actions-modal/ActionsModalContainer";
import {
  Tab,
  useActionsModalContext,
} from "@/components/dashboard/actions-modal/ActionsModalContext";
import ActionsModalTabContent from "@/components/dashboard/actions-modal/ActionsModalTabContent";
import ParametersPanel from "@/components/dashboard/actions-modal/ParametersPanel";
import Tabs from "@/components/shared/Tabs";
import { AppData, useAppContext } from "@/contexts/AppContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  getMaxValue,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
} from "@/lib/actions";

export default function ActionsModal() {
  const { obligation, ...restAppContext } = useAppContext();
  const data = restAppContext.data as AppData;
  const {
    reserveSymbol,
    selectedTab,
    onSelectedTabChange,
    isMoreParametersOpen,
    deposit,
    borrow,
    withdraw,
    repay,
  } = useActionsModalContext();

  const { md } = useBreakpoint();

  // Reserve
  const reserve =
    reserveSymbol !== undefined
      ? data.lendingMarket.reserves.find((r) => r.symbol === reserveSymbol)
      : undefined;

  // Tabs
  const tabs = [
    { id: Tab.DEPOSIT, title: "Deposit" },
    { id: Tab.BORROW, title: "Borrow" },
    { id: Tab.WITHDRAW, title: "Withdraw" },
    { id: Tab.REPAY, title: "Repay" },
  ];

  const side = [Tab.DEPOSIT, Tab.WITHDRAW].includes(selectedTab)
    ? Side.DEPOSIT
    : Side.BORROW;

  // Tab config
  const tabConfig = useMemo(() => {
    if (reserve === undefined) return undefined;

    const coinBalanceForReserve =
      data.coinBalancesMap[reserve.coinType]?.balance ?? new BigNumber(0);

    if (selectedTab === Tab.DEPOSIT) {
      const getNewCalculations = (value: string) => {
        if (!value.length)
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };
        const valueObj = new BigNumber(value);
        if (!obligation || valueObj.isNaN())
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };

        const newBorrowLimitUsd = obligation.minPriceBorrowLimitUsd.plus(
          valueObj
            .times(reserve.minPrice)
            .times(reserve.config.openLtvPct / 100),
        );
        const newBorrowUtilization =
          newBorrowLimitUsd && !newBorrowLimitUsd.eq(0)
            ? obligation.maxPriceWeightedBorrowsUsd.div(newBorrowLimitUsd)
            : null;

        return {
          newBorrowLimitUsd,
          newBorrowUtilization: newBorrowUtilization
            ? BigNumber.max(BigNumber.min(1, newBorrowUtilization), 0)
            : null,
        };
      };

      return {
        action: Action.DEPOSIT,
        actionPastTense: "deposited",
        getMaxValue: getMaxValue(
          Action.DEPOSIT,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getNewCalculations,
        getSubmitButtonNoValueState: getSubmitButtonNoValueState(
          Action.DEPOSIT,
          data.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        getSubmitButtonState: getSubmitButtonState(
          Action.DEPOSIT,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getSubmitWarningMessages: getSubmitWarningMessages(
          Action.DEPOSIT,
          data.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        submit: deposit,
      };
    } else if (selectedTab === Tab.BORROW) {
      const getNewCalculations = (value: string) => {
        if (!value.length)
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };
        const valueObj = new BigNumber(value);
        if (!obligation || valueObj.isNaN())
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };

        const newBorrowUtilization =
          !valueObj.isNaN() && !obligation.minPriceBorrowLimitUsd.eq(0)
            ? obligation.maxPriceWeightedBorrowsUsd
                .plus(
                  valueObj
                    .times(reserve.maxPrice)
                    .times(reserve.config.borrowWeightBps / 10000),
                )
                .div(obligation.minPriceBorrowLimitUsd)
            : null;

        return {
          newBorrowLimitUsd: null,
          newBorrowUtilization: newBorrowUtilization
            ? BigNumber.max(BigNumber.min(1, newBorrowUtilization), 0)
            : null,
        };
      };

      return {
        action: Action.BORROW,
        actionPastTense: "borrowed",
        getMaxValue: getMaxValue(
          Action.BORROW,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getNewCalculations,
        getSubmitButtonNoValueState: getSubmitButtonNoValueState(
          Action.BORROW,
          data.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        getSubmitButtonState: getSubmitButtonState(
          Action.BORROW,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getSubmitWarningMessages: getSubmitWarningMessages(
          Action.BORROW,
          data.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        submit: borrow,
      };
    } else if (selectedTab === Tab.WITHDRAW) {
      const getNewCalculations = (value: string) => {
        if (!value.length)
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };
        const valueObj = new BigNumber(value);
        if (!obligation || valueObj.isNaN())
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };

        const newBorrowLimitUsd = !valueObj.isNaN()
          ? obligation.minPriceBorrowLimitUsd.minus(
              valueObj
                .times(reserve.minPrice)
                .times(reserve.config.openLtvPct / 100),
            )
          : null;

        const newBorrowUtilization =
          newBorrowLimitUsd && !newBorrowLimitUsd.eq(0)
            ? obligation.borrowedAmountUsd.div(newBorrowLimitUsd)
            : null;

        return {
          newBorrowLimitUsd,
          newBorrowUtilization: newBorrowUtilization
            ? BigNumber.max(BigNumber.min(1, newBorrowUtilization), 0)
            : null,
        };
      };

      return {
        action: Action.WITHDRAW,
        actionPastTense: "withdrew",
        getMaxValue: getMaxValue(
          Action.WITHDRAW,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getNewCalculations,
        getSubmitButtonState: getSubmitButtonState(
          Action.WITHDRAW,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        submit: withdraw,
      };
    } else if (selectedTab === Tab.REPAY) {
      const getNewCalculations = (value: string) => {
        if (!value.length)
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };
        const valueObj = new BigNumber(value);
        if (!obligation || valueObj.isNaN())
          return {
            newBorrowLimitUsd: null,
            newBorrowUtilization: null,
          };

        const newBorrowUtilization =
          !valueObj.isNaN() && !obligation.minPriceBorrowLimitUsd.eq(0)
            ? obligation.borrowedAmountUsd
                .minus(
                  valueObj
                    .times(reserve.maxPrice)
                    .times(reserve.config.borrowFeeBps / 10000),
                )
                .div(obligation.minPriceBorrowLimitUsd)
            : null;

        return {
          newBorrowLimitUsd: null,
          newBorrowUtilization: newBorrowUtilization
            ? BigNumber.max(BigNumber.min(1, newBorrowUtilization), 0)
            : null,
        };
      };

      return {
        action: Action.REPAY,
        actionPastTense: "repaid",
        getMaxValue: getMaxValue(
          Action.REPAY,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        getNewCalculations,
        getSubmitButtonState: getSubmitButtonState(
          Action.REPAY,
          reserve,
          coinBalanceForReserve,
          data,
          obligation,
        ),
        submit: repay,
      };
    }
  }, [
    selectedTab,
    reserve,
    data,
    obligation,
    deposit,
    borrow,
    withdraw,
    repay,
  ]);

  return (
    <ActionsModalContainer>
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
      >
        <div
          className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
          style={{
            height: `calc(100dvh - ${64 /* Drawer margin-top */}px - ${0 /* Drawer border-top */}px - ${16 /* Drawer padding-top */}px - ${62 /* Tabs */}px - ${16 /* Drawer padding-bottom */}px - ${0 /* Drawer border-bottom */}px`,
          }}
        >
          {reserve && tabConfig && (
            <>
              <div className="flex h-full w-full flex-col gap-4 md:h-auto md:w-[28rem]">
                <ActionsModalTabContent
                  side={side}
                  reserve={reserve}
                  {...tabConfig}
                />
              </div>

              {md && isMoreParametersOpen && (
                <div className="flex h-[440px] w-[28rem] flex-col gap-4 rounded-md border p-4">
                  <ParametersPanel side={side} reserve={reserve} />
                </div>
              )}
            </>
          )}
        </div>
      </Tabs>
    </ActionsModalContainer>
  );
}
