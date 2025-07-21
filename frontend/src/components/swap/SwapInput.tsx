import { forwardRef, useEffect, useRef } from "react";

import BigNumber from "bignumber.js";
import { Download, Upload, Wallet } from "lucide-react";
import { mergeRefs } from "react-merge-refs";

import { Token, formatToken, formatUsd } from "@suilend/sui-fe";

import TokenSelectionDialog from "@/components/shared/TokenSelectionDialog";
import { TLabel, TLabelSans } from "@/components/shared/Typography";
import { Input as InputComponent } from "@/components/ui/input";
import { useSwapContext } from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TokenDirection } from "@/lib/swap";
import { cn } from "@/lib/utils";

const INPUT_HEIGHT = 70; // px
const USD_LABEL_HEIGHT = 16; // px

interface SwapInputProps {
  title?: string;
  autoFocus?: boolean;
  value: string;
  isValueLoading?: boolean;
  onChange?: (value: string) => void;
  usdValue?: BigNumber;
  direction: TokenDirection;
  token: Token;
  onSelectToken: (token: Token) => void;
  disabledCoinTypes?: string[];
  onMaxClick?: () => void;
  onHalfClick?: () => void;
}

const SwapInput = forwardRef<HTMLInputElement, SwapInputProps>(
  (
    {
      title,
      autoFocus,
      value,
      isValueLoading,
      onChange,
      usdValue,
      direction,
      token,
      onSelectToken,
      disabledCoinTypes,
      onMaxClick,
      onHalfClick,
    },
    ref,
  ) => {
    const { getBalance, obligation } = useLoadedUserContext();

    const { swapInAccount, ...restSwapContext } = useSwapContext();
    const tokens = restSwapContext.tokens as Token[];

    // Autofocus
    const localRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      if (!autoFocus) return;
      setTimeout(() => localRef.current?.focus());
    }, [autoFocus]);

    // State
    const isReadOnly = !onChange;

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
          "w-full rounded-md border bg-background",
          !isReadOnly && "border-primary",
        )}
      >
        <div
          className={cn(
            "flex w-full flex-col rounded-[7px]",
            isValueLoading && "animate-pulse bg-muted/10",
          )}
        >
          {title && <TLabelSans className="px-3 pb-1 pt-3">{title}</TLabelSans>}

          <div className="relative w-full">
            <InputComponent
              ref={mergeRefs([localRef, ref])}
              className="relative z-[1] border-0 bg-transparent px-0 py-0 text-2xl"
              type="number"
              placeholder="0"
              value={value}
              readOnly={isReadOnly}
              onChange={
                !isReadOnly ? (e) => onChange(e.target.value) : undefined
              }
              onWheel={(e) => e.currentTarget.blur()}
              style={{
                height: `${INPUT_HEIGHT}px`,
                paddingLeft: `${3 * 4}px`,
                paddingRight: `${3 * 4 + (5 * 4 + 2 * 4 + token.symbol.slice(0, 10).length * 14.4 + 1 * 4 + 4 * 4) + 3 * 4}px`,
                paddingTop: 0,
                paddingBottom: `${INPUT_HEIGHT - 32}px`,
              }}
              step="any"
              autoComplete="off"
            />

            {new BigNumber(value || 0).gt(0) &&
              usdValue !== undefined &&
              !usdValue.eq(0) && (
                <TLabel
                  className="absolute left-3 z-[2]"
                  style={{
                    bottom: `${INPUT_HEIGHT - (32 + 4 + USD_LABEL_HEIGHT)}px`,
                  }}
                >
                  {formatUsd(usdValue)}
                </TLabel>
              )}

            <div
              className="absolute right-3 z-[2] flex flex-col items-end justify-center gap-1"
              style={{ top: 0 }}
            >
              <TokenSelectionDialog
                isSwapInput
                direction={direction}
                token={token}
                tokens={tokens}
                onSelectToken={onSelectToken}
                disabledCoinTypes={disabledCoinTypes}
              />

              <div className="flex flex-row items-center gap-3 pr-1.5">
                {(swapInAccount || direction === TokenDirection.OUT) && (
                  <>
                    {/* Deposited */}
                    {tokenDepositedAmount.gt(0) && (
                      <div className="flex flex-row items-center gap-1.5 text-muted-foreground">
                        <Download className="h-3 w-3 text-inherit" />
                        <TLabel className="text-inherit">
                          {formatToken(tokenDepositedAmount, { exact: false })}
                        </TLabel>
                      </div>
                    )}

                    {/* Borrowed */}
                    {tokenBorrowedAmount.gt(0) && (
                      <div className="flex flex-row items-center gap-1.5 text-muted-foreground">
                        <Upload className="h-3 w-3 text-inherit" />
                        <TLabel className="text-inherit">
                          {formatToken(tokenBorrowedAmount, { exact: false })}
                        </TLabel>
                      </div>
                    )}
                  </>
                )}

                {/* Balance */}
                {!swapInAccount && (
                  <div className="flex flex-row items-center gap-1.5 text-muted-foreground">
                    <Wallet className="h-3 w-3 text-inherit" />
                    <TLabel className="text-inherit">
                      {tokenBalance.eq(0)
                        ? "--"
                        : formatToken(tokenBalance, { exact: false })}
                    </TLabel>
                  </div>
                )}

                {/* MAX */}
                {direction === TokenDirection.IN && (
                  <>
                    <div className="h-3.5 w-px bg-muted/50" />

                    <TLabel
                      className="-m-1.5 cursor-pointer p-1.5 transition-colors hover:text-secondary"
                      onClick={() => onMaxClick?.()}
                    >
                      MAX
                    </TLabel>
                    <TLabel
                      className="-m-1.5 cursor-pointer p-1.5 transition-colors hover:text-secondary"
                      onClick={() => onHalfClick?.()}
                    >
                      HALF
                    </TLabel>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
SwapInput.displayName = "SwapInput";

export default SwapInput;
