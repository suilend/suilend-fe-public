import { useState } from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { ChevronsUpDown } from "lucide-react";

import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatToken, formatType } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CoinPopoverProps {
  coinMetadataMap?: Record<string, CoinMetadata>;
  value: string | undefined;
  onChange: (coinType: string) => void;
}

export default function CoinPopover({
  coinMetadataMap,
  value,
  onChange,
}: CoinPopoverProps) {
  const { getBalance } = useLoadedAppContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onChangeWrapper = async (_value: string) => {
    onChange(_value);
    setIsOpen(false);
  };

  return (
    <Popover
      label={value ? `coin (${formatType(value)})` : "coin"}
      id="coin"
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="h-10 justify-between"
          endIcon={<ChevronsUpDown className="h-4 w-4" />}
          variant="secondary"
        >
          {value !== undefined && coinMetadataMap?.[value] ? (
            <div className="flex min-w-0 flex-row items-center gap-2">
              <TokenLogo
                className="h-4 w-4 shrink-0"
                token={{
                  coinType: value,
                  symbol: coinMetadataMap[value].symbol,
                  iconUrl: coinMetadataMap[value].iconUrl,
                }}
              />
              <TBody className="overflow-hidden text-ellipsis text-nowrap text-inherit">
                {coinMetadataMap[value].symbol}
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
      {Object.entries(coinMetadataMap ?? {}).map(([coinType, coinMetadata]) => {
        const isSelected = value === coinType;

        return (
          <button
            key={coinType}
            className={cn(
              "flex w-full flex-row items-center justify-between px-3 py-2",
              isSelected
                ? "bg-muted/10"
                : "transition-colors hover:bg-muted/10",
            )}
            onClick={() => onChangeWrapper(coinType)}
          >
            <div className="flex min-w-0 flex-row items-center gap-2">
              <TokenLogo
                className="h-4 w-4 shrink-0"
                token={{
                  coinType: coinType,
                  symbol: coinMetadata.symbol,
                  iconUrl: coinMetadata.iconUrl,
                }}
              />
              <TBody className="overflow-hidden text-ellipsis text-nowrap">
                {coinMetadata.symbol}
              </TBody>
            </div>

            <TBody className="overflow-hidden text-ellipsis text-nowrap text-xs">
              {formatToken(getBalance(coinType), { exact: false })}{" "}
              {coinMetadata.symbol}
            </TBody>
          </button>
        );
      })}
    </Popover>
  );
}
