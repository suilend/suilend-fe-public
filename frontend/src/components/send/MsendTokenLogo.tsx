import { ClassValue } from "clsx";

import { NORMALIZED_mSEND_SERIES_1_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { cn } from "@/lib/utils";

interface MsendTokenLogoProps {
  className?: ClassValue;
}

export default function MsendTokenLogo({ className }: MsendTokenLogoProps) {
  const { mSendCoinMetadata } = useLoadedSendContext();

  const coinType = NORMALIZED_mSEND_SERIES_1_COINTYPE; // Works for all mSEND coinTypes
  const coinMetadata = mSendCoinMetadata;

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={getToken(coinType, coinMetadata)}
    />
  );
}
