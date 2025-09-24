import { PropsWithChildren, createContext, useContext, useMemo } from "react";

import { ParsedObligation } from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";

import { AppData } from "@/contexts/AppContext";
import { UserData } from "@/contexts/UserContext";

interface LendingMarketContext {
  appData: AppData;

  userData: UserData;
  obligation: ParsedObligation | undefined;
  obligationOwnerCap: ObligationOwnerCap<string> | undefined;
}

const defaultContextValue: LendingMarketContext = {
  appData: {} as AppData,

  userData: {} as UserData,
  obligation: undefined,
  obligationOwnerCap: undefined,
};

const LendingMarketContext =
  createContext<LendingMarketContext>(defaultContextValue);

export const useLendingMarketContext = () => useContext(LendingMarketContext);

interface LendingMarketContextProviderProps extends PropsWithChildren {
  appData: AppData;

  userData: UserData;
  obligation: ParsedObligation | undefined;
  obligationOwnerCap: ObligationOwnerCap<string> | undefined;
}

export function LendingMarketContextProvider({
  appData,
  userData,
  obligation,
  obligationOwnerCap,
  children,
}: LendingMarketContextProviderProps) {
  // Context
  const contextValue: LendingMarketContext = useMemo(
    () => ({
      appData,

      userData,
      obligation,
      obligationOwnerCap,
    }),
    [appData, userData, obligation, obligationOwnerCap],
  );

  return (
    <LendingMarketContext.Provider value={contextValue}>
      {children}
    </LendingMarketContext.Provider>
  );
}
