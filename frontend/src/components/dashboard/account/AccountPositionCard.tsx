import { useRouter } from "next/router";

import { FileClock } from "lucide-react";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import AccountBreakdown from "@/components/dashboard/account/AccountBreakdown";
import BorrowLimitTitle from "@/components/dashboard/account/BorrowLimitTitle";
import LiquidationThresholdTitle from "@/components/dashboard/account/LiquidationThresholdTitle";
import WeightedBorrowsTitle from "@/components/dashboard/account/WeightedBorrowsTitle";
import {
  QueryParams as AccountOverviewQueryParams,
  Tab as AccountOverviewTab,
} from "@/components/dashboard/account-overview/AccountOverviewDialog";
import Card from "@/components/dashboard/Card";
import UtilizationBar, {
  getWeightedBorrowsUsd,
} from "@/components/dashboard/UtilizationBar";
import Button from "@/components/shared/Button";
import LabelWithTooltip from "@/components/shared/LabelWithTooltip";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { formatPercent, formatUsd } from "@/lib/format";
import { getNetAprPercent } from "@/lib/liquidityMining";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import { shallowPushQuery } from "@/lib/router";
import {
  BORROWS_TOOLTIP,
  DEPOSITS_TOOLTIP,
  NET_APR_TOOLTIP,
} from "@/lib/tooltips";
import { cn } from "@/lib/utils";

function AccountPositionCardContent() {
  const appContext = useAppContext();
  const data = appContext.data as AppData;
  const obligation = appContext.obligation as ParsedObligation;

  const isLooping = getIsLooping(data, obligation);
  const wasLooping = getWasLooping(data, obligation);

  // APR
  const netAprPercent = getNetAprPercent(obligation, data.rewardMap);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full">
        <div className="absolute bottom-0 left-0 right-2/3 top-0 z-[1] rounded-l-sm bg-gradient-to-r from-primary/20 to-transparent" />

        <div className="relative z-[2] flex flex-row items-center justify-around gap-1 rounded-sm border border-primary/5 px-4 py-3">
          <div className="flex flex-col items-center gap-1">
            <LabelWithTooltip className="text-center">Equity</LabelWithTooltip>
            <Tooltip title={formatUsd(obligation.netValueUsd, { exact: true })}>
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
              title={formatUsd(obligation.depositedAmountUsd, { exact: true })}
            >
              <TBody className="w-max text-center">
                {formatUsd(obligation.depositedAmountUsd)}
              </TBody>
            </Tooltip>
          </div>

          <TLabelSans>-</TLabelSans>

          <div className="flex flex-col items-center gap-1">
            <LabelWithTooltip className="text-center" tooltip={BORROWS_TOOLTIP}>
              Borrows
            </LabelWithTooltip>
            <Tooltip
              title={formatUsd(obligation.borrowedAmountUsd, { exact: true })}
            >
              <TBody className="w-max text-center">
                {formatUsd(obligation.borrowedAmountUsd)}
              </TBody>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="flex flex-row items-center justify-between gap-2">
        <LabelWithTooltip tooltip={NET_APR_TOOLTIP}>Net APR</LabelWithTooltip>
        <TBody
          className={cn(
            "w-max text-right",
            (isLooping || wasLooping) && "text-warning",
          )}
        >
          {formatPercent(netAprPercent)}
        </TBody>
      </div>

      {obligation.positionCount > 0 && (
        <>
          <Separator />

          <div className="flex flex-row justify-between gap-2">
            <div className="flex flex-col gap-1">
              <WeightedBorrowsTitle />
              <Tooltip
                title={formatUsd(getWeightedBorrowsUsd(obligation), {
                  exact: true,
                })}
              >
                <TBody className="w-max">
                  {formatUsd(getWeightedBorrowsUsd(obligation))}
                </TBody>
              </Tooltip>
            </div>

            <div className="flex flex-col items-end gap-1">
              <BorrowLimitTitle />
              <Tooltip
                title={formatUsd(obligation.minPriceBorrowLimitUsd, {
                  exact: true,
                })}
              >
                <TBody className="w-max text-right">
                  {formatUsd(obligation.minPriceBorrowLimitUsd)}
                </TBody>
              </Tooltip>
            </div>
          </div>

          <UtilizationBar />

          <div className="flex flex-row items-center justify-between gap-2">
            <LiquidationThresholdTitle />
            <Tooltip
              title={formatUsd(obligation.unhealthyBorrowValueUsd, {
                exact: true,
              })}
            >
              <TBody className="w-max text-right">
                {formatUsd(obligation.unhealthyBorrowValueUsd)}
              </TBody>
            </Tooltip>
          </div>

          <AccountBreakdown />
        </>
      )}
    </div>
  );
}

export default function AccountPositionCard() {
  const router = useRouter();
  const { address } = useWalletContext();
  const { obligation } = useAppContext();

  const openAccountOverviewTab = (tab: AccountOverviewTab) => {
    shallowPushQuery(router, {
      ...router.query,
      [AccountOverviewQueryParams.TAB]: tab,
    });
  };

  return (
    <Card
      id={address && obligation ? "position" : undefined}
      headerProps={{
        title: "Account",
        endContent: address && obligation && (
          <>
            <Button
              labelClassName="uppercase text-xs"
              startIcon={<FileClock />}
              variant="secondaryOutline"
              onClick={() =>
                openAccountOverviewTab(AccountOverviewTab.EARNINGS)
              }
            >
              Overview
            </Button>
          </>
        ),
        noSeparator: true,
      }}
    >
      <CardContent>
        {!address ? (
          <TLabelSans>Get started by connecting your wallet.</TLabelSans>
        ) : !obligation ? (
          <TLabelSans>
            No active positions. Get started by depositing assets.
          </TLabelSans>
        ) : (
          <AccountPositionCardContent />
        )}
      </CardContent>
    </Card>
  );
}
