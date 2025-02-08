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

import {
  NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES,
  NORMALIZED_upSUI_COINTYPE,
  isDeprecated,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import useFetchBalances from "@suilend/frontend-sui-next/fetchers/useFetchBalances";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";
import useRefreshOnBalancesChange from "@suilend/frontend-sui-next/hooks/useRefreshOnBalancesChange";
import { ParsedObligation, ParsedReserve, RewardMap } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";

import { useAppContext } from "@/contexts/AppContext";
import useFetchUserData from "@/fetchers/useFetchUserData";

export interface UserData {
  obligationOwnerCaps: ObligationOwnerCap<string>[];
  obligations: ParsedObligation[];
  rewardMap: RewardMap;

  lendingMarketOwnerCapId: string | undefined;
}

interface UserContext {
  rawBalancesMap: Record<string, BigNumber> | undefined;
  balancesCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  getBalance: (coinType: string) => BigNumber;

  userData: UserData | undefined; // Depends on suilendClient, appData

  refresh: () => void; // Refreshes appData, balances, and userData

  obligation: ParsedObligation | undefined; // Depends on userData
  obligationOwnerCap: ObligationOwnerCap<string> | undefined; //Depends on userData
  setObligationId: (obligationId: string) => void;

  filteredReserves: ParsedReserve[] | undefined; // Depends on appData, obligation
}
type LoadedUserContext = UserContext & {
  userData: UserData;

  filteredReserves: ParsedReserve[];
};

const UserContext = createContext<UserContext>({
  rawBalancesMap: undefined,
  balancesCoinMetadataMap: undefined,
  getBalance: () => {
    throw Error("UserContextProvider not initialized");
  },

  userData: undefined,

  refresh: () => {
    throw Error("UserContextProvider not initialized");
  },

  obligation: undefined,
  obligationOwnerCap: undefined,
  setObligationId: () => {
    throw Error("UserContextProvider not initialized");
  },

  filteredReserves: undefined,
});

export const useUserContext = () => useContext(UserContext);
export const useLoadedUserContext = () => useUserContext() as LoadedUserContext;

export function UserContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();
  const { appData, refreshAppData } = useAppContext();

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
  const { data: userData, mutateData: mutateUserData } =
    useFetchUserData(address);

  // Refresh
  const refresh = useCallback(() => {
    (async () => {
      await refreshAppData();
      await mutateUserData();
    })();
    refreshRawBalancesMap();
  }, [refreshAppData, mutateUserData, refreshRawBalancesMap]);

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

  // Filtered reserves
  const filteredReserves = useMemo(
    () =>
      appData?.lendingMarket.reserves
        .filter((reserve) =>
          !isInMsafeApp()
            ? true
            : !NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES.includes(
                reserve.coinType,
              ),
        )
        .filter((reserve) => {
          const depositPosition = obligation?.deposits?.find(
            (d) => d.coinType === reserve.coinType,
          );
          const borrowPosition = obligation?.borrows?.find(
            (b) => b.coinType === reserve.coinType,
          );

          const depositedAmount =
            depositPosition?.depositedAmount ?? new BigNumber(0);
          const borrowedAmount =
            borrowPosition?.borrowedAmount ?? new BigNumber(0);

          return (
            (reserve.coinType === NORMALIZED_upSUI_COINTYPE &&
              Date.now() >= 1734609600000) || // 2024-12-19 12:00:00 UTC
            isDeprecated(reserve.coinType) || // Always show deprecated reserves
            reserve.config.depositLimit.gt(0) ||
            depositedAmount.gt(0) ||
            borrowedAmount.gt(0) ||
            !!userData?.lendingMarketOwnerCapId
          );
        }),
    [appData?.lendingMarket, obligation, userData?.lendingMarketOwnerCapId],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,

      userData,

      refresh,

      obligation,
      obligationOwnerCap,
      setObligationId,

      filteredReserves,
    }),
    [
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      userData,
      refresh,
      obligation,
      obligationOwnerCap,
      setObligationId,
      filteredReserves,
    ],
  );

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}
