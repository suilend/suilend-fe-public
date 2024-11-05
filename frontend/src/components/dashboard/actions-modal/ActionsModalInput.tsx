import { forwardRef, useEffect, useRef } from "react";

import BigNumber from "bignumber.js";
import { mergeRefs } from "react-merge-refs";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import { Action } from "@suilend/sdk/types";

import Button from "@/components/shared/Button";
import { TBody, TLabel } from "@/components/shared/Typography";
import { Input as InputComponent } from "@/components/ui/input";
import { COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP } from "@/lib/coinType";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const INPUT_HEIGHT = 70; // px
const INPUT_BORDER_Y = 1; // px
const INPUT_INNER_HEIGHT = INPUT_HEIGHT - 2 * INPUT_BORDER_Y; // px
const MAX_BUTTON_WIDTH = 60; // px
const MAX_BUTTON_HEIGHT = 40; // px
const USD_LABEL_HEIGHT = 16; // px

interface ActionsModalInputProps {
  value: string;
  onChange: (value: string) => void;
  reserve: ParsedReserve;
  action: Action;
  useMaxAmount: boolean;
  onMaxClick: () => void;
}

const ActionsModalInput = forwardRef<HTMLInputElement, ActionsModalInputProps>(
  ({ value, onChange, reserve, action, useMaxAmount, onMaxClick }, ref) => {
    // Autofocus
    const localRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      setTimeout(() => localRef.current?.focus());
    }, [action]);

    // Usd
    const usdValue = new BigNumber(value || 0).times(reserve.price);

    return (
      <div className="relative w-full">
        <div className="absolute left-3 top-1/2 z-[2] -translate-y-2/4">
          <Button
            className={cn(
              useMaxAmount &&
                "border-secondary bg-secondary/5 disabled:opacity-100",
            )}
            labelClassName={cn(
              "uppercase",
              useMaxAmount && "text-primary-foreground",
            )}
            variant="secondaryOutline"
            onClick={onMaxClick}
            disabled={useMaxAmount}
            style={{
              width: `${MAX_BUTTON_WIDTH}px`,
              height: `${MAX_BUTTON_HEIGHT}px`,
            }}
          >
            Max
          </Button>
        </div>

        <InputComponent
          ref={mergeRefs([localRef, ref])}
          className="relative z-[1] border-primary bg-card px-0 py-0 text-right text-2xl"
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onWheel={(e) => e.currentTarget.blur()}
          style={{
            height: `${INPUT_HEIGHT}px`,
            paddingLeft: `${3 * 4 + MAX_BUTTON_WIDTH + 3 * 4}px`,
            paddingRight: `${3 * 4 + reserve.symbol.length * 14.4 + 3 * 4}px`,
            paddingTop: `${(INPUT_INNER_HEIGHT - MAX_BUTTON_HEIGHT) / 2}px`,
            paddingBottom: `${(INPUT_INNER_HEIGHT - MAX_BUTTON_HEIGHT) / 2 + USD_LABEL_HEIGHT}px`,
          }}
          step="any"
        />

        <div
          className="absolute right-3 top-0 z-[2] flex flex-col items-end justify-center"
          style={{ height: `${INPUT_HEIGHT}px` }}
        >
          <TBody className="text-right text-2xl">{reserve.symbol}</TBody>
          <TLabel
            className="text-right"
            style={{ height: `${USD_LABEL_HEIGHT}px` }}
          >
            {reserve.priceIdentifier !==
            COINTYPE_PYTH_PRICE_ID_SYMBOL_MAP[reserve.coinType]
              ?.priceIdentifier ? (
              "--"
            ) : (
              <>
                {!usdValue.eq(0) && "≈"}
                {formatUsd(usdValue)}
              </>
            )}
          </TLabel>
        </div>
      </div>
    );
  },
);
ActionsModalInput.displayName = "ActionsModalInput";

export default ActionsModalInput;
