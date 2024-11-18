import { useRouter } from "next/router";
import {
  Dispatch,
  PropsWithChildren,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import { cloneDeep } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import { shallowPushQuery, useWalletContext } from "@suilend/frontend-sui";
import { SuilendClient } from "@suilend/sdk/client";

import { ParametersPanelTab } from "@/components/dashboard/actions-modal/ParametersPanel";
import { AppData, useAppContext } from "@/contexts/AppContext";

enum QueryParams {
  RESERVE_INDEX = "assetIndex", // Being phased out
  RESERVE_SYMBOL = "asset",
  TAB = "action",
  PARAMETERS_PANEL_TAB = "parametersPanelTab",
}

export enum Tab {
  DEPOSIT = "deposit",
  BORROW = "borrow",
  WITHDRAW = "withdraw",
  REPAY = "repay",
}

export type ActionSignature = (
  coinType: string,
  value: string,
) => Promise<SuiTransactionBlockResponse>;

interface ActionsModalContext {
  isOpen: boolean;
  open: (symbol: string) => void;
  close: () => void;
  reserveSymbol?: string;

  selectedTab: Tab;
  onSelectedTabChange: (tab: Tab) => void;
  isMoreParametersOpen: boolean;
  setIsMoreParametersOpen: Dispatch<SetStateAction<boolean>>;
  selectedParametersPanelTab: ParametersPanelTab;
  onSelectedParametersPanelTabChange: (tab: ParametersPanelTab) => void;

  deposit: ActionSignature;
  borrow: ActionSignature;
  withdraw: ActionSignature;
  repay: ActionSignature;
}

const defaultContextValue: ActionsModalContext = {
  isOpen: false,
  open: () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  close: () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  reserveSymbol: undefined,

  selectedTab: Tab.DEPOSIT,
  onSelectedTabChange: () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  isMoreParametersOpen: false,
  setIsMoreParametersOpen: () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  selectedParametersPanelTab: ParametersPanelTab.ADVANCED,
  onSelectedParametersPanelTabChange: () => {
    throw Error("ActionsModalContextProvider not initialized");
  },

  deposit: async () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  borrow: async () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  withdraw: async () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
  repay: async () => {
    throw Error("ActionsModalContextProvider not initialized");
  },
};

const ActionsModalContext =
  createContext<ActionsModalContext>(defaultContextValue);

export const useActionsModalContext = () => useContext(ActionsModalContext);

export function ActionsModalContextProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.RESERVE_INDEX]: router.query[QueryParams.RESERVE_INDEX] as
        | string
        | undefined,
      [QueryParams.RESERVE_SYMBOL]: router.query[QueryParams.RESERVE_SYMBOL] as
        | string
        | undefined,
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
      [QueryParams.PARAMETERS_PANEL_TAB]: router.query[
        QueryParams.PARAMETERS_PANEL_TAB
      ] as ParametersPanelTab | undefined,
    }),
    [router.query],
  );

  const { address } = useWalletContext();
  const { obligation, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  // Open
  const [isOpen, setIsOpen] = useState<boolean>(
    queryParams[QueryParams.RESERVE_INDEX] !== undefined ||
      queryParams[QueryParams.RESERVE_SYMBOL] !== undefined,
  );

  const open = useCallback(
    (symbol: string) => {
      setIsOpen(true);

      shallowPushQuery(router, {
        ...router.query,
        [QueryParams.RESERVE_SYMBOL]: symbol,
      });
    },
    [router],
  );
  const close = useCallback(() => {
    setIsOpen(false);

    setTimeout(() => {
      const restQuery = cloneDeep(router.query);
      delete restQuery[QueryParams.RESERVE_INDEX];
      delete restQuery[QueryParams.RESERVE_SYMBOL];
      shallowPushQuery(router, restQuery);
    }, 400);
  }, [router]);

  // Reserve symbol
  const reserveSymbol = useMemo(() => {
    if (queryParams[QueryParams.RESERVE_INDEX] !== undefined)
      return data.lendingMarket.reserves.find(
        (r) =>
          Number(r.arrayIndex) ===
          +(queryParams[QueryParams.RESERVE_INDEX] as string),
      )?.symbol;

    return (
      queryParams[QueryParams.RESERVE_SYMBOL] ??
      defaultContextValue.reserveSymbol
    );
  }, [queryParams, data.lendingMarket.reserves]);
  useEffect(() => {
    if (queryParams[QueryParams.RESERVE_SYMBOL]) setIsOpen(true);
  }, [queryParams]);

  // Tab
  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : defaultContextValue.selectedTab,
    [queryParams],
  );
  const onSelectedTabChange = useCallback(
    (tab: Tab) => {
      shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
    },
    [router],
  );

  // More parameters
  const [isMoreParametersOpen, setIsMoreParametersOpen] = useLocalStorage<
    ActionsModalContext["isMoreParametersOpen"]
  >(
    "isActionsModalMoreParametersOpen",
    defaultContextValue.isMoreParametersOpen,
  );

  const selectedParametersPanelTab = useMemo(
    () =>
      queryParams[QueryParams.PARAMETERS_PANEL_TAB] &&
      Object.values(ParametersPanelTab).includes(
        queryParams[QueryParams.PARAMETERS_PANEL_TAB],
      )
        ? queryParams[QueryParams.PARAMETERS_PANEL_TAB]
        : defaultContextValue.selectedParametersPanelTab,
    [queryParams],
  );
  const onSelectedParametersPanelTabChange = useCallback(
    (tab: ParametersPanelTab) => {
      shallowPushQuery(router, {
        ...router.query,
        [QueryParams.PARAMETERS_PANEL_TAB]: tab,
      });
    },
    [router],
  );

  // Actions
  const obligationOwnerCap = useMemo(
    () =>
      data.obligationOwnerCaps?.find((o) => o.obligationId === obligation?.id),
    [data.obligationOwnerCaps, obligation?.id],
  );

  const deposit = useCallback(
    async (coinType: string, value: string) => {
      if (!address) throw Error("Wallet not connected");

      const transaction = new Transaction();
      try {
        await suilendClient.depositIntoObligation(
          address,
          coinType,
          value,
          transaction,
          obligationOwnerCap?.id,
        );
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      suilendClient,
      signExecuteAndWaitForTransaction,
      obligationOwnerCap,
    ],
  );

  const borrow = useCallback(
    async (coinType: string, value: string) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      const transaction = new Transaction();
      try {
        await suilendClient.borrowAndSendToUser(
          address,
          obligationOwnerCap.id,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      suilendClient,
      signExecuteAndWaitForTransaction,
      obligationOwnerCap,
      obligation,
    ],
  );

  const withdraw = useCallback(
    async (coinType: string, value: string) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      const transaction = new Transaction();
      try {
        await suilendClient.withdrawAndSendToUser(
          address,
          obligationOwnerCap.id,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [
      address,
      suilendClient,
      signExecuteAndWaitForTransaction,
      obligationOwnerCap,
      obligation,
    ],
  );

  const repay = useCallback(
    async (coinType: string, value: string) => {
      if (!address) throw Error("Wallet not connected");
      if (!obligation) throw Error("Obligation not found");

      const transaction = new Transaction();
      try {
        await suilendClient.repayIntoObligation(
          address,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        Sentry.captureException(err);
        console.error(err);
        throw err;
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      return res;
    },
    [address, suilendClient, signExecuteAndWaitForTransaction, obligation],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      isOpen: isOpen && reserveSymbol !== undefined,
      open,
      close,
      reserveSymbol,

      selectedTab,
      onSelectedTabChange,
      isMoreParametersOpen,
      setIsMoreParametersOpen,
      selectedParametersPanelTab,
      onSelectedParametersPanelTabChange,

      deposit,
      borrow,
      withdraw,
      repay,
    }),
    [
      isOpen,
      reserveSymbol,
      open,
      close,
      selectedTab,
      onSelectedTabChange,
      isMoreParametersOpen,
      setIsMoreParametersOpen,
      selectedParametersPanelTab,
      onSelectedParametersPanelTabChange,
      deposit,
      borrow,
      withdraw,
      repay,
    ],
  );

  return (
    <ActionsModalContext.Provider value={contextValue}>
      {children}
    </ActionsModalContext.Provider>
  );
}
