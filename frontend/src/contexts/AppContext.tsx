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
import BigNumber from "bignumber.js";

import {
  NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_yapSUI_COINTYPE,
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
import useFetchLstData from "@/fetchers/useFetchLstData";
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
export interface LstData {
  lstCoinTypes: string[];
  aprPercentMap: Record<string, BigNumber>;
}

interface AppContext {
  allAppData: Record<string, AppData> | undefined;
  filteredReservesMap: Record<string, ParsedReserve[]> | undefined;
  refreshAllAppData: () => Promise<void>;

  appData: AppData | undefined;
  filteredReserves: ParsedReserve[] | undefined;

  lstData: LstData | undefined;
  isLst: (coinType: string) => boolean;
  isEcosystemLst: (coinType: string) => boolean;

  walrusEpoch: number | undefined;
  walrusEpochProgressPercent: number | undefined;
}
type LoadedAppContext = AppContext & {
  allAppData: Record<string, AppData>;
  filteredReservesMap: Record<string, ParsedReserve[]>;

  appData: AppData;
  filteredReserves: ParsedReserve[];

  lstData: LstData;
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  filteredReservesMap: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  appData: undefined,
  filteredReserves: undefined,

  lstData: undefined,
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

  // Lending markets
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  const appData = useMemo(
    () =>
      Object.values(allAppData ?? {}).find(
        (_appData) =>
          _appData.lendingMarket.slug ===
          queryParams[QueryParams.LENDING_MARKET],
      ) ?? Object.values(allAppData ?? {})[0],
    [queryParams, allAppData],
  );

  // Filtered reserves
  const filteredReservesMap = useMemo(() => {
    if (!allAppData) return undefined;

    const result: Record<string, ParsedReserve[]> = {};
    for (const _appData of Object.values(allAppData)) {
      const filteredReserves = _appData.lendingMarket.reserves
        .filter((reserve) =>
          !isInMsafeApp()
            ? true
            : !NON_SPONSORED_PYTH_PRICE_FEED_COINTYPES.includes(
                reserve.coinType,
              ),
        )
        .filter((reserve) => {
          return (
            (reserve.coinType === NORMALIZED_yapSUI_COINTYPE &&
              Date.now() >= 1739966400000) || // 2024-02-19 12:00:00 UTC
            (reserve.depositedAmount.gt(0) &&
              reserve.config.depositLimit.eq(0)) || // Always show deprecated reserves
            reserve.config.depositLimit.gt(0) ||
            address === ADMIN_ADDRESS
          );
        });

      result[_appData.lendingMarket.id] = filteredReserves;
    }

    return result;
  }, [allAppData, address]);

  const filteredReserves = useMemo(
    () =>
      appData?.lendingMarket.id
        ? filteredReservesMap?.[appData.lendingMarket.id]
        : undefined,
    [appData?.lendingMarket.id, filteredReservesMap],
  );

  // LST
  const { data: lstData } = useFetchLstData();

  const isLst = useCallback(
    (coinType: string) => lstData?.lstCoinTypes.includes(coinType) ?? false,
    [lstData],
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
      filteredReservesMap,
      refreshAllAppData,

      appData,
      filteredReserves,

      lstData,
      isLst,
      isEcosystemLst,

      walrusEpoch,
      walrusEpochProgressPercent,
    }),
    [
      allAppData,
      filteredReservesMap,
      refreshAllAppData,
      appData,
      filteredReserves,
      lstData,
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
