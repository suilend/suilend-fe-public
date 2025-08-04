import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import track from "@suilend/sui-fe/lib/track";
import { useWalletContext } from "@suilend/sui-fe-next";

import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";

interface DashboardContext {
  isFirstDepositDialogOpen: boolean;
  setIsFirstDepositDialogOpen: Dispatch<SetStateAction<boolean>>;

  isAutoclaimNotificationDialogOpen: boolean;
  setIsAutoclaimNotificationDialogOpen: Dispatch<SetStateAction<boolean>>;

  claimRewards: (
    rewardsMap: Record<string, RewardSummary[]>,
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

  isAutoclaimNotificationDialogOpen: false,
  setIsAutoclaimNotificationDialogOpen: () => {
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
  const { appData, openLedgerHashDialog } = useLoadedAppContext();
  const {
    obligation,
    obligationOwnerCap,
    autoclaimRewards,
    latestAutoclaimDigestMap,
    lastSeenAutoclaimDigestMap,
    setLastSeenAutoclaimDigest,
  } = useLoadedUserContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // First deposit
  const [isFirstDepositDialogOpen, setIsFirstDepositDialogOpen] =
    useState<boolean>(defaultContextValue.isFirstDepositDialogOpen);

  // Autoclaim
  const [
    isAutoclaimNotificationDialogOpen,
    setIsAutoclaimNotificationDialogOpen,
  ] = useState<boolean>(defaultContextValue.isAutoclaimNotificationDialogOpen);

  const didOpenAutoclaimNotificationDialogMap = useRef<Record<string, boolean>>(
    {},
  );
  useEffect(() => {
    if (!obligation?.id) return;

    const lastSeenAutoclaimDigest = lastSeenAutoclaimDigestMap[obligation.id];
    const latestAutoclaimDigest = latestAutoclaimDigestMap[obligation.id];
    if (
      latestAutoclaimDigest === undefined ||
      lastSeenAutoclaimDigest === latestAutoclaimDigest
    )
      return;

    if (didOpenAutoclaimNotificationDialogMap.current[obligation.id]) return;
    didOpenAutoclaimNotificationDialogMap.current[obligation.id] = true;

    setIsAutoclaimNotificationDialogOpen(true);
    setLastSeenAutoclaimDigest(obligation.id, latestAutoclaimDigest);
  }, [
    obligation?.id,
    lastSeenAutoclaimDigestMap,
    latestAutoclaimDigestMap,
    setLastSeenAutoclaimDigest,
  ]);

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
      args: {
        isSwapping: boolean;
        swappingToCoinType: string;
        isDepositing: boolean;
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

          // Non-swapped coins
          for (const [coinType, coin] of Object.entries(mergedCoinsMap).filter(
            ([coinType]) => nonSwappedCoinTypes.includes(coinType),
          )) {
            if (args.isDepositing) {
              appData.suilendClient.deposit(
                coin,
                args.swappingToCoinType,
                obligationOwnerCap.id,
                transaction,
              );
            } else {
              transaction.transferObjects(
                [coin],
                transaction.pure.address(address),
              );
            }
          }

          // Swapped coins
          // Get amounts and routers
          const amountsAndSortedQuotesMap: Record<
            string,
            {
              coin: TransactionObjectArgument;
              routers: Cetus.RouterData;
            }
          > = Object.fromEntries(
            await Promise.all(
              Object.entries(mergedCoinsMap)
                .filter(([coinType]) => swappedCoinTypes.includes(coinType))
                .map(([coinType, coin]) =>
                  (async () => {
                    // Get amount
                    const amount = await getClaimRewardSimulatedAmount(
                      rewards.filter((r) => r.rewardCoinType === coinType),
                    );

                    // Get routes
                    const routers = await cetusSdk.findRouters({
                      from: coinType,
                      target: args.swappingToCoinType,
                      amount: new BN(amount), // Underestimate (rewards keep accruing)
                      byAmountIn: true,
                      splitCount: new BigNumber(amount)
                        .times(rewardsMap[coinType][0].stats.price ?? 1)
                        .gte(10)
                        ? undefined // Don't limit splitCount if amount is >= $10
                        : 1,
                    });
                    if (!routers) throw new Error("No quote found");
                    console.log("[claimRewards] routers", {
                      coinType,
                      routers,
                    });

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

            if (args.isDepositing) {
              appData.suilendClient.deposit(
                coinOut,
                args.swappingToCoinType,
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
      obligationOwnerCap,
      obligation,
      appData.suilendClient,
      getClaimRewardSimulatedAmount,
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

      isAutoclaimNotificationDialogOpen,
      setIsAutoclaimNotificationDialogOpen,

      claimRewards,
    }),
    [
      isFirstDepositDialogOpen,
      setIsFirstDepositDialogOpen,
      isAutoclaimNotificationDialogOpen,
      setIsAutoclaimNotificationDialogOpen,
      claimRewards,
    ],
  );

  return (
    <DashboardContext.Provider value={contextValue}>
      <ActionsModalContextProvider>{children}</ActionsModalContextProvider>
    </DashboardContext.Provider>
  );
}
