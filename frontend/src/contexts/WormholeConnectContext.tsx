import Script from "next/script";
import {
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

interface WormholeConnectContext {
  isLoading: boolean;
}

const defaultContextValue: WormholeConnectContext = {
  isLoading: true,
};

const WormholeConnectContext =
  createContext<WormholeConnectContext>(defaultContextValue);

export const useWormholeConnectContext = () =>
  useContext(WormholeConnectContext);

export function WormholeConnectContextProvider({
  children,
}: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState<
    WormholeConnectContext["isLoading"]
  >(defaultContextValue.isLoading);

  // Context
  const contextValue: WormholeConnectContext = useMemo(
    () => ({
      isLoading,
    }),
    [isLoading],
  );

  return (
    <WormholeConnectContext.Provider value={contextValue}>
      <Script
        type="module"
        src="https://suilend.fi/wormhole-connect@0.3.22-beta.6-development/main.js"
        onLoad={() => setIsLoading(false)}
      />
      {children}
    </WormholeConnectContext.Provider>
  );
}
