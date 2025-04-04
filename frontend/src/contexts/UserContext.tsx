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
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import { NORMALIZED_WAL_COINTYPE } from "@suilend/frontend-sui";
import {
  shallowPushQuery,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import useFetchBalances from "@suilend/frontend-sui-next/fetchers/useFetchBalances";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";
import useRefreshOnBalancesChange from "@suilend/frontend-sui-next/hooks/useRefreshOnBalancesChange";
import { ParsedObligation, RewardMap } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";

import {
  QueryParams as AppContextQueryParams,
  useAppContext,
} from "@/contexts/AppContext";
import useFetchUserData from "@/fetchers/useFetchUserData";
import { getOwnedObjectsOfType } from "@/lib/transactions";
import { STAKED_WAL_TYPE, StakedWalObject, StakedWalState } from "@/lib/walrus";

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
});

export const useUserContext = () => useContext(UserContext);
export const useLoadedUserContext = () => useUserContext() as LoadedUserContext;

export function UserContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();

  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { appData, refreshAllAppData } = useAppContext();

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
        const objs = await getOwnedObjectsOfType(
          suiClient,
          _address,
          STAKED_WAL_TYPE,
        );

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
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}
