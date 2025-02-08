import { forwardRef, useEffect, useRef } from "react";

import BigNumber from "bignumber.js";
import { Download, Wallet } from "lucide-react";
import { mergeRefs } from "react-merge-refs";

import { formatToken, formatUsd } from "@suilend/frontend-sui";

import { TLabel, TLabelSans } from "@/components/shared/Typography";
import TokenSelectionDialog from "@/components/swap/TokenSelectionDialog";
import { Input as InputComponent } from "@/components/ui/input";
import { TokenDirection, useSwapContext } from "@/contexts/SwapContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { SwapToken } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT_HEIGHT = 70; // px
const USD_LABEL_HEIGHT = 16; // px
const INPUT_PADDING_Y = INPUT_HEIGHT / 2 - (32 + USD_LABEL_HEIGHT) / 2; // px

interface SwapInputProps {
  title?: string;
  autoFocus?: boolean;
  value: string;
  isValueLoading?: boolean;
  onChange?: (value: string) => void;
  usdValue?: BigNumber;
  direction: TokenDirection;
  token: SwapToken;
  onSelectToken: (token: SwapToken) => void;
  onAmountClick?: () => void;
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
      onAmountClick,
    },
    ref,
  ) => {
    const { getBalance, obligation } = useLoadedUserContext();

    const { isUsingDeposits } = useSwapContext();

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
          {title && <TLabelSans className="px-3 pt-3">{title}</TLabelSans>}

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
                paddingTop: `${INPUT_PADDING_Y}px`,
                paddingBottom: `${INPUT_PADDING_Y + USD_LABEL_HEIGHT}px`,
              }}
              step="any"
            />

            {new BigNumber(value || 0).gt(0) &&
              usdValue !== undefined &&
              !usdValue.eq(0) && (
                <TLabel
                  className="absolute left-3 z-[2]"
                  style={{ bottom: `${INPUT_PADDING_Y}px` }}
                >
                  {formatUsd(usdValue)}
                </TLabel>
              )}

            <div
              className="absolute right-3 z-[2] flex h-8 flex-col items-end justify-center gap-1"
              style={{ top: `${INPUT_PADDING_Y}px` }}
            >
              <TokenSelectionDialog
                direction={direction}
                token={token}
                onSelectToken={onSelectToken}
              />

              <div className="flex flex-row items-center gap-3 pr-1">
                {/* Balance */}
                {!isUsingDeposits && (
                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5 text-muted-foreground",
                      onAmountClick && "cursor-pointer",
                    )}
                    onClick={onAmountClick}
                  >
                    <Wallet className="h-3 w-3 text-inherit" />
                    <TLabel className="text-inherit">
                      {tokenBalance.eq(0)
                        ? "--"
                        : formatToken(tokenBalance, { exact: false })}
                    </TLabel>
                  </div>
                )}

                {/* Deposited */}
                {(isUsingDeposits || direction === TokenDirection.OUT) && (
                  <div
                    className={cn(
                      "flex flex-row items-center gap-1.5 text-muted-foreground",
                      onAmountClick && "cursor-pointer",
                    )}
                    onClick={onAmountClick}
                  >
                    <Download className="h-3 w-3 text-inherit" />
                    <TLabel className="text-inherit">
                      {tokenDepositedAmount.eq(0)
                        ? "--"
                        : formatToken(tokenDepositedAmount, { exact: false })}
                    </TLabel>
                  </div>
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
