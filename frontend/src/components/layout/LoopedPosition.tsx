import { getToken } from "@suilend/sui-fe";

import TokenLogo from "@/components/shared/TokenLogo";
import { TBodySans } from "@/components/shared/Typography";
import { useMarketCardContext } from "@/contexts/MarketCardContext";

interface LoopedPositionProps {
  coinTypes: string[];
}

export default function LoopedPosition({ coinTypes }: LoopedPositionProps) {
  const { appData } = useMarketCardContext();

  return (
    <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
      <TokenLogo
        token={getToken(coinTypes[0], appData.coinMetadataMap[coinTypes[0]])}
        size={16}
      />
      <TBodySans className="text-xs text-foreground">
        {appData.coinMetadataMap[coinTypes[0]].symbol} deposits{" "}
        {coinTypes[0] === coinTypes[1] ? "and borrows" : "and"}
      </TBodySans>
      {coinTypes[0] !== coinTypes[1] && (
        <>
          <TokenLogo
            token={getToken(
              coinTypes[1],
              appData.coinMetadataMap[coinTypes[1]],
            )}
            size={16}
          />
          <TBodySans className="text-xs text-foreground">
            {appData.coinMetadataMap[coinTypes[1]].symbol} borrows
          </TBodySans>
        </>
      )}
    </div>
  );
}
