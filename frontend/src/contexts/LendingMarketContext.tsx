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

import { ParsedObligation } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";

import { AppData, useLoadedAppContext } from "@/contexts/AppContext";
import { UserData, useLoadedUserContext } from "@/contexts/UserContext";

interface LendingMarketContext {
  appData: AppData;
  isFeatured: boolean;
  featuredReserveIds: string[];
  isDeprecated: boolean;
  deprecatedReserveIds: string[];

  userData: UserData;
  obligation: ParsedObligation | undefined;
  obligationOwnerCap: ObligationOwnerCap<string> | undefined;

  isShowingAutoclaimNotification: boolean;
  dismissAutoclaimNotification: () => void;
}

const defaultContextValue: LendingMarketContext = {
  appData: {} as AppData,
  isFeatured: false,
  featuredReserveIds: [],
  isDeprecated: false,
  deprecatedReserveIds: [],

  userData: {} as UserData,
  obligation: undefined,
  obligationOwnerCap: undefined,

  isShowingAutoclaimNotification: false,
  dismissAutoclaimNotification: () => {
    throw Error("LendingMarketContextProvider not initialized");
  },
};

const LendingMarketContext =
  createContext<LendingMarketContext>(defaultContextValue);

export const useLendingMarketContext = () => useContext(LendingMarketContext);

interface LendingMarketContextProviderProps extends PropsWithChildren {
  lendingMarketId: string;
}

export function LendingMarketContextProvider({
  lendingMarketId,
  children,
}: LendingMarketContextProviderProps) {
  const {
    allAppData,
    featuredLendingMarketIds,
    featuredReserveIds,
    deprecatedLendingMarketIds,
    deprecatedReserveIds,
  } = useLoadedAppContext();
  const appData = allAppData.allLendingMarketData[lendingMarketId];
  const {
    allUserData,
    obligationMap,
    obligationOwnerCapMap,
    latestAutoclaimDigestMap,
    lastSeenAutoclaimDigestMap,
    setLastSeenAutoclaimDigest,
  } = useLoadedUserContext();
  const userData = allUserData[lendingMarketId];
  const obligation = obligationMap[lendingMarketId];
  const obligationOwnerCap = obligationOwnerCapMap[lendingMarketId];

  // Autoclaim
  const [isShowingAutoclaimNotification, setIsShowingAutoclaimNotification] =
    useState<boolean>(defaultContextValue.isShowingAutoclaimNotification);

  const dismissAutoclaimNotification = useCallback(
    () => setIsShowingAutoclaimNotification(false),
    [],
  );

  const didShowAutoclaimNotificationMap = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!obligation?.id) return;

    const lastSeenAutoclaimDigest = lastSeenAutoclaimDigestMap[obligation.id];
    const latestAutoclaimDigest = latestAutoclaimDigestMap[obligation.id];
    if (
      latestAutoclaimDigest === undefined ||
      lastSeenAutoclaimDigest === latestAutoclaimDigest
    )
      return;

    if (didShowAutoclaimNotificationMap.current[obligation.id]) return;
    didShowAutoclaimNotificationMap.current[obligation.id] = true;

    setIsShowingAutoclaimNotification(true);
    setLastSeenAutoclaimDigest(obligation.id, latestAutoclaimDigest);
  }, [
    obligation?.id,
    lastSeenAutoclaimDigestMap,
    latestAutoclaimDigestMap,
    setLastSeenAutoclaimDigest,
  ]);

  // Context
  const contextValue: LendingMarketContext = useMemo(
    () => ({
      appData,
      isFeatured: (featuredLendingMarketIds ?? []).includes(
        appData.lendingMarket.id,
      ),
      featuredReserveIds: (featuredReserveIds ?? []).filter((id) =>
        appData.lendingMarket.reserves.some((reserve) => reserve.id === id),
      ),
      isDeprecated: (deprecatedLendingMarketIds ?? []).includes(
        appData.lendingMarket.id,
      ),
      deprecatedReserveIds: (deprecatedReserveIds ?? []).filter((id) =>
        appData.lendingMarket.reserves.some((reserve) => reserve.id === id),
      ),

      userData,
      obligation,
      obligationOwnerCap,

      isShowingAutoclaimNotification,
      dismissAutoclaimNotification,
    }),
    [
      appData,
      featuredLendingMarketIds,
      featuredReserveIds,
      deprecatedLendingMarketIds,
      deprecatedReserveIds,
      userData,
      obligation,
      obligationOwnerCap,
      isShowingAutoclaimNotification,
      dismissAutoclaimNotification,
    ],
  );

  return (
    <LendingMarketContext.Provider value={contextValue}>
      {children}
    </LendingMarketContext.Provider>
  );
}
