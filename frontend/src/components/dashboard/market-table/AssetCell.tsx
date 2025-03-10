import { useMemo } from "react";

import BigNumber from "bignumber.js";

import {
  NORMALIZED_SUI_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  Token,
  formatPrice,
  getMsafeAppStoreUrl,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import useIsTouchscreen from "@suilend/frontend-sui-next/hooks/useIsTouchscreen";
import { ParsedReserve } from "@suilend/sdk/parsers";

import { AccountAssetTableType } from "@/components/dashboard/AccountAssetTable";
import { MarketCardListType } from "@/components/dashboard/market-table/MarketCardList";
import { MarketTableType } from "@/components/dashboard/market-table/MarketTable";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { getSwapUrl } from "@/contexts/SwapContext";
import { SPRINGSUI_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface AssetCellProps {
  tableType: AccountAssetTableType | MarketTableType | MarketCardListType;
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
  const { isLst } = useLoadedAppContext();

  const isTouchscreen = useIsTouchscreen();

  const links: { title: string; href: string; isRelative?: boolean }[] =
    useMemo(() => {
      const result = [];

      if (
        (tableType === AccountAssetTableType.DEPOSITS ||
          tableType === AccountAssetTableType.BALANCES) &&
        !isInMsafeApp()
      ) {
        result.push({
          title: "Swap",
          href: `${getSwapUrl(
            reserve ? token.symbol : token.coinType,
            token.symbol !== "USDC" ? "USDC" : "SUI",
          )}${tableType === AccountAssetTableType.DEPOSITS ? "?useDeposits=true" : ""}`,
          isRelative: true,
        });
      }
      if (
        (tableType === AccountAssetTableType.BALANCES ||
          tableType === MarketTableType.MARKET) &&
        isLst(token.coinType)
      ) {
        result.push({
          title: "Stake",
          href: !isInMsafeApp()
            ? `${SPRINGSUI_URL}/SUI-${token.symbol}`
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
    }, [tableType, reserve, token, isLst]);

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
            ? !TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType)
              ? formatPrice(reserve.price)
              : "--"
            : price !== undefined
              ? formatPrice(price)
              : "--"}
        </TLabel>
      </div>
    </div>
  );
}
