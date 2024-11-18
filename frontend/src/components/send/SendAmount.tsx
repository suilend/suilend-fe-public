import { NORMALIZED_SEND_COINTYPE } from "@suilend/frontend-sui";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface SendAmountProps {
  amount?: number;
}

export default function SendAmount({ amount }: SendAmountProps) {
  const { data } = useLoadedAppContext();

  const coinMetadata = data.coinMetadataMap[NORMALIZED_SEND_COINTYPE];

  return (
    <>
      <TokenLogo
        className="mx-2 inline-block h-10 w-10"
        token={{
          coinType: NORMALIZED_SEND_COINTYPE,
          symbol: coinMetadata.symbol,
          iconUrl: coinMetadata.iconUrl,
        }}
      />
      {amount && `${amount} `}SEND
    </>
  );
}
