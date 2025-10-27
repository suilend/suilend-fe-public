import { Info } from "lucide-react";
import { getToken, Token } from "@suilend/sui-fe";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface EarnHeaderProps {
  title: string;
  tooltip: string;
  type: string;
  tokens: Token[];
}

export default function EarnHeader({ title, tooltip, type, tokens }: EarnHeaderProps) {
  return (
    <div className="flex h-10 flex-row items-center gap-3">
      <TokenLogos
        tokens={tokens}
        size={24}
      />

      <div className="flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <TBody>{title}</TBody>
          <Tooltip title={tooltip}>
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Tooltip>
        </div>

        <div className="flex h-5 w-max flex-row items-center rounded-full border border-muted/25 px-2">
          <TLabelSans>{type}</TLabelSans>
        </div>
      </div>
    </div>
  );
}
