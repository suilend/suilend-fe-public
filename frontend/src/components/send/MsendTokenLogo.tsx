import { NORMALIZED_mSEND_SERIES_1_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedSendContext } from "@/contexts/SendContext";

interface MsendTokenLogoProps {
  size: number;
}

export default function MsendTokenLogo({ size }: MsendTokenLogoProps) {
  const { mSendCoinMetadata } = useLoadedSendContext();

  const coinType = NORMALIZED_mSEND_SERIES_1_COINTYPE; // Works for all mSEND coinTypes
  const coinMetadata = mSendCoinMetadata;

  return <TokenLogo token={getToken(coinType, coinMetadata)} size={size} />;
}
