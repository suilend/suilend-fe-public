import { useState } from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { ChevronsUpDown } from "lucide-react";

import { formatToken } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import CopyToClipboardButton from "@/components/shared/CopyToClipboardButton";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface CoinDropdownMenuProps {
  coinMetadataMap?: Record<string, CoinMetadata>;
  value: string | undefined;
  onChange: (coinType: string) => void;
}

export default function CoinDropdownMenu({
  coinMetadataMap,
  value,
  onChange,
}: CoinDropdownMenuProps) {
  const { explorer } = useSettingsContext();
  const { getBalance } = useLoadedUserContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onChangeWrapper = async (_value: string) => {
    onChange(_value);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-1">
        <TLabelSans>coin</TLabelSans>

        {value && (
          <div className="flex h-4 flex-row items-center">
            <CopyToClipboardButton
              className="h-6 w-6 hover:bg-transparent"
              iconClassName="w-3 h-3"
              value={value}
            />
            <OpenOnExplorerButton
              className="h-6 w-6 hover:bg-transparent"
              iconClassName="w-3 h-3"
              url={explorer.buildCoinUrl(value)}
            />
          </div>
        )}
      </div>
      <DropdownMenu
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
        items={Object.entries(coinMetadataMap ?? {}).map(
          ([coinType, coinMetadata]) => (
            <DropdownMenuItem
              key={coinType}
              className="flex flex-row items-center justify-between gap-2"
              isSelected={coinType === value}
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
            </DropdownMenuItem>
          ),
        )}
      />
    </div>
  );
}
