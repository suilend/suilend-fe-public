import WormholeConnect, {
  WormholeConnectConfig,
  WormholeConnectTheme,
} from "@wormhole-foundation/wormhole-connect";

import styles from "@/components/bridge/WormholeConnect.module.scss";
import { useAppContext } from "@/contexts/AppContext";
import { DISCORD_URL } from "@/lib/navigation";
import track from "@/lib/track";
import { cn } from "@/lib/utils";

export default function WormholeConnectWrapper() {
  const { rpc } = useAppContext();

  return (
    <div className={cn("w-full", styles.root)}>
      <WormholeConnect
        config={
          {
            network: "Mainnet",
            rpcs: {
              Ethereum:
                "https://rpc.ankr.com/eth/d57d49c5cc988185579623ea8fc23e7a0fc7005e843939bc29ed460952b381cb",

              Solana: `https://solendf-solendf-67c7.rpcpool.com/${process.env.NEXT_PUBLIC_SOL_TRITON_ONE_DEV_API_KEY ?? ""}`,
              Sui: rpc.url,
            },
            chains: ["Ethereum", "Solana", "Sui"],
            tokens: ["WETH", "USDCeth", "USDT", "WSOL", "SOL"],
            eventHandler: (e) => {
              if (e.type === "transfer.initiate") {
                track("bridge_submit");
              } else if (e.type === "transfer.redeem.initiate") {
                track("bridge_claim");
              } else if (e.type === "transfer.success") {
                const { details } = e;
                track("bridge_complete", {
                  fromNetwork: details.fromChain,
                  toNetwork: details.toChain,
                  amount: details.amount ?? 0,
                  amountUsd: details.USDAmount ?? 0,
                  asset: details.fromToken.symbol,
                });
              }
            },
            ui: {
              title: "",
              defaultInputs: {
                toChain: "Sui",
                requiredChain: "Sui",
              },
              pageHeader: "",
              menu: [],
              showHamburgerMenu: false,
              getHelpUrl: DISCORD_URL,
              showInProgressWidget: true,
            },
          } as WormholeConnectConfig
        }
        theme={
          {
            mode: "dark",
            input: "hsl(var(--card))",
            primary: "hsl(var(--primary))",
            secondary: "#667085",
            text: "hsl(var(--foreground))",
            textSecondary: "hsl(var(--muted-foreground))",
            error: "hsl(var(--destructive))",
            success: "hsl(var(--success))",
            badge: "hsl(var(--popover))",
            font: "var(--font-geist-sans)",
          } as WormholeConnectTheme
        }
      />
    </div>
  );
}
