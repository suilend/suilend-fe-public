import { useRouter } from "next/router";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import { shallowPushQuery } from "@suilend/frontend-sui-next";
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

export interface UserData {
  obligationOwnerCaps: ObligationOwnerCap<string>[];
  obligations: ParsedObligation[];
  rewardMap: RewardMap;
}

interface UserContext {
  rawBalancesMap: Record<string, BigNumber> | undefined;
  balancesCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  getBalance: (coinType: string) => BigNumber;

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
  }, [refreshAllAppData, mutateAllUserData, refreshRawBalancesMap]);

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
