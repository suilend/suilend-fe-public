import BigNumber from "bignumber.js";

import {
  COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP,
  Token,
} from "@suilend/frontend-sui";
import useIsTouchscreen from "@suilend/frontend-sui/hooks/useIsTouchscreen";
import { ParsedReserve } from "@suilend/sdk/parsers";

import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { getSwapUrl } from "@/contexts/SwapContext";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AssetCellProps {
  isBalance?: boolean;
  reserve?: ParsedReserve;
  token: Token;
  price?: BigNumber;
}

export default function AssetCell({
  isBalance,
  reserve,
  token,
  price,
}: AssetCellProps) {
  const isTouchscreen = useIsTouchscreen();

  return (
    <div className="flex flex-row items-center gap-3">
      <TokenLogo showTooltip token={token} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-baseline gap-2">
          <TBody>{token.symbol}</TBody>

          {isBalance && (
            <TextLink
              className={cn(
                "swapLink block shrink-0 text-xs uppercase text-muted-foreground no-underline opacity-0 hover:text-foreground focus:text-foreground focus:opacity-100",
                isTouchscreen && "opacity-100",
              )}
              href={getSwapUrl(
                reserve ? token.symbol : token.coinType,
                token.symbol !== "USDC" ? "USDC" : "SUI",
              )}
              isRelative
              noIcon
            >
              Swap
            </TextLink>
          )}
        </div>
        <TLabel>
          {reserve
            ? reserve.priceIdentifier !==
              COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[reserve.coinType]
                ?.priceIdentifier
              ? "--"
              : formatPrice(reserve.price)
            : price === undefined
              ? "--"
              : formatPrice(price)}
        </TLabel>
      </div>
    </div>
  );
}
