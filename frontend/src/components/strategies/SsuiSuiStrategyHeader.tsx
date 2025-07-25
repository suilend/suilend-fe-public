import { formatNumber, getToken } from "@suilend/sui-fe";
import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
} from "@suilend/sui-fe";

import TokenLogos from "@/components/shared/TokenLogos";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  sSUI_SUI_TARGET_EXPOSURE,
  useSsuiStrategyContext,
} from "@/contexts/SsuiStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function SsuiSuiStrategyHeader() {
  const { appData } = useLoadedAppContext();
  const { userData } = useLoadedUserContext();

  const { isObligationLooping, getExposure } = useSsuiStrategyContext();

  // Obligation
  const OBLIGATION_ID =
    "0xf8dfef417a82155d5cbf485c4e7e061ff11dc1ddfa1370c6a46f0d7dfe4017f0";
  const obligation = userData.obligations.find((o) => o.id === OBLIGATION_ID);

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
          {isObligationLooping(obligation)
            ? formatNumber(
                getExposure(
                  obligation!.deposits[0].depositedAmount,
                  obligation!.borrows[0].borrowedAmount,
                ),
                { dp: 2, trimTrailingZeros: true },
              )
            : formatNumber(sSUI_SUI_TARGET_EXPOSURE, {
                dp: 2,
                trimTrailingZeros: true,
              })}
          x sSUI/SUI loop
        </TLabelSans>
      </div>
    </div>
  );
}
