import {
    PropsWithChildren,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
  } from "react";
  
  import BigNumber from "bignumber.js";

  export interface LeaderboardRowData {
    rank: number;
    address: string;
    pointsPerDay: BigNumber;
    totalSend: BigNumber;
  }
  
  interface SendContext {
    leaderboardRows?: LeaderboardRowData[];
    updatedAt?: Date;
    rank?: number | null;
  }
  
  const defaultContextValue: SendContext = {
    leaderboardRows: undefined,
    updatedAt: undefined,
    rank: undefined,
  };
  
  const SendContext = createContext<SendContext>(defaultContextValue);
  
  export const useSendContext = () => useContext(SendContext);
  
  export function SendContextProvider({ children }: PropsWithChildren) {
    return (
      <SendContext.Provider value={{}}>
        {children}
      </SendContext.Provider>
    );
  }
  