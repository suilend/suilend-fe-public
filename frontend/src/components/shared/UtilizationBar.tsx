import { CSSProperties } from "react";

import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import { AlertTriangle } from "lucide-react";

import { formatPercent } from "@suilend/frontend-sui";
import { ParsedObligation } from "@suilend/sdk/parsers/obligation";

import BorrowLimitTitle from "@/components/dashboard/account/BorrowLimitTitle";
import LiquidationThresholdTitle from "@/components/dashboard/account/LiquidationThresholdTitle";
import WeightedBorrowsTitle from "@/components/dashboard/account/WeightedBorrowsTitle";
import Tooltip from "@/components/shared/Tooltip";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

export const getWeightedBorrowsUsd = (obligation: ParsedObligation) => {
  return obligation.maxPriceWeightedBorrowsUsd.gt(
    obligation.minPriceBorrowLimitUsd,
  )
    ? BigNumber.max(
        obligation.weightedBorrowsUsd,
        obligation.minPriceBorrowLimitUsd,
      )
    : obligation.maxPriceWeightedBorrowsUsd;
};

const getPassedBorrowLimit = (obligation: ParsedObligation) => {
  const weightedBorrowsUsd = getWeightedBorrowsUsd(obligation);
  const borrowLimitUsd = obligation.minPriceBorrowLimitUsd;

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
  thresholdClassName?: ClassValue;
  obligation?: ParsedObligation;
  noTooltip?: boolean;
}

export default function UtilizationBar({
  thresholdClassName,
  obligation,
  noTooltip,
}: UtilizationBarProps) {
  const userContext = useLoadedUserContext();

  if (!obligation) obligation = userContext.obligation;
  if (!obligation) return null;

  const depositedAmountUsd = obligation.depositedAmountUsd;
  if (depositedAmountUsd.eq(0))
    return <div className="h-3 w-full bg-muted/20" />;

  const weightedBorrowsUsd = getWeightedBorrowsUsd(obligation);
  const borrowLimitUsd = obligation.minPriceBorrowLimitUsd;
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
      className: cn("bg-primary", thresholdClassName),
      leftPercent: toPercent(borrowLimitUsd),
    },
    {
      className: cn("bg-secondary", thresholdClassName),
      leftPercent: toPercent(liquidationThresholdUsd),
    },
  ];

  // Tooltip
  const weightedBorrowsTooltip = (
    <>
      {"• "}
      <span>
        {formatPercent(
          !borrowLimitUsd.eq(0)
            ? weightedBorrowsUsd.div(borrowLimitUsd).times(100)
            : new BigNumber(0),
        )}
      </span>
      {" of borrow limit"}
      <br />
      {"• "}
      <span>
        {formatPercent(
          !liquidationThresholdUsd.eq(0)
            ? weightedBorrowsUsd.div(liquidationThresholdUsd).times(100)
            : new BigNumber(0),
        )}
      </span>
      {" of liquidation threshold"}
      <br />
      {"• "}
      <span>
        {formatPercent(weightedBorrowsUsd.div(depositedAmountUsd).times(100))}
      </span>
      {" of deposited balance"}
    </>
  );
  const borrowLimitTooltip = (
    <>
      {"• "}
      <span>
        {formatPercent(
          !liquidationThresholdUsd.eq(0)
            ? borrowLimitUsd.div(liquidationThresholdUsd).times(100)
            : new BigNumber(0),
        )}
      </span>
      {" of liquidation threshold"}
      <br />
      {"• "}
      <span>
        {formatPercent(borrowLimitUsd.div(depositedAmountUsd).times(100))}
      </span>
      {" of deposited balance"}
    </>
  );
  const liquidationThresholdTooltip = (
    <>
      {"• "}
      <span>
        {formatPercent(
          liquidationThresholdUsd.div(depositedAmountUsd).times(100),
        )}
      </span>
      {" of deposited balance"}
    </>
  );

  return (
    <Tooltip
      contentProps={{
        className: "px-4 w-[240px] py-4 flex-col flex gap-4",
      }}
      content={
        noTooltip ? undefined : (
          <>
            <div className="flex flex-col gap-2">
              <WeightedBorrowsTitle
                className="text-sm text-foreground"
                noTooltip
                amount={weightedBorrowsUsd}
              />
              <TBodySans className="text-xs">
                {weightedBorrowsTooltip}
              </TBodySans>
              {passedBorrowLimit &&
                (!passedLiquidationThreshold ? (
                  <TLabelSans className="text-warning">
                    <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                    Weighted borrows exceed borrow limit. Repay borrows or
                    deposit more assets to avoid liquidation.
                  </TLabelSans>
                ) : (
                  <TLabelSans className="text-destructive">
                    <AlertTriangle className="mb-0.5 mr-1 inline h-3 w-3" />
                    Weighted borrows exceed liquidation threshold, putting
                    account at risk of liquidation.
                  </TLabelSans>
                ))}
            </div>

            <div className="flex flex-col gap-2">
              <BorrowLimitTitle
                className="text-sm text-foreground"
                noTooltip
                amount={borrowLimitUsd}
              />
              <TBodySans className="text-xs">{borrowLimitTooltip}</TBodySans>
            </div>

            <div className="flex flex-col gap-2">
              <LiquidationThresholdTitle
                className="text-sm text-foreground"
                noTooltip
                amount={liquidationThresholdUsd}
              />
              <TBodySans className="text-xs">
                {liquidationThresholdTooltip}
              </TBodySans>
            </div>
          </>
        )
      }
    >
      <div
        className={cn(
          !noTooltip &&
            "-mb-[3px] border-b border-dotted border-b-muted/40 pb-[2px]",
        )}
      >
        <div className="relative flex h-3 w-full flex-row">
          {segments.map((segment, index) => (
            <Segment key={index} {...segment} />
          ))}
          {thresholds.map((threshold, index) => (
            <Threshold key={index} {...threshold} />
          ))}
        </div>
      </div>
    </Tooltip>
  );
}
