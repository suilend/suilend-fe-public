import WormholeConnect from "@wormhole-foundation/wormhole-connect";
import BigNumber from "bignumber.js";

import track from "@suilend/frontend-sui/lib/track";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import styles from "@/components/bridge/WormholeConnect.module.scss";
import { DISCORD_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function WormholeConnectWrapper() {
  const { rpc } = useSettingsContext();

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
          tokens: ["WETH", "USDCeth", "USDT", "WSOL", "SOL"],
          eventHandler: (event) => {
            if (event.type === "transfer.initiate") {
              track("bridge_submit");
            } else if (event.type === "transfer.redeem.initiate") {
              track("bridge_claim");
            } else if (event.type === "transfer.success") {
              const { details } = event;
              track("bridge_complete", {
                fromNetwork: details.fromChain,
                toNetwork: details.toChain,
                amount: details.amount
                  ? +new BigNumber(details.amount.amount).div(
                      10 ** details.amount.decimals,
                    )
                  : 0,
                amountUsd: details.USDAmount ?? 0,
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
            showHamburgerMenu: false,
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
