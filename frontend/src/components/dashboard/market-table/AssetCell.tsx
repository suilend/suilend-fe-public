import { MouseEvent, useMemo } from "react";

import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_WAL_COINTYPE,
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  TX_TOAST_DURATION,
  Token,
  formatPrice,
  formatToken,
  getBalanceChange,
  getMsafeAppStoreUrl,
  getToken,
  isInMsafeApp,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import useIsTouchscreen from "@suilend/frontend-sui-next/hooks/useIsTouchscreen";
import { ParsedReserve } from "@suilend/sdk/parsers";

import { AccountAssetTableType } from "@/components/dashboard/AccountAssetTable";
import { MarketCardListType } from "@/components/dashboard/market-table/MarketCardList";
import { MarketTableType } from "@/components/dashboard/market-table/MarketTable";
import Button from "@/components/shared/Button";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabel } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { getSwapUrl } from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { SPRINGSUI_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

const WALRUS_PACKAGE_ID =
  "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77";
const WALRUS_STAKING_OBJECT_ID =
  "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904";

const SUILEND_NODE_ID =
  "0xe5cc25058895aeb7024ff044c17f4939f34f5c4df36744af1aae34e28a0510b5";

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
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData, isLst } = useLoadedAppContext();
  const { getBalance, refresh } = useLoadedUserContext();

  const isTouchscreen = useIsTouchscreen();

  // Links
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

  // Stake WAL
  const stakeWal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!address) return;

    const transaction = new Transaction();

    try {
      const balance = getBalance(NORMALIZED_WAL_COINTYPE);
      if (balance.lt(1)) throw new Error("Minimum stake is 1 WAL");

      const submitAmount = balance
        .times(10 ** appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals)
        .integerValue(BigNumber.ROUND_DOWN)
        .toString();

      const coin = coinWithBalance({
        balance: BigInt(submitAmount),
        type: NORMALIZED_WAL_COINTYPE,
        useGasCoin: false,
      })(transaction);
      // transaction.transferObjects([coin], transaction.pure.address(address));

      const stakedWal = transaction.moveCall({
        target: `${WALRUS_PACKAGE_ID}::staking::stake_with_pool`,
        arguments: [
          transaction.object(WALRUS_STAKING_OBJECT_ID),
          transaction.object(coin),
          transaction.pure.id(SUILEND_NODE_ID),
        ],
      });
      transaction.transferObjects(
        [stakedWal],
        transaction.pure.address(address),
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChangeOut = getBalanceChange(
        res,
        address,
        getToken(
          NORMALIZED_WAL_COINTYPE,
          appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE],
        ),
        -1,
      );

      const balanceChangeOutFormatted = formatToken(
        balanceChangeOut !== undefined ? balanceChangeOut : balance,
        {
          dp: appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals,
          trimTrailingZeros: true,
        },
      );

      toast.success(`Staked ${balanceChangeOutFormatted} WAL`, {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      toast.error("Failed to stake WAL", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

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
          {(tableType === AccountAssetTableType.BALANCES ||
            tableType === MarketTableType.MARKET) &&
            token.coinType === NORMALIZED_WAL_COINTYPE &&
            address &&
            getBalance(NORMALIZED_WAL_COINTYPE).gt(0) && (
              <Button
                className={cn(
                  "hoverLink h-auto px-0 py-0 text-muted-foreground opacity-0 hover:bg-transparent hover:text-foreground",
                  isTouchscreen && "opacity-100",
                )}
                labelClassName="uppercase text-xs"
                variant="ghost"
                onClick={stakeWal}
              >
                Stake
              </Button>
            )}
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
