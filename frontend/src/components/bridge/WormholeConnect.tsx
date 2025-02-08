import WormholeConnect from "@wormhole-foundation/wormhole-connect";
import BigNumber from "bignumber.js";

import {
  NORMALIZED_SOL_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_WETH_COINTYPE,
  NORMALIZED_wUSDT_COINTYPE,
} from "@suilend/frontend-sui";
import track from "@suilend/frontend-sui/lib/track";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import styles from "@/components/bridge/WormholeConnect.module.scss";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { DISCORD_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function WormholeConnectWrapper() {
  const { appData } = useLoadedAppContext();
  const { rpc } = useSettingsContext();

  const assetUsdPriceMap: Record<string, BigNumber> = {
    USDC: appData.reserveMap[NORMALIZED_USDC_COINTYPE].price,
    USDT: appData.reserveMap[NORMALIZED_wUSDT_COINTYPE].price,
    WETH: appData.reserveMap[NORMALIZED_WETH_COINTYPE].price,
    WSOL: appData.reserveMap[NORMALIZED_SOL_COINTYPE].price,
    SOL: appData.reserveMap[NORMALIZED_SOL_COINTYPE].price,
  };

  return (
    <div className={cn("w-full", styles.root)}>
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
              track("bridge_submit");
            } else if (event.type === "transfer.redeem.initiate") {
              track("bridge_claim");
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

              track("bridge_complete", {
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
              toChain: "Sui",
              requiredChain: "Sui",
            },
            getHelpUrl: DISCORD_URL,
            showInProgressWidget: true,
          },
        }}
        theme={{
          mode: "dark",
          input: "hsl(var(--card))",
          primary: "hsl(var(--primary))",
          secondary: "hsl(var(--muted))",
          text: "hsl(var(--foreground))",
          textSecondary: "hsl(var(--muted-foreground))",
          error: "hsl(var(--destructive))",
          success: "hsl(var(--success))",
          badge: "hsl(var(--card))",
          font: "var(--font-geist-sans)",
        }}
      />
    </div>
  );
}
