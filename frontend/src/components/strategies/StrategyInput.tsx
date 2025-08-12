import { forwardRef, useEffect, useRef } from "react";

import BigNumber from "bignumber.js";
import { mergeRefs } from "react-merge-refs";

import { ParsedReserve } from "@suilend/sdk/parsers/reserve";
import {
  TEMPORARY_PYTH_PRICE_FEED_COINTYPES,
  formatUsd,
} from "@suilend/sui-fe";

import Button from "@/components/shared/Button";
import StandardSelect from "@/components/shared/StandardSelect";
import { TLabel } from "@/components/shared/Typography";
import { Tab as LstStrategyDialogTab } from "@/components/strategies/LstStrategyDialog";
import { Input as InputComponent } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const INPUT_HEIGHT = 70; // px
const INPUT_BORDER_Y = 1; // px
const INPUT_INNER_HEIGHT = INPUT_HEIGHT - 2 * INPUT_BORDER_Y; // px
const MAX_BUTTON_WIDTH = 60; // px
const MAX_BUTTON_HEIGHT = 40; // px
const USD_LABEL_HEIGHT = 16; // px

interface StrategyInputProps {
  value: string;
  onChange: (value: string) => void;
  reserve: ParsedReserve;
  reserveOptions: { id: string; name: string }[];
  onReserveChange: (value: string) => void;
  tab: LstStrategyDialogTab;
  useMaxAmount: boolean;
  onMaxClick: () => void;
}

const StrategyInput = forwardRef<HTMLInputElement, StrategyInputProps>(
  (
    {
      value,
      onChange,
      reserve,
      reserveOptions,
      onReserveChange,
      tab,
      useMaxAmount,
      onMaxClick,
    },
    ref,
  ) => {
    // Autofocus
    const localRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
      setTimeout(() => localRef.current?.focus());
    }, [tab]);

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
            paddingRight: `${3 * 4 + reserve.token.symbol.length * 14.4 + (4 + 16) + 3 * 4}px`,
            paddingTop: `${(INPUT_INNER_HEIGHT - MAX_BUTTON_HEIGHT) / 2}px`,
            paddingBottom: `${(INPUT_INNER_HEIGHT - MAX_BUTTON_HEIGHT) / 2 + USD_LABEL_HEIGHT}px`,
          }}
          step="any"
          autoComplete="off"
        />

        <div
          className="absolute right-3 top-0 z-[2] flex flex-col items-end justify-center"
          style={{ height: `${INPUT_HEIGHT}px` }}
        >
          <StandardSelect
            className="group h-auto w-max min-w-0 !border-0 !bg-transparent px-0 font-mono text-2xl !text-foreground"
            iconClassName="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"
            iconOpenClassName="text-foreground"
            items={reserveOptions}
            value={reserve.coinType}
            onChange={onReserveChange}
          />
          <TLabel
            className="text-right"
            style={{ height: `${USD_LABEL_HEIGHT}px` }}
          >
            {!TEMPORARY_PYTH_PRICE_FEED_COINTYPES.includes(reserve.coinType) ? (
              <>
                {!usdValue.eq(0) && "≈"}
                {formatUsd(usdValue)}
              </>
            ) : (
              "--"
            )}
          </TLabel>
        </div>
      </div>
    );
  },
);
StrategyInput.displayName = "StrategyInput";

export default StrategyInput;
