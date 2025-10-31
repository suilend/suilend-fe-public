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

import { API_URL } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import { AppData, useLoadedAppContext } from "@/contexts/AppContext";
import { UserData, useLoadedUserContext } from "@/contexts/UserContext";

enum QueryParams {
  LENDING_MARKET_ID = "lendingMarketId",
}

interface AdminContext {
  appData: AppData;
  featuredReserveIds: string[];
  deprecatedReserveIds: string[];

  userData: UserData;
  setSelectedLendingMarketId: (lendingMarketId: string) => void;

  steammPoolInfos: any[] | undefined;
}

const defaultContextValue: AdminContext = {
  appData: {} as AppData,
  featuredReserveIds: [],
  deprecatedReserveIds: [],

  userData: {} as UserData,
  setSelectedLendingMarketId: () => {
    throw Error("AdminContextProvider not initialized");
  },

  steammPoolInfos: undefined,
};

const AdminContext = createContext<AdminContext>(defaultContextValue);

export const useAdminContext = () => useContext(AdminContext);

export function AdminContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.LENDING_MARKET_ID]: router.query[
        QueryParams.LENDING_MARKET_ID
      ] as string,
    }),
    [router.query],
  );

  const { allAppData, featuredReserveIds, deprecatedReserveIds } =
    useLoadedAppContext();
  const { allUserData } = useLoadedUserContext();

  // Lending market
  const [selectedLendingMarketId, setSelectedLendingMarketId] =
    useState<string>(queryParams[QueryParams.LENDING_MARKET_ID] ?? "");

  const onSelectedLendingMarketIdChange = useCallback(
    (lendingMarketId: string) => {
      setSelectedLendingMarketId(lendingMarketId);

      shallowPushQuery(router, {
        ...router.query,
        [QueryParams.LENDING_MARKET_ID]: lendingMarketId,
      });
    },
    [router],
  );

  const appData = useMemo(
    () =>
      allAppData.allLendingMarketData[selectedLendingMarketId] ??
      Object.values(allAppData.allLendingMarketData)[0],
    [allAppData.allLendingMarketData, selectedLendingMarketId],
  );
  const userData = useMemo(
    () =>
      allUserData[selectedLendingMarketId] ??
      allUserData[Object.keys(allUserData)[0]],
    [allUserData, selectedLendingMarketId],
  );

  // STEAMM pools
  const [steammPoolInfos, setSteammPoolInfos] = useState<any[] | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      try {
        const poolsUrl = `${API_URL}/steamm/pools/all`;
        const poolsRes = await fetch(poolsUrl);
        const poolsJson: any[] = await poolsRes.json();
        if ((poolsJson as any)?.statusCode === 500)
          throw new Error("Failed to fetch pools");

        setSteammPoolInfos(poolsJson.map((poolObj) => poolObj.poolInfo));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Context
  const contextValue: AdminContext = useMemo(
    () => ({
      appData,
      featuredReserveIds: (featuredReserveIds ?? []).filter((id) =>
        appData.lendingMarket.reserves.some((reserve) => reserve.id === id),
      ),
      deprecatedReserveIds: (deprecatedReserveIds ?? []).filter((id) =>
        appData.lendingMarket.reserves.some((reserve) => reserve.id === id),
      ),

      userData,
      setSelectedLendingMarketId: onSelectedLendingMarketIdChange,

      steammPoolInfos,
    }),
    [
      appData,
      featuredReserveIds,
      deprecatedReserveIds,
      userData,
      onSelectedLendingMarketIdChange,
      steammPoolInfos,
    ],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
