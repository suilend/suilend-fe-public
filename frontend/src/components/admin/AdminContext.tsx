import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { LENDING_MARKETS } from "@suilend/sdk";

interface AdminContext {
  selectedLendingMarketId: string;
  setSelectedLendingMarketId: Dispatch<SetStateAction<string>>;
}

const defaultContextValue: AdminContext = {
  selectedLendingMarketId: LENDING_MARKETS[0].id,
  setSelectedLendingMarketId: () => {
    throw Error("AdminContextProvider not initialized");
  },
};

const AdminContext = createContext<AdminContext>(defaultContextValue);

export const useAdminContext = () => useContext(AdminContext);

export function AdminContextProvider({ children }: PropsWithChildren) {
  const [selectedLendingMarketId, setSelectedLendingMarketId] =
    useState<string>(LENDING_MARKETS[0].id);

  // Context
  const contextValue: AdminContext = useMemo(
    () => ({
      selectedLendingMarketId,
      setSelectedLendingMarketId,
    }),
    [selectedLendingMarketId, setSelectedLendingMarketId],
  );

  return (
    <AdminContext.Provider value={contextValue}>
      {children}
    </AdminContext.Provider>
  );
}
