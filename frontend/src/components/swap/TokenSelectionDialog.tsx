import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { Check, ChevronDown, Download, Search, Wallet } from "lucide-react";

import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
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
  direction: TokenDirection;
  token: SwapToken;
  isSelected: boolean;
  onClick: () => void;
}

function TokenRow({ direction, token, isSelected, onClick }: TokenRowProps) {
  const { appData } = useLoadedAppContext();
  const { getBalance, obligation } = useLoadedUserContext();

  const { isUsingDeposits, verifiedCoinTypes } = useSwapContext();

  // Amount
  const tokenBalance = getBalance(token.coinType);

  const tokenDepositPosition = obligation?.deposits?.find(
    (d) => d.coinType === token.coinType,
  );
  const tokenDepositedAmount =
    tokenDepositPosition?.depositedAmount ?? new BigNumber(0);

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
            <div className="flex min-w-0 flex-row items-center gap-1">
              <TBody className="overflow-hidden text-ellipsis text-nowrap">
                {token.symbol}
              </TBody>

              <div className="flex shrink-0 flex-row items-center gap-1">
                {(appData.reserveCoinTypes.includes(token.coinType) ||
                  verifiedCoinTypes.includes(token.coinType)) && (
                  <Tooltip
                    title={
                      appData.reserveCoinTypes.includes(token.coinType)
                        ? "This asset is listed on Suilend"
                        : verifiedCoinTypes.includes(token.coinType)
                          ? "This asset appears on the list of Cetus verified assets"
                          : ""
                    }
                  >
                    <div className="h-4 w-4 rounded-full bg-success/10 p-0.5">
                      <Check className="h-3 w-3 text-success" />
                    </div>
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
              {/* Balance */}
              {!isUsingDeposits && (
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
              )}

              {/* Deposited */}
              {(isUsingDeposits || direction === TokenDirection.OUT) && (
                <div
                  className={cn(
                    "flex flex-row items-center gap-1.5",
                    tokenDepositedAmount.gt(0)
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Download className="h-3 w-3 text-inherit" />
                  <TBody className="text-inherit">
                    {tokenDepositedAmount.eq(0)
                      ? "--"
                      : formatToken(tokenDepositedAmount, { exact: false })}
                  </TBody>
                </div>
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
  direction: TokenDirection;
  token: SwapToken;
  onSelectToken: (token: SwapToken) => void;
}

export default function TokenSelectionDialog({
  direction,
  token,
  onSelectToken,
}: TokenSelectionDialogProps) {
  const { getBalance, obligation, filteredReserves } = useLoadedUserContext();

  const {
    isUsingDeposits,
    fetchTokensMetadata,
    verifiedCoinTypes,
    ...restSwapContext
  } = useSwapContext();
  const tokens = restSwapContext.tokens as SwapToken[];

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

  const reserveTokens = useMemo(
    () =>
      filteredReserves
        .map((r) => tokens.find((t) => t.symbol === r.token.symbol))
        .filter(Boolean) as SwapToken[],
    [filteredReserves, tokens],
  );

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

  // Tokens - top
  const topTokens = useMemo(
    () =>
      direction === TokenDirection.IN && isUsingDeposits
        ? []
        : ([
            NORMALIZED_sSUI_COINTYPE,
            NORMALIZED_SUI_COINTYPE,
            NORMALIZED_USDC_COINTYPE,
            NORMALIZED_suiUSDT_COINTYPE,
            NORMALIZED_SEND_COINTYPE,
          ]

            .map((coinType) => tokens.find((t) => t.coinType === coinType))
            .filter(Boolean) as SwapToken[]),
    [direction, isUsingDeposits, tokens],
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

    if (isUsingDeposits) {
      if (direction === TokenDirection.IN) result = [...filteredDepositTokens];
      else result = [...filteredDepositTokens, ...filteredReserveTokens];
    } else
      result = [
        ...filteredDepositTokens,
        ...filteredBalanceTokens,
        ...filteredReserveTokens,
        ...filteredOtherTokens,
      ];

    return result;
  }, [
    isUsingDeposits,
    direction,
    filteredDepositTokens,
    filteredReserveTokens,
    filteredBalanceTokens,
    filteredOtherTokens,
  ]);

  useEffect(() => {
    if (
      filteredTokens.length === 0 &&
      isCoinType(searchString) &&
      !isUsingDeposits
    )
      fetchTokensMetadata([normalizeStructTag(searchString)]);
  }, [filteredTokens, searchString, isUsingDeposits, fetchTokensMetadata]);

  const filteredTokensMap = useMemo(() => {
    let result: Record<
      string,
      {
        title: string;
        tokens: SwapToken[];
      }
    >;

    if (isUsingDeposits) {
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
    isUsingDeposits,
    direction,
    filteredDepositTokens,
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
          className="h-auto p-0 hover:bg-transparent"
          labelClassName="text-2xl"
          startIcon={
            <TokenLogo
              className="mr-1 h-5 w-5"
              imageProps={{ className: "rounded-full" }}
              token={token}
            />
          }
          endIcon={<ChevronDown className="h-4 w-4 opacity-50" />}
          variant="ghost"
        >
          {token.symbol.slice(0, 10)}
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
              isUsingDeposits
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
              className="gap-1.5 rounded-full border hover:border-transparent"
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
              {/* TODO: Truncate symbol if the list of priority tokens includes non-reserves */}
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
                      direction={direction}
                      token={t}
                      isSelected={t.coinType === token.coinType}
                      onClick={() => onTokenClick(t)}
                    />
                  ))}
                </div>
              </Fragment>
            ))
        ) : (
          <TLabelSans className="py-4 text-center">
            {searchString
              ? isCoinType(searchString) && !isUsingDeposits
                ? "Fetching token metadata..."
                : `No tokens matching "${searchString}"`
              : "No tokens"}
          </TLabelSans>
        )}
      </div>
    </Dialog>
  );
}
