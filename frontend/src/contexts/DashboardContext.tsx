import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { setSuiClient as set7kSdkSuiClient } from "@7kprotocol/sdk-ts/cjs";
import {
  AggregatorClient as CetusSdk,
  Env,
} from "@cetusprotocol/aggregator-sdk";
import { AggregatorQuoter as FlowXAggregatorQuoter } from "@flowx-finance/sdk";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";

import {
  ClaimRewardsReward,
  QuoteProvider,
  RewardSummary,
  StandardizedQuote,
  fetchAggQuotesAll,
  getSwapTransaction,
} from "@suilend/sdk";
import { NORMALIZED_SEND_COINTYPE, getToken } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { _7K_PARTNER_ADDRESS } from "@/lib/7k";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { FLOWX_PARTNER_ID } from "@/lib/flowx";

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
    args?: { isDepositing?: boolean; asSend?: boolean },
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
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { obligation, obligationOwnerCap } = useLoadedUserContext();

  // send.ag
  // SDKs
  const aftermathSdk = useMemo(() => {
    const sdk = new AftermathSdk("MAINNET");
    sdk.init();
    return sdk;
  }, []);

  const cetusSdk = useMemo(() => {
    const sdk = new CetusSdk({
      endpoint: "https://api-sui.cetus.zone/router_v2/find_routes",
      signer: address,
      client: suiClient,
      env: Env.Mainnet,
    });
    return sdk;
  }, [address, suiClient]);

  useEffect(() => {
    set7kSdkSuiClient(suiClient);
  }, [suiClient]);

  const flowXSdk = useMemo(() => {
    const sdk = new FlowXAggregatorQuoter("mainnet");
    return sdk;
  }, []);

  // Config
  const sdkMap = useMemo(
    () => ({
      [QuoteProvider.AFTERMATH]: aftermathSdk,
      [QuoteProvider.CETUS]: cetusSdk,
      [QuoteProvider.FLOWX]: flowXSdk,
    }),
    [aftermathSdk, cetusSdk, flowXSdk],
  );

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

  // SEND
  const sendToken = useMemo(
    () =>
      getToken(
        NORMALIZED_SEND_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_SEND_COINTYPE],
      ),
    [appData.coinMetadataMap],
  );

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Actions
  const claimRewards = useCallback(
    async (
      rewardsMap: Record<string, RewardSummary[]>,
      args?: {
        isDepositing?: boolean;
        asSend?: boolean;
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
            amount: r.obligationClaims[obligation.id].claimableAmount
              .times(10 ** r.stats.mintDecimals)
              .integerValue(BigNumber.ROUND_DOWN)
              .toString(),
          }));

        if (args?.isDepositing) {
          if (args?.asSend) {
          } else {
            appData.suilendClient.claimRewardsAndDeposit(
              address,
              obligationOwnerCap.id,
              rewards,
              transaction,
            );
          }
        } else {
          if (args?.asSend) {
            const { transaction: _transaction, mergedCoinsMap } =
              appData.suilendClient.claimRewards(
                address,
                obligationOwnerCap.id,
                rewards,
                transaction,
              );
            transaction = _transaction;

            // Get swap quotes for all rewards in parallel
            const swapQuotes: StandardizedQuote[] = await Promise.all(
              Object.entries(mergedCoinsMap).map(
                ([coinType, { coin, amount }]) =>
                  (async () => {
                    const quotes = await fetchAggQuotesAll(
                      sdkMap,
                      activeProviders,
                      getToken(coinType, appData.coinMetadataMap[coinType]),
                      sendToken,
                      amount,
                    );
                    if (quotes.length === 0) throw new Error("No quotes found");

                    const sortedQuotes = (
                      quotes.filter(Boolean) as StandardizedQuote[]
                    )
                      .slice()
                      .sort((a, b) => +b.out.amount.minus(a.out.amount));

                    const quote = sortedQuotes[0]; // Best quote by amount out

                    return quote;
                  })(),
              ),
            );

            // Add swap calls for each quote sequentially
            const sendCoins = [];
            for (const [coinType, { coin, amount }] of Object.entries(
              mergedCoinsMap,
            )) {
              const swapQuote = swapQuotes.find(
                (q) => q.in.coinType === coinType,
              );
              if (!swapQuote) throw new Error("No quote found"); // Should never happen

              console.log(
                "xxx swapQuote",
                swapQuote.in.amount.toString(),
                swapQuote.out.amount.toString(),
              );

              const coinToSwap = transaction.splitCoins(coin, [amount]);
              transaction.transferObjects([coin], address);

              const { transaction: _transaction, coinOut } =
                await getSwapTransaction(
                  suiClient,
                  address,
                  swapQuote,
                  1,
                  sdkMap,
                  {
                    [QuoteProvider.CETUS]: CETUS_PARTNER_ID,
                    [QuoteProvider._7K]: _7K_PARTNER_ADDRESS,
                    [QuoteProvider.FLOWX]: FLOWX_PARTNER_ID,
                  },
                  transaction,
                  coinToSwap,
                );
              if (!coinOut) throw new Error("Missing coin to transfer to user");

              transaction = _transaction;
              sendCoins.push(coinOut);
            }

            // Merge and transfer SEND to user
            const mergedSendCoin = sendCoins[0];
            if (sendCoins.length > 1) {
              transaction.mergeCoins(mergedSendCoin, sendCoins.slice(1));
            }

            transaction.transferObjects(
              [mergedSendCoin],
              transaction.pure.address(address),
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
      sdkMap,
      activeProviders,
      appData.coinMetadataMap,
      sendToken,
      suiClient,
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
