import { useState } from "react";

import { intervalToDuration } from "date-fns";
import { ChevronsUpDown } from "lucide-react";

import MsendTokenLogo from "@/components/send/MsendTokenLogo";
import Button from "@/components/shared/Button";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/components/shared/DropdownMenu";
import { TBody, TBodySans } from "@/components/shared/Typography";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { formatToken } from "@/lib/format";
import { formatDuration } from "@/lib/send";

export default function MsendDropdownMenu() {
  const {
    mSendObjectMap,
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
            <MsendTokenLogo
              className="h-5 w-5"
              coinType={selectedMsendCoinType}
            />
            <TBody className="text-[16px] text-inherit">
              {formatToken(mSendBalanceMap[selectedMsendCoinType], {
                exact: false,
              })}
            </TBody>
          </div>
        </Button>
      }
      contentStyle={{
        padding: "8px",
        gap: 0,
        maxWidth: "none",
        width: "var(--radix-dropdown-menu-trigger-width)",
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
            {/* Penalty */}
            <div className="flex flex-row items-center gap-3">
              <TBodySans className="text-muted-foreground">Penalty</TBodySans>
              <TBody>
                {formatToken(mSendObjectMap[coinType].currentPenaltySui)}
                {" SUI"}
              </TBody>
            </div>

            {/* Maturity */}
            <div className="flex flex-row items-center gap-3">
              <TBodySans className="text-muted-foreground">Maturity</TBodySans>
              <TBody>
                {Date.now() < +mSendObjectMap[coinType].penaltyEndTimeS * 1000
                  ? formatDuration(
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
          </div>

          {/* Right */}
          <div className="flex flex-row items-center gap-2">
            <MsendTokenLogo className="h-5 w-5" coinType={coinType} />
            <TBody className="text-[16px]">
              {formatToken(mSendBalanceMap[coinType], { exact: false })}
            </TBody>
          </div>
        </DropdownMenuItem>
      ))}
    />
  );
}
