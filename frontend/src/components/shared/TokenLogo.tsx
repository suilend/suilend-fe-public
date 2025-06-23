import Image from "next/image";
import { useEffect } from "react";

import { ClassValue } from "clsx";
import DOMPurify from "dompurify";

import {
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_suiETH_COINTYPE,
  NORMALIZED_suiUSDT_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_wUSDC_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
  Token,
} from "@suilend/sui-fe";

import TextLink from "@/components/shared/TextLink";
import Tooltip from "@/components/shared/Tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { ASSETS_URL } from "@/lib/constants";
import { DOCS_BRIDGE_LEARN_MORE_URL } from "@/lib/navigation";
import { isInvalidIconUrl } from "@/lib/tokens";
import { cn } from "@/lib/utils";

interface TokenLogoProps {
  className?: ClassValue;
  token?: Token;
  size: number;
  showBridgedAssetTooltip?: boolean;
}

export default function TokenLogo({
  className,
  token,
  size,
  showBridgedAssetTooltip,
}: TokenLogoProps) {
  const { tokenIconImageLoadErrorMap, loadTokenIconImage } =
    useLoadedAppContext();

  useEffect(() => {
    if (!token) return;
    if (isInvalidIconUrl(token.iconUrl)) return;

    loadTokenIconImage(token);
  }, [token, loadTokenIconImage]);

  // Bridged asset
  const wormholeAssetMap: Record<string, string> = {
    [NORMALIZED_wUSDC_COINTYPE]: "Wormhole Wrapped Ethereum-native USDC",
    [NORMALIZED_wUSDT_COINTYPE]: "Wormhole Wrapped Ethereum-native USDT",
    [NORMALIZED_WETH_COINTYPE]: "Wormhole Wrapped Ethereum-native WETH",
    [NORMALIZED_SOL_COINTYPE]: "Wormhole Wrapped Solana-native SOL",
  };
  const wormholeAsset = token ? wormholeAssetMap[token.coinType] : undefined;

  const suiBridgeAssetMap: Record<string, string> = {
    [NORMALIZED_suiUSDT_COINTYPE]: "USDT by Sui Bridge (Ethereum-native)",
    [NORMALIZED_wBTC_COINTYPE]: "wBTC by Sui Bridge (Ethereum-native)",
    [NORMALIZED_suiETH_COINTYPE]: "ETH by Sui Bridge (Ethereum-native)",
  };
  const suiBridgeAsset = token ? suiBridgeAssetMap[token.coinType] : undefined;

  const isSmall = size <= 24;
  const bridgeLogoSize = isSmall ? 8 : 12;

  if (!token)
    return (
      <Skeleton
        className={cn("shrink-0 rounded-[50%] border", className)}
        style={{ width: size, height: size }}
      />
    );
  if (
    isInvalidIconUrl(token.iconUrl) ||
    tokenIconImageLoadErrorMap[token.coinType]
  )
    return (
      <div
        className={cn("shrink-0 rounded-[50%] border", className)}
        style={{ width: size, height: size }}
      />
    );
  return (
    <Tooltip
      title={
        showBridgedAssetTooltip && (wormholeAsset || suiBridgeAsset) ? (
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
      <div className="relative shrink-0" style={{ width: size, height: size }}>
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

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={cn("relative z-[1] rounded-[50%]", className)}
          src={DOMPurify.sanitize(token.iconUrl!)}
          alt={`${token.symbol} logo`}
          width={size}
          height={size}
          style={{ width: size, height: size }}
        />
      </div>
    </Tooltip>
  );
}
