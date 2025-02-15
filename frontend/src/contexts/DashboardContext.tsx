import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";

import { useWalletContext } from "@suilend/frontend-sui-next";
import { ClaimRewardsReward, RewardSummary } from "@suilend/sdk";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
    isDepositing: boolean,
  ) => Promise<SuiTransactionBlockResponse>;
}

const defaultContextValue: DashboardContext = {
  isFirstDepositDialogOpen: false,
  setIsFirstDepositDialogOpen: () => {
    throw Error("DashboardContextProvider not initialized");
  },

  claimRewards: async () => {
    throw Error("DashboardContextProvider not initialized");
  },
};

const DashboardContext = createContext<DashboardContext>(defaultContextValue);

export const useDashboardContext = () => useContext(DashboardContext);

export function DashboardContextProvider({ children }: PropsWithChildren) {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { obligation, obligationOwnerCap } = useLoadedUserContext();

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const claimRewards = useCallback(
    async (
      rewardsMap: Record<string, RewardSummary[]>,
      isDepositing: boolean,
    ) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      const transaction = new Transaction();

      try {
        const rewards: ClaimRewardsReward[] = Object.values(rewardsMap)
          .flat()
          .map((r) => ({
            reserveArrayIndex:
              r.obligationClaims[obligation.id].reserveArrayIndex,
            rewardIndex: BigInt(r.stats.rewardIndex),
            rewardCoinType: r.stats.rewardCoinType,
            side: r.stats.side,
          }));

        if (isDepositing)
          appData.suilendClient.claimRewardsAndDeposit(
            address,
            obligationOwnerCap.id,
            rewards,
            transaction,
          );
        else
          appData.suilendClient.claimRewardsAndSendToUser(
            address,
            obligationOwnerCap.id,
            rewards,
            transaction,
          );
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      appData.suilendClient,
      signExecuteAndWaitForTransaction,
      obligationOwnerCap,
      obligation,
    ],
  );

  // Context
  const contextValue: DashboardContext = useMemo(
    () => ({
      isFirstDepositDialogOpen,
      setIsFirstDepositDialogOpen,

      claimRewards,
    }),
    [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen, claimRewards],
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      <ActionsModalContextProvider>{children}</ActionsModalContextProvider>
    </DashboardContext.Provider>
  );
}
