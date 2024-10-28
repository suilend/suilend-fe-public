import { PropsWithChildren, createContext, useContext, useMemo } from "react";

import { useLocalStorage } from "usehooks-ts";

interface SettingsContext {
  gasBudget: string;
  setGasBudget: (value: string) => void;
}

const defaultContextValue: SettingsContext = {
  gasBudget: "",
  setGasBudget: () => {
    throw Error("SettingsContextProvider not initialized");
  },
};

const SettingsContext = createContext<SettingsContext>(defaultContextValue);

export const useSettingsContext = () => useContext(SettingsContext);

export function SettingsContextProvider({ children }: PropsWithChildren) {
  // Gas budget
  const [gasBudget, setGasBudget] = useLocalStorage<string>(
    "gasBudget",
    defaultContextValue.gasBudget,
  );

  // Context
  const contextValue: SettingsContext = useMemo(
    () => ({
      gasBudget,
      setGasBudget,
    }),
    [gasBudget, setGasBudget],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}
