import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { useFlags } from "launchdarkly-react-client-sdk";

import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { NORMALIZED_sSUI_COINTYPE, Token } from "@suilend/sui-fe";
import useLedgerHashDialog from "@suilend/sui-fe-next/hooks/useLedgerHashDialog";

import LedgerHashDialog from "@/components/shared/LedgerHashDialog";
import useFetchAppData from "@/fetchers/useFetchAppData";
import { isInvalidIconUrl } from "@/lib/tokens";

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
  lstStatsMap: Record<
    string,
    {
      lstToSuiExchangeRate: BigNumber;
      aprPercent: BigNumber;
    }
  >;
  okxAprPercentMap:
    | {
        xBtcDepositAprPercent: BigNumber;
        usdcBorrowAprPercent: BigNumber;
      }
    | undefined;
  elixirSdeUsdAprPercent: BigNumber | undefined;
}

interface AppContext {
  allAppData: AllAppData | undefined;
  featuredReserveIds: string[] | undefined;
  deprecatedReserveIds: string[] | undefined;
  refreshAllAppData: () => Promise<void>;

  isLst: (coinType: string) => boolean;
  isEcosystemLst: (coinType: string) => boolean;

  tokenIconImageLoadErrorMap: Record<string, boolean>;
  loadTokenIconImage: (token: Token) => void;

  openLedgerHashDialog: (transaction: Transaction) => Promise<void>;
  closeLedgerHashDialog: () => void;
}
type LoadedAppContext = AppContext & {
  allAppData: AllAppData;
};

const AppContext = createContext<AppContext>({
  allAppData: undefined,
  featuredReserveIds: undefined,
  deprecatedReserveIds: undefined,
  refreshAllAppData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  isLst: () => {
    throw Error("AppContextProvider not initialized");
  },
  isEcosystemLst: () => {
    throw Error("AppContextProvider not initialized");
  },

  tokenIconImageLoadErrorMap: {},
  loadTokenIconImage: () => {
    throw Error("AppContextProvider not initialized");
  },

  openLedgerHashDialog: async () => {
    throw Error("AppContextProvider not initialized");
  },
  closeLedgerHashDialog: () => {
    throw Error("AppContextProvider not initialized");
  },
});

export const useAppContext = () => useContext(AppContext);
export const useLoadedAppContext = () => useAppContext() as LoadedAppContext;

export function AppContextProvider({ children }: PropsWithChildren) {
  // All app data
  const { data: allAppData, mutateData: mutateAllAppData } = useFetchAppData();

  const refreshAllAppData = useCallback(async () => {
    await mutateAllAppData();
  }, [mutateAllAppData]);

  // Featured, deprecated reserves
  const flags = useFlags();
  const featuredReserveIds: string[] | undefined = useMemo(
    () => (flags?.suilendFeaturedReserveIds ?? []).filter(Boolean), // Filter out ""
    [flags?.suilendFeaturedReserveIds],
  );
  const deprecatedReserveIds: string[] | undefined = useMemo(
    () => flags?.suilendDeprecatedReserveIds,
    [flags?.suilendDeprecatedReserveIds],
  );

  // LST
  const isLst = useCallback(
    (coinType: string) =>
      Object.keys(allAppData?.lstStatsMap ?? {}).includes(coinType) ?? false,
    [allAppData?.lstStatsMap],
  );
  const isEcosystemLst = useCallback(
    (coinType: string) =>
      isLst(coinType) && coinType !== NORMALIZED_sSUI_COINTYPE,
    [isLst],
  );

  // Token images
  const [tokenIconImageLoadErrorMap, setTokenIconImageLoadErrorMap] = useState<
    Record<string, boolean>
  >({});

  const loadedTokenIconsRef = useRef<string[]>([]);
  const loadTokenIconImage = useCallback((token: Token) => {
    if (isInvalidIconUrl(token.iconUrl)) return;

    if (loadedTokenIconsRef.current.includes(token.coinType)) return;
    loadedTokenIconsRef.current.push(token.coinType);

    const image = new Image();
    image.src = token.iconUrl!;
    image.onerror = () => {
      console.error(
        `Failed to load iconUrl for ${token.coinType}: ${token.iconUrl}`,
      );
      setTokenIconImageLoadErrorMap((prev) => ({
        ...prev,
        [token.coinType]: true,
      }));
    };
  }, []);

  // Ledger hash
  const {
    ledgerHash,
    isLedgerHashDialogOpen,
    openLedgerHashDialog,
    closeLedgerHashDialog,
  } = useLedgerHashDialog();

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      allAppData,
      featuredReserveIds,
      deprecatedReserveIds,
      refreshAllAppData,

      isLst,
      isEcosystemLst,

      tokenIconImageLoadErrorMap,
      loadTokenIconImage,

      openLedgerHashDialog,
      closeLedgerHashDialog,
    }),
    [
      allAppData,
      featuredReserveIds,
      deprecatedReserveIds,
      refreshAllAppData,
      isLst,
      isEcosystemLst,
      tokenIconImageLoadErrorMap,
      loadTokenIconImage,
      openLedgerHashDialog,
      closeLedgerHashDialog,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>
      <LedgerHashDialog
        isOpen={isLedgerHashDialogOpen}
        onClose={closeLedgerHashDialog}
        ledgerHash={ledgerHash ?? ""}
      />

      {children}
    </AppContext.Provider>
  );
}
