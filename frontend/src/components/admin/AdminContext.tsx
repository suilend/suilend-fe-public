import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { API_URL } from "@suilend/frontend-sui";

import { AppData, useLoadedAppContext } from "@/contexts/AppContext";

interface AdminContext {
  appData: AppData;
  setSelectedLendingMarketId: Dispatch<SetStateAction<string>>;

  steammPoolInfos: any[] | undefined;
}

const defaultContextValue: AdminContext = {
  appData: {} as AppData,
  setSelectedLendingMarketId: () => {
    throw Error("AdminContextProvider not initialized");
  },

  steammPoolInfos: undefined,
};

const AdminContext = createContext<AdminContext>(defaultContextValue);

export const useAdminContext = () => useContext(AdminContext);

export function AdminContextProvider({ children }: PropsWithChildren) {
  const { allAppData } = useLoadedAppContext();

  // Lending market
  const [selectedLendingMarketId, setSelectedLendingMarketId] =
    useState<string>("");

  const appData = useMemo(
    () =>
      allAppData.allLendingMarketData[selectedLendingMarketId] ??
      Object.values(allAppData.allLendingMarketData)[0],
    [allAppData.allLendingMarketData, selectedLendingMarketId],
  );

  // STEAMM pools
  const [steammPoolInfos, setSteammPoolInfos] = useState<any[] | undefined>(
    undefined,
  );

  useEffect(() => {
    (async () => {
      try {
        const poolsRes = await fetch(`${API_URL}/steamm/pools/all`);
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
      setSelectedLendingMarketId,

      steammPoolInfos,
    }),
    [appData, setSelectedLendingMarketId, steammPoolInfos],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
