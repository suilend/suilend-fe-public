import { useState } from "react";

import { intervalToDuration } from "date-fns";
import { ChevronsUpDown } from "lucide-react";

import { formatToken } from "@suilend/sui-fe";

import MsendTokenLogo from "@/components/send/MsendTokenLogo";
import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import { TBody, TBodySans } from "@/components/shared/Typography";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { formatCountdownDuration } from "@/lib/send";

const getMsendCoinTypeName = (coinType: string) =>
  coinType
    .split("::")
    .at(-1)!
    .split("_")
    .filter((s) => s !== "MSEND")
    .join(" ");

export default function MsendDropdownMenu() {
  const {
    mSendObjectMap,
    mSendCoinMetadata,
    mSendBalanceMap,
    mSendCoinTypesWithBalance,
    selectedMsendCoinType,
    setSelectedMsendCoinType,
  } = useLoadedSendContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const onChangeWrapper = async (_value: string) => {
    setSelectedMsendCoinType(_value);
    setIsOpen(false);
  };

  return (
    <DropdownMenu
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className="h-10 justify-between"
          endIcon={<ChevronsUpDown className="h-4 w-4" />}
          variant="secondary"
        >
          <div className="flex flex-row items-center gap-2">
            <TBody className="text-inherit">
              {getMsendCoinTypeName(selectedMsendCoinType)}
            </TBody>
          </div>
        </Button>
      }
      contentProps={{
        style: {
          padding: "8px",
          gap: 0,
          maxWidth: "none",
          width: "var(--radix-dropdown-menu-trigger-width)",
        },
      }}
      items={mSendCoinTypesWithBalance.map((coinType) => (
        <DropdownMenuItem
          key={coinType}
          className="flex flex-row items-center justify-between gap-2"
          isSelected={coinType === selectedMsendCoinType}
          onClick={() => onChangeWrapper(coinType)}
        >
          {/* Left */}
          <div className="flex flex-col gap-1.5">
            {/* Maturity */}
            <div className="flex flex-row items-center gap-3">
              <TBodySans className="text-muted-foreground">Maturity</TBodySans>
              <TBody>
                {Date.now() < +mSendObjectMap[coinType].penaltyEndTimeS * 1000
                  ? formatCountdownDuration(
                      intervalToDuration({
                        start: Date.now(),
                        end: new Date(
                          +mSendObjectMap[coinType].penaltyEndTimeS * 1000,
                        ),
                      }),
                    )
                  : "--"}
              </TBody>
            </div>

            {/* Penalty */}
            <div className="flex flex-row items-center gap-3">
              <TBodySans className="text-muted-foreground">Penalty</TBodySans>
              <TBody>
                {formatToken(mSendObjectMap[coinType].currentPenaltySui)}
                {" SUI"}
              </TBody>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-end gap-1.5">
            <TBody>{getMsendCoinTypeName(coinType)}</TBody>
            <div className="flex flex-row items-center gap-2">
              <MsendTokenLogo className="h-5 w-5" />
              <TBody>
                {formatToken(mSendBalanceMap[coinType], {
                  dp: mSendCoinMetadata.decimals,
                  trimTrailingZeros: true,
                })}
              </TBody>
            </div>
          </div>
        </DropdownMenuItem>
      ))}
    />
  );
}
