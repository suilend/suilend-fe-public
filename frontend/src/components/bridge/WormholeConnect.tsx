import WormholeConnect from "@wormhole-foundation/wormhole-connect";
import BigNumber from "bignumber.js";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import {
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
} from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";
import mixpanelTrack from "@suilend/sui-fe-next/lib/track";

import { useLoadedAppContext } from "@/contexts/AppContext";
import { DISCORD_URL } from "@/lib/navigation";

export default function WormholeConnectWrapper() {
  const { rpc } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  const assetUsdPriceMap: Record<string, BigNumber> = {
    USDC: appDataMainMarket.reserveMap[NORMALIZED_USDC_COINTYPE].price,
    USDT: appDataMainMarket.reserveMap[NORMALIZED_wUSDT_COINTYPE].price,
    WETH: appDataMainMarket.reserveMap[NORMALIZED_WETH_COINTYPE].price,
    WSOL: appDataMainMarket.reserveMap[NORMALIZED_SOL_COINTYPE].price,
    SOL: appDataMainMarket.reserveMap[NORMALIZED_SOL_COINTYPE].price,
  };

  return (
    <div className="w-full">
      <WormholeConnect
        config={{
          network: "Mainnet",
          rpcs: {
            Ethereum:
              "https://rpc.ankr.com/eth/d57d49c5cc988185579623ea8fc23e7a0fc7005e843939bc29ed460952b381cb",
            Solana: `https://solendf-solendf-67c7.rpcpool.com/${process.env.NEXT_PUBLIC_SOL_TRITON_ONE_DEV_API_KEY ?? ""}`,
            Sui: rpc.url,
          },
          chains: ["Ethereum", "Solana", "Sui"],
          tokens: [
            "USDCeth",
            "USDCsol",
            "USDCsui",
            "USDT",
            "WETH",
            "WSOL",
            "SOL",
          ],
          eventHandler: (event) => {
            if (event.type === "transfer.start") {
              mixpanelTrack("bridge_submit");
            } else if (event.type === "transfer.redeem.initiate") {
              mixpanelTrack("bridge_claim");
            } else if (event.type === "transfer.success") {
              const { details } = event;

              const amount = details.amount
                ? new BigNumber(details.amount.amount).div(
                    10 ** details.amount.decimals,
                  )
                : new BigNumber(0);
              const amountUsd = amount.times(
                assetUsdPriceMap[details.fromToken.symbol] ?? 0,
              );

              mixpanelTrack("bridge_complete", {
                fromNetwork: details.fromChain,
                toNetwork: details.toChain,
                amount: amount.toFixed(2, BigNumber.ROUND_DOWN),
                amountUsd: amountUsd.toFixed(2, BigNumber.ROUND_DOWN),
                asset: details.fromToken.symbol,
              });
            }
          },
          ui: {
            title: "Bridge",
            defaultInputs: {
              source: { chain: "Ethereum" },
              destination: { chain: "Sui" },
              requiredChain: "Sui",
            },
            getHelpUrl: DISCORD_URL,
            showInProgressWidget: true,
          },
        }}
        theme={{
          mode: "dark",
          input: "#0a1526", // hsl(221 65% 9%)
          primary: "#2463eb", // hsl(221 100% 57%)
          secondary: "#8fa2c4", // hsl(221 34% 65%)
          text: "#ffffff", // hsl(0 0%, 100%)
          textSecondary: "#8fa2c4", // hsl(221 34% 65%)
          error: "#ef4444", // hsl(0 86% 60%)
          success: "#36b37e", // hsl(158 56% 48%)
          badge: "#0a1526", // hsl(221 65% 9%)
          font: "inherit",
        }}
      />
    </div>
  );
}
