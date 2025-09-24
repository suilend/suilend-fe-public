import { useRouter } from "next/router";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CoinMetadata, SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import {
  LENDING_MARKET_ID,
  ObligationWithUnclaimedRewards,
  ParsedObligation,
  RewardMap,
  Side,
  StrategyOwnerCap,
} from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import {
  API_URL,
  NORMALIZED_WAL_COINTYPE,
  getAllOwnedObjects,
} from "@suilend/sui-fe";
import track from "@suilend/sui-fe/lib/track";
import {
  shallowPushQuery,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";
import useFetchBalances from "@suilend/sui-fe-next/fetchers/useFetchBalances";
import useCoinMetadataMap from "@suilend/sui-fe-next/hooks/useCoinMetadataMap";
import useRefreshOnBalancesChange from "@suilend/sui-fe-next/hooks/useRefreshOnBalancesChange";

import {
  QueryParams as AppContextQueryParams,
  useAppContext,
} from "@/contexts/AppContext";
import useFetchUserData from "@/fetchers/useFetchUserData";
import { fetchClaimRewardEvents } from "@/lib/events";
import { STAKED_WAL_TYPE, StakedWalObject, StakedWalState } from "@/lib/walrus";

const getCombinedAutoclaimedRewards = (
  prevRewards: Record<string, number[]>,
  newRewards: Record<string, number[]>,
) => {
  const result: Record<string, number[]> = {
    ...prevRewards,
  };
  for (const [obligationId, rewards] of Object.entries(newRewards))
    result[obligationId] = [...(result[obligationId] ?? []), ...rewards];

  return result;
};

export interface UserData {
  strategyOwnerCaps: StrategyOwnerCap[];
  strategyObligations: ParsedObligation[];

  obligationOwnerCaps: ObligationOwnerCap<string>[];
  obligations: ParsedObligation[];

  rewardMap: RewardMap;
}

interface UserContext {
  rawBalancesMap: Record<string, BigNumber> | undefined;
  balancesCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  getBalance: (coinType: string) => BigNumber;
  ownedStakedWalObjects: StakedWalObject[] | undefined;

  allUserData: Record<string, UserData> | undefined; // Depends on allAppData

  refresh: () => void; // Refreshes allAppData, balances, and allUserData

  obligationMap: Record<string, ParsedObligation | undefined> | undefined; // Depends on userData
  obligationOwnerCapMap:
    | Record<string, ObligationOwnerCap<string> | undefined>
    | undefined; // Depends on userData
  setObligationId: (lendingMarketId: string, obligationId: string) => void;

  autoclaimRewards: (
    transaction: Transaction,
  ) => Promise<{ transaction: Transaction; onSuccess: () => void }>;

  latestAutoclaimDigestMap: Record<string, string>;
  lastSeenAutoclaimDigestMap: Record<string, string>;
  setLastSeenAutoclaimDigest: (obligationId: string, digest: string) => void;
}
type LoadedUserContext = UserContext & {
  allUserData: Record<string, UserData>;

  obligationMap: Record<string, ParsedObligation | undefined>;
  obligationOwnerCapMap: Record<string, ObligationOwnerCap<string> | undefined>;
};

const UserContext = createContext<UserContext>({
  rawBalancesMap: undefined,
  balancesCoinMetadataMap: undefined,
  getBalance: () => {
    throw Error("UserContextProvider not initialized");
  },
  ownedStakedWalObjects: undefined,

  allUserData: undefined,

  refresh: () => {
    throw Error("UserContextProvider not initialized");
  },

  obligationMap: undefined,
  obligationOwnerCapMap: undefined,
  setObligationId: () => {
    throw Error("UserContextProvider not initialized");
  },

  autoclaimRewards: async () => {
    throw Error("UserContextProvider not initialized");
  },

  latestAutoclaimDigestMap: {},
  lastSeenAutoclaimDigestMap: {},
  setLastSeenAutoclaimDigest: () => {
    throw Error("UserContextProvider not initialized");
  },
});

export const useUserContext = () => useContext(UserContext);
export const useLoadedUserContext = () => useUserContext() as LoadedUserContext;

export function UserContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  const { suiClient } = useSettingsContext();
  const { address, dryRunTransaction, isUsingLedger } = useWalletContext();
  const { allAppData, refreshAllAppData } = useAppContext();

  // Balances
  const { data: rawBalancesMap, mutateData: mutateRawBalancesMap } =
    useFetchBalances();

  const refreshRawBalancesMap = useCallback(async () => {
    await mutateRawBalancesMap();
  }, [mutateRawBalancesMap]);

  const balancesCoinTypes = useMemo(
    () => Object.keys(rawBalancesMap ?? {}),
    [rawBalancesMap],
  );
  const balancesCoinMetadataMap = useCoinMetadataMap(balancesCoinTypes);

  const getBalance = useCallback(
    (coinType: string) => {
      if (rawBalancesMap?.[coinType] === undefined) return new BigNumber(0);

      const coinMetadata = balancesCoinMetadataMap?.[coinType];
      if (!coinMetadata) return new BigNumber(0);

      return new BigNumber(rawBalancesMap[coinType]).div(
        10 ** coinMetadata.decimals,
      );
    },
    [rawBalancesMap, balancesCoinMetadataMap],
  );

  const [ownedStakedWalObjectsMap, setOwnedStakedWalObjectsMap] = useState<
    Record<string, SuiObjectResponse[]>
  >({});

  const fetchOwnedStakedWalObjectsMap = useCallback(
    async (_address: string) => {
      console.log("Fetching ownedStakedWalObjectsMap", _address);

      try {
        const objs = await getAllOwnedObjects(suiClient, _address, {
          StructType: STAKED_WAL_TYPE,
        });

        setOwnedStakedWalObjectsMap((prev) => ({
          ...prev,
          [_address]: objs,
        }));
        console.log("Fetched ownedStakedWalObjectsMap", _address, objs);
      } catch (err) {
        console.error("Failed to fetch ownedStakedWalObjectsMap", err);
      }
    },
    [suiClient],
  );

  const isFetchingOwnedStakedWalObjectsMapRef = useRef<string[]>([]);
  useEffect(() => {
    if (!address) return;
    if (process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true") return;

    if (isFetchingOwnedStakedWalObjectsMapRef.current.includes(address)) return;
    isFetchingOwnedStakedWalObjectsMapRef.current.push(address);

    fetchOwnedStakedWalObjectsMap(address);
  }, [address, fetchOwnedStakedWalObjectsMap]);

  const ownedStakedWalObjects = useMemo(() => {
    if (!address || allAppData === undefined) return undefined;
    if (process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true")
      return undefined;

    const appDataMainMarket =
      allAppData.allLendingMarketData[LENDING_MARKET_ID];

    const result: StakedWalObject[] = [];
    for (const obj of ownedStakedWalObjectsMap[address] ?? []) {
      const { activation_epoch, node_id, principal, state } = (
        obj.data?.content as any
      ).fields;

      result.push({
        id: obj.data?.objectId as string,
        nodeId: node_id,
        activationEpoch: activation_epoch,
        withdrawEpoch:
          state.variant === "Withdrawing"
            ? state.fields.withdraw_epoch
            : undefined,
        amount: new BigNumber(principal).div(
          10 **
            appDataMainMarket.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals,
        ),
        state:
          state.variant === "Staked"
            ? StakedWalState.STAKED
            : StakedWalState.WITHDRAWING,
      });
    }

    return result;
  }, [address, allAppData, ownedStakedWalObjectsMap]);

  // User data
  const { data: allUserData, mutateData: mutateAllUserData } =
    useFetchUserData();

  const userDataMap: Record<string, UserData | undefined> | undefined = useMemo(
    () =>
      allAppData === undefined
        ? undefined
        : Object.fromEntries(
            Object.values(allAppData.allLendingMarketData).map((appData) => [
              appData.lendingMarket.id,
              allUserData?.[appData.lendingMarket.id],
            ]),
          ),
    [allAppData, allUserData],
  );

  // Refresh
  const refresh = useCallback(() => {
    (async () => {
      await refreshAllAppData();
      await mutateAllUserData();
    })();
    refreshRawBalancesMap();
    if (address) fetchOwnedStakedWalObjectsMap(address);
  }, [
    refreshAllAppData,
    mutateAllUserData,
    refreshRawBalancesMap,
    address,
    fetchOwnedStakedWalObjectsMap,
  ]);

  useRefreshOnBalancesChange(refresh as () => Promise<void>);

  // Obligation
  const [obligationIdMap, setObligationIdMap] = useLocalStorage<
    Record<string, string>
  >("obligationIdMap", {});

  const obligationMap:
    | Record<string, ParsedObligation | undefined>
    | undefined = useMemo(
    () =>
      allAppData === undefined || userDataMap === undefined
        ? undefined
        : Object.fromEntries(
            Object.values(allAppData.allLendingMarketData).map((appData) => [
              appData.lendingMarket.id,
              userDataMap[appData.lendingMarket.id]?.obligations.find(
                (o) => o.id === obligationIdMap[appData.lendingMarket.id],
              ) ?? userDataMap[appData.lendingMarket.id]?.obligations[0],
            ]),
          ),
    [allAppData, userDataMap, obligationIdMap],
  );
  const obligationOwnerCapMap:
    | Record<string, ObligationOwnerCap<string> | undefined>
    | undefined = useMemo(
    () =>
      allAppData === undefined ||
      userDataMap === undefined ||
      obligationMap === undefined
        ? undefined
        : Object.fromEntries(
            Object.values(allAppData.allLendingMarketData).map((appData) => [
              appData.lendingMarket.id,
              userDataMap[appData.lendingMarket.id]?.obligationOwnerCaps.find(
                (o) =>
                  o.obligationId ===
                  obligationMap[appData.lendingMarket.id]?.id,
              ),
            ]),
          ),
    [allAppData, userDataMap, obligationMap],
  );

  // Obligations with unclaimed rewards
  const AUTOCLAIM_OBLIGATIONS_LIMIT = 15;
  const MAX_REWARDS_PER_TRANSACTION = useMemo(
    () => (isUsingLedger ? 0 : 15),
    [isUsingLedger],
  );

  // Fetch
  const [obligationsWithUnclaimedRewards, setObligationsWithUnclaimedRewards] =
    useState<ObligationWithUnclaimedRewards[] | undefined>(undefined);

  const hasFetchedObligationsWithUnclaimedRewardsRef = useRef<boolean>(false);
  useEffect(() => {
    if (hasFetchedObligationsWithUnclaimedRewardsRef.current) return;
    hasFetchedObligationsWithUnclaimedRewardsRef.current = true;

    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/obligations/unclaimed-rewards?limit=${AUTOCLAIM_OBLIGATIONS_LIMIT}`,
        );
        const json: {
          obligations: {
            id: string;
            unclaimedRewards: {
              rewardReserveArrayIndex: string;
              rewardIndex: string;
              rewardCoinType: string;
              side: Side;
              depositReserveArrayIndex: string;
            }[];
          }[];
        } = await res.json();

        const result: ObligationWithUnclaimedRewards[] = json.obligations.map(
          (o) => ({
            ...o,
            unclaimedRewards: o.unclaimedRewards.map((r) => ({
              rewardReserveArrayIndex: BigInt(r.rewardReserveArrayIndex),
              rewardIndex: BigInt(r.rewardIndex),
              rewardCoinType: r.rewardCoinType,
              side: r.side,
              depositReserveArrayIndex: BigInt(r.depositReserveArrayIndex),
            })),
          }),
        );
        setObligationsWithUnclaimedRewards(result);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Autoclaim
  const [autoclaimedRewards, setAutoclaimedRewards] = useState<
    Record<string, number[]>
  >({});

  const autoclaimRewards = useCallback(
    async (transaction: Transaction) => {
      if (!allAppData) throw Error("App data not loaded"); // Should never happen as the page is not rendered if the app data is not loaded
      if (!userDataMap) throw Error("User data not loaded"); // Should never happen as the page is not rendered if the user data is not loaded
      if (!obligationsWithUnclaimedRewards)
        return { transaction, onSuccess: () => {} }; // Can happen if the data is not loaded yet or fails to load

      const innerTransaction = Transaction.from(transaction);

      // Prepare
      const appDataMainMarket =
        allAppData.allLendingMarketData[LENDING_MARKET_ID];
      const suilendClientMainMarket = appDataMainMarket.suilendClient;
      const userDataMainMarket =
        userDataMap[appDataMainMarket.lendingMarket.id];

      const filteredObligationsWithUnclaimedRewards =
        obligationsWithUnclaimedRewards.filter(
          (obligation) =>
            !userDataMainMarket?.obligations.some(
              (o) => o.id === obligation.id,
            ),
        );
      const newAutoclaimedRewards =
        filteredObligationsWithUnclaimedRewards.reduce(
          (acc, obligation) => ({ ...acc, [obligation.id]: [] }),
          {} as Record<string, number[]>,
        );

      // Iterate over obligations and rewards
      for (const obligation of filteredObligationsWithUnclaimedRewards) {
        for (let i = 0; i < obligation.unclaimedRewards.length; i++) {
          const reward = obligation.unclaimedRewards[i];

          const count = Object.values(newAutoclaimedRewards).reduce(
            (acc, rewards) => acc + rewards.length,
            0,
          );
          if (count >= MAX_REWARDS_PER_TRANSACTION) break; // Skip if we've reached the max number of rewards for this transaction

          if ((autoclaimedRewards[obligation.id] ?? []).includes(i)) continue; // Skip if already autoclaimed in a previous transaction

          suilendClientMainMarket.claimRewardAndDeposit(
            obligation.id,
            reward.rewardReserveArrayIndex,
            reward.rewardIndex,
            reward.rewardCoinType,
            reward.side,
            reward.depositReserveArrayIndex,
            innerTransaction,
          );
          newAutoclaimedRewards[obligation.id].push(i);
        }
      }

      const count = Object.values(newAutoclaimedRewards).reduce(
        (acc, rewards) => acc + rewards.length,
        0,
      );
      if (count === 0) return { transaction, onSuccess: () => {} }; // Skip if no rewards to autoclaim

      try {
        await dryRunTransaction(innerTransaction);
        return {
          transaction: innerTransaction,
          onSuccess: () => {
            setAutoclaimedRewards((prev) =>
              getCombinedAutoclaimedRewards(prev, newAutoclaimedRewards),
            );
          },
        };
      } catch (err) {
        track("autoclaim_rewards_dry_run_error");
        return { transaction, onSuccess: () => {} };
      }
    },
    [
      allAppData,
      userDataMap,
      obligationsWithUnclaimedRewards,
      MAX_REWARDS_PER_TRANSACTION,
      autoclaimedRewards,
      dryRunTransaction,
    ],
  );

  // Autoclaim - last seen & latest digests
  const [lastSeenAutoclaimDigestMap, setLastSeenAutoclaimDigestMap] =
    useLocalStorage<Record<string, string>>("lastSeenAutoclaimDigestMap", {});
  const [latestAutoclaimDigestMap, setLatestAutoclaimDigestMap] = useState<
    Record<string, string>
  >({});

  const setLastSeenAutoclaimDigest = useCallback(
    (_obligationId: string, digest: string) => {
      setLastSeenAutoclaimDigestMap((prev) => ({
        ...prev,
        [_obligationId]: digest,
      }));
    },
    [setLastSeenAutoclaimDigestMap],
  );

  const hasFetchedAutoclaimDigestsMapRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!address || !obligationIdMap) return;

    for (const obligationId of Object.values(obligationIdMap)) {
      if (hasFetchedAutoclaimDigestsMapRef.current[obligationId]) return;
      hasFetchedAutoclaimDigestsMapRef.current[obligationId] = true;

      (async () => {
        const { autoclaimDigests, lastClaimRewardDigest } =
          await fetchClaimRewardEvents(suiClient, address, obligationId);
        if (autoclaimDigests.length === 0) return;

        const latestAutoclaimDigest = autoclaimDigests[0];
        if (latestAutoclaimDigest !== lastClaimRewardDigest) {
          setLastSeenAutoclaimDigest(obligationId, latestAutoclaimDigest);
          return;
        }

        setLatestAutoclaimDigestMap((prev) => ({
          ...prev,
          [obligationId]: latestAutoclaimDigest,
        }));
      })();
    }
  }, [address, obligationIdMap, suiClient, setLastSeenAutoclaimDigest]);

  // Context
  const contextValue = useMemo(
    () => ({
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      ownedStakedWalObjects,

      allUserData,
      userDataMap,

      refresh,

      obligationMap,
      obligationOwnerCapMap,
      setObligationId: (lendingMarketId: string, obligationId: string) => {
        const lendingMarket = allAppData?.allLendingMarketData[lendingMarketId];
        if (!lendingMarket) return;

        shallowPushQuery(router, {
          ...router.query,
          [AppContextQueryParams.LENDING_MARKET]:
            lendingMarket.lendingMarket.slug,
        });
        setObligationIdMap((prev) => ({
          ...prev,
          [lendingMarketId]: obligationId,
        }));
      },

      autoclaimRewards,

      latestAutoclaimDigestMap,
      lastSeenAutoclaimDigestMap,
      setLastSeenAutoclaimDigest,
    }),
    [
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      ownedStakedWalObjects,
      allUserData,
      userDataMap,
      refresh,
      obligationMap,
      obligationOwnerCapMap,
      allAppData,
      router,
      setObligationIdMap,
      autoclaimRewards,
      latestAutoclaimDigestMap,
      lastSeenAutoclaimDigestMap,
      setLastSeenAutoclaimDigest,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}
