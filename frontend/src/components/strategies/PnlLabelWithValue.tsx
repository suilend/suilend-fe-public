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
  pnlAmount?: BigNumber;
}

export default function PnlLabelWithValue({
  reserve,
  pnlAmount,
}: PnlLabelWithValueProps) {
  return (
    <LabelWithValue
      className="items-start"
      labelClassName="my-[2px]"
      label="PnL"
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
              title={`${formatToken(pnlAmount.abs(), {
                prefix: pnlAmount.eq(0)
                  ? undefined
                  : pnlAmount.gte(0)
                    ? "+"
                    : "-",
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
                {formatToken(pnlAmount.abs(), {
                  prefix: pnlAmount.eq(0)
                    ? undefined
                    : pnlAmount.gte(0)
                      ? "+"
                      : "-",
                  exact: false,
                })}{" "}
                {reserve.token.symbol}
              </TBody>
            </Tooltip>
          )}
        </div>
      }
    />
  );
}
