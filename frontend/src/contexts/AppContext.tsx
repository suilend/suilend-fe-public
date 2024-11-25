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

import { RewardMap, useWalletContext } from "@suilend/frontend-sui";
import useFetchBalances from "@suilend/frontend-sui/fetchers/useFetchBalances";
import useCoinMetadataMap from "@suilend/frontend-sui/hooks/useCoinMetadataMap";
import useRefreshOnBalancesChange from "@suilend/frontend-sui/hooks/useRefreshOnBalancesChange";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";

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

  lstAprPercentMap: Record<string, BigNumber>;
}

interface AppContext {
  suilendClient: SuilendClient | undefined;
  data: AppData | undefined;
  balancesCoinMetadataMap: Record<string, CoinMetadata> | undefined;
  getBalance: (coinType: string) => BigNumber;
  refresh: () => Promise<void>;

  obligation: ParsedObligation | undefined;
  obligationOwnerCap: ObligationOwnerCap<string> | undefined;
  setObligationId: (obligationId: string) => void;
}
type LoadedAppContext = AppContext & {
  suilendClient: SuilendClient;
  data: AppData;
};

const AppContext = createContext<AppContext>({
  suilendClient: undefined,
  data: undefined,
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
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  const { address } = useWalletContext();

  // App data
  const { data: appData, mutateData: mutateAppData } = useFetchAppData(address);

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

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      suilendClient: appData?.suilendClient,
      data: appData,
      balancesCoinMetadataMap,
      getBalance,
      refresh,

      obligation,
      obligationOwnerCap,
      setObligationId,
    }),
    [
      appData,
      balancesCoinMetadataMap,
      getBalance,
      refresh,
      obligation,
      obligationOwnerCap,
      setObligationId,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
