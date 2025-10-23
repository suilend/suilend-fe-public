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
  useRef,
  useState,
} from "react";

import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { cloneDeep } from "lodash";
import { useLocalStorage } from "usehooks-ts";

import {
  ParsedReserve,
  createObligationIfNoneExists,
  sendObligationToUser,
} from "@suilend/sdk";
import { shallowPushQuery, useWalletContext } from "@suilend/sui-fe-next";

import ActionsModal from "@/components/dashboard/actions-modal/ActionsModal";
import { ParametersPanelTab } from "@/components/dashboard/actions-modal/ParametersPanel";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { QueryParams as DashboardQueryParams } from "@/contexts/DashboardContext";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

enum QueryParams {
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
  lendingMarketId: string,
  coinType: string,
  value: string,
) => Promise<SuiTransactionBlockResponse>;

interface ActionsModalContext {
  isOpen: boolean;
  open: (lendingMarketId: string | undefined, reserveSymbol: string) => void;
  close: () => void;

  reserve: ParsedReserve | undefined;
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

  reserve: undefined,
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

  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData, openLedgerHashDialog } = useLoadedAppContext();
  const { appData } = useLendingMarketContext();
  const { obligationMap, obligationOwnerCapMap, autoclaimRewards } =
    useLoadedUserContext();

  // Open
  const [isInDom, setIsInDom] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const open = useCallback(
    (lendingMarketId: string | undefined, reserveSymbol: string) => {
      const newQueryParams: Record<string, string> = {
        [QueryParams.RESERVE_SYMBOL]: reserveSymbol,
      };
      if (lendingMarketId)
        newQueryParams[DashboardQueryParams.LENDING_MARKET_ID] =
          lendingMarketId;

      shallowPushQuery(router, {
        ...router.query,
        ...newQueryParams,
      });

      // Wait for query to update
      setTimeout(() => {
        setIsInDom(true);

        // Wait for state to update
        setTimeout(() => {
          setIsOpen(true);
        }, 50);
      }, 50);
    },
    [router],
  );
  const close = useCallback(() => {
    setIsOpen(false);

    // Wait for dialog to close
    setTimeout(() => {
      setIsInDom(false);

      // Wait for state to update
      setTimeout(() => {
        const restQuery = cloneDeep(router.query);
        delete restQuery[DashboardQueryParams.LENDING_MARKET_ID];
        delete restQuery[QueryParams.RESERVE_SYMBOL];
        shallowPushQuery(router, restQuery);
      }, 50);
    }, 500);
  }, [router]);

  const didInitialOpenRef = useRef<boolean>(false);
  useEffect(() => {
    if (didInitialOpenRef.current) return;
    didInitialOpenRef.current = true;

    if (queryParams[QueryParams.RESERVE_SYMBOL] !== undefined)
      open(appData.lendingMarket.id, queryParams[QueryParams.RESERVE_SYMBOL]);
  }, [queryParams, open, appData.lendingMarket.id]);

  // Reserve
  const reserve: ParsedReserve | undefined = useMemo(
    () =>
      queryParams[QueryParams.RESERVE_SYMBOL] !== undefined
        ? appData.lendingMarket.reserves.find(
            (r) => r.token.symbol === queryParams[QueryParams.RESERVE_SYMBOL],
          )
        : undefined,
    [queryParams, appData.lendingMarket.reserves],
  );

  // Tab
  const selectedTab: Tab = useMemo(
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
  const deposit = useCallback(
    async (lendingMarketId: string, coinType: string, value: string) => {
      const appData = allAppData.allLendingMarketData[lendingMarketId];
      const obligation = obligationMap[appData.lendingMarket.id];
      const obligationOwnerCap =
        obligationOwnerCapMap[appData.lendingMarket.id];

      if (!address) throw Error("Wallet not connected");

      let transaction = new Transaction();

      try {
        const { obligationOwnerCapId, didCreate } =
          createObligationIfNoneExists(
            appData.suilendClient,
            transaction,
            obligationOwnerCap,
          );
        await appData.suilendClient.depositIntoObligation(
          address,
          coinType,
          value,
          transaction,
          obligationOwnerCapId,
        );
        if (didCreate)
          sendObligationToUser(obligationOwnerCapId, address, transaction);
      } catch (err) {
        console.error(err);
        throw err;
      }

      const { transaction: _transaction, onSuccess: onAutoclaimSuccess } =
        await autoclaimRewards(transaction);
      transaction = _transaction;

      const res = await signExecuteAndWaitForTransaction(
        transaction,
        undefined,
        (tx: Transaction) => openLedgerHashDialog(tx),
      );
      onAutoclaimSuccess();

      return res;
    },
    [
      allAppData.allLendingMarketData,
      obligationMap,
      obligationOwnerCapMap,
      address,
      autoclaimRewards,
      openLedgerHashDialog,
      signExecuteAndWaitForTransaction,
    ],
  );

  const borrow = useCallback(
    async (lendingMarketId: string, coinType: string, value: string) => {
      const appData = allAppData.allLendingMarketData[lendingMarketId];
      const obligation = obligationMap[appData.lendingMarket.id];
      const obligationOwnerCap =
        obligationOwnerCapMap[appData.lendingMarket.id];

      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let transaction = new Transaction();

      try {
        await appData.suilendClient.borrowAndSendToUser(
          address,
          obligationOwnerCap.id,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        console.error(err);
        throw err;
      }

      const { transaction: _transaction, onSuccess: onAutoclaimSuccess } =
        await autoclaimRewards(transaction);
      transaction = _transaction;

      const res = await signExecuteAndWaitForTransaction(
        transaction,
        undefined,
        (tx: Transaction) => openLedgerHashDialog(tx),
      );
      onAutoclaimSuccess();

      return res;
    },
    [
      allAppData.allLendingMarketData,
      obligationMap,
      obligationOwnerCapMap,
      address,
      autoclaimRewards,
      openLedgerHashDialog,
      signExecuteAndWaitForTransaction,
    ],
  );

  const withdraw = useCallback(
    async (lendingMarketId: string, coinType: string, value: string) => {
      const appData = allAppData.allLendingMarketData[lendingMarketId];
      const obligation = obligationMap[appData.lendingMarket.id];
      const obligationOwnerCap =
        obligationOwnerCapMap[appData.lendingMarket.id];

      if (!address) throw Error("Wallet not connected");
      if (!obligationOwnerCap || !obligation)
        throw Error("Obligation not found");

      let transaction = new Transaction();

      try {
        await appData.suilendClient.withdrawAndSendToUser(
          address,
          obligationOwnerCap.id,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        console.error(err);
        throw err;
      }

      const { transaction: _transaction, onSuccess: onAutoclaimSuccess } =
        await autoclaimRewards(transaction);
      transaction = _transaction;

      const res = await signExecuteAndWaitForTransaction(
        transaction,
        undefined,
        (tx: Transaction) => openLedgerHashDialog(tx),
      );
      onAutoclaimSuccess();

      return res;
    },
    [
      allAppData.allLendingMarketData,
      obligationMap,
      obligationOwnerCapMap,
      address,
      autoclaimRewards,
      openLedgerHashDialog,
      signExecuteAndWaitForTransaction,
    ],
  );

  const repay = useCallback(
    async (lendingMarketId: string, coinType: string, value: string) => {
      const appData = allAppData.allLendingMarketData[lendingMarketId];
      const obligation = obligationMap[appData.lendingMarket.id];
      const obligationOwnerCap =
        obligationOwnerCapMap[appData.lendingMarket.id];

      if (!address) throw Error("Wallet not connected");
      if (!obligation) throw Error("Obligation not found");

      let transaction = new Transaction();

      try {
        await appData.suilendClient.repayIntoObligation(
          address,
          obligation.id,
          coinType,
          value,
          transaction,
        );
      } catch (err) {
        console.error(err);
        throw err;
      }

      const { transaction: _transaction, onSuccess: onAutoclaimSuccess } =
        await autoclaimRewards(transaction);
      transaction = _transaction;

      const res = await signExecuteAndWaitForTransaction(
        transaction,
        undefined,
        (tx: Transaction) => openLedgerHashDialog(tx),
      );
      onAutoclaimSuccess();

      return res;
    },
    [
      allAppData.allLendingMarketData,
      obligationMap,
      obligationOwnerCapMap,
      address,
      autoclaimRewards,
      openLedgerHashDialog,
      signExecuteAndWaitForTransaction,
    ],
  );

  // Context
  const contextValue = useMemo(
    () => ({
      isOpen,
      open,
      close,

      reserve,
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
      open,
      close,
      reserve,
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
      {isInDom && <ActionsModal />}
      {children}
    </ActionsModalContext.Provider>
  );
}
