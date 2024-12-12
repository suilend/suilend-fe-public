import { ClassValue } from "clsx";

import { NORMALIZED_SEND_COINTYPE } from "@suilend/frontend-sui";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { cn } from "@/lib/utils";

interface SendTokenLogoProps {
  className?: ClassValue;
}

export default function SendTokenLogo({ className }: SendTokenLogoProps) {
  const { sendCoinMetadataMap } = useLoadedSendContext();

  const coinMetadata = sendCoinMetadataMap[NORMALIZED_SEND_COINTYPE];

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={{
        coinType: NORMALIZED_SEND_COINTYPE,
        symbol: coinMetadata.symbol,
        iconUrl: coinMetadata.iconUrl,
      }}
    />
  );
}
