import Image from "next/image";
import { CSSProperties } from "react";

import { ClassValue } from "clsx";

import {
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
} from "@suilend/sui-fe";

import TextLink from "@/components/shared/TextLink";
import Tooltip from "@/components/shared/Tooltip";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ASSETS_URL } from "@/lib/constants";
import { DOCS_BRIDGE_LEARN_MORE_URL } from "@/lib/navigation";
import { Token } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TokenLogoProps {
  showTooltip?: boolean;
  className?: ClassValue;
  style?: CSSProperties;
  imageProps?: React.HTMLAttributes<HTMLImageElement>;
  token: Token;
}

export default function TokenLogo({
  showTooltip,
  className,
  style,
  imageProps,
  token,
}: TokenLogoProps) {
  const { className: imageClassName, ...restImageProps } = imageProps || {};

  const wormholeAssetMap: Record<string, string> = {
    [NORMALIZED_wUSDC_COINTYPE]: "Wormhole Wrapped Ethereum-native USDC",
    [NORMALIZED_wUSDT_COINTYPE]: "Wormhole Wrapped Ethereum-native USDT",
    [NORMALIZED_WETH_COINTYPE]: "Wormhole Wrapped Ethereum-native WETH",
    [NORMALIZED_SOL_COINTYPE]: "Wormhole Wrapped Solana-native SOL",
  };
  const wormholeAsset = wormholeAssetMap[token.coinType];

  const suiBridgeAssetMap: Record<string, string> = {
    [NORMALIZED_suiUSDT_COINTYPE]: "USDT by Sui Bridge (Ethereum-native)",
    [NORMALIZED_wBTC_COINTYPE]: "wBTC by Sui Bridge (Ethereum-native)",
    [NORMALIZED_suiETH_COINTYPE]: "ETH by Sui Bridge (Ethereum-native)",
  };
  const suiBridgeAsset = suiBridgeAssetMap[token.coinType];

  const isSmall = className
    ? className.toString().includes("h-4") ||
      className.toString().includes("h-5") ||
      className.toString().includes("h-6")
    : false;
  const bridgeLogoSize = isSmall ? 8 : 12;

  return (
    <Tooltip
      title={
        showTooltip && (wormholeAsset || suiBridgeAsset) ? (
          <>
            {wormholeAsset || suiBridgeAsset}
            {wormholeAsset && (
              <>
                {" "}
                <TextLink href={DOCS_BRIDGE_LEARN_MORE_URL}>
                  Learn more
                </TextLink>
              </>
            )}
          </>
        ) : undefined
      }
    >
      <div className={cn("relative h-7 w-7 shrink-0", className)} style={style}>
        <AspectRatio ratio={1} className="relative z-[1]">
          {!token.iconUrl ||
          token.iconUrl === "" ||
          token.iconUrl === "TODO" ? (
            <div className="h-full w-full shrink-0 rounded-[50%] bg-muted/15" />
          ) : (
            <Image
              key={token.iconUrl}
              className={cn(
                "shrink-0 rounded-[50%] rounded-full object-cover",
                imageClassName,
              )}
              src={token.iconUrl}
              alt={`${token.symbol} logo`}
              fill
              quality={100}
              {...restImageProps}
            />
          )}
        </AspectRatio>

        {(wormholeAsset || suiBridgeAsset) && (
          <div className="absolute -bottom-0.5 -right-0.5 z-[2] rounded-full border border-[black] bg-[black]">
            {wormholeAsset ? (
              <Image
                src={`${ASSETS_URL}/partners/Wormhole.png`}
                alt="Wormhole logo"
                width={bridgeLogoSize}
                height={bridgeLogoSize}
                quality={100}
              />
            ) : (
              <Image
                src={`${ASSETS_URL}/partners/Sui Bridge.png`}
                alt="Sui Bridge logo"
                width={bridgeLogoSize}
                height={bridgeLogoSize}
                quality={100}
              />
            )}
          </div>
        )}
      </div>
    </Tooltip>
  );
}
