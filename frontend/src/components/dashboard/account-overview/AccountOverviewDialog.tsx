import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { FileClock, RotateCw } from "lucide-react";

import { isSendPoints } from "@suilend/frontend-sui";
import { shallowPushQuery } from "@suilend/frontend-sui-next";
import { WAD } from "@suilend/sdk/lib/constants";
import {
  ApiBorrowEvent,
  ApiClaimRewardEvent,
  ApiDepositEvent,
  ApiLiquidateEvent,
  ApiObligationDataEvent,
  ApiRepayEvent,
  ApiReserveAssetDataEvent,
  ApiWithdrawEvent,
} from "@suilend/sdk/lib/types";

import EarningsTabContent from "@/components/dashboard/account-overview/EarningsTabContent";
import HistoryTabContent from "@/components/dashboard/account-overview/HistoryTabContent";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Tabs from "@/components/shared/Tabs";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { EventType, eventSortAsc } from "@/lib/events";
import { formatPoints, formatToken } from "@/lib/format";
import { API_URL } from "@/lib/navigation";
import { Token } from "@/lib/types";

export enum QueryParams {
  TAB = "accountOverviewTab",
}

export enum Tab {
  EARNINGS = "earnings",
  HISTORY = "history",
}

export const getCtokenExchangeRate = (event: ApiReserveAssetDataEvent) =>
  new BigNumber(event.ctokenSupply).eq(0)
    ? new BigNumber(1)
    : new BigNumber(event.supplyAmount).div(WAD).div(event.ctokenSupply);

export type EventsData = {
  reserveAssetData: ApiReserveAssetDataEvent[];
  deposit: ApiDepositEvent[];
  borrow: ApiBorrowEvent[];
  withdraw: ApiWithdrawEvent[];
  repay: ApiRepayEvent[];
  liquidate: ApiLiquidateEvent[];
  claimReward: ApiClaimRewardEvent[];
  obligationData: ApiObligationDataEvent[];
};

interface TokenAmountProps {
  amount?: BigNumber;
  token: Token;
  decimals: number;
}

export function TokenAmount({ amount, token, decimals }: TokenAmountProps) {
  return (
    <div className="flex w-max flex-row items-center gap-2">
      <TokenLogo className="h-4 w-4" token={token} />

      <Tooltip
        title={
          amount !== undefined && isSendPoints(token.coinType) ? (
            <>
              {formatPoints(amount, { dp: decimals })} {token.symbol}
            </>
          ) : undefined
        }
      >
        <TBody>
          {amount === undefined
            ? "N/A"
            : isSendPoints(token.coinType)
              ? formatPoints(amount)
              : formatToken(amount, { dp: decimals })}{" "}
          {token.symbol}
        </TBody>
      </Tooltip>
    </div>
  );
}

export default function AccountOverviewDialog() {
  const router = useRouter();
  const queryParams = {
    [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
  };

  const { refresh, obligation } = useLoadedAppContext();

  // Open
  const isOpen = queryParams[QueryParams.TAB] !== undefined;

  const onOpenChange = (_isOpen: boolean) => {
    if (_isOpen) return;

    const restQuery = cloneDeep(router.query);
    delete restQuery[QueryParams.TAB];
    shallowPushQuery(router, restQuery);
  };

  // Tabs
  const tabs = [
    { id: Tab.EARNINGS, title: "Earnings" },
    { id: Tab.HISTORY, title: "History" },
  ];

  const selectedTab =
    queryParams[QueryParams.TAB] &&
    Object.values(Tab).includes(queryParams[QueryParams.TAB])
      ? queryParams[QueryParams.TAB]
      : Object.values(Tab)[0];
  const onSelectedTabChange = (tab: Tab) => {
    shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
  };

  // Events
  const [eventsData, setEventsData] = useState<EventsData | undefined>(
    undefined,
  );

  const clearEventsData = useCallback(() => {
    setEventsData(undefined);
  }, []);

  const fetchEventsData = useCallback(
    async (obligationId: string) => {
      clearEventsData();

      try {
        const url1 = `${API_URL}/events?${new URLSearchParams({
          eventTypes: [
            EventType.DEPOSIT,
            EventType.BORROW,
            EventType.WITHDRAW,
            EventType.REPAY,
            EventType.LIQUIDATE,
          ].join(","),
          joinEventTypes: EventType.RESERVE_ASSET_DATA,
          obligationId,
        })}`;
        const res1 = await fetch(url1);
        const json1 = await res1.json();

        const url2 = `${API_URL}/events?${new URLSearchParams({
          eventTypes: EventType.CLAIM_REWARD,
          obligationId,
        })}`;
        const res2 = await fetch(url2);
        const json2 = await res2.json();

        const url3 = `${API_URL}/events?${new URLSearchParams({
          eventTypes: EventType.OBLIGATION_DATA,
          obligationId,
        })}`;
        const res3 = await fetch(url3);
        const json3 = await res3.json();

        // Parse
        const data = { ...json1, ...json2, ...json3 } as EventsData;
        for (const event of [
          ...(data.reserveAssetData ?? []),
          ...(data.deposit ?? []),
          ...(data.borrow ?? []),
          ...(data.withdraw ?? []),
          ...(data.repay ?? []),
          ...(data.claimReward ?? []),
        ]) {
          event.coinType = normalizeStructTag(event.coinType);
        }

        setEventsData({
          reserveAssetData: (data.reserveAssetData ?? [])
            .slice()
            .sort(eventSortAsc),
          deposit: (data.deposit ?? []).slice().sort(eventSortAsc),
          borrow: (data.borrow ?? []).slice().sort(eventSortAsc),
          withdraw: (data.withdraw ?? []).slice().sort(eventSortAsc),
          repay: (data.repay ?? []).slice().sort(eventSortAsc),
          liquidate: (data.liquidate ?? []).slice().sort(eventSortAsc),
          claimReward: (data.claimReward ?? []).slice().sort(eventSortAsc),
          obligationData: (data.obligationData ?? [])
            .slice()
            .sort(eventSortAsc),
        });
      } catch (err) {
        console.error(err);
      }
    },
    [clearEventsData],
  );

  const fetchedDataObligationIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!obligation?.id) return;

    if (isOpen) {
      if (fetchedDataObligationIdRef.current === obligation.id) return;

      fetchEventsData(obligation.id);
      fetchedDataObligationIdRef.current = obligation.id;
    }
  }, [obligation?.id, isOpen, fetchEventsData]);

  // Refresh
  const getNowS = () => Math.floor(new Date().getTime() / 1000);
  const [nowS, setNowS] = useState<number>(getNowS);

  const refreshDialog = () => {
    if (!obligation?.id) return;

    if (selectedTab === Tab.EARNINGS) refresh();
    fetchEventsData(obligation.id);
    setNowS(getNowS());
  };

  if (!obligation) return null;
  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange }}
      headerProps={{
        title: { icon: <FileClock />, children: "Account overview" },
        titleEndContent: (
          <Button
            className="text-muted-foreground"
            icon={<RotateCw />}
            variant="ghost"
            size="icon"
            onClick={refreshDialog}
          >
            Refresh
          </Button>
        ),
      }}
      dialogContentInnerClassName="max-w-6xl"
    >
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
        listClassName="mb-0"
      />

      {selectedTab === Tab.EARNINGS && (
        <EarningsTabContent eventsData={eventsData} nowS={nowS} />
      )}
      {selectedTab === Tab.HISTORY && (
        <HistoryTabContent eventsData={eventsData} />
      )}
    </Dialog>
  );
}
