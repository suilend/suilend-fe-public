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

import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { useFlags } from "launchdarkly-react-client-sdk";

import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { NORMALIZED_sSUI_COINTYPE, Token } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";
import useLedgerHashDialog from "@suilend/sui-fe-next/hooks/useLedgerHashDialog";

import LedgerHashDialog from "@/components/shared/LedgerHashDialog";
import useFetchAppData from "@/fetchers/useFetchAppData";
import { isInvalidIconUrl } from "@/lib/tokens";
import { WALRUS_INNER_STAKING_OBJECT_ID } from "@/lib/walrus";

enum QueryParams {
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
  lstMap: Record<
    string,
    {
      lstToSuiExchangeRate: BigNumber;
      aprPercent: BigNumber;
    }
  >;
  okxAprPercentMap: {
    xBtcDepositAprPercent: BigNumber;
  };
}

interface AppContext {
  allAppData: AllAppData | undefined;
  featuredReserveIds: string[] | undefined;
  deprecatedReserveIds: string[] | undefined;
  refreshAllAppData: () => Promise<void>;

  isLst: (coinType: string) => boolean;
  isEcosystemLst: (coinType: string) => boolean;

  walrusEpoch: number | undefined;
  walrusEpochProgressPercent: number | undefined;

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

  walrusEpoch: undefined,
  walrusEpochProgressPercent: undefined,

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
      Object.keys(allAppData?.lstMap ?? {}).includes(coinType) ?? false,
    [allAppData?.lstMap],
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

      walrusEpoch,
      walrusEpochProgressPercent,

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
      walrusEpoch,
      walrusEpochProgressPercent,
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
