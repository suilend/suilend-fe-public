import { ClassValue } from "clsx";

import { NORMALIZED_SEND_COINTYPE, getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface SendTokenLogoProps {
  className?: ClassValue;
}

export default function SendTokenLogo({ className }: SendTokenLogoProps) {
  const { appData } = useLoadedAppContext();

  return (
    <TokenLogo
      className={cn("h-4 w-4", className)}
      token={getToken(
        NORMALIZED_SEND_COINTYPE,
        appData.coinMetadataMap[NORMALIZED_SEND_COINTYPE],
      )}
    />
  );
}
