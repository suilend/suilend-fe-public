import { MouseEvent, useEffect, useState } from "react";

import styles from "@/components/bridge/WormholeConnect.module.scss";
import Container from "@/components/shared/Container";
import { useAppContext } from "@/contexts/AppContext";
import { DASHBOARD_URL } from "@/lib/navigation";
import track from "@/lib/track";
import { cn } from "@/lib/utils";

interface WormholeConnectProps {
  isHidden?: boolean;
}

export default function WormholeConnect({ isHidden }: WormholeConnectProps) {
  const { rpc } = useAppContext();

  // Analytics
  const [didSubmit, setDidSubmit] = useState<boolean>(false);
  const [didClaim, setDidClaim] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const appContentElem = document.querySelector("[class$='-appContent']");
      if (appContentElem) {
        let isComplete = false;
        const inputDivElems = appContentElem.querySelectorAll(
          "[class$='input'] > div",
        );
        for (const elem of inputDivElems) {
          if (elem.textContent === "The bridge is now complete.") {
            isComplete = true;
            break;
          }
        }

        if (isComplete && (didSubmit || didClaim)) {
          const chainElems = appContentElem.querySelectorAll(
            "[class$='-input'] > div[class$='-row'] > div[class$='-chain'] > div:last-of-type",
          );
          const fromNetwork = chainElems[0]?.textContent ?? undefined;
          const toNetwork = chainElems[1]?.textContent ?? undefined;

          const amountAssetElems = appContentElem.querySelectorAll(
            "div.MuiStack-root > div div[class$='-input'] > div:last-of-type > div:first-of-type > div:first-of-type > div:last-of-type > div:first-of-type",
          );
          const fromAmountAsset = amountAssetElems[0]?.textContent ?? undefined;
          const fromAmount = fromAmountAsset?.split(" ")?.[0] ?? undefined;
          const fromAssetSymbol = fromAmountAsset?.split(" ")?.[1] ?? undefined;

          setDidSubmit(false);
          setDidClaim(false);
          track("bridge_complete", {
            fromNetwork,
            toNetwork,
            amount: fromAmount,
            asset: fromAssetSymbol,
          } as Record<string, string>);
        }
      }
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [didSubmit, didClaim]);

  useEffect(() => {
    if (isHidden) {
      setDidSubmit(false);
      setDidClaim(false);
    }
  }, [isHidden]);

  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    if (
      target.tagName.toLowerCase() === "div" &&
      target.getAttribute("class")?.includes("-button") &&
      target.getAttribute("class")?.includes("-action")
    ) {
      // Submit
      if (target.innerHTML === "Approve and proceed with transaction") {
        setDidSubmit(true);
        track("bridge_submit");
      }

      // Claim
      if (target.innerHTML === "Claim") {
        setDidClaim(true);
        track("bridge_claim");
      }

      // Deposit (CTA)
      if (target.innerHTML === "Deposit") {
        setDidSubmit(false);
        setDidClaim(false);
        track("bridge_deposit");
      }

      // Back
    } else if (
      (target.tagName.toLowerCase() === "svg" &&
        target.getAttribute("class")?.includes("-arrowBack")) ||
      (target.tagName.toLowerCase() === "path" &&
        target.parentElement &&
        target.parentElement.tagName.toLowerCase() === "svg" &&
        target.parentElement.getAttribute("class")?.includes("-arrowBack"))
    ) {
      setDidSubmit(false);
      setDidClaim(false);
    }
  };

  return (
    <Container className={cn(isHidden && "hidden")}>
      <div
        id="wormhole-connect"
        onMouseDown={onMouseDown}
        className={cn("w-full", styles.root)}
        data-config={JSON.stringify({
          env: "mainnet",
          rpcs: {
            ethereum:
              "https://rpc.ankr.com/eth/d57d49c5cc988185579623ea8fc23e7a0fc7005e843939bc29ed460952b381cb",
            solana: `https://solendf-solendf-67c7.rpcpool.com/${process.env.NEXT_PUBLIC_SOL_TRITON_ONE_DEV_API_KEY ?? ""}`,
            sui: rpc.url,
          },
          tokens: ["WETH", "USDCeth", "USDT", "WSOL", "SOL"],
          cta: { text: "Deposit", link: DASHBOARD_URL },
          bridgeDefaults: { toNetwork: "sui", requiredNetwork: "sui" },
          pageHeader: "Bridge",
          networks: ["ethereum", "solana", "sui"],
          showHamburgerMenu: false,
        })}
        data-theme={JSON.stringify({
          mode: "dark",
          primary: {
            "50": "#fafafa",
            "100": "#f5f5f5",
            "200": "#eeeeee",
            "300": "#e0e0e0",
            "400": "#bdbdbd",
            "500": "#9e9e9e",
            "600": "#757575",
            "700": "#616161",
            "800": "#424242",
            "900": "#212121",
            A100: "#f5f5f5",
            A200: "#eeeeee",
            A400: "#bdbdbd",
            A700: "#616161",
          },
          secondary: {
            "50": "#fafafa",
            "100": "#f5f5f5",
            "200": "#eeeeee",
            "300": "#e0e0e0",
            "400": "#bdbdbd",
            "500": "#9e9e9e",
            "600": "#757575",
            "700": "#616161",
            "800": "#424242",
            "900": "#212121",
            A100: "#f5f5f5",
            A200: "#eeeeee",
            A400: "#bdbdbd",
            A700: "#616161",
          },
          divider: "hsl(var(--border))",
          background: { default: "transparent" },
          text: {
            primary: "hsl(var(--foreground))",
            secondary: "hsl(var(--muted-foreground))",
          },
          error: {
            "50": "#ffebee",
            "100": "#ffcdd2",
            "200": "#ef9a9a",
            "300": "#e57373",
            "400": "#ef5350",
            "500": "#f44336",
            "600": "#e53935",
            "700": "#d32f2f",
            "800": "#c62828",
            "900": "#b71c1c",
            A100: "#ff8a80",
            A200: "#ff5252",
            A400: "#ff1744",
            A700: "#d50000",
          },
          info: {
            "50": "#97a5b7",
            "100": "#8293a9",
            "200": "#6e819a",
            "300": "#596f8c",
            "400": "#445d7e",
            "500": "#304C70",
            "600": "#2b4464",
            "700": "#263c59",
            "800": "#21354e",
            "900": "#1c2d43",
            A100: "#304C70",
            A200: "#304C70",
            A400: "#304C70",
            A700: "#304C70",
          },
          success: {
            "50": "#66d6cd",
            "100": "#4dcfc4",
            "200": "#33c8bc",
            "300": "#1ac1b4",
            "400": "#01BBAC",
            "500": "#00a89a",
            "600": "#009589",
            "700": "#008278",
            "800": "#007067",
            "900": "#005d56",
            A100: "#00a89a",
            A200: "#00a89a",
            A400: "#00a89a",
            A700: "#00a89a",
          },
          warning: {
            "50": "#ffe3a4",
            "100": "#ffdd91",
            "200": "#ffd77f",
            "300": "#ffd26d",
            "400": "#ffcc5b",
            "500": "#FFC749",
            "600": "#e5b341",
            "700": "#cc9f3a",
            "800": "#b28b33",
            "900": "#99772b",
            A100: "#FFC749",
            A200: "#FFC749",
            A400: "#FFC749",
            A700: "#FFC749",
          },
          button: {
            primary: "hsl(var(--primary))",
            primaryText: "hsl(var(--primary-foreground))",
            disabled: "hsl(var(--primary))",
            disabledText: "hsl(var(--primary-foreground))",
            action: "hsl(var(--primary))",
            actionText: "hsl(var(--primary-foreground))",
            hover: "#ffffff0F",
          },
          options: { hover: "#ffffff0F", select: "#ffffff19" },
          card: {
            background: "hsl(var(--card))",
            secondary: "hsla(var(--muted) / 10%)",
            elevation: "none",
          },
          popover: {
            background: "hsl(var(--popover))",
            secondary: "hsla(var(--muted) / 10%)",
            elevation: "none",
          },
          modal: { background: "hsl(var(--popover))" },
          font: {
            primary: "var(--font-geist-sans)",
            header: "var(--font-geist-sans)",
          },
        })}
      />
    </Container>
  );
}
