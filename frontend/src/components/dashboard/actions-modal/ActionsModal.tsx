import { useMemo } from "react";

import { Action, Side } from "@suilend/sdk/lib/types";

import ActionsModalContainer from "@/components/dashboard/actions-modal/ActionsModalContainer";
import {
  Tab,
  useActionsModalContext,
} from "@/components/dashboard/actions-modal/ActionsModalContext";
import ActionsModalTabContent from "@/components/dashboard/actions-modal/ActionsModalTabContent";
import ParametersPanel from "@/components/dashboard/actions-modal/ParametersPanel";
import Tabs from "@/components/shared/Tabs";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  getMaxValue,
  getNewBorrowUtilizationCalculations,
  getSubmitButtonNoValueState,
  getSubmitButtonState,
  getSubmitWarningMessages,
} from "@/lib/actions";

export default function ActionsModal() {
  const { appData } = useLoadedAppContext();
  const { getBalance, obligation } = useLoadedUserContext();

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
      ? appData.lendingMarket.reserves.find((r) => r.symbol === reserveSymbol)
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

    const coinBalanceForReserve = getBalance(reserve.coinType);

    if (selectedTab === Tab.DEPOSIT) {
      return {
        action: Action.DEPOSIT,
        actionPastTense: "deposited",
        getMaxValue: getMaxValue(
          Action.DEPOSIT,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getNewBorrowUtilizationCalculations:
          getNewBorrowUtilizationCalculations(
            Action.DEPOSIT,
            reserve,
            obligation,
          ),
        getSubmitButtonNoValueState: getSubmitButtonNoValueState(
          Action.DEPOSIT,
          appData.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        getSubmitButtonState: getSubmitButtonState(
          Action.DEPOSIT,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getSubmitWarningMessages: getSubmitWarningMessages(
          Action.DEPOSIT,
          appData.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        submit: deposit,
      };
    } else if (selectedTab === Tab.BORROW) {
      return {
        action: Action.BORROW,
        actionPastTense: "borrowed",
        getMaxValue: getMaxValue(
          Action.BORROW,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getNewBorrowUtilizationCalculations:
          getNewBorrowUtilizationCalculations(
            Action.BORROW,
            reserve,
            obligation,
          ),
        getSubmitButtonNoValueState: getSubmitButtonNoValueState(
          Action.BORROW,
          appData.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        getSubmitButtonState: getSubmitButtonState(
          Action.BORROW,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getSubmitWarningMessages: getSubmitWarningMessages(
          Action.BORROW,
          appData.lendingMarket.reserves,
          reserve,
          obligation,
        ),
        submit: borrow,
      };
    } else if (selectedTab === Tab.WITHDRAW) {
      return {
        action: Action.WITHDRAW,
        actionPastTense: "withdrew",
        getMaxValue: getMaxValue(
          Action.WITHDRAW,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getNewBorrowUtilizationCalculations:
          getNewBorrowUtilizationCalculations(
            Action.WITHDRAW,
            reserve,
            obligation,
          ),
        getSubmitButtonState: getSubmitButtonState(
          Action.WITHDRAW,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        submit: withdraw,
      };
    } else if (selectedTab === Tab.REPAY) {
      return {
        action: Action.REPAY,
        actionPastTense: "repaid",
        getMaxValue: getMaxValue(
          Action.REPAY,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        getNewBorrowUtilizationCalculations:
          getNewBorrowUtilizationCalculations(
            Action.REPAY,
            reserve,
            obligation,
          ),
        getSubmitButtonState: getSubmitButtonState(
          Action.REPAY,
          reserve,
          coinBalanceForReserve,
          appData,
          obligation,
        ),
        submit: repay,
      };
    }
  }, [
    reserve,
    getBalance,
    selectedTab,
    appData,
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
            height: `calc(100dvh - ${2 * 4 /* Margin top */}px - ${0 /* Drawer border-top */}px - ${16 /* Dialog padding-top */}px - ${62 /* Tabs */}px - ${16 /* Dialog padding-bottom */}px - ${2 * 4 /* Margin bottom */}px - ${1 /* Dialog border-bottom */}px)`,
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
