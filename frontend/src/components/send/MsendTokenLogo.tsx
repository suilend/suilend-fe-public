import { ClassValue } from "clsx";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { cn } from "@/lib/utils";

interface MsendTokenLogoProps {
  className?: ClassValue;
  coinType: string;
}

export default function MsendTokenLogo({
  className,
  coinType,
}: MsendTokenLogoProps) {
  const { mSendCoinMetadataMap } = useLoadedSendContext();

  const coinMetadata = mSendCoinMetadataMap[coinType];

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={{
        coinType,
        symbol: coinMetadata.symbol,
        iconUrl: coinMetadata.iconUrl,
      }}
    />
  );
}
