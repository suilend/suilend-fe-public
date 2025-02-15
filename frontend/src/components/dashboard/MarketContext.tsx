import { PropsWithChildren, createContext, useContext, useMemo } from "react";

import { AppData } from "@/contexts/AppContext";

interface MarketContext {
  appData: AppData;
}

const defaultContextValue: MarketContext = {
  appData: {} as AppData,
};

const MarketContext = createContext<MarketContext>(defaultContextValue);

export const useMarketContext = () => useContext(MarketContext);

interface MarketContextProviderProps extends PropsWithChildren {
  appData: AppData;
}

export function MarketContextProvider({
  appData,
  children,
}: MarketContextProviderProps) {
  // Context
  const contextValue: MarketContext = useMemo(
    () => ({
      appData,
    }),
    [appData],
  );

  return (
    <MarketContext.Provider value={contextValue}>
      {children}
    </MarketContext.Provider>
  );
}
