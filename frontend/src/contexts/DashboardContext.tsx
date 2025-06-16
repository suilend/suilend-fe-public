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
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { BN } from "bn.js";

import {
  ClaimRewardsReward,
  QuoteProvider,
  RewardSummary,
  StandardizedQuote,
  getAggSortedQuotesAll,
  getSwapTransaction,
} from "@suilend/sdk";
import { NORMALIZED_SEND_COINTYPE, getToken } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { useAggSdks } from "@/lib/swap";

const SWAP_TO_SEND_SLIPPAGE_PERCENT = 1;

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
    args: { asSend: boolean; isDepositing: boolean },
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
  const { suiClient } = useSettingsContext();
  const { address, dryRunTransaction, signExecuteAndWaitForTransaction } =
    useWalletContext();
  const { appData } = useLoadedAppContext();
  const { obligation, obligationOwnerCap } = useLoadedUserContext();

  // send.ag
  const { sdkMap, partnerIdMap } = useAggSdks();

  const activeProviders = useMemo(
    () => [
      QuoteProvider.AFTERMATH,
      QuoteProvider.CETUS,
      QuoteProvider._7K,
      QuoteProvider.FLOWX,
      // QuoteProvider.OKX_DEX,
    ],
    [],
  );

  // Helpers
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

      const [coinType, coin] = Object.entries(mergedCoinsMap)[0];

      // Get amount
      transaction.transferObjects([coin], transaction.pure.address(address));
      const inspectResults = await dryRunTransaction(transaction);

      console.log("[getClaimRewardSimulatedAmount]", {
        inspectResults,
      });

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

  const depositOrSendToUser = useCallback(
    (
      isDepositing: boolean,
      coinType: string,
      coin: TransactionObjectArgument,
      transaction: Transaction,
    ) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      const innerTransaction = Transaction.from(transaction);

      if (isDepositing) {
        // Deposit SEND
        appData.suilendClient.deposit(
          coin,
          coinType,
          obligationOwnerCap.id,
          innerTransaction,
        );
      } else {
        // Transfer SEND to user
        innerTransaction.transferObjects(
          [coin],
          innerTransaction.pure.address(address),
        );
      }

      return innerTransaction;
    },
    [address, obligationOwnerCap, obligation, appData.suilendClient],
  );

  const swapToSendAndDepositOrSendToUser = useCallback(
    async (
      isDepositing: boolean,
      coinIn: TransactionObjectArgument,
      quote: StandardizedQuote,
      transaction: Transaction,
    ) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let innerTransaction = Transaction.from(transaction);

      const { transaction: _transaction2, coinOut } = await getSwapTransaction(
        suiClient,
        address,
        quote,
        SWAP_TO_SEND_SLIPPAGE_PERCENT,
        sdkMap,
        partnerIdMap,
        innerTransaction,
        coinIn,
      );
      if (!coinOut) throw new Error("Missing coin to transfer to user");

      innerTransaction = _transaction2;

      innerTransaction = depositOrSendToUser(
        isDepositing,
        NORMALIZED_SEND_COINTYPE,
        coinOut,
        innerTransaction,
      );

      return innerTransaction;
    },
    [
      address,
      obligationOwnerCap,
      obligation,
      suiClient,
      sdkMap,
      partnerIdMap,
      depositOrSendToUser,
    ],
  );

  const swapDustToSendAndDepositOrSendToUser = useCallback(
    async (
      isDepositing: boolean,
      coinType: string,
      coinIn: TransactionObjectArgument,
      transaction: Transaction,
    ) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let innerTransaction = Transaction.from(transaction);

      const routers = await sdkMap[QuoteProvider.CETUS].findRouters({
        from: coinType,
        target: NORMALIZED_SEND_COINTYPE,
        amount: new BN(0.01 * 10 ** appData.coinMetadataMap[coinType].decimals), // Just an estimate (an upper bound)
        byAmountIn: true,
      });

      if (!routers) throw new Error("No routers found");
      console.log("[swapDustToSendAndSendToUser]", { routers });

      const coinOut = await sdkMap[QuoteProvider.CETUS].fixableRouterSwap({
        routers,
        inputCoin: coinIn,
        slippage: SWAP_TO_SEND_SLIPPAGE_PERCENT,
        txb: innerTransaction,
        partner: partnerIdMap[QuoteProvider.CETUS],
      });

      innerTransaction = depositOrSendToUser(
        isDepositing,
        NORMALIZED_SEND_COINTYPE,
        coinOut,
        innerTransaction,
      );

      return innerTransaction;
    },
    [
      address,
      obligationOwnerCap,
      obligation,
      sdkMap,
      appData.coinMetadataMap,
      partnerIdMap,
      depositOrSendToUser,
    ],
  );

  //

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const claimRewards = useCallback(
    async (
      rewardsMap: Record<string, RewardSummary[]>,
      args: { asSend: boolean; isDepositing: boolean },
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

        if (args?.asSend) {
          if (Object.keys(rewardsMap).length > 1)
            throw new Error(
              "Cannot claim multiple rewards as SEND in one transaction",
            ); // TODO

          // Claim
          const { transaction: _transaction1, mergedCoinsMap } =
            appData.suilendClient.claimRewards(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          transaction = _transaction1;

          const [coinType, coin] = Object.entries(mergedCoinsMap)[0];

          // Get amount
          const amount = await getClaimRewardSimulatedAmount(rewards);

          // Get quotes
          const sortedQuotes = await getAggSortedQuotesAll(
            sdkMap,
            activeProviders,
            getToken(coinType, appData.coinMetadataMap[coinType]),
            getToken(
              NORMALIZED_SEND_COINTYPE,
              appData.coinMetadataMap[NORMALIZED_SEND_COINTYPE],
            ),
            amount,
          );
          if (sortedQuotes.length === 0) throw new Error("No quotes found");

          // Make swap
          const swapCoinIn = transaction.splitCoins(coin, [amount]);
          const dustCoinIn = coin;

          // Swap - main
          let quote: StandardizedQuote | undefined = undefined;
          for (const _quote of sortedQuotes) {
            try {
              console.log("[claimRewards] dryRunTransaction for swap", {
                quote: _quote,
              });
              const testTransaction = await swapToSendAndDepositOrSendToUser(
                args?.isDepositing,
                swapCoinIn,
                _quote,
                Transaction.from(transaction),
              );

              await dryRunTransaction(testTransaction);
              quote = _quote;
              break;
            } catch (err) {
              console.error(err);
              continue;
            }
          }
          if (quote === undefined) throw new Error("No valid quotes found");

          transaction = await swapToSendAndDepositOrSendToUser(
            args?.isDepositing,
            swapCoinIn,
            quote,
            transaction,
          );

          // Swap - dust
          transaction = await swapDustToSendAndDepositOrSendToUser(
            args?.isDepositing,
            coinType,
            dustCoinIn,
            transaction,
          );
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

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      obligationOwnerCap,
      obligation,
      appData.suilendClient,
      getClaimRewardSimulatedAmount,
      sdkMap,
      activeProviders,
      appData.coinMetadataMap,
      dryRunTransaction,
      swapToSendAndDepositOrSendToUser,
      swapDustToSendAndDepositOrSendToUser,
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
