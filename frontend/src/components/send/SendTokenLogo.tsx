import { ClassValue } from "clsx";

import { NORMALIZED_SEND_COINTYPE } from "@suilend/frontend-sui";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface SendTokenLogoProps {
  className?: ClassValue;
}

export default function SendTokenLogo({ className }: SendTokenLogoProps) {
  const { data } = useLoadedAppContext();

  const coinMetadata = data.coinMetadataMap[NORMALIZED_SEND_COINTYPE];

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
