import TokenLogo from "@/components/shared/TokenLogo";
import { TBodySans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface LoopedPositionProps {
  coinTypes: string[];
}

export default function LoopedPosition({ coinTypes }: LoopedPositionProps) {
  const { data } = useLoadedAppContext();

  return (
    <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
      <TokenLogo
        className="h-4 w-4"
        token={{
          coinType: coinTypes[0],
          symbol: data.coinMetadataMap[coinTypes[0]].symbol,
          iconUrl: data.coinMetadataMap[coinTypes[0]].iconUrl,
        }}
      />
      <TBodySans className="text-xs text-foreground">
        {data.coinMetadataMap[coinTypes[0]].symbol} deposits{" "}
        {coinTypes[0] === coinTypes[1] ? "and borrows" : "and"}
      </TBodySans>
      {coinTypes[0] !== coinTypes[1] && (
        <>
          <TokenLogo
            className="h-4 w-4"
            token={{
              coinType: coinTypes[1],
              symbol: data.coinMetadataMap[coinTypes[1]].symbol,
              iconUrl: data.coinMetadataMap[coinTypes[1]].iconUrl,
            }}
          />
          <TBodySans className="text-xs text-foreground">
            {data.coinMetadataMap[coinTypes[1]].symbol} borrows
          </TBodySans>
        </>
      )}
    </div>
  );
}
