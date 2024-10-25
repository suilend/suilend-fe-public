import BigNumber from "bignumber.js";

import { ParsedReserve } from "@suilend/sdk/parsers";

import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { getSwapUrl } from "@/contexts/SwapContext";
import useIsTouchscreen from "@/hooks/useIsTouchscreen";
import { COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP } from "@/lib/coinType";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AssetCellProps {
  isBalance?: boolean;
  coinType: string;
  price: BigNumber;
  symbol: string;
  iconUrl?: string | null;
  reserve: ParsedReserve;
}

export default function AssetCell({
  isBalance,
  coinType,
  price,
  symbol,
  iconUrl,
  reserve,
}: AssetCellProps) {
  const isTouchscreen = useIsTouchscreen();

  return (
    <div className="flex flex-row items-center gap-3">
      <TokenLogo showTooltip token={{ coinType, symbol, iconUrl }} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-baseline gap-2">
          <TBody>{symbol}</TBody>

          {isBalance && (
            <TextLink
              className={cn(
                "swapLink block shrink-0 text-xs uppercase text-muted-foreground no-underline opacity-0 hover:text-foreground focus:text-foreground focus:opacity-100",
                isTouchscreen && "opacity-100",
              )}
              href={getSwapUrl(symbol, symbol !== "USDC" ? "USDC" : "SUI")}
              isRelative
              noIcon
            >
              Swap
            </TextLink>
          )}
        </div>
        <TLabel>
          {reserve.priceIdentifier !==
          COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[reserve.coinType].priceIdentifier
            ? "--"
            : formatPrice(price)}
        </TLabel>
      </div>
    </div>
  );
}
