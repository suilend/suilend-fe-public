import { Info } from "lucide-react";

import { getToken } from "@suilend/sui-fe";
import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
} from "@suilend/sui-fe";

import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function SsuiSuiStrategyHeader() {
  const { appData } = useLoadedAppContext();

  return (
    <div className="flex h-10 flex-row items-center gap-3">
      <TokenLogos
        tokens={[
          getToken(
            NORMALIZED_sSUI_COINTYPE,
            appData.coinMetadataMap[NORMALIZED_sSUI_COINTYPE],
          ),
          getToken(
            NORMALIZED_SUI_COINTYPE,
            appData.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
          ),
        ]}
        size={28}
      />

      <div className="-ml-[7px] flex flex-col gap-1">
        <div className="flex flex-row items-center gap-2">
          <TBody>sSUI/SUI</TBody>
          <Tooltip title="Sets up a sSUI/SUI loop strategy by depositing sSUI and borrowing SUI to the desired leverage">
            <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Tooltip>
        </div>

        <div className="flex h-5 w-max flex-row items-center rounded-full border border-muted/25 px-2">
          <TLabelSans>Looping</TLabelSans>
        </div>
      </div>
    </div>
  );
}
