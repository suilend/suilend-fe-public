import { useRouter } from "next/router";
import { useMemo } from "react";

import { FileClock, User, UsersRound } from "lucide-react";

import {
  ADMIN_ADDRESS,
  LENDING_MARKET_ID,
  getNetAprPercent,
} from "@suilend/sdk";
import { formatPercent, formatUsd } from "@suilend/sui-fe";
import {
  shallowPushQuery,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";

import AccountBreakdown from "@/components/dashboard/account/AccountBreakdown";
import BorrowLimitTitle from "@/components/dashboard/account/BorrowLimitTitle";
import LiquidationThresholdTitle from "@/components/dashboard/account/LiquidationThresholdTitle";
import WeightedBorrowsTitle from "@/components/dashboard/account/WeightedBorrowsTitle";
import {
  QueryParams as AccountOverviewQueryParams,
  Tab as AccountOverviewTab,
} from "@/components/dashboard/account-overview/AccountOverviewDialog";
import Card from "@/components/dashboard/Card";
import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import ParentLendingMarket from "@/components/shared/ParentLendingMarket";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import UtilizationBar, {
  getWeightedBorrowsUsd,
} from "@/components/shared/UtilizationBar";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { QueryParams as DashboardQueryParams } from "@/contexts/DashboardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import {
  BORROWS_TOOLTIP,
  DEPOSITS_TOOLTIP,
  NET_APR_TOOLTIP,
} from "@/lib/tooltips";
import { cn } from "@/lib/utils";

export default function AccountsCard() {
  const router = useRouter();

  const { explorer } = useSettingsContext();
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { allUserData, obligationMap } = useLoadedUserContext();

  const openAccountOverviewTab = (
    lendingMarketId: string | undefined,
    tab: AccountOverviewTab,
  ) => {
    const newQueryParams: Record<string, string> = {
      [AccountOverviewQueryParams.TAB]: tab,
    };
    if (lendingMarketId)
      newQueryParams[DashboardQueryParams.LENDING_MARKET_ID] = lendingMarketId;

    shallowPushQuery(router, {
      ...router.query,
      ...newQueryParams,
    });
  };

  const filteredAppData = useMemo(
    () =>
      Object.values(allAppData.allLendingMarketData).filter((appData) => {
        const obligation = obligationMap[appData.lendingMarket.id];

        if (!obligation) return false;
        if (appData.lendingMarket.isHidden && address !== ADMIN_ADDRESS)
          return false;

        return true;
      }),
    [allAppData.allLendingMarketData, obligationMap, address],
  );

  if (!address) return null;
  if (filteredAppData.length === 0)
    return (
      <Card
        headerProps={{
          title: "Account",
          noSeparator: true,
        }}
      >
        <CardContent>
          <TLabelSans>
            No active positions. Get started by depositing assets.
          </TLabelSans>
        </CardContent>
      </Card>
    );
  return (
    <Card
      id="accounts"
      headerProps={{
        titleIcon: filteredAppData.length === 1 ? <User /> : <UsersRound />,
        title: filteredAppData.length === 1 ? "Account" : "Accounts",
        noSeparator: true,
        startContent: filteredAppData.length === 1 && (
          <div className="flex h-4 cursor-auto flex-row items-center">
            <CopyToClipboardButton
              value={Object.values(obligationMap)[0]!.id}
            />
            <OpenOnExplorerButton
              url={explorer.buildObjectUrl(Object.values(obligationMap)[0]!.id)}
            />
            <Button
              className="text-muted-foreground"
              tooltip="Overview"
              icon={<FileClock />}
              variant="ghost"
              size="icon"
              onClick={(e) => {
                openAccountOverviewTab(
                  filteredAppData[0].lendingMarket.id === LENDING_MARKET_ID
                    ? undefined
                    : filteredAppData[0].lendingMarket.id,
                  AccountOverviewTab.EARNINGS,
                );
                e.stopPropagation();
              }}
            >
              Overview
            </Button>
          </div>
        ),
      }}
    >
      <CardContent className="flex flex-col gap-px p-0">
        {filteredAppData.map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id]!;
          const userData = allUserData[appData.lendingMarket.id];

          const isLooping =
            appData.lendingMarket.id === LENDING_MARKET_ID &&
            getIsLooping(appData, obligation); // Main market only
          const wasLooping =
            appData.lendingMarket.id === LENDING_MARKET_ID &&
            getWasLooping(appData, obligation); // Main market only

          return (
            <div key={appData.lendingMarket.id} className="w-full">
              <ParentLendingMarket
                id={`accounts-${appData.lendingMarket.id}`}
                lendingMarketId={appData.lendingMarket.id}
                count={formatUsd(obligation.netValueUsd)}
                startContent={
                  <div className="flex h-4 cursor-auto flex-row items-center">
                    <CopyToClipboardButton value={obligation.id} />
                    <OpenOnExplorerButton
                      url={explorer.buildObjectUrl(obligation.id)}
                    />
                    <Button
                      className="text-muted-foreground"
                      tooltip="Overview"
                      icon={<FileClock />}
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        openAccountOverviewTab(
                          appData.lendingMarket.id === LENDING_MARKET_ID
                            ? undefined
                            : appData.lendingMarket.id,
                          AccountOverviewTab.EARNINGS,
                        );
                        e.stopPropagation();
                      }}
                    >
                      Overview
                    </Button>
                  </div>
                }
                noHeader={filteredAppData.length === 1}
              >
                <div
                  className={cn(
                    "flex w-full flex-col gap-4 p-4",
                    filteredAppData.length === 1 && "pt-0",
                  )}
                >
                  {/* Equity */}
                  <div className="relative w-full">
                    <div className="absolute bottom-0 left-0 right-2/3 top-0 z-[1] rounded-l-sm bg-gradient-to-r from-primary/20 to-transparent" />

                    <div className="relative z-[2] flex flex-row items-center justify-around gap-1 rounded-sm border border-primary/5 px-4 py-3">
                      <div className="flex flex-col items-center gap-1">
                        <LabelWithTooltip className="text-center">
                          Equity
                        </LabelWithTooltip>
                        <Tooltip
                          title={formatUsd(obligation.netValueUsd, {
                            exact: true,
                          })}
                        >
                          <TBody className="w-max text-center">
                            {formatUsd(obligation.netValueUsd)}
                          </TBody>
                        </Tooltip>
                      </div>

                      <TLabelSans>=</TLabelSans>

                      <div className="flex flex-col items-center gap-1">
                        <LabelWithTooltip
                          className="text-center"
                          tooltip={DEPOSITS_TOOLTIP}
                        >
                          Deposits
                        </LabelWithTooltip>
                        <Tooltip
                          title={formatUsd(obligation.depositedAmountUsd, {
                            exact: true,
                          })}
                        >
                          <TBody className="w-max text-center">
                            {formatUsd(obligation.depositedAmountUsd)}
                          </TBody>
                        </Tooltip>
                      </div>

                      <TLabelSans>-</TLabelSans>

                      <div className="flex flex-col items-center gap-1">
                        <LabelWithTooltip
                          className="text-center"
                          tooltip={BORROWS_TOOLTIP}
                        >
                          Borrows
                        </LabelWithTooltip>
                        <Tooltip
                          title={formatUsd(obligation.borrowedAmountUsd, {
                            exact: true,
                          })}
                        >
                          <TBody className="w-max text-center">
                            {formatUsd(obligation.borrowedAmountUsd)}
                          </TBody>
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  {/* Net APR */}
                  <div className="flex flex-row items-center justify-between gap-2">
                    <LabelWithTooltip tooltip={NET_APR_TOOLTIP}>
                      Net APR
                    </LabelWithTooltip>
                    <TBody
                      className={cn(
                        "w-max text-right",
                        (isLooping || wasLooping) && "text-warning",
                      )}
                    >
                      {formatPercent(
                        getNetAprPercent(
                          obligation,
                          userData.rewardMap,
                          allAppData.lstMap,
                        ),
                      )}
                    </TBody>
                  </div>

                  {/* Utilization bar */}
                  {obligation.positionCount > 0 && (
                    <>
                      <div className="flex flex-row justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <WeightedBorrowsTitle />
                          <Tooltip
                            title={formatUsd(
                              getWeightedBorrowsUsd(obligation),
                              {
                                exact: true,
                              },
                            )}
                          >
                            <TBody className="w-max">
                              {formatUsd(getWeightedBorrowsUsd(obligation))}
                            </TBody>
                          </Tooltip>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <BorrowLimitTitle />
                          <Tooltip
                            title={formatUsd(
                              obligation.minPriceBorrowLimitUsd,
                              {
                                exact: true,
                              },
                            )}
                          >
                            <TBody className="w-max text-center">
                              {formatUsd(obligation.minPriceBorrowLimitUsd)}
                            </TBody>
                          </Tooltip>
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <LiquidationThresholdTitle />
                          <Tooltip
                            title={formatUsd(
                              obligation.unhealthyBorrowValueUsd,
                              {
                                exact: true,
                              },
                            )}
                          >
                            <TBody className="w-max text-right">
                              {formatUsd(obligation.unhealthyBorrowValueUsd)}
                            </TBody>
                          </Tooltip>
                        </div>
                      </div>

                      <UtilizationBar obligation={obligation} />
                      <AccountBreakdown />
                    </>
                  )}
                </div>
              </ParentLendingMarket>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
