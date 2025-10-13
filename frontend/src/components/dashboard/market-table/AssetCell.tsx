import { useMemo } from "react";

import BigNumber from "bignumber.js";

import { ParsedReserve } from "@suilend/sdk/parsers";
import {
  NORMALIZED_SUI_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  Token,
  formatPrice,
  getMsafeAppStoreUrl,
  isInMsafeApp,
} from "@suilend/sui-fe";
import useIsTouchscreen from "@suilend/sui-fe-next/hooks/useIsTouchscreen";

import { AccountAssetTableType } from "@/components/dashboard/AccountAssetTable";
import { MarketCardListType } from "@/components/dashboard/market-table/MarketCardList";
import { MarketTableType } from "@/components/dashboard/market-table/MarketTable";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { SPRINGSUI_URL } from "@/lib/navigation";
import { getSwapUrl } from "@/lib/swap";
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

  // Links
  const links: { title: string; href: string; isRelative?: boolean }[] =
    useMemo(() => {
      const result = [];

      if (
        (tableType === AccountAssetTableType.DEPOSITS ||
          tableType === AccountAssetTableType.BORROWS) &&
        !isInMsafeApp()
      ) {
        result.push({
          title: "Swap",
          href:
            // Swap deposited token to SUI/USDC (to deposit)
            tableType === AccountAssetTableType.DEPOSITS
              ? `${getSwapUrl(
                  reserve ? token.symbol : token.coinType,
                  token.coinType !== NORMALIZED_SUI_COINTYPE ? "SUI" : "USDC",
                )}?${new URLSearchParams({ swapInAccount: "true" }).toString()}`
              : // Swap deposited SUI/USDC to borrowed token (to repay)
                tableType === AccountAssetTableType.BORROWS
                ? `${getSwapUrl(
                    token.coinType !== NORMALIZED_SUI_COINTYPE ? "SUI" : "USDC",
                    reserve ? token.symbol : token.coinType,
                  )}?${new URLSearchParams({ swapInAccount: "true" }).toString()}`
                : // Swap token in wallet to SUI/USDC (to wallet)
                  getSwapUrl(
                    reserve ? token.symbol : token.coinType,
                    token.coinType !== NORMALIZED_SUI_COINTYPE ? "SUI" : "USDC",
                  ),
          isRelative: true,
        });
      }
      if (
        tableType === MarketTableType.MARKET &&
        token.coinType === NORMALIZED_SUI_COINTYPE
      ) {
        result.push({
          title: "Stake",
          href: !isInMsafeApp()
            ? `${SPRINGSUI_URL}/SUI-sSUI`
            : getMsafeAppStoreUrl("SpringSui"),
        });
      }
      if (tableType === MarketTableType.MARKET && isLst(token.coinType)) {
        result.push({
          title: "Stake",
          href: !isInMsafeApp()
            ? `${SPRINGSUI_URL}/SUI-${token.symbol}`
            : getMsafeAppStoreUrl("SpringSui"),
        });
      }

      return result;
    }, [tableType, token, reserve, isLst]);

  return (
    <div className="flex flex-row items-center gap-3">
      <TokenLogo token={token} size={28} showBridgedAssetTooltip />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row flex-wrap items-baseline gap-x-2 gap-y-1">
          <TBody>{token.symbol}</TBody>

          {links.map((link) => (
            <TextLink
              key={link.title}
              className={cn(
                "hoverLink block shrink-0 text-xs uppercase text-muted-foreground no-underline hover:text-foreground",
                isTouchscreen && "!opacity-100",
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
          {price !== undefined &&
          (!reserve ||
            !TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType))
            ? formatPrice(price)
            : "--"}
        </TLabel>
      </div>
    </div>
  );
}
