import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { CoinBalance, CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { useLocalStorage } from "usehooks-ts";

import { RewardMap, useWalletContext } from "@suilend/frontend-sui";
import useRefreshOnBalancesChange from "@suilend/frontend-sui/hooks/useRefreshOnBalancesChange";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import { ParsedCoinBalance } from "@/lib/coinBalance";

export interface AppData {
  suilendClient: SuilendClient;

  lendingMarket: ParsedLendingMarket;
  lendingMarketOwnerCapId: string | undefined;
  reserveMap: Record<string, ParsedReserve>;
  obligationOwnerCaps: ObligationOwnerCap<string>[] | undefined;
  obligations: ParsedObligation[] | undefined;
  coinBalancesMap: Record<string, ParsedCoinBalance>;
  coinMetadataMap: Record<string, CoinMetadata>;
  rewardMap: RewardMap;
  coinBalancesRaw: CoinBalance[];

  lstAprPercentMap: Record<string, BigNumber>;
}

interface AppContext {
  suilendClient: SuilendClient | undefined;
  data: AppData | undefined;
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

  // Refresh
  const refresh = useCallback(async () => {
    await mutateAppData();
  }, [mutateAppData]);

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
      refresh,

      obligation,
      obligationOwnerCap,
      setObligationId,
    }),
    [appData, refresh, obligation, obligationOwnerCap, setObligationId],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
