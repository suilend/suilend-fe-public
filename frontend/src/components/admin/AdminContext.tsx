import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
} from "react";

import { useLocalStorage } from "usehooks-ts";

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
    useLocalStorage<string>("admin_selectedLendingMarketId", "");

  const appData = useMemo(
    () => allAppData[selectedLendingMarketId] ?? Object.values(allAppData)[0],
    [allAppData, selectedLendingMarketId],
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
