import { PropsWithChildren, createContext, useContext, useMemo } from "react";

import { AppData } from "@/contexts/AppContext";

interface MarketCardContext {
  appData: AppData;
}

const defaultContextValue: MarketCardContext = {
  appData: {} as AppData,
};

const MarketCardContext = createContext<MarketCardContext>(defaultContextValue);

export const useMarketCardContext = () => useContext(MarketCardContext);

interface MarketCardContextProviderProps extends PropsWithChildren {
  appData: AppData;
}

export function MarketCardContextProvider({
  appData,
  children,
}: MarketCardContextProviderProps) {
  // Context
  const contextValue: MarketCardContext = useMemo(
    () => ({
      appData,
    }),
    [appData],
  );

  return (
    <MarketCardContext.Provider value={contextValue}>
      {children}
    </MarketCardContext.Provider>
  );
}
