import { ReservesRowData } from "@/components/dashboard/market-table/MarketTable";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel } from "@/components/shared/Typography";
import { formatToken, formatUsd } from "@/lib/format";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface TotalCellProps {
  token: ReservesRowData["token"];
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
  token,
  total,
  totalUsd,
  tooltip,
  horizontal,
}: TotalCellProps) {
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
      <Tooltip title={formatUsd(totalUsd, { exact: true })}>
        <TLabel className="text-right">{formatUsd(totalUsd)}</TLabel>
      </Tooltip>
    </div>
  );
}
