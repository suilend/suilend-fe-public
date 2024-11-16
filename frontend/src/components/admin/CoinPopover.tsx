import { useState } from "react";

import { ChevronsUpDown } from "lucide-react";

import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody } from "@/components/shared/Typography";
import { ParsedCoinBalance } from "@/lib/coinBalance";
import { formatToken } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CoinPopoverProps {
  coinBalancesMap: Record<string, ParsedCoinBalance>;
  value: string | undefined;
  onChange: (coinType: string) => void;
}

export default function CoinPopover({
  coinBalancesMap,
  value,
  onChange,
}: CoinPopoverProps) {
  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onChangeWrapper = async (_value: string) => {
    onChange(_value);
    setIsOpen(false);
  };

  return (
    <Popover
      label="coin"
      id="coin"
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="h-10 justify-between"
          endIcon={<ChevronsUpDown className="h-4 w-4" />}
          variant="secondary"
        >
          {value !== undefined && coinBalancesMap[value] ? (
            <div className="flex flex-row items-center gap-2">
              <TokenLogo
                className="h-4 w-4"
                token={{
                  coinType: value,
                  symbol: coinBalancesMap[value].symbol,
                  iconUrl: coinBalancesMap[value].iconUrl,
                }}
              />
              <TBody className="text-inherit">
                {coinBalancesMap[value].symbol}
              </TBody>
            </div>
          ) : value !== undefined ? (
            "Invalid coin selected".toUpperCase()
          ) : (
            "Select coin".toUpperCase()
          )}
        </Button>
      }
      contentProps={{
        align: "start",
        className:
          "border-secondary/25 p-0 overflow-y-auto flex flex-col gap-px",
        style: {
          width: "var(--radix-popover-trigger-width)",
          maxHeight: "var(--radix-popover-content-available-height)",
        },
      }}
    >
      {Object.values(coinBalancesMap).map((cb) => {
        const isSelected = value === cb.coinType;

        return (
          <button
            key={cb.coinType}
            className={cn(
              "flex w-full flex-row items-center justify-between px-3 py-2",
              isSelected
                ? "bg-muted/10"
                : "transition-colors hover:bg-muted/10",
            )}
            onClick={() => onChangeWrapper(cb.coinType)}
          >
            <div className="flex flex-row items-center gap-2">
              <TokenLogo
                className="h-4 w-4"
                token={{
                  coinType: cb.coinType,
                  symbol: cb.symbol,
                  iconUrl: cb.iconUrl,
                }}
              />
              <TBody>{cb.symbol}</TBody>
            </div>

            <TBody className="text-xs">
              {formatToken(cb.balance, { exact: false })} {cb.symbol}
            </TBody>
          </button>
        );
      })}
    </Popover>
  );
}
