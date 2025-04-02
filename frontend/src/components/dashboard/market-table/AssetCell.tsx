import Image from "next/image";
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
  formatId,
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
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  DEFAULT_TOKEN_IN_SYMBOL as SWAP_DEFAULT_TOKEN_IN_SYMBOL,
  DEFAULT_TOKEN_OUT_SYMBOL as SWAP_DEFAULT_TOKEN_OUT_SYMBOL,
  getSwapUrl,
} from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";
import { SPRINGSUI_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import {
  SUILEND_WALRUS_NODE_ID,
  StakedWalObject,
  StakedWalState,
  WALRUS_PACKAGE_ID,
  WALRUS_STAKING_OBJECT_ID,
} from "@/lib/walrus";

interface AssetCellProps {
  tableType: AccountAssetTableType | MarketTableType | MarketCardListType;
  reserve?: ParsedReserve;
  token: Token;
  price?: BigNumber;
  extra?: Record<string, any>;
}

export default function AssetCell({
  tableType,
  reserve,
  token,
  price,
  extra,
}: AssetCellProps) {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData, isLst, walrusEpoch } = useLoadedAppContext();
  const { getBalance, refresh } = useLoadedUserContext();

  const isTouchscreen = useIsTouchscreen();

  // Links
  const links: { title: string; href: string; isRelative?: boolean }[] =
    useMemo(() => {
      const result = [];

      if (
        (tableType === AccountAssetTableType.DEPOSITS ||
          tableType === AccountAssetTableType.BALANCES) &&
        !(
          // Staked WAL
          (token.coinType === NORMALIZED_WAL_COINTYPE && reserve === undefined)
        ) &&
        !isInMsafeApp()
      ) {
        result.push({
          title: "Swap",
          href: `${getSwapUrl(
            token.symbol !== SWAP_DEFAULT_TOKEN_OUT_SYMBOL
              ? reserve
                ? token.symbol
                : token.coinType
              : SWAP_DEFAULT_TOKEN_IN_SYMBOL,
            SWAP_DEFAULT_TOKEN_OUT_SYMBOL,
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

  // WAL
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

      const stakedWal = transaction.moveCall({
        target: `${WALRUS_PACKAGE_ID}::staking::stake_with_pool`,
        arguments: [
          transaction.object(WALRUS_STAKING_OBJECT_ID),
          transaction.object(coin),
          transaction.pure.id(SUILEND_WALRUS_NODE_ID),
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

  // Staked WAL
  const withdrawWal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!address) return;

    const transaction = new Transaction();

    try {
      const { id, amount } = extra!.obj as StakedWalObject;

      const wal = transaction.moveCall({
        target: `${WALRUS_PACKAGE_ID}::staking::withdraw_stake`,
        arguments: [
          transaction.object(WALRUS_STAKING_OBJECT_ID),
          transaction.object(id),
        ],
      });
      transaction.transferObjects([wal], transaction.pure.address(address));

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        `Withdrew ${formatToken(amount, {
          dp: appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals,
          trimTrailingZeros: true,
        })} staked WAL`,
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to withdraw staked WAL", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  const unstakeWal = async (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!address) return;

    const transaction = new Transaction();

    try {
      const { id, amount } = extra!.obj as StakedWalObject;

      transaction.moveCall({
        target: `${WALRUS_PACKAGE_ID}::staking::request_withdraw_stake`,
        arguments: [
          transaction.object(WALRUS_STAKING_OBJECT_ID),
          transaction.object(id),
        ],
      });

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        `Requested withdrawal of ${formatToken(amount, {
          dp: appData.coinMetadataMap[NORMALIZED_WAL_COINTYPE].decimals,
          trimTrailingZeros: true,
        })} staked WAL`,
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to request withdrawal of staked WAL", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <div className="flex flex-row items-center gap-3">
      <div className="relative w-max">
        <TokenLogo showTooltip token={token} />

        {
          // Staked WAL
          token.coinType === NORMALIZED_WAL_COINTYPE &&
            reserve === undefined && (
              <div className="absolute left-1/2 top-[100%] flex w-max -translate-x-1/2 flex-row items-center gap-1">
                {(extra!.obj as StakedWalObject).nodeId ===
                  SUILEND_WALRUS_NODE_ID && (
                  <Image
                    className="-mt-px"
                    src={`${ASSETS_URL}/Suilend.svg`}
                    alt="Suilend logo"
                    width={8}
                    height={8}
                    quality={100}
                  />
                )}
                <TLabelSans className="text-[8px]">
                  {(extra!.obj as StakedWalObject).nodeId ===
                  SUILEND_WALRUS_NODE_ID
                    ? "Suilend"
                    : formatId((extra!.obj as StakedWalObject).nodeId, 2)}
                </TLabelSans>
              </div>
            )
        }
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex flex-row flex-wrap items-baseline gap-x-2">
          <TBody>{token.symbol}</TBody>
          {
            // Staked WAL (withdrawing state)
            token.coinType === NORMALIZED_WAL_COINTYPE &&
              reserve === undefined &&
              (extra!.obj as StakedWalObject).state ===
                StakedWalState.WITHDRAWING && (
                <TLabelSans className="animate-pulse">
                  Withdrawing Epoch{" "}
                  {(extra!.obj as StakedWalObject).activationEpoch + 1}
                </TLabelSans>
              )
          }

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
            address && (
              <Button
                className={cn(
                  "hoverLink h-auto px-0 py-0 text-muted-foreground opacity-0 hover:bg-transparent hover:text-foreground",
                  isTouchscreen && "opacity-100",
                )}
                labelClassName="uppercase text-xs"
                variant="ghost"
                onClick={
                  // Staked WAL
                  reserve === undefined
                    ? (extra!.obj as StakedWalObject).state ===
                      StakedWalState.WITHDRAWING
                      ? undefined
                      : (extra!.obj as StakedWalObject).activationEpoch >
                          (walrusEpoch ?? 0) + 1
                        ? withdrawWal
                        : unstakeWal
                    : // WAL
                      stakeWal
                }
              >
                {
                  // Staked WAL
                  reserve === undefined
                    ? (extra!.obj as StakedWalObject).state ===
                      StakedWalState.WITHDRAWING
                      ? undefined
                      : (extra!.obj as StakedWalObject).activationEpoch >
                          (walrusEpoch ?? 0) + 1
                        ? "Withdraw"
                        : "Unstake"
                    : // WAL
                      "Stake"
                }
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
