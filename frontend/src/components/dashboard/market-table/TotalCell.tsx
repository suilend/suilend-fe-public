import { TEMPORARY_PYTH_PRICE_FEED_COINTYPES } from "@suilend/frontend-sui";

import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel } from "@/components/shared/Typography";
import { formatToken, formatUsd } from "@/lib/format";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface TotalCellProps {
  reserve: ReservesRowData["reserve"];
  token: ReservesRowData["token"];
  limit: ReservesRowData["depositLimit"] | ReservesRowData["borrowLimit"];
  total: ReservesRowData["depositedAmount"] | ReservesRowData["borrowedAmount"];
  totalUsd:
    | ReservesRowData["depositedAmountUsd"]
    | ReservesRowData["borrowedAmountUsd"];
  tooltip?:
    | ReservesRowData["depositedAmountTooltip"]
    | ReservesRowData["borrowedAmountTooltip"];
  horizontal?: boolean;
}
export default function TotalCell({
  reserve,
  token,
  limit,
  total,
  totalUsd,
  tooltip,
  horizontal,
}: TotalCellProps) {
  if (limit.eq(0) && total.eq(0) && totalUsd.eq(0))
    return <TBody className="text-right text-muted-foreground">--</TBody>;
  return (
    <div
      className={cn(
        "flex flex-col items-end gap-1",
        horizontal && "flex-row-reverse items-baseline justify-end gap-2",
      )}
    >
      <Tooltip
        title={
          tooltip ??
          `${formatToken(total, { dp: token.decimals })} ${token.symbol}`
        }
      >
        <TBody
          className={cn(
            "min-w-max text-right",
            !!tooltip &&
              cn(
                "text-muted-foreground decoration-muted-foreground/50",
                hoverUnderlineClassName,
              ),
          )}
        >
          {formatToken(total, { exact: false })} {token.symbol}
        </TBody>
      </Tooltip>
      <Tooltip
        title={
          !TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType)
            ? formatUsd(totalUsd, { exact: true })
            : undefined
        }
      >
        <TLabel className="text-right">
          {!TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType)
            ? formatUsd(totalUsd)
            : "--"}
        </TLabel>
      </Tooltip>
    </div>
  );
}
