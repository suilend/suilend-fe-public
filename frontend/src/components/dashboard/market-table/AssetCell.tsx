import { useMemo } from "react";

import BigNumber from "bignumber.js";

import {
  COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP,
  NORMALIZED_LST_COINTYPES,
  NORMALIZED_SUI_COINTYPE,
  Token,
  getMsafeAppStoreUrl,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import useIsTouchscreen from "@suilend/frontend-sui/hooks/useIsTouchscreen";
import { ParsedReserve } from "@suilend/sdk/parsers";

import { AccountAssetTableType } from "@/components/dashboard/AccountAssetTable";
import { MarketTableType } from "@/components/dashboard/market-table/MarketTable";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { getSwapUrl } from "@/contexts/SwapContext";
import { formatPrice } from "@/lib/format";
import { SPRINGSUI_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AssetCellProps {
  tableType: AccountAssetTableType | MarketTableType;
  reserve?: ParsedReserve;
  token: Token;
  price?: BigNumber;
}

export default function AssetCell({
  tableType,
  reserve,
  token,
  price,
}: AssetCellProps) {
  const isTouchscreen = useIsTouchscreen();

  const links: { title: string; href: string; isRelative?: boolean }[] =
    useMemo(() => {
      const result = [];

      if (tableType === AccountAssetTableType.BALANCES && !isInMsafeApp()) {
        result.push({
          title: "Swap",
          href: getSwapUrl(
            reserve ? token.symbol : token.coinType,
            token.symbol !== "USDC" ? "USDC" : "SUI",
          ),
          isRelative: true,
        });
      }
      if (
        (tableType === AccountAssetTableType.BALANCES ||
          tableType === MarketTableType.MARKET) &&
        NORMALIZED_LST_COINTYPES.includes(token.coinType)
      ) {
        result.push({
          title: "Mint",
          href: !isInMsafeApp()
            ? `${SPRINGSUI_URL}?${new URLSearchParams({
                lst: token.symbol,
              })}`
            : getMsafeAppStoreUrl("SpringSui"),
        });
      }
      if (
        (tableType === AccountAssetTableType.BALANCES ||
          tableType === MarketTableType.MARKET) &&
        token.coinType === NORMALIZED_SUI_COINTYPE
      ) {
        result.push({
          title: "Stake",
          href: !isInMsafeApp()
            ? SPRINGSUI_URL
            : getMsafeAppStoreUrl("SpringSui"),
        });
      }

      return result;
    }, [tableType, reserve, token]);

  return (
    <div className="flex flex-row items-center gap-3">
      <TokenLogo showTooltip token={token} />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-baseline gap-2">
          <TBody>{token.symbol}</TBody>

          {links.map((link) => (
            <TextLink
              key={link.title}
              className={cn(
                "hoverLink block shrink-0 text-xs uppercase text-muted-foreground no-underline opacity-0 hover:text-foreground",
                isTouchscreen && "opacity-100",
              )}
              href={link.href}
              isRelative={link.isRelative}
              noIcon
            >
              {link.title}
            </TextLink>
          ))}
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
