import { useState } from "react";

import { Info } from "lucide-react";

import Button from "@/components/shared/Button";
import Popover from "@/components/shared/Popover";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { getFormattedMaxOutflow } from "@/lib/rateLimiter";
import { cn } from "@/lib/utils";

export default function MarketDetailsPopover() {
  const { appData } = useLoadedAppContext();

  const formattedOutflow = getFormattedMaxOutflow(
    appData.lendingMarket.rateLimiter,
  );

  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <Popover
      id="market-details"
      rootProps={{ open: isOpen, onOpenChange: setIsOpen }}
      trigger={
        <Button
          className={cn("text-muted-foreground", isOpen && "text-foreground")}
          icon={<Info />}
          variant="ghost"
          size="icon"
          role="combobox"
        >
          Info
        </Button>
      }
      contentProps={{
        align: "start",
        className: "w-[240px]",
      }}
    >
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-row items-center justify-between gap-4">
          <TLabelSans>Max outflow</TLabelSans>
          <TBody className="text-right uppercase">
            {formattedOutflow.formattedMaxOutflow}
          </TBody>
        </div>

        <div className="flex flex-row items-center justify-between gap-4">
          <TLabelSans>Owner</TLabelSans>
          <TBody className="text-right uppercase">Suilend</TBody>
        </div>
      </div>
    </Popover>
  );
}
