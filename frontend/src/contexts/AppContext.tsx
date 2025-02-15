import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import useFetchLstAprPercentMap from "@/fetchers/useFetchLstAprPercentMap";

export interface AppData {
  suilendClient: SuilendClient;
  lendingMarketOwnerCapId: string | undefined;

  lendingMarket: ParsedLendingMarket;
  coinMetadataMap: Record<string, CoinMetadata>;

  refreshedRawReserves: Reserve<string>[];
  reserveMap: Record<string, ParsedReserve>;
  filteredReserves: ParsedReserve[];
  reserveCoinTypes: string[];
  reserveCoinMetadataMap: Record<string, CoinMetadata>;

  rewardPriceMap: Record<string, BigNumber | undefined>;
  rewardCoinTypes: string[];
  activeRewardCoinTypes: string[];
  rewardCoinMetadataMap: Record<string, CoinMetadata>;
}
export type LstAprPercentMap = Record<string, BigNumber>;

interface AppContext {
  allAppData: AppData[] | undefined;
  refreshAllAppData: () => Promise<void>;
  lstAprPercentMap: LstAprPercentMap | undefined;

  appData: AppData | undefined;
  // mainMarketAppData: AppData | undefined;
  // setSelectedLendingMarketId: Dispatch<SetStateAction<string>>;
}
type LoadedAppContext = AppContext & {
  allAppData: AppData[];
  lstAprPercentMap: LstAprPercentMap;

  appData: AppData;
  // mainMarketAppData: AppData;
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },
  lstAprPercentMap: undefined,

  appData: undefined,
  // mainMarketAppData: undefined,
  // setSelectedLendingMarketId: () => {
  //   throw Error("AppContextProvider not initialized");
  // },
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  // All app data
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  // LST APRs
  const { data: lstAprPercentMap } = useFetchLstAprPercentMap();

  // Lending market
  // const [selectedLendingMarketId, setSelectedLendingMarketId] =
  //   useLocalStorage<string>("selectedLendingMarketId", "");

  // const appData = useMemo(
  //   () =>
  //     allAppData?.find((a) => a.lendingMarket.id === selectedLendingMarketId) ??
  //     allAppData?.[0],
  //   [allAppData, selectedLendingMarketId],
  // );
  const appData = useMemo(() => allAppData?.[0], [allAppData]);

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      allAppData,
      refreshAllAppData,
      lstAprPercentMap,

      appData,
      // mainMarketAppData,
      // setSelectedLendingMarketId,
    }),
    [
      allAppData,
      refreshAllAppData,
      lstAprPercentMap,
      appData,
      // mainMarketAppData,
      // setSelectedLendingMarketId,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
