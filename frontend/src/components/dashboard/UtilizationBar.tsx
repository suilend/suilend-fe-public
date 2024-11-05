import React, { CSSProperties } from "react";

import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import { AlertTriangle } from "lucide-react";

import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import BorrowLimitTitle from "@/components/dashboard/account/BorrowLimitTitle";
import LiquidationThresholdTitle from "@/components/dashboard/account/LiquidationThresholdTitle";
import WeightedBorrowsTitle from "@/components/dashboard/account/WeightedBorrowsTitle";
import Tooltip from "@/components/shared/Tooltip";
import { TBodySans } from "@/components/shared/Typography";
import { useAppContext } from "@/contexts/AppContext";
import { formatPercent, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const getBorrowLimitUsd = (obligation: ParsedObligation) =>
  obligation.minPriceBorrowLimitUsd;

export const getWeightedBorrowsUsd = (obligation: ParsedObligation) => {
  return obligation.maxPriceWeightedBorrowsUsd.gt(getBorrowLimitUsd(obligation))
    ? BigNumber.max(
        obligation.weightedBorrowsUsd,
        getBorrowLimitUsd(obligation),
      )
    : obligation.maxPriceWeightedBorrowsUsd;
};

const getPassedBorrowLimit = (obligation: ParsedObligation) => {
  const weightedBorrowsUsd = getWeightedBorrowsUsd(obligation);
  const borrowLimitUsd = getBorrowLimitUsd(obligation);

  if (weightedBorrowsUsd.eq(0) && borrowLimitUsd.eq(0)) return false;
  return weightedBorrowsUsd.gte(borrowLimitUsd);
};

const getPassedLiquidationThreshold = (obligation: ParsedObligation) => {
  const weightedBorrowsUsd = getWeightedBorrowsUsd(obligation);
  const liquidationThreshold = obligation.unhealthyBorrowValueUsd;

  if (weightedBorrowsUsd.eq(0) && liquidationThreshold.eq(0)) return false;
  return weightedBorrowsUsd.gte(liquidationThreshold);
};

export const getWeightedBorrowsColor = (obligation: ParsedObligation) => {
  const passedBorrowLimit = getPassedBorrowLimit(obligation);
  const passedLiquidationThreshold = getPassedLiquidationThreshold(obligation);

  if (!passedBorrowLimit) return "foreground";
  if (!passedLiquidationThreshold) return "warning";
  return "destructive";
};

interface SegmentProps {
  className?: ClassValue;
  style?: CSSProperties;
  widthPercent: number;
}

function Segment({ className, style, widthPercent }: SegmentProps) {
  if (widthPercent === 0) return null;
  return (
    <div
      className={cn("relative z-[1] h-full bg-muted/20", className)}
      style={{ width: `${widthPercent}%`, ...style }}
    />
  );
}

interface ThresholdProps {
  className?: ClassValue;
  leftPercent: number;
}

function Threshold({ className, leftPercent }: ThresholdProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 top-0 z-[2] w-1 -translate-x-2/4",
        className,
      )}
      style={{ left: `${leftPercent}%` }}
    />
  );
}

interface UtilizationBarProps {
  className?: ClassValue;
  obligation?: ParsedObligation | null;
  noTooltip?: boolean;
}

export default function UtilizationBar({
  className,
  obligation,
  noTooltip,
}: UtilizationBarProps) {
  const appContext = useAppContext();

  if (!obligation) obligation = appContext.obligation;
  if (!obligation) return null;

  const depositedAmountUsd = obligation.depositedAmountUsd;
  if (depositedAmountUsd.eq(0)) return null;

  const weightedBorrowsUsd = getWeightedBorrowsUsd(obligation);
  const borrowLimitUsd = getBorrowLimitUsd(obligation);
  const liquidationThresholdUsd = obligation.unhealthyBorrowValueUsd;

  const passedBorrowLimit = getPassedBorrowLimit(obligation);
  const passedLiquidationThreshold = getPassedLiquidationThreshold(obligation);

  const weightedBorrowsColor = getWeightedBorrowsColor(obligation);
  const WEIGHTED_BORROWS_SEGMENT_STYLE = {
    backgroundColor: `hsl(var(--${weightedBorrowsColor}))`,
  };

  const toPercent = (value: BigNumber) =>
    value.div(depositedAmountUsd).times(100).toNumber();

  const segments = (() => {
    if (!passedBorrowLimit) {
      return [
        {
          widthPercent: toPercent(weightedBorrowsUsd),
          style: WEIGHTED_BORROWS_SEGMENT_STYLE,
        },
        {
          widthPercent: toPercent(
            new BigNumber(borrowLimitUsd.minus(weightedBorrowsUsd)),
          ),
        },
        {
          widthPercent: toPercent(
            new BigNumber(liquidationThresholdUsd.minus(borrowLimitUsd)),
          ),
        },
        {
          widthPercent: toPercent(
            new BigNumber(depositedAmountUsd.minus(liquidationThresholdUsd)),
          ),
        },
      ];
    } else if (!passedLiquidationThreshold) {
      return [
        {
          widthPercent: toPercent(weightedBorrowsUsd),
          style: WEIGHTED_BORROWS_SEGMENT_STYLE,
        },
        {
          widthPercent: toPercent(
            new BigNumber(liquidationThresholdUsd.minus(weightedBorrowsUsd)),
          ),
        },
        {
          widthPercent: toPercent(
            new BigNumber(depositedAmountUsd.minus(liquidationThresholdUsd)),
          ),
        },
      ];
    } else {
      return [
        {
          widthPercent: toPercent(weightedBorrowsUsd),
          style: WEIGHTED_BORROWS_SEGMENT_STYLE,
        },
        {
          widthPercent: toPercent(
            new BigNumber(depositedAmountUsd.minus(weightedBorrowsUsd)),
          ),
        },
      ];
    }
  })();

  const thresholds = [
    {
      leftPercent: toPercent(borrowLimitUsd),
      className: "bg-primary",
    },
    {
      leftPercent: toPercent(liquidationThresholdUsd),
      className: "bg-secondary",
    },
  ];

  // Tooltip
  const weightedBorrowsTooltip = (
    <>
      {"Your weighted borrows are "}
      <span className="">{formatUsd(weightedBorrowsUsd)}</span>
      {", which is"}
      <br />
      {"• "}
      <span className="">
        {formatPercent(
          !borrowLimitUsd.eq(0)
            ? weightedBorrowsUsd.div(borrowLimitUsd).times(100)
            : new BigNumber(0),
        )}
      </span>
      {" of your borrow limit"}
      <br />
      {"• "}
      <span className="">
        {formatPercent(
          !liquidationThresholdUsd.eq(0)
            ? weightedBorrowsUsd.div(liquidationThresholdUsd).times(100)
            : new BigNumber(0),
        )}
      </span>
      {" of your liquidation threshold"}
      <br />
      {"• "}
      <span className="">
        {formatPercent(weightedBorrowsUsd.div(depositedAmountUsd).times(100))}
      </span>
      {" of your deposited balance"}
      {passedBorrowLimit &&
        (!passedLiquidationThreshold ? (
          <>
            <span className="mt-2 block rounded-md bg-warning/10 p-2 text-warning">
              <span className="mr-2 font-medium">
                <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                Warning
              </span>
              Your weighted borrows exceed your borrow limit. Repay your borrows
              or deposit more assets to avoid liquidation.
            </span>
          </>
        ) : (
          <>
            <span className="mt-2 block rounded-md bg-destructive/10 p-2 text-destructive">
              <span className="mr-2 font-medium">
                <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                Danger
              </span>
              Your weighted borrows exceed your liquidation threshold, putting
              your account at risk of liquidation.
            </span>
          </>
        ))}
    </>
  );
  const borrowLimitTooltip = (
    <>
      {"Your borrow limit is "}
      <span className="">{formatUsd(borrowLimitUsd)}</span>
      {", or "}
      <span className="">
        {formatPercent(borrowLimitUsd.div(depositedAmountUsd).times(100))}
      </span>
      {" of your deposited balance."}
    </>
  );
  const liquidationThresholdTooltip = (
    <>
      {"Your liquidation threshold is "}
      <span className="">{formatUsd(liquidationThresholdUsd)}</span>
      {", or "}
      <span className="">
        {formatPercent(
          liquidationThresholdUsd.div(depositedAmountUsd).times(100),
        )}
      </span>
      {" of your deposited balance."}
    </>
  );

  return (
    <Tooltip
      contentProps={{
        className: "px-4 py-4 flex-col flex gap-4 w-max",
        style: {
          maxWidth: "var(--radix-popper-anchor-width)",
        },
        align: "start",
      }}
      content={
        noTooltip ? undefined : (
          <>
            <div className="flex flex-col gap-2">
              <WeightedBorrowsTitle noTooltip />
              <TBodySans className="text-xs">
                {weightedBorrowsTooltip}
              </TBodySans>
            </div>

            <div className="flex flex-col gap-2">
              <BorrowLimitTitle noTooltip />
              <TBodySans className="text-xs">{borrowLimitTooltip}</TBodySans>
            </div>

            <div className="flex flex-col gap-2">
              <LiquidationThresholdTitle noTooltip />
              <TBodySans className="text-xs">
                {liquidationThresholdTooltip}
              </TBodySans>
            </div>
          </>
        )
      }
    >
      <div className={cn("relative flex h-2.5 w-full flex-row", className)}>
        {segments.map((segment, index) => (
          <Segment key={index} {...segment} />
        ))}
        {thresholds.map((threshold, index) => (
          <Threshold key={index} {...threshold} />
        ))}
      </div>
    </Tooltip>
  );
}
