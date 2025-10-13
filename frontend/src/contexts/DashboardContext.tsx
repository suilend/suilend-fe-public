import { useRouter } from "next/router";
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

import { RouterDataV3 as CetusQuote } from "@cetusprotocol/aggregator-sdk";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import BN from "bn.js";

import {
  ClaimRewardsReward,
  LENDING_MARKET_ID,
  RewardsMap,
} from "@suilend/sdk";
import track from "@suilend/sui-fe/lib/track";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useLoadedAppContext } from "@/contexts/AppContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";

export enum QueryParams {
  LENDING_MARKET_ID = "lendingMarketId",
}

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    lendingMarketId: string,
    rewardsMap: RewardsMap,
    args: {
      isSwapping: boolean;
      swappingToCoinType: string;
      isDepositing: boolean;
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
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.LENDING_MARKET_ID]: router.query[
        QueryParams.LENDING_MARKET_ID
      ] as string | undefined,
    }),
    [router.query],
  );

  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData, openLedgerHashDialog } = useLoadedAppContext();
  const { obligationMap, obligationOwnerCapMap, autoclaimRewards } =
    useLoadedUserContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // Lending market
  const lendingMarketId = useMemo(
    () => queryParams[QueryParams.LENDING_MARKET_ID] ?? LENDING_MARKET_ID,
    [queryParams],
  );

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const claimRewards = useCallback(
    async (
      lendingMarketId: string,
      rewardsMap: RewardsMap,
      args: {
        isSwapping: boolean;
        swappingToCoinType: string;
        isDepositing: boolean;
      },
    ) => {
      const appData = allAppData.allLendingMarketData[lendingMarketId];
      const obligation = obligationMap[appData.lendingMarket.id];
      const obligationOwnerCap =
        obligationOwnerCapMap[appData.lendingMarket.id];

      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let transaction = new Transaction();

      try {
        const rewards: ClaimRewardsReward[] = Object.values(rewardsMap)
          .flatMap((r) => r.rewards)
          .map((r) => ({
            reserveArrayIndex:
              r.obligationClaims[obligation.id].reserveArrayIndex,
            rewardIndex: BigInt(r.stats.rewardIndex),
            rewardCoinType: r.stats.rewardCoinType,
            side: r.stats.side,
          }));

        if (args.isSwapping) {
          // Claim
          const { transaction: _transaction1, mergedCoinsMap } =
            appData.suilendClient.claimRewards(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          transaction = _transaction1;

          const nonSwappedCoinTypes = Object.keys(mergedCoinsMap).filter(
            (coinType) => coinType === args.swappingToCoinType,
          );
          const swappedCoinTypes = Object.keys(mergedCoinsMap).filter(
            (coinType) => coinType !== args.swappingToCoinType,
          );

          let resultCoin: TransactionObjectArgument | undefined = undefined;

          // Non-swapped coins
          for (const [coinType, coin] of Object.entries(mergedCoinsMap).filter(
            ([coinType]) => nonSwappedCoinTypes.includes(coinType),
          )) {
            if (resultCoin) transaction.mergeCoins(resultCoin, [coin]);
            else resultCoin = coin;
          }

          // Swapped coins
          // Get amounts and routers
          const amountsAndSortedQuotesMap: Record<
            string,
            {
              coin: TransactionObjectArgument;
              routers: CetusQuote;
            }
          > = Object.fromEntries(
            await Promise.all(
              Object.entries(mergedCoinsMap)
                .filter(([coinType]) => swappedCoinTypes.includes(coinType))
                .map(([coinType, coin]) =>
                  (async () => {
                    const { rawAmount: amount } = rewardsMap[coinType]; // Use underestimate (rewards keep accruing)

                    // Get routes
                    const routers = await cetusSdk.findRouters({
                      from: coinType,
                      target: args.swappingToCoinType,
                      amount: new BN(amount.toString()), // Underestimate (rewards keep accruing)
                      byAmountIn: true,
                    });
                    if (!routers) throw new Error("No swap quote found");
                    console.log("[claimRewards] routers", {
                      coinType,
                      routers,
                    });

                    return [coinType, { coin, routers }];
                  })(),
                ),
            ),
          );
          console.log("[claimRewards] amountsAndSortedQuotesMap", {
            amountsAndSortedQuotesMap,
          });

          // Swap
          for (const [coinType, { coin: coinIn, routers }] of Object.entries(
            amountsAndSortedQuotesMap,
          )) {
            console.log("[claimRewards] swapping coinType", coinType);
            const slippagePercent = 3;

            let coinOut: TransactionObjectArgument;
            try {
              coinOut = await cetusSdk.fixableRouterSwapV3({
                router: routers,
                inputCoin: coinIn,
                slippage: slippagePercent / 100,
                txb: transaction,
                partner: CETUS_PARTNER_ID,
              });
            } catch (err) {
              throw new Error("No swap quote found");
            }

            if (resultCoin) transaction.mergeCoins(resultCoin, [coinOut]);
            else resultCoin = coinOut;
          }

          if (!resultCoin) throw new Error("No coin to deposit or transfer");
          if (args.isDepositing) {
            appData.suilendClient.deposit(
              resultCoin,
              args.swappingToCoinType,
              obligationOwnerCap.id,
              transaction,
            );
          } else {
            transaction.transferObjects(
              [resultCoin],
              transaction.pure.address(address),
            );
          }
        } else {
          if (args.isDepositing) {
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

      const { transaction: _transaction, onSuccess: onAutoclaimSuccess } =
        await autoclaimRewards(transaction);
      transaction = _transaction;

      const res = await signExecuteAndWaitForTransaction(
        transaction,
        undefined,
        (tx: Transaction) => openLedgerHashDialog(tx),
      );
      onAutoclaimSuccess();
      track(
        "claim_rewards",
        Object.fromEntries(
          Object.entries(args ?? {}).map(([k, v]) => [k, String(v)]),
        ),
      );

      return res;
    },
    [
      address,
      allAppData.allLendingMarketData,
      obligationOwnerCapMap,
      obligationMap,
      cetusSdk,
      autoclaimRewards,
      openLedgerHashDialog,
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
      <LendingMarketContextProvider lendingMarketId={lendingMarketId}>
        {children}
      </LendingMarketContextProvider>
    </DashboardContext.Provider>
  );
}
