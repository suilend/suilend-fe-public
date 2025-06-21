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

import { LENDING_MARKETS, ParsedObligation, RewardMap } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { NORMALIZED_WAL_COINTYPE, getAllOwnedObjects } from "@suilend/sui-fe";
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
import { STAKED_WAL_TYPE, StakedWalObject, StakedWalState } from "@/lib/walrus";

const MAX_REWARDS_PER_TRANSACTION = 5;

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
  userData: UserData | undefined; // Depends on allUserData

  refresh: () => void; // Refreshes allAppData, balances, and allUserData

  obligation: ParsedObligation | undefined; // Depends on userData
  obligationOwnerCap: ObligationOwnerCap<string> | undefined; // Depends on userData
  setObligationId: (lendingMarketSlug: string, obligationId: string) => void;

  autoclaimRewards: (
    transaction: Transaction,
  ) => Promise<{ transaction: Transaction; onSuccess: () => void }>;
}
type LoadedUserContext = UserContext & {
  allUserData: Record<string, UserData>;
  userData: UserData;
};

const UserContext = createContext<UserContext>({
  rawBalancesMap: undefined,
  balancesCoinMetadataMap: undefined,
  getBalance: () => {
    throw Error("UserContextProvider not initialized");
  },
  ownedStakedWalObjects: undefined,

  allUserData: undefined,
  userData: undefined,

  refresh: () => {
    throw Error("UserContextProvider not initialized");
  },

  obligation: undefined,
  obligationOwnerCap: undefined,
  setObligationId: () => {
    throw Error("UserContextProvider not initialized");
  },

  autoclaimRewards: async () => {
    throw Error("UserContextProvider not initialized");
  },
});

export const useUserContext = () => useContext(UserContext);
export const useLoadedUserContext = () => useUserContext() as LoadedUserContext;

export function UserContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  const { suiClient } = useSettingsContext();
  const { address, dryRunTransaction } = useWalletContext();
  const {
    allAppData,
    appData,
    refreshAllAppData,
    obligationsWithUnclaimedRewards,
  } = useAppContext();

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

    if (isFetchingOwnedStakedWalObjectsMapRef.current.includes(address)) return;
    isFetchingOwnedStakedWalObjectsMapRef.current.push(address);

    fetchOwnedStakedWalObjectsMap(address);
  }, [address, fetchOwnedStakedWalObjectsMap]);

  const ownedStakedWalObjects = useMemo(() => {
    if (!address || appData === undefined) return undefined;

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
          10 ** appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals,
        ),
        state:
          state.variant === "Staked"
            ? StakedWalState.STAKED
            : StakedWalState.WITHDRAWING,
      });
    }

    return result;
  }, [address, appData, ownedStakedWalObjectsMap]);

  // User data
  const { data: allUserData, mutateData: mutateAllUserData } =
    useFetchUserData();

  const userData = useMemo(
    () =>
      appData?.lendingMarket.id
        ? allUserData?.[appData.lendingMarket.id]
        : undefined,
    [appData?.lendingMarket.id, allUserData],
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
  const [obligationId, setObligationId] = useLocalStorage<string>(
    "obligationId",
    "",
  );

  const obligation = useMemo(
    () =>
      userData?.obligations?.find((o) => o.id === obligationId) ??
      userData?.obligations?.[0],
    [userData?.obligations, obligationId],
  );
  const obligationOwnerCap = useMemo(
    () =>
      userData?.obligationOwnerCaps?.find(
        (o) => o.obligationId === obligation?.id,
      ),
    [userData?.obligationOwnerCaps, obligation?.id],
  );

  // Obligations with unclaimed rewards
  const [autoclaimedRewards, setAutoclaimedRewards] = useState<
    Record<string, number[]>
  >({});

  const autoclaimRewards = useCallback(
    async (transaction: Transaction) => {
      if (!allAppData) throw Error("App data not loaded"); // Should never happen as the page is not rendered if the app data is not loaded
      if (!obligationsWithUnclaimedRewards)
        return { transaction, onSuccess: () => {} }; // Can happen if the data is not loaded yet (unlikely)

      const innerTransaction = Transaction.from(transaction);

      // Prepare
      const suilendClient =
        allAppData.allLendingMarketData[LENDING_MARKETS[0].id].suilendClient;

      const filteredObligationsWithUnclaimedRewards =
        obligationsWithUnclaimedRewards.filter(
          (obligation) =>
            !userData?.obligations.some((o) => o.id === obligation.id),
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

          suilendClient.claimRewardAndDeposit(
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
      if (count === 0)
        return { transaction: innerTransaction, onSuccess: () => {} }; // Skip if no rewards to autoclaim

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
        return { transaction: innerTransaction, onSuccess: () => {} };
      }
    },
    [
      allAppData,
      obligationsWithUnclaimedRewards,
      userData?.obligations,
      autoclaimedRewards,
      dryRunTransaction,
    ],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      ownedStakedWalObjects,

      allUserData,
      userData,

      refresh,

      obligation,
      obligationOwnerCap,
      setObligationId: (lendingMarketSlug: string, obligationId: string) => {
        shallowPushQuery(router, {
          ...router.query,
          [AppContextQueryParams.LENDING_MARKET]: lendingMarketSlug,
        });
        setObligationId(obligationId);
      },

      autoclaimRewards,
    }),
    [
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      ownedStakedWalObjects,
      allUserData,
      userData,
      refresh,
      obligation,
      obligationOwnerCap,
      router,
      setObligationId,
      autoclaimRewards,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}
