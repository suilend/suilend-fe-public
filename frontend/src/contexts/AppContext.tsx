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
import { RewardMap } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import useFetchLstAprPercentMap from "@/fetchers/useFetchLstAprPercentMap";

export interface AppData {
  suilendClient: SuilendClient;

  lendingMarket: ParsedLendingMarket;
  reserveMap: Record<string, ParsedReserve>;
  rewardMap: RewardMap;

  reserveCoinTypes: string[];
  rewardCoinTypes: string[];

  coinMetadataMap: Record<string, CoinMetadata>;
  rewardPriceMap: Record<string, BigNumber | undefined>;

  obligationOwnerCaps: ObligationOwnerCap<string>[] | undefined;
  obligations: ParsedObligation[] | undefined;
  lendingMarketOwnerCapId: string | undefined;
}
export type LstAprPercentMap = Record<string, BigNumber>;

interface AppContext {
  suilendClient: SuilendClient | undefined;
  data: AppData | undefined;
  lstAprPercentMap: LstAprPercentMap | undefined;
  rawBalancesMap: Record<string, BigNumber> | undefined;
  balancesCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  getBalance: (coinType: string) => BigNumber;
  refresh: () => Promise<void>;

  obligation: ParsedObligation | undefined;
  obligationOwnerCap: ObligationOwnerCap<string> | undefined;
  setObligationId: (obligationId: string) => void;

  filteredReserves: ParsedReserve[] | undefined;
}
type LoadedAppContext = AppContext & {
  suilendClient: SuilendClient;
  data: AppData;
  lstAprPercentMap: LstAprPercentMap;

  filteredReserves: ParsedReserve[];
};

const AppContext = createContext<AppContext>({
  suilendClient: undefined,
  data: undefined,
  lstAprPercentMap: undefined,
  rawBalancesMap: undefined,
  balancesCoinMetadataMap: undefined,
  getBalance: () => {
    throw Error("AppContextProvider not initialized");
  },
  refresh: async () => {
    throw Error("AppContextProvider not initialized");
  },

  obligation: undefined,
  obligationOwnerCap: undefined,
  setObligationId: () => {
    throw Error("AppContextProvider not initialized");
  },

  filteredReserves: undefined,
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // App data
  const { data: appData, mutateData: mutateAppData } = useFetchAppData(address);

  // LST APRs
  const { data: lstAprPercentMap } = useFetchLstAprPercentMap();

  // Balances
  const { data: rawBalancesMap, mutateData: mutateRawBalancesMap } =
    useFetchBalances();

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

  // Refresh
  const refresh = useCallback(async () => {
    await mutateAppData();
    await mutateRawBalancesMap();
  }, [mutateAppData, mutateRawBalancesMap]);

  useRefreshOnBalancesChange(refresh);

  // Obligation
  const [obligationId, setObligationId] = useLocalStorage<string>(
    "obligationId",
    "",
  );

  const obligation = useMemo(
    () =>
      appData?.obligations?.find((o) => o.id === obligationId) ??
      appData?.obligations?.[0],
    [appData?.obligations, obligationId],
  );
  const obligationOwnerCap = useMemo(
    () =>
      appData?.obligationOwnerCaps?.find(
        (o) => o.obligationId === obligation?.id,
      ),
    [appData?.obligationOwnerCaps, obligation?.id],
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
            (reserve.coinType === NORMALIZED_upSUI_COINTYPE
              ? Date.now() >= 1734609600000 // 2024-12-19 12:00:00 UTC
              : isDeprecated(reserve.coinType) // Always show deprecated reserves
                ? true
                : reserve.config.depositLimit.gt(0)) ||
            depositedAmount.gt(0) ||
            borrowedAmount.gt(0) ||
            !!appData.lendingMarketOwnerCapId
          );
        }),
    [appData?.lendingMarket, obligation, appData?.lendingMarketOwnerCapId],
  );

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      suilendClient: appData?.suilendClient,
      data: appData,
      lstAprPercentMap,
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      refresh,

      obligation,
      obligationOwnerCap,
      setObligationId,

      filteredReserves,
    }),
    [
      appData,
      lstAprPercentMap,
      rawBalancesMap,
      balancesCoinMetadataMap,
      getBalance,
      refresh,
      obligation,
      obligationOwnerCap,
      setObligationId,
      filteredReserves,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
