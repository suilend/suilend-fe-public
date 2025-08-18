import BigNumber from "bignumber.js";

import { ParsedReserve } from "@suilend/sdk";
import { formatToken, formatUsd } from "@suilend/sui-fe";

import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface PnlLabelWithValueProps {
  reserve: ParsedReserve;
  label: string;
  labelTooltip?: string;
  pnlAmount?: BigNumber;
}

export default function PnlLabelWithValue({
  reserve,
  label,
  labelTooltip,
  pnlAmount,
}: PnlLabelWithValueProps) {
  return (
    <LabelWithValue
      className="items-start"
      labelClassName="my-[2px]"
      label={label}
      labelTooltip={labelTooltip}
      value="0"
      horizontal
      customChild={
        <div className="flex flex-row items-baseline gap-2">
          {pnlAmount === undefined ? (
            <Skeleton className="h-4 w-12" />
          ) : (
            <Tooltip title="Estimate calculated using current prices">
              <TLabel
                className={cn(
                  "text-right decoration-muted-foreground/50",
                  pnlAmount.gt(0) && "text-success decoration-success/50",
                  pnlAmount.lt(0) &&
                    "text-destructive decoration-destructive/50",
                  hoverUnderlineClassName,
                )}
              >
                {new BigNumber(pnlAmount.times(reserve.price)).eq(0)
                  ? undefined
                  : new BigNumber(pnlAmount.times(reserve.price)).gte(0)
                    ? "+"
                    : "-"}
                {formatUsd(pnlAmount.times(reserve.price))}
              </TLabel>
            </Tooltip>
          )}

          {pnlAmount === undefined ? (
            <Skeleton className="h-5 w-16" />
          ) : (
            <Tooltip
              title={`${
                new BigNumber(pnlAmount.times(reserve.price)).eq(0)
                  ? ""
                  : new BigNumber(pnlAmount.times(reserve.price)).gte(0)
                    ? "+"
                    : "-"
              }${formatToken(pnlAmount.abs(), {
                dp: reserve.token.decimals,
              })} ${reserve.token.symbol}`}
            >
              <TBody
                className={cn(
                  "text-right",
                  pnlAmount.gt(0) && "text-success",
                  pnlAmount.lt(0) && "text-destructive",
                )}
              >
                {new BigNumber(pnlAmount.times(reserve.price)).eq(0)
                  ? undefined
                  : new BigNumber(pnlAmount.times(reserve.price)).gte(0)
                    ? "+"
                    : "-"}
                {formatToken(pnlAmount.abs(), { exact: false })}{" "}
                {reserve.token.symbol}
              </TBody>
            </Tooltip>
          )}
        </div>
      }
    />
  );
}
