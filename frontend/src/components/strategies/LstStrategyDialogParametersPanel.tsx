import { useRouter } from "next/router";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { formatDate } from "date-fns";
import { capitalize } from "lodash";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  STRATEGY_TYPE_INFO_MAP,
  StrategyType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import { getToken } from "@suilend/sui-fe";
import { shallowPushQuery, useSettingsContext } from "@suilend/sui-fe-next";

import { TokenAmount } from "@/components/dashboard/account-overview/AccountOverviewDialog";
import Button from "@/components/shared/Button";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  BorrowEvent,
  ClaimRewardEvent,
  DepositEvent,
  ForgiveEvent,
  HistoryEvent,
  RepayEvent,
  WithdrawEvent,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { EventType, EventTypeNameMap } from "@/lib/events";
import { cn } from "@/lib/utils";

enum QueryParams {
  TAB = "parametersPanelTab",
}

enum Tab {
  DETAILS = "details",
  HISTORY = "history",
}

interface TabContentProps {
  strategyType: StrategyType;
}

function DetailsTabContent({ strategyType }: TabContentProps) {
  const { appData } = useLoadedAppContext();

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getBorrowReserve,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();

  // Strategy
  const strategyInfo = useMemo(
    () => STRATEGY_TYPE_INFO_MAP[strategyType],
    [strategyType],
  );

  const minExposure = useMemo(
    () => exposureMap[strategyType].min,
    [strategyType, exposureMap],
  );
  const maxExposure = useMemo(
    () => exposureMap[strategyType].max,
    [strategyType, exposureMap],
  );
  const defaultExposure = useMemo(
    () => exposureMap[strategyType].default,
    [strategyType, exposureMap],
  );

  // Reserves
  const depositReserves = useMemo(
    () => getDepositReserves(strategyType),
    [getDepositReserves, strategyType],
  );
  const borrowReserve = useMemo(
    () => getBorrowReserve(strategyType),
    [getBorrowReserve, strategyType],
  );
  const defaultCurrencyReserve = getDefaultCurrencyReserve(strategyType);

  return (
    <>
      {/* How does it work? */}
      <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
        <TBodySans>How does it work?</TBodySans>
        <TLabelSans>
          The following flowchart explains how the {strategyInfo.header.title}{" "}
          {strategyInfo.header.type} strategy works:
        </TLabelSans>

        <div className="flex w-full min-w-[250px] flex-col gap-0 pt-1">
          {/* Top */}
          <div className="relative z-[2] flex h-[160px] w-full flex-row gap-0">
            {/* Base (left) */}
            {depositReserves.base !== undefined &&
              depositReserves.lst !== undefined && (
                <div className="relative h-full w-20">
                  <div className="absolute inset-y-4 left-10 w-px border-l border-dashed border-muted" />

                  {/* Base (left-top) */}
                  <div
                    className={cn(
                      "absolute left-10 top-4",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TokenLogo token={depositReserves.base.token} size={20} />
                      <TBody>{depositReserves.base.token.symbol}</TBody>
                    </div>
                  </div>

                  {/* Borrow (left-bottom) */}
                  <div
                    className={cn(
                      "absolute bottom-4 left-10",
                      "flex h-0 w-0 flex-row items-center justify-center",
                    )}
                  >
                    <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                      <TBody className="w-max uppercase">Borrow</TBody>
                    </div>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-popover pb-0.5">
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              )}

            {/* Base/BorrowAsset or LST/BorrowAsset Looping (right) */}
            <div className="relative h-full flex-1">
              <div className="absolute inset-x-10 inset-y-4 rounded-[16px] border border-dashed border-muted" />

              {/* LST (center-top) */}
              <div
                className={cn(
                  "absolute left-1/2 top-4 -translate-x-1/2",
                  "flex h-0 w-0 flex-row items-center justify-center",
                )}
              >
                <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                  {depositReserves.lst !== undefined ? (
                    <>
                      <TokenLogo token={depositReserves.lst.token} size={20} />
                      <TBody>{depositReserves.lst.token.symbol}</TBody>
                    </>
                  ) : (
                    <>
                      <TokenLogo
                        token={depositReserves.base!.token}
                        size={20}
                      />
                      <TBody>{depositReserves.base!.token.symbol}</TBody>
                    </>
                  )}
                </div>
              </div>

              {/* Borrow (right-center) */}
              <div
                className={cn(
                  "absolute right-10 top-1/2 -translate-y-1/2",
                  "flex h-0 w-0 flex-row items-center justify-center",
                )}
              >
                <div className="flex h-8 flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                  <TBody className="w-max uppercase">Borrow</TBody>
                </div>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-popover pb-0.5">
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* BorrowAsset (center-bottom) */}
              <div
                className={cn(
                  "absolute bottom-4 left-1/2 -translate-x-1/2",
                  "flex h-0 w-0 flex-row items-center justify-center",
                )}
              >
                <div className="flex h-8 w-max flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                  <TokenLogo token={borrowReserve.token} size={20} />
                  <TBody>{borrowReserve.token.symbol}</TBody>
                </div>

                {depositReserves.base !== undefined &&
                  depositReserves.lst !== undefined && (
                    <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-popover pt-0.5">
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
              </div>

              {/* Swap or Stake (left-center) */}
              <div
                className={cn(
                  "absolute left-10 top-1/2 -translate-y-1/2",
                  "flex h-0 w-0 flex-row items-center justify-center",
                )}
              >
                <div className="flex h-8 flex-row items-center justify-center gap-2 rounded-full bg-border px-3">
                  <TBody className="w-max uppercase">
                    {depositReserves.lst !== undefined ? "Stake" : "Swap"}
                  </TBody>
                </div>

                <div className="absolute left-1/2 top-4 -translate-x-1/2 bg-popover pt-0.5">
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          {depositReserves.base !== undefined &&
            depositReserves.lst !== undefined && (
              <div className="relative z-[1] flex h-[40px] w-full flex-row gap-0">
                {/* Left */}
                <div className="relative h-full w-20">
                  <div className="absolute inset-y-0 left-10 right-0 rounded-bl-[16px] border border-r-0 border-t-0 border-dashed border-muted" />
                </div>

                {/* Right */}
                <div className="relative h-full flex-1">
                  <div className="absolute inset-y-0 left-0 right-1/2 rounded-br-[16px] border border-l-0 border-t-0 border-dashed border-muted" />
                </div>
              </div>
            )}
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
        <TBodySans>How do I manage or claim rewards?</TBodySans>
        <TLabelSans>
          {
            {
              [StrategyType.sSUI_SUI_LOOPING]:
                "sSUI rewards (for depositing sSUI, and for borrowing SUI)",
              [StrategyType.stratSUI_SUI_LOOPING]:
                "STRAT rewards (for depositing stratSUI) and sSUI rewards (for borrowing SUI)",
              [StrategyType.USDC_sSUI_SUI_LOOPING]:
                "sSUI rewards (for depositing sSUI, and for borrowing SUI)",
              [StrategyType.AUSD_sSUI_SUI_LOOPING]:
                "sSUI rewards (for depositing AUSD, for depositing sSUI, and for borrowing SUI)",
              [StrategyType.xBTC_wBTC_LOOPING]:
                "DEEP and SEND rewards (for depositing xBTC)",
              [StrategyType.xBTC_sSUI_SUI_LOOPING]:
                "DEEP and SEND rewards (for depositing xBTC) and sSUI rewards (for depositing sSUI, and for borrowing SUI)",
            }[strategyType]
          }{" "}
          are autoclaimed and redeposited every 2 weeks.
          <br />
          <br />
          You can also claim them manually at any time by clicking the{" "}
          {`"Claim rewards"`} button.
        </TLabelSans>
      </div>
    </>
  );
}

function HistoryTabContent({ strategyType }: TabContentProps) {
  const { explorer } = useSettingsContext();
  const { appData } = useLoadedAppContext();
  const { userData } = useLoadedUserContext();
  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
  } = useLoadedLstStrategyContext();

  // Obligation
  const strategyOwnerCap = userData.strategyOwnerCaps.find(
    (soc) => soc.strategyType === strategyType,
  );
  const obligation = userData.strategyObligations.find(
    (so) => so.id === strategyOwnerCap?.obligationId,
  );

  // Stats - history
  const [groupedHistory, setGroupedHistory] = useState<
    HistoryEvent[][] | undefined
  >(undefined);

  const didFetchHistoryRef = useRef<boolean>(false);
  useEffect(() => {
    if (didFetchHistoryRef.current) return;
    didFetchHistoryRef.current = true;

    (async () => {
      try {
        const history = await getHistory(strategyType, obligation);

        // Process history
        const filteredHistory = history.filter(
          (event) => event.type !== EventType.OBLIGATION_DATA,
        );

        const groupedHistory = filteredHistory.reduce((acc, event) => {
          const prevEvents = acc[acc.length - 1];
          if (
            prevEvents !== undefined &&
            event.digest === prevEvents[0].digest
          ) {
            acc[acc.length - 1].push(event);
          } else {
            acc.push([event]);
          }
          return acc;
        }, [] as HistoryEvent[][]);

        const reversedGroupedHistory = groupedHistory.reverse();

        setGroupedHistory(reversedGroupedHistory);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [getHistory, strategyType, obligation]);

  return (
    <>
      {groupedHistory === undefined ? (
        <Skeleton className="h-[200px] w-full md:h-[500px]" />
      ) : (
        groupedHistory.map((events) => (
          <div
            key={events[0].digest}
            className="flex w-full flex-col gap-2 rounded-sm border p-4"
          >
            <div className="flex h-5 w-full flex-row items-center gap-1">
              <TBodySans className="w-max">
                {formatDate(
                  new Date(events[0].timestampS * 1000),
                  "yyyy-MM-dd HH:mm:ss",
                )}
              </TBodySans>

              <OpenOnExplorerButton
                url={explorer.buildTxUrl(events[0].digest)}
              />
            </div>

            <div className="flex w-full flex-col gap-2">
              {events.map((event) => (
                <div
                  key={event.eventIndex}
                  className="flex w-full flex-row gap-4"
                >
                  {/* Type */}
                  <TBodySans className="w-[100px]">
                    {EventTypeNameMap[event.type]}
                  </TBodySans>

                  {/* Details */}
                  <div className="flex-1">
                    {[
                      EventType.DEPOSIT,
                      EventType.BORROW,
                      EventType.WITHDRAW,
                      EventType.REPAY,
                      EventType.FORGIVE,
                      EventType.CLAIM_REWARD,
                    ].includes(event.type) ? (
                      <TokenAmount
                        amount={
                          (
                            event as
                              | DepositEvent
                              | BorrowEvent
                              | WithdrawEvent
                              | RepayEvent
                              | ForgiveEvent
                              | ClaimRewardEvent
                          ).liquidityAmount
                        }
                        token={getToken(
                          (
                            event as
                              | DepositEvent
                              | BorrowEvent
                              | WithdrawEvent
                              | RepayEvent
                              | ForgiveEvent
                              | ClaimRewardEvent
                          ).coinType,
                          appData.coinMetadataMap[
                            (
                              event as
                                | DepositEvent
                                | BorrowEvent
                                | WithdrawEvent
                                | RepayEvent
                                | ForgiveEvent
                                | ClaimRewardEvent
                            ).coinType
                          ],
                        )}
                      />
                    ) : event.type === EventType.SOCIALIZE_LOSS ? (
                      <TokenAmount
                        amount={event.lossAmount}
                        token={getToken(
                          event.coinType,
                          appData.coinMetadataMap[event.coinType],
                        )}
                      />
                    ) : event.type === EventType.LIQUIDATE ? (
                      <TokenAmount
                        amount={event.withdrawAmount}
                        token={getToken(
                          event.withdrawCoinType,
                          appData.coinMetadataMap[event.withdrawCoinType],
                        )}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  );
}

interface TabButtonProps extends PropsWithChildren {
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <Button
      className={cn(
        "h-7 flex-1 py-0 uppercase",
        isActive && "border border-secondary disabled:opacity-100",
      )}
      labelClassName="text-xs"
      variant={isActive ? "secondary" : "secondaryOutline"}
      onClick={onClick}
      disabled={isActive}
    >
      {children}
    </Button>
  );
}

interface LstStrategyDialogParametersPanelProps {
  strategyType: StrategyType;
}

export default function LstStrategyDialogParametersPanel({
  strategyType,
}: LstStrategyDialogParametersPanelProps) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  // Tabs
  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : Tab.DETAILS,
    [queryParams],
  );
  const onSelectedTabChange = useCallback(
    (tab: Tab) => {
      shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
    },
    [router],
  );

  const TabContent = {
    [Tab.DETAILS]: DetailsTabContent,
    [Tab.HISTORY]: HistoryTabContent,
  }[selectedTab];

  return (
    <>
      <div className="flex flex-row gap-2">
        {Object.values(Tab).map((tab) => (
          <TabButton
            key={tab}
            isActive={selectedTab === tab}
            onClick={() => onSelectedTabChange(tab)}
          >
            {capitalize(tab)}
          </TabButton>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        <TabContent strategyType={strategyType} />
      </div>
    </>
  );
}
