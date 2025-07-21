import { getToken } from "@suilend/sui-fe";
import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
} from "@suilend/sui-fe";

import TokenLogos from "@/components/shared/TokenLogos";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { sSUI_SUI_TARGET_EXPOSURE } from "@/contexts/StrategiesContext";

export default function SsuiSuiStrategyHeader() {
  const { appData } = useLoadedAppContext();

  return (
    <div className="flex flex-row items-center gap-3">
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
        <TBody>sSUI/SUI</TBody>
        <TLabelSans>
          {sSUI_SUI_TARGET_EXPOSURE.toNumber()}x sSUI/SUI loop
        </TLabelSans>
      </div>
    </div>
  );
}
