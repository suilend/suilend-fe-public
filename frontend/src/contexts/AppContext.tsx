import { useRouter } from "next/router";
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { useFlags } from "launchdarkly-react-client-sdk";

import {
  NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES,
  NORMALIZED_KOBAN_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { ADMIN_ADDRESS, SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import { WALRUS_INNER_STAKING_OBJECT_ID } from "@/lib/walrus";

export enum QueryParams {
  LENDING_MARKET = "market",
}

export interface AppData {
  suilendClient: SuilendClient;

  lendingMarket: ParsedLendingMarket;
  coinMetadataMap: Record<string, CoinMetadata>;

  refreshedRawReserves: Reserve<string>[];
  reserveMap: Record<string, ParsedReserve>;
  reserveCoinTypes: string[];
  reserveCoinMetadataMap: Record<string, CoinMetadata>;

  rewardPriceMap: Record<string, BigNumber | undefined>;
  rewardCoinTypes: string[];
  activeRewardCoinTypes: string[];
  rewardCoinMetadataMap: Record<string, CoinMetadata>;
}
export interface AllAppData {
  allLendingMarketData: Record<string, AppData>;
  lstAprPercentMap: Record<string, BigNumber>;
}

interface AppContext {
  allAppData: AllAppData | undefined;
  deprecatedReserveIds: string[] | undefined;
  filteredReservesMap: Record<string, ParsedReserve[]> | undefined;
  refreshAllAppData: () => Promise<void>;

  appData: AppData | undefined;
  filteredReserves: ParsedReserve[] | undefined;

  isLst: (coinType: string) => boolean;
  isEcosystemLst: (coinType: string) => boolean;

  walrusEpoch: number | undefined;
  walrusEpochProgressPercent: number | undefined;
}
type LoadedAppContext = AppContext & {
  allAppData: AllAppData;
  filteredReservesMap: Record<string, ParsedReserve[]>;

  appData: AppData;
  filteredReserves: ParsedReserve[];
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  deprecatedReserveIds: undefined,
  filteredReservesMap: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  appData: undefined,
  filteredReserves: undefined,

  isLst: () => {
    throw Error("AppContextProvider not initialized");
  },
  isEcosystemLst: () => {
    throw Error("AppContextProvider not initialized");
  },

  walrusEpoch: undefined,
  walrusEpochProgressPercent: undefined,
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = useCallback(
    () => ({
      [QueryParams.LENDING_MARKET]: router.query[QueryParams.LENDING_MARKET] as
        | string
        | undefined,
    }),
    [router.query],
  )();

  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  // All app data
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  const appData = useMemo(
    () =>
      Object.values(allAppData?.allLendingMarketData ?? {}).find(
        (_appData) =>
          _appData.lendingMarket.slug ===
          queryParams[QueryParams.LENDING_MARKET],
      ) ?? Object.values(allAppData?.allLendingMarketData ?? {})[0],
    [queryParams, allAppData?.allLendingMarketData],
  );

  // Deprecated reserves
  const flags = useFlags();
  const deprecatedReserveIds: string[] | undefined = useMemo(
    () => flags?.suilendDeprecatedReserveIds,
    [flags?.suilendDeprecatedReserveIds],
  );

  // Filtered reserves
  const filteredReservesMap = useMemo(() => {
    if (!allAppData) return undefined;

    const result: Record<string, ParsedReserve[]> = {};
    for (const _appData of Object.values(allAppData.allLendingMarketData)) {
      const filteredReserves = _appData.lendingMarket.reserves
        .filter((reserve) =>
          !isInMsafeApp()
            ? true
            : !NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES.includes(
                reserve.coinType,
              ),
        )
        .filter((reserve) =>
          reserve.coinType === NORMALIZED_KOBAN_COINTYPE
            ? Date.now() >= 1747234800000 || // 2025-05-14 15:00:00 UTC
              address === ADMIN_ADDRESS
            : true,
        )
        .filter((reserve) => {
          return (
            deprecatedReserveIds?.includes(reserve.id) || // Show deprecated reserves
            !(
              reserve.config.depositLimit.eq(0) &&
              reserve.depositedAmountUsd.lt(1000)
            ) || // Show reserves with depositLimit > 0 OR depositedAmountUsd >= 1000
            address === ADMIN_ADDRESS
          );
        });

      result[_appData.lendingMarket.id] = filteredReserves;
    }

    return result;
  }, [allAppData, deprecatedReserveIds, address]);

  const filteredReserves = useMemo(
    () =>
      appData?.lendingMarket.id
        ? filteredReservesMap?.[appData.lendingMarket.id]
        : undefined,
    [appData?.lendingMarket.id, filteredReservesMap],
  );

  // LST
  const isLst = useCallback(
    (coinType: string) =>
      Object.keys(allAppData?.lstAprPercentMap ?? {}).includes(coinType) ??
      false,
    [allAppData?.lstAprPercentMap],
  );
  const isEcosystemLst = useCallback(
    (coinType: string) =>
      isLst(coinType) && coinType !== NORMALIZED_sSUI_COINTYPE,
    [isLst],
  );

  // Walrus
  const [walrusEpoch, setWalrusEpoch] = useState<number | undefined>(undefined);
  const [walrusEpochProgressPercent, setWalrusEpochProgressPercent] = useState<
    number | undefined
  >(undefined);
  useEffect(() => {
    (async () => {
      try {
        const obj = await suiClient.getObject({
          id: WALRUS_INNER_STAKING_OBJECT_ID,
          options: {
            showContent: true,
          },
        });

        const { epoch, epoch_duration, first_epoch_start } = (
          obj.data?.content as any
        ).fields.value.fields;

        setWalrusEpoch(epoch);
        setWalrusEpochProgressPercent(
          ((Date.now() - (+first_epoch_start + (epoch - 1) * +epoch_duration)) /
            +epoch_duration) *
            100,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }, [suiClient]);

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      allAppData,
      deprecatedReserveIds,
      filteredReservesMap,
      refreshAllAppData,

      appData,
      filteredReserves,

      isLst,
      isEcosystemLst,

      walrusEpoch,
      walrusEpochProgressPercent,
    }),
    [
      allAppData,
      deprecatedReserveIds,
      filteredReservesMap,
      refreshAllAppData,
      appData,
      filteredReserves,
      isLst,
      isEcosystemLst,
      walrusEpoch,
      walrusEpochProgressPercent,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
