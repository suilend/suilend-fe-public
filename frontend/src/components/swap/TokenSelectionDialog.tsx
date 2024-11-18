import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { ChevronDown, Search, Wallet } from "lucide-react";

import { SUI_COINTYPE, isCoinType, isSui } from "@suilend/frontend-sui";

import Dialog from "@/components/dashboard/Dialog";
import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import Input from "@/components/shared/Input";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabel, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useSwapContext } from "@/contexts/SwapContext";
import { ParsedCoinBalance } from "@/lib/coinBalance";
import { formatToken } from "@/lib/format";
import { SwapToken } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TokenRowProps {
  token: SwapToken;
  isSelected: boolean;
  onClick: () => void;
}

function TokenRow({ token, isSelected, onClick }: TokenRowProps) {
  const swapContext = useSwapContext();
  const coinBalancesMap = swapContext.coinBalancesMap as Record<
    string,
    ParsedCoinBalance
  >;

  const tokenBalance =
    coinBalancesMap[token.coinType]?.balance ?? new BigNumber(0);

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
          <div className="flex w-full flex-row items-center justify-between gap-4">
            <div className="flex min-w-0 flex-row items-center gap-1">
              <TBody className="overflow-hidden text-ellipsis text-nowrap">
                {token.symbol}
              </TBody>
              <CopyToClipboardButton
                className="-my-0.5 h-6 w-6 hover:bg-transparent"
                iconClassName="w-3 h-3"
                value={isSui(token.coinType) ? SUI_COINTYPE : token.coinType}
              />
            </div>

            <div className="flex min-w-0 flex-row items-center gap-1.5">
              <Wallet className="h-3 w-3 shrink-0 text-foreground" />
              <Tooltip
                title={
                  tokenBalance.gt(0)
                    ? `${formatToken(tokenBalance, { dp: token.decimals })} ${token.symbol}`
                    : undefined
                }
              >
                <TBody className="overflow-hidden text-ellipsis text-nowrap">
                  {formatToken(tokenBalance, { exact: false })}
                </TBody>
              </Tooltip>
            </div>
          </div>

          {token.name && (
            <div className="flex flex-row items-center gap-2">
              {token.name && (
                <TLabelSans className="overflow-hidden text-ellipsis text-nowrap">
                  {token.name}
                </TLabelSans>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface TokenSelectionDialogProps {
  token: SwapToken;
  onSelectToken: (token: SwapToken) => void;
}

export default function TokenSelectionDialog({
  token,
  onSelectToken,
}: TokenSelectionDialogProps) {
  const { data } = useLoadedAppContext();

  const { fetchTokensMetadata, ...restSwapContext } = useSwapContext();
  const tokens = restSwapContext.tokens as SwapToken[];
  const coinBalancesMap = restSwapContext.coinBalancesMap as Record<
    string,
    ParsedCoinBalance
  >;

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpenChange = (_isOpen: boolean) => {
    setIsOpen(_isOpen);
  };

  // Tokens
  const tokensWithBalances = useMemo(
    () =>
      tokens.filter((t) =>
        (coinBalancesMap[t.coinType]?.balance ?? new BigNumber(0)).gt(0),
      ),
    [tokens, coinBalancesMap],
  );
  const reserveTokens = useMemo(
    () =>
      data.lendingMarket.reserves
        .map((r) => tokens.find((t) => t.symbol === r.symbol))
        .filter(Boolean) as SwapToken[],
    [data.lendingMarket.reserves, tokens],
  );
  const otherTokens = useMemo(
    () =>
      tokens.filter(
        (t) =>
          !tokensWithBalances.find((_t) => _t.coinType === t.coinType) &&
          !reserveTokens.find((_t) => _t.coinType === t.coinType),
      ),
    [tokens, tokensWithBalances, reserveTokens],
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

  const filteredTokensWithBalances = useMemo(
    () => filterTokens(tokensWithBalances),
    [filterTokens, tokensWithBalances],
  );
  const filteredReserveTokens = useMemo(
    () => filterTokens(reserveTokens),
    [filterTokens, reserveTokens],
  );
  const filteredOtherTokens = useMemo(
    () => filterTokens(otherTokens),
    [filterTokens, otherTokens],
  );

  const filteredTokens = useMemo(
    () => [
      ...filteredTokensWithBalances,
      ...filteredReserveTokens,
      ...filteredOtherTokens,
    ],
    [filteredTokensWithBalances, filteredReserveTokens, filteredOtherTokens],
  );

  useEffect(() => {
    if (filteredTokens.length === 0 && isCoinType(searchString))
      fetchTokensMetadata([normalizeStructTag(searchString)]);
  }, [filteredTokens, searchString, fetchTokensMetadata]);

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
      dialogContentProps={{ className: "max-w-lg max-h-[800px]" }}
      headerProps={{ title: "Select token" }}
    >
      <div className="w-full px-4 pb-4">
        <div className="flex flex-row items-center gap-3 rounded-md bg-muted/5 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <div className="flex-1">
            <Input
              id="searchString"
              type="text"
              placeholder="Search by token symbol, name or address"
              value={searchString}
              onChange={setSearchString}
              inputProps={{
                autoFocus: true,
                className: "font-sans bg-transparent border-0 px-0",
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-row flex-wrap gap-2 px-4 pb-4">
        {reserveTokens.map((t) => (
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

      <div className="relative flex w-full flex-col overflow-auto">
        {filteredTokens.length > 0 ? (
          [
            {
              title: "Your assets",
              tokens: filteredTokensWithBalances,
            },
            {
              title: "Suilend assets",
              tokens: filteredReserveTokens,
            },
            {
              title: "Other assets",
              tokens: filteredOtherTokens,
            },
          ]
            .filter(({ tokens: _tokens }) => _tokens.length > 0)
            .map(({ title, tokens: _tokens }, index) => (
              <Fragment key={index}>
                <div
                  className={cn(
                    "sticky inset-x-0 top-0 flex w-full flex-row items-center bg-card px-4 py-2",
                  )}
                  style={{ zIndex: 2 + index }}
                >
                  <TLabel className="uppercase text-primary">{title}</TLabel>
                </div>
                <div className="flex w-full flex-col gap-px">
                  {_tokens.map((t) => (
                    <TokenRow
                      key={t.coinType}
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
            {isCoinType(searchString)
              ? "Fetching token metadata..."
              : `No tokens matching "${searchString}"`}
          </TLabelSans>
        )}
      </div>
    </Dialog>
  );
}
