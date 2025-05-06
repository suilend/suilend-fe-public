import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { AppData, useLoadedAppContext } from "@/contexts/AppContext";

interface AdminContext {
  appData: AppData;
  setSelectedLendingMarketId: Dispatch<SetStateAction<string>>;
}

const defaultContextValue: AdminContext = {
  appData: {} as AppData,
  setSelectedLendingMarketId: () => {
    throw Error("AdminContextProvider not initialized");
  },
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

  // Context
  const contextValue: AdminContext = useMemo(
    () => ({
      appData,
      setSelectedLendingMarketId,
    }),
    [appData, setSelectedLendingMarketId],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
