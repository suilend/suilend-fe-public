import { useMemo } from "react";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { Action, Side } from "@suilend/sdk/lib/types";

import ActionsModalContainer from "@/components/dashboard/actions-modal/ActionsModalContainer";
import {
  Tab,
  useActionsModalContext,
} from "@/components/dashboard/actions-modal/ActionsModalContext";
import ActionsModalTabContent from "@/components/dashboard/actions-modal/ActionsModalTabContent";
import ParametersPanel from "@/components/dashboard/actions-modal/ParametersPanel";
import Button from "@/components/shared/Button";
import ParentLendingMarket from "@/components/shared/ParentLendingMarket";
import Tabs from "@/components/shared/Tabs";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";
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
  const { appData, obligation } = useLendingMarketContext(); // From ActionsModalContextProvider
  const { getBalance } = useLoadedUserContext();

  const {
    reserve,
    selectedTab,
    onSelectedTabChange,
    isMoreParametersOpen,
    deposit,
    borrow,
    withdraw,
    repay,
  } = useActionsModalContext();

  const { md } = useBreakpoint();

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
    if (!reserve) return undefined;

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
      <ParentLendingMarket
        className="-mx-4 -mb-2 -mt-4 w-auto"
        contentClassName="pr-2"
        lendingMarketId={appData.lendingMarket.id}
        endContent={
          <DialogPrimitive.Close asChild>
            <Button
              className="shrink-0 text-muted-foreground"
              icon={<X className="h-5 w-5" />}
              variant="ghost"
              size="icon"
            >
              Close
            </Button>
          </DialogPrimitive.Close>
        }
      >
        <Tabs
          className="mb-4"
          tabs={tabs}
          selectedTab={selectedTab}
          onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
        >
          <div
            className="flex flex-col gap-4 md:!h-auto md:flex-row md:items-stretch"
            style={{
              height: `calc(100dvh - ${0 /* Top */}px - ${1 /* Border-top */}px - ${32 /* Lending market header */}px - ${8 /* Gap */}px - ${42 /* Tabs */}px - ${16 /* Gap */}px - ${16 /* Padding-bottom */}px - ${1 /* Border-bottom */}px - ${0 /* Bottom */}px)`,
            }}
          >
            {reserve && tabConfig && (
              <>
                <div className="flex h-full w-full max-w-[28rem] flex-col gap-4 md:h-auto md:w-[28rem]">
                  <ActionsModalTabContent
                    side={side}
                    reserve={reserve}
                    {...tabConfig}
                  />

                  {/* Required to get the desired modal width on <md */}
                  <div className="-mt-4 h-0 w-[28rem] max-w-full" />
                </div>

                {md && isMoreParametersOpen && (
                  <div className="flex h-[480px] w-[28rem] flex-col gap-4 rounded-md border p-4">
                    <ParametersPanel side={side} reserve={reserve} />
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs>
      </ParentLendingMarket>
    </ActionsModalContainer>
  );
}
