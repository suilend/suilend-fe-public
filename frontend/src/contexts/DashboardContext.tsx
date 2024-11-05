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

import { SuilendClient } from "@suilend/sdk/client";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { RewardSummary } from "@/lib/liquidityMining";

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
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
  const { address } = useWalletContext();
  const { obligation, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const obligationOwnerCap = data.obligationOwnerCaps?.find(
    (o) => o.obligationId === obligation?.id,
  );

  const claimRewards = useCallback(
    async (rewardsMap: Record<string, RewardSummary[]>) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      const transaction = new Transaction();
      try {
        await suilendClient.claimRewardsToObligation(
          address,
          Object.values(rewardsMap)
            .flat()
            .map((r) => {
              const obligationClaim = r.obligationClaims[obligation.id];

              return {
                obligationOwnerCapId: obligationOwnerCap.id,
                reserveArrayIndex: obligationClaim.reserveArrayIndex,
                rewardIndex: BigInt(r.stats.rewardIndex),
                rewardType: r.stats.rewardCoinType,
                side: r.stats.side,
              };
            }),
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
      suilendClient,
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
