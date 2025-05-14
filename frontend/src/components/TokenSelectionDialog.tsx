import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import {
  BadgeCheck,
  ChevronDown,
  Download,
  Search,
  Upload,
  Wallet,
} from "lucide-react";

import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_WAL_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  SUI_COINTYPE,
  formatToken,
  isCoinType,
  isSui,
} from "@suilend/frontend-sui";

import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { TokenDirection, useSwapContext } from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { SwapToken } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TokenRowProps {
  token: SwapToken;
  isSelected: boolean;
  onClick: () => void;
}

function TokenRow({ token, isSelected, onClick }: TokenRowProps) {
  const { allAppData } = useLoadedAppContext();
  const { getBalance, obligation } = useLoadedUserContext();

  const { tradeWithinAccount, verifiedCoinTypes } = useSwapContext();

  // Amount
  const tokenBalance = getBalance(token.coinType);

  const tokenDepositPosition = obligation?.deposits?.find(
    (d) => d.coinType === token.coinType,
  );
  const tokenDepositedAmount =
    tokenDepositPosition?.depositedAmount ?? new BigNumber(0);

  const tokenBorrowPosition = obligation?.borrows?.find(
    (b) => b.coinType === token.coinType,
  );
  const tokenBorrowedAmount =
    tokenBorrowPosition?.borrowedAmount ?? new BigNumber(0);

  return (
    <div
      className={cn(
        "relative z-[1] flex w-full cursor-pointer px-4 py-3",
        isSelected
          ? "bg-muted/10 shadow-[inset_2px_0_0_0_hsl(var(--foreground))]"
          : "transition-colors hover:bg-muted/10",
      )}
      onClick={onClick}
    >
      <div className="flex w-full flex-row items-center gap-3">
        <TokenLogo
          showTooltip
          className="shrink-0"
          imageProps={{ className: "rounded-full" }}
          token={token}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {/* Top */}
          <div className="flex w-full flex-row items-center justify-between gap-4">
            {/* Top left */}
            <div className="flex min-w-0 flex-row items-center gap-1.5">
              <TBody className="overflow-hidden text-ellipsis text-nowrap">
                {token.symbol}
              </TBody>

              <div className="flex shrink-0 flex-row items-center gap-1">
                {(Object.values(allAppData.allLendingMarketData).find(
                  (_appData) =>
                    _appData.reserveCoinTypes.includes(token.coinType),
                ) ||
                  verifiedCoinTypes.includes(token.coinType)) && (
                  <Tooltip
                    title={
                      Object.values(allAppData.allLendingMarketData).find(
                        (_appData) =>
                          _appData.reserveCoinTypes.includes(token.coinType),
                      )
                        ? "This asset is listed on Suilend"
                        : verifiedCoinTypes.includes(token.coinType)
                          ? "This asset appears on the list of Cetus verified assets"
                          : ""
                    }
                  >
                    <BadgeCheck className="h-4 w-4 text-verified" />
                  </Tooltip>
                )}

                <CopyToClipboardButton
                  className="h-6 w-6 hover:bg-transparent"
                  iconClassName="w-3 h-3"
                  value={isSui(token.coinType) ? SUI_COINTYPE : token.coinType}
                />
              </div>
            </div>

            {/* Top right */}
            <div className="flex shrink-0 flex-row items-center gap-3">
              {!tradeWithinAccount ? (
                <>
                  {/* Balance */}
                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5",
                      tokenBalance.gt(0)
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    <Wallet className="h-3 w-3 text-inherit" />
                    <TBody className="text-inherit">
                      {tokenBalance.eq(0)
                        ? "--"
                        : formatToken(tokenBalance, { exact: false })}
                    </TBody>
                  </div>
                </>
              ) : (
                <>
                  {/* Deposited */}
                  {tokenDepositedAmount.gt(0) && (
                    <div className="flex flex-row items-center gap-1.5 text-foreground">
                      <Download className="h-3 w-3 text-inherit" />
                      <TBody className="text-inherit">
                        {formatToken(tokenDepositedAmount, { exact: false })}
                      </TBody>
                    </div>
                  )}

                  {/* Borrowed */}
                  {tokenBorrowedAmount.gt(0) && (
                    <div className="flex flex-row items-center gap-1.5 text-foreground">
                      <Upload className="h-3 w-3 text-inherit" />
                      <TBody className="text-inherit">
                        {formatToken(tokenBorrowedAmount, { exact: false })}
                      </TBody>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Bottom */}
          {token.name && (
            <TLabelSans className="overflow-hidden text-ellipsis text-nowrap">
              {token.name}
            </TLabelSans>
          )}
        </div>
      </div>
    </div>
  );
}

interface TokenSelectionDialogProps {
  triggerClassName?: ClassValue;
  triggerLabelSelectedClassName?: ClassValue;
  triggerLabelUnselectedClassName?: ClassValue;
  triggerChevronClassName?: ClassValue;
  isSwapInput?: boolean;
  direction?: TokenDirection;
  token?: SwapToken;
  tokens: SwapToken[];
  onSelectToken: (token: SwapToken) => void;
}

export default function TokenSelectionDialog({
  triggerClassName,
  triggerLabelSelectedClassName,
  triggerLabelUnselectedClassName,
  triggerChevronClassName,
  isSwapInput,
  direction,
  token,
  tokens,
  onSelectToken,
}: TokenSelectionDialogProps) {
  const { filteredReservesMap, filteredReserves } = useLoadedAppContext();
  const { getBalance, obligation } = useLoadedUserContext();

  const { tradeWithinAccount, fetchTokensMetadata, verifiedCoinTypes } =
    useSwapContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpenChange = (_isOpen: boolean) => {
    setIsOpen(_isOpen);
  };

  // Tokens - categories
  const balanceTokens = useMemo(() => {
    const sortedTokens = tokens
      .filter((t) => getBalance(t.coinType).gt(0))
      .sort((a, b) => +getBalance(b.coinType) - +getBalance(a.coinType));

    return [
      ...sortedTokens.filter((t) => verifiedCoinTypes.includes(t.coinType)),
      ...sortedTokens.filter((t) => !verifiedCoinTypes.includes(t.coinType)),
    ];
  }, [tokens, getBalance, verifiedCoinTypes]);

  const reserveTokens = useMemo(() => {
    const result: SwapToken[] = [];

    for (const r of Object.values(filteredReservesMap).flat()) {
      const token = tokens.find((t) => t.symbol === r.token.symbol);
      if (token && !result.find((t) => t.coinType === token.coinType))
        result.push(token);
    }

    return result;
  }, [filteredReservesMap, tokens]);

  const otherTokens = useMemo(
    () =>
      tokens.filter(
        (t) =>
          !balanceTokens.find((_t) => _t.coinType === t.coinType) &&
          !reserveTokens.find((_t) => _t.coinType === t.coinType),
      ),
    [tokens, balanceTokens, reserveTokens],
  );

  const depositTokens = useMemo(() => {
    return filteredReserves
      .filter((r) =>
        obligation?.deposits.find((d) => d.coinType === r.coinType),
      )
      .map((r) => tokens.find((t) => t.symbol === r.token.symbol))
      .filter(Boolean) as SwapToken[];
  }, [filteredReserves, obligation, tokens]);

  const borrowTokens = useMemo(() => {
    return filteredReserves
      .filter((r) => obligation?.borrows.find((b) => b.coinType === r.coinType))
      .map((r) => tokens.find((t) => t.symbol === r.token.symbol))
      .filter(Boolean) as SwapToken[];
  }, [filteredReserves, obligation, tokens]);

  // Tokens - top
  const topTokens = useMemo(
    () =>
      [
        NORMALIZED_sSUI_COINTYPE,
        NORMALIZED_SUI_COINTYPE,
        NORMALIZED_USDC_COINTYPE,
        NORMALIZED_WAL_COINTYPE,
        NORMALIZED_SEND_COINTYPE,
      ]
        .filter((coinType) =>
          tradeWithinAccount
            ? direction === TokenDirection.IN
              ? !!depositTokens.find((t) => t.coinType === coinType)
              : true
            : true,
        )
        .map((coinType) => tokens.find((t) => t.coinType === coinType))
        .filter(Boolean) as SwapToken[],
    [tradeWithinAccount, direction, depositTokens, tokens],
  );

  // Filter
  const [searchString, setSearchString] = useState<string>("");

  const filterTokens = useCallback(
    (_tokens: SwapToken[]) =>
      _tokens.filter((t) =>
        `${t.coinType}${t.symbol}${t.name}`
          .toLowerCase()
          .includes(searchString.toLowerCase()),
      ),
    [searchString],
  );

  const filteredDepositTokens = useMemo(
    () => filterTokens(depositTokens),
    [filterTokens, depositTokens],
  );
  const filteredBorrowTokens = useMemo(
    () => filterTokens(borrowTokens),
    [filterTokens, borrowTokens],
  );
  const filteredBalanceTokens = useMemo(
    () => filterTokens(balanceTokens),
    [filterTokens, balanceTokens],
  );
  const filteredReserveTokens = useMemo(
    () => filterTokens(reserveTokens),
    [filterTokens, reserveTokens],
  );
  const filteredOtherTokens = useMemo(
    () => filterTokens(otherTokens),
    [filterTokens, otherTokens],
  );

  const filteredTokens = useMemo(() => {
    let result: SwapToken[];

    if (tradeWithinAccount) {
      if (direction === TokenDirection.IN) result = [...filteredDepositTokens];
      else
        result = [
          ...filteredDepositTokens,
          ...filteredBorrowTokens,
          ...filteredReserveTokens,
        ];
    } else
      result = [
        ...filteredDepositTokens,
        ...filteredBorrowTokens,
        ...filteredBalanceTokens,
        ...filteredReserveTokens,
        ...filteredOtherTokens,
      ];

    return result;
  }, [
    tradeWithinAccount,
    direction,
    filteredDepositTokens,
    filteredBorrowTokens,
    filteredReserveTokens,
    filteredBalanceTokens,
    filteredOtherTokens,
  ]);

  useEffect(() => {
    if (
      filteredTokens.length === 0 &&
      isCoinType(searchString) &&
      !tradeWithinAccount &&
      isSwapInput
    )
      fetchTokensMetadata([normalizeStructTag(searchString)]);
  }, [
    filteredTokens,
    searchString,
    tradeWithinAccount,
    isSwapInput,
    fetchTokensMetadata,
  ]);

  const filteredTokensMap = useMemo(() => {
    let result: Record<
      string,
      {
        title: string;
        tokens: SwapToken[];
      }
    >;

    if (tradeWithinAccount) {
      if (direction === TokenDirection.IN)
        result = {
          deposit: {
            title: "Deposited assets",
            tokens: filteredDepositTokens,
          },
        };
      else
        result = {
          deposit: {
            title: "Deposited assets",
            tokens: filteredDepositTokens,
          },
          borrow: {
            title: "Borrowed assets",
            tokens: filteredBorrowTokens,
          },
          suilend: {
            title: "Assets listed on Suilend",
            tokens: filteredReserveTokens,
          },
        };
    } else
      result = {
        deposit: {
          title: "Deposited assets",
          tokens: filteredDepositTokens,
        },
        borrow: {
          title: "Borrowed assets",
          tokens: filteredBorrowTokens,
        },
        balance: {
          title: "Wallet balances",
          tokens: filteredBalanceTokens,
        },
        suilend: {
          title: "Assets listed on Suilend",
          tokens: filteredReserveTokens,
        },
        other: {
          title: "Other known assets",
          tokens: filteredOtherTokens,
        },
      };

    return result;
  }, [
    tradeWithinAccount,
    direction,
    filteredDepositTokens,
    filteredBorrowTokens,
    filteredReserveTokens,
    filteredBalanceTokens,
    filteredOtherTokens,
  ]);

  // Select token
  const onTokenClick = (t: SwapToken) => {
    onSelectToken(t);
    setTimeout(() => setIsOpen(false), 50);
    setTimeout(() => setSearchString(""), 250);
  };

  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange }}
      trigger={
        <Button
          className={cn(
            "group h-auto p-0 hover:bg-transparent",
            triggerClassName,
          )}
          labelClassName={cn(
            token
              ? cn("text-2xl", triggerLabelSelectedClassName)
              : cn("text-sm", triggerLabelUnselectedClassName),
          )}
          startIcon={
            token && (
              <TokenLogo
                className="mr-1 h-5 w-5"
                imageProps={{ className: "rounded-full" }}
                token={token}
              />
            )
          }
          endIcon={
            <ChevronDown
              className={cn(
                "h-4 w-4 text-foreground/50 transition-colors group-hover:text-foreground",
                triggerChevronClassName,
              )}
            />
          }
          variant="ghost"
        >
          {token ? token.symbol.slice(0, 10) : "Select token"}
        </Button>
      }
      headerProps={{
        title: { children: "Select token" },
      }}
      dialogContentInnerClassName="max-w-lg h-[800px]"
    >
      {/* Search */}
      <div className="flex flex-row items-center gap-3 rounded-md bg-muted/5 px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <Input
            id="searchString"
            type="text"
            placeholder={
              tradeWithinAccount
                ? "Search by token symbol or name"
                : "Search by token symbol, name or address"
            }
            value={searchString}
            onChange={setSearchString}
            inputProps={{
              autoFocus: true,
              className: "font-sans bg-transparent border-0 px-0",
            }}
          />
        </div>
      </div>

      {/* Top tokens */}
      {topTokens.length > 0 && (
        <div className="flex flex-row flex-wrap gap-2">
          {topTokens.map((t) => (
            <Button
              key={t.coinType}
              className={cn(
                "gap-1.5 rounded-full",
                t.coinType === token?.coinType
                  ? "border border-white bg-muted/25"
                  : "border transition-colors hover:border-transparent",
              )}
              startIcon={
                <TokenLogo
                  className="h-4 w-4"
                  imageProps={{ className: "rounded-full" }}
                  token={t}
                />
              }
              variant="ghost"
              onClick={() => onTokenClick(t)}
            >
              {/* TODO: Truncate symbol if the list of top tokens includes non-reserves */}
              {t.symbol}
            </Button>
          ))}
        </div>
      )}

      {/* Tokens */}
      <div className="relative -mx-4 -mb-4 flex flex-col overflow-y-auto">
        {filteredTokens.length > 0 ? (
          Object.values(filteredTokensMap)
            .filter((list) => list.tokens.length > 0)
            .map((list, index) => (
              <Fragment key={index}>
                <div
                  className={cn(
                    "sticky inset-x-0 top-0 flex w-full flex-row items-center bg-card px-4 py-2",
                  )}
                  style={{ zIndex: 2 + index }}
                >
                  <TLabel className="uppercase text-primary">
                    {list.title}{" "}
                    <span className="text-muted-foreground">
                      {list.tokens.length}
                    </span>
                  </TLabel>
                </div>
                <div className="flex w-full flex-col gap-px">
                  {list.tokens.map((t) => (
                    <TokenRow
                      key={t.coinType}
                      token={t}
                      isSelected={t.coinType === token?.coinType}
                      onClick={() => onTokenClick(t)}
                    />
                  ))}
                </div>
              </Fragment>
            ))
        ) : (
          <TLabelSans className="py-4 text-center">
            {searchString
              ? isCoinType(searchString) && !tradeWithinAccount && isSwapInput
                ? "Fetching token metadata..."
                : `No tokens matching "${searchString}"`
              : "No tokens"}
          </TLabelSans>
        )}
      </div>
    </Dialog>
  );
}
