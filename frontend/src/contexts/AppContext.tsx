import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";

import { CoinBalance, CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import { isEqual } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import {
  RewardMap,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { SuilendClient } from "@suilend/sdk/client";
import { ParsedLendingMarket } from "@suilend/sdk/parsers/lendingMarket";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import useFetchAppData from "@/fetchers/useFetchAppData";
import { ParsedCoinBalance } from "@/lib/coinBalance";

export interface AppData {
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

export interface AppContext {
  suilendClient: SuilendClient | null;
  data: AppData | null;
  refreshData: () => Promise<void>;

  obligation: ParsedObligation | null;
  setObligationId: Dispatch<SetStateAction<string | null>>;
}

const defaultContextValue: AppContext = {
  suilendClient: null,
  data: null,
  refreshData: async () => {
    throw Error("AppContextProvider not initialized");
  },

  obligation: null,
  setObligationId: () => {
    throw Error("AppContextProvider not initialized");
  },
};

const AppContext = createContext<AppContext>(defaultContextValue);

export const useAppContext = () => useContext(AppContext);

export function AppContextProvider({ children }: PropsWithChildren) {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();

  // Suilend client & app data
  const { data, mutate: mutateData, suilendClient } = useFetchAppData(address);

  const refreshData = useCallback(async () => {
    await mutateData();
  }, [mutateData]);

  // Obligation
  const [obligationId, setObligationId] = useLocalStorage<string | null>(
    "obligationId",
    null,
  );

  // Poll for balance changes
  // const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const previousBalancesRef = useRef<CoinBalance[] | undefined>(undefined);
  useEffect(() => {
    // if (unsubscribeRef.current !== undefined) {
    //   unsubscribeRef.current();
    //   unsubscribeRef.current = undefined;
    // }
    previousBalancesRef.current = undefined;

    if (!address) return;
    if (!suiClient) return;

    // suiClient
    //   .subscribeTransaction({
    //     filter: {
    //       FromAddress: address,
    //     },
    //     onMessage: async (event: TransactionEffects) => {
    //       await refreshData();
    //     },
    //   })
    //   .then((unsubscribe) => {
    //     unsubscribeRef.current = unsubscribe;
    //   });

    const interval = setInterval(async () => {
      try {
        const balances = await suiClient.getAllBalances({
          owner: address,
        });

        if (
          previousBalancesRef.current !== undefined &&
          !isEqual(balances, previousBalancesRef.current)
        )
          await refreshData();
        previousBalancesRef.current = balances;
      } catch (err) {
        console.error(err);
      }
    }, 1000 * 5);

    return () => {
      // if (unsubscribeRef.current !== undefined) {
      //   unsubscribeRef.current();
      //   unsubscribeRef.current = undefined;
      // }
      if (interval !== undefined) clearInterval(interval);
    };
  }, [address, suiClient, refreshData]);

  // Context
  const contextValue: AppContext = useMemo(
    () => ({
      suilendClient,
      data: data ?? null,
      refreshData,

      obligation:
        data?.obligations?.find(
          (obligation) => obligation.id === obligationId,
        ) ??
        data?.obligations?.[0] ??
        null,
      setObligationId,
    }),
    [suilendClient, data, refreshData, obligationId, setObligationId],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
