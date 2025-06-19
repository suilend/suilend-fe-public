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

import * as Cetus from "@cetusprotocol/aggregator-sdk";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import { ClaimRewardsReward, RewardSummary } from "@suilend/sdk";
import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
} from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
    args?: {
      asSend?: boolean;
      asSui?: boolean;
      asUsdc?: boolean;
      isDepositing?: boolean;
    },
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
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { appData, autoclaimRewards } = useLoadedAppContext();
  const { obligation, obligationOwnerCap } = useLoadedUserContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const getClaimRewardSimulatedAmount = useCallback(
    async (rewards: ClaimRewardsReward[]): Promise<string> => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let transaction = new Transaction();

      // Claim
      const { transaction: _transaction, mergedCoinsMap } =
        appData.suilendClient.claimRewards(
          address,
          obligationOwnerCap.id,
          rewards,
          transaction,
        );
      transaction = _transaction;

      const [coinType, coin] = Object.entries(mergedCoinsMap)[0]; // There should be only be one entry

      // Get amount
      transaction.transferObjects([coin], transaction.pure.address(address));
      const inspectResults = await dryRunTransaction(transaction);

      const claimEvents = inspectResults.events.filter(
        (event) =>
          event.type ===
            "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::ClaimRewardEvent" &&
          normalizeStructTag((event.parsedJson as any).coin_type.name) ===
            coinType,
      );
      if (claimEvents.length === 0) throw new Error("Claim event not found");

      const amount = claimEvents
        .reduce(
          (acc, claimEvent) =>
            acc.plus((claimEvent.parsedJson as any).liquidity_amount),
          new BigNumber(0),
        )
        .integerValue(BigNumber.ROUND_DOWN)
        .toString();
      console.log("[getClaimRewardSimulatedAmount]", {
        coinType,
        amount,
        claimEvents,
      });

      return amount;
    },
    [
      address,
      obligationOwnerCap,
      obligation,
      appData.suilendClient,
      dryRunTransaction,
    ],
  );

  const claimRewards = useCallback(
    async (
      rewardsMap: Record<string, RewardSummary[]>,
      args?: {
        asSend?: boolean;
        asSui?: boolean;
        asUsdc?: boolean;
        isDepositing?: boolean;
      },
    ) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let transaction = new Transaction();

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

        if (args?.asSend || args?.asSui || args?.asUsdc) {
          // Claim
          const { transaction: _transaction1, mergedCoinsMap } =
            appData.suilendClient.claimRewards(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          transaction = _transaction1;

          // Get amounts and routers
          const amountsAndSortedQuotesMap: Record<
            string,
            {
              coin: TransactionObjectArgument;
              routers: Cetus.RouterData;
            }
          > = Object.fromEntries(
            await Promise.all(
              Object.entries(mergedCoinsMap).map(([coinType, coin]) =>
                (async () => {
                  // Get amount
                  const amount = await getClaimRewardSimulatedAmount(
                    rewards.filter((r) => r.rewardCoinType === coinType),
                  );

                  // Get routes
                  const routers = await cetusSdk.findRouters({
                    from: coinType,
                    target: args?.asSend
                      ? NORMALIZED_SEND_COINTYPE
                      : args?.asSui
                        ? NORMALIZED_SUI_COINTYPE
                        : NORMALIZED_USDC_COINTYPE,
                    amount: new BN(amount), // Underestimate (rewards keep accruing)
                    byAmountIn: true,
                    splitCount: new BigNumber(amount)
                      .times(rewardsMap[coinType][0].stats.price ?? 1)
                      .gte(10)
                      ? undefined // Don't limit splitCount if amount is >= $10
                      : 1,
                  });
                  if (!routers) throw new Error("No quote found");
                  console.log("[claimRewards] routers", { coinType, routers });

                  return [coinType, { coin, routers }];
                })(),
              ),
            ),
          );

          // Swap
          for (const [coinType, { coin: coinIn, routers }] of Object.entries(
            amountsAndSortedQuotesMap,
          )) {
            const slippagePercent = 3;

            let coinOut: TransactionObjectArgument;
            try {
              coinOut = await cetusSdk.fixableRouterSwap({
                routers,
                inputCoin: coinIn,
                slippage: slippagePercent / 100,
                txb: transaction,
                partner: CETUS_PARTNER_ID,
              });
            } catch (err) {
              throw new Error("No quote found");
            }

            if (args?.isDepositing) {
              appData.suilendClient.deposit(
                coinOut,
                args?.asSend
                  ? NORMALIZED_SEND_COINTYPE
                  : args?.asSui
                    ? NORMALIZED_SUI_COINTYPE
                    : NORMALIZED_USDC_COINTYPE,
                obligationOwnerCap.id,
                transaction,
              );
            } else {
              transaction.transferObjects(
                [coinOut],
                transaction.pure.address(address),
              );
            }
          }
        } else {
          if (args?.isDepositing) {
            appData.suilendClient.claimRewardsAndDeposit(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          } else {
            appData.suilendClient.claimRewardsAndSendToUser(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          }
        }
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      // transaction = autoclaimRewards(transaction);

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      obligationOwnerCap,
      obligation,
      appData.suilendClient,
      getClaimRewardSimulatedAmount,
      cetusSdk,
      // autoclaimRewards,
      signExecuteAndWaitForTransaction,
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
