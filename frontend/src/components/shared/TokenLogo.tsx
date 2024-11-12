import Image from "next/image";
import { CSSProperties } from "react";

import { ClassValue } from "clsx";

import {
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_USDT_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
} from "@suilend/frontend-sui";

import TextLink from "@/components/shared/TextLink";
import Tooltip from "@/components/shared/Tooltip";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { DOCS_BRIDGE_LEARN_MORE_URL } from "@/lib/navigation";
import { Token } from "@/lib/types";
import { cn } from "@/lib/utils";
import wormholeLogo from "@/public/assets/wormhole.png";

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

  const nativeAssetMap: Record<string, string> = {
    [NORMALIZED_wUSDC_COINTYPE]: "Wormhole Wrapped Ethereum-native USDC",
    [NORMALIZED_USDT_COINTYPE]: "Wormhole Wrapped Ethereum-native USDT",
    [NORMALIZED_WETH_COINTYPE]: "Wormhole Wrapped Ethereum-native WETH",
    [NORMALIZED_SOL_COINTYPE]: "Wormhole Wrapped Solana-native SOL",
  };
  const nativeAsset = nativeAssetMap[token.coinType];

  const isSmall = className
    ? className.toString().includes("h-4") ||
      className.toString().includes("h-5") ||
      className.toString().includes("h-6")
    : false;
  const wormholeLogoSize = isSmall ? 8 : 12;

  return (
    <Tooltip
      title={
        showTooltip && nativeAsset ? (
          <>
            {`${nativeAsset}. `}
            <TextLink href={DOCS_BRIDGE_LEARN_MORE_URL}>Learn more</TextLink>
          </>
        ) : undefined
      }
    >
      <div className={cn("relative h-7 w-7", className)} style={style}>
        <AspectRatio ratio={1} className="relative z-[1]">
          {token.iconUrl ? (
            <Image
              key={token.iconUrl}
              className={cn("rounded-full object-cover", imageClassName)}
              src={token.iconUrl}
              alt={`${token.symbol} logo`}
              fill
              {...restImageProps}
            />
          ) : (
            <div className="h-full w-full" />
          )}
        </AspectRatio>

        {nativeAsset && (
          <div className="absolute -bottom-0.5 -right-0.5 z-[2] rounded-full border border-[black] bg-[black]">
            <Image
              src={wormholeLogo}
              alt="Wormhole logo"
              width={wormholeLogoSize}
              height={wormholeLogoSize}
            />
          </div>
        )}
      </div>
    </Tooltip>
  );
}
