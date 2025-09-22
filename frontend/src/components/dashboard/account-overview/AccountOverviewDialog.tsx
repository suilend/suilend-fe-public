import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { FileClock, RotateCw } from "lucide-react";

import { WAD } from "@suilend/sdk/lib/constants";
import {
  ApiBorrowEvent,
  ApiClaimRewardEvent,
  ApiDepositEvent,
  ApiForgiveEvent,
  ApiLiquidateEvent,
  ApiObligationDataEvent,
  ApiRepayEvent,
  ApiReserveAssetDataEvent,
  ApiSocializeLossEvent,
  ApiWithdrawEvent,
} from "@suilend/sdk/lib/types";
import {
  API_URL,
  Token,
  formatPoints,
  formatToken,
  isSendPoints,
} from "@suilend/sui-fe";
import {
  shallowPushQuery,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import EarningsTabContent from "@/components/dashboard/account-overview/EarningsTabContent";
import HistoryTabContent from "@/components/dashboard/account-overview/HistoryTabContent";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Tabs from "@/components/shared/Tabs";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { EventType, eventSortAsc, fetchClaimRewardEvents } from "@/lib/events";

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

  forgive: ApiForgiveEvent[];
  socializeLoss: ApiSocializeLossEvent[];

  claimReward: ApiClaimRewardEvent[];

  obligationData: ApiObligationDataEvent[];
};

interface TokenAmountProps {
  amount?: BigNumber;
  token: Token;
}

export function TokenAmount({ amount, token }: TokenAmountProps) {
  return (
    <div className="flex w-max flex-row items-center gap-2">
      <TokenLogo token={token} size={16} />

      <Tooltip
        title={
          amount !== undefined && isSendPoints(token.coinType) ? (
            <>
              {formatPoints(amount, { dp: token.decimals })} {token.symbol}
            </>
          ) : undefined
        }
      >
        <TBody>
          {amount === undefined
            ? "N/A"
            : isSendPoints(token.coinType)
              ? formatPoints(amount)
              : formatToken(amount, {
                  dp: token.decimals,
                  trimTrailingZeros: true,
                })}{" "}
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

  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { refresh, obligation } = useLoadedUserContext();

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
  const [autoclaimDigests, setAutoclaimDigests] = useState<
    string[] | undefined
  >(undefined);

  const clearEventsData = useCallback(() => {
    setEventsData(undefined);
    setAutoclaimDigests(undefined);
  }, []);

  const fetchEventsData = useCallback(
    async (address: string, obligationId: string) => {
      clearEventsData();

      try {
        const [
          json1,
          json2,
          { claimReward, autoclaimDigests: _autoclaimDigests },
          json3,
        ] = await Promise.all([
          // Deposit, borrow, withdraw, repay, and liquidate events joined with reserve asset data
          (async () => {
            const url = `${API_URL}/events?${new URLSearchParams({
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
            const res = await fetch(url);
            const json: {
              deposit: ApiDepositEvent[];
              borrow: ApiBorrowEvent[];
              withdraw: ApiWithdrawEvent[];
              repay: ApiRepayEvent[];
              liquidate: ApiLiquidateEvent[];
              forgive: ApiForgiveEvent[];
            } = await res.json();

            return json;
          })(),

          // Forgive and SocializeLoss events
          (async () => {
            const url = `${API_URL}/events?${new URLSearchParams({
              eventTypes: [EventType.FORGIVE, EventType.SOCIALIZE_LOSS].join(
                ",",
              ),
              obligationId,
            })}`;
            const res = await fetch(url);
            const json: {
              forgive: ApiForgiveEvent[];
              socializeLoss: ApiSocializeLossEvent[];
            } = await res.json();

            return json;
          })(),

          // ClaimReward events
          fetchClaimRewardEvents(suiClient, address, obligationId),

          // ObligationData events
          (async () => {
            const url = `${API_URL}/events?${new URLSearchParams({
              eventTypes: EventType.OBLIGATION_DATA,
              obligationId,
            })}`;
            const res = await fetch(url);
            const json: {
              obligationData: ApiObligationDataEvent[];
            } = await res.json();

            return json;
          })(),
        ]);

        // Parse
        const data = {
          ...json1,
          ...json2,
          ...{ claimReward },
          ...json3,
        } as EventsData;
        for (const event of [
          ...(data.reserveAssetData ?? []),
          ...(data.deposit ?? []),
          ...(data.borrow ?? []),
          ...(data.withdraw ?? []),
          ...(data.repay ?? []),

          ...(data.forgive ?? []),
          ...(data.socializeLoss ?? []),

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

          forgive: (data.forgive ?? []).slice().sort(eventSortAsc),
          socializeLoss: (data.socializeLoss ?? []).slice().sort(eventSortAsc),

          claimReward: (data.claimReward ?? []).slice().sort(eventSortAsc),

          obligationData: (data.obligationData ?? [])
            .slice()
            .sort(eventSortAsc),
        });
        setAutoclaimDigests(_autoclaimDigests);
      } catch (err) {
        console.error(err);
      }
    },
    [clearEventsData, suiClient],
  );

  const fetchedDataObligationIdRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!address || !obligation?.id) return;

    if (isOpen) {
      if (fetchedDataObligationIdRef.current === obligation.id) return;
      fetchedDataObligationIdRef.current = obligation.id;

      fetchEventsData(address, obligation.id);
    }
  }, [address, obligation?.id, isOpen, fetchEventsData]);

  // Refresh
  const getNowS = () => Math.floor(new Date().getTime() / 1000);
  const [nowS, setNowS] = useState<number>(getNowS);

  const refreshDialog = () => {
    if (!address || !obligation?.id) return;

    if (selectedTab === Tab.EARNINGS) refresh();
    fetchEventsData(address, obligation.id);
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
      />

      {selectedTab === Tab.EARNINGS && (
        <EarningsTabContent eventsData={eventsData} nowS={nowS} />
      )}
      {selectedTab === Tab.HISTORY && (
        <HistoryTabContent
          eventsData={eventsData}
          autoclaimDigests={autoclaimDigests}
        />
      )}
    </Dialog>
  );
}
