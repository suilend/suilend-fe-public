import "@/lib/abortSignalPolyfill";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";
import { PropsWithChildren, useEffect, useRef } from "react";

import { MSafeWallet } from "@msafe/sui-wallet";
import { registerWallet } from "@mysten/wallet-standard";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LDProvider } from "launchdarkly-react-client-sdk";
import mixpanel from "mixpanel-browser";

import { RPCS, RpcId } from "@suilend/sui-fe";
import {
  SettingsContextProvider,
  WalletContextProvider,
} from "@suilend/sui-fe-next";

import Layout from "@/components/layout/Layout";
import Toaster from "@/components/shared/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContextProvider } from "@/contexts/AppContext";
import { UserContextProvider } from "@/contexts/UserContext";
import { TITLE } from "@/lib/constants";
import { fontClassNames } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "@/styles/globals.scss";

function WalletContextProviderWrapper({ children }: PropsWithChildren) {
  // MSafe Wallet
  const didRegisterMsafeWalletRef = useRef<boolean>(false);
  useEffect(() => {
    if (didRegisterMsafeWalletRef.current) return;

    registerWallet(
      new MSafeWallet(
        "Suilend",
        RPCS.find((rpc) => rpc.id === RpcId.FULL_NODE)!.url,
        "sui:mainnet",
      ),
    );
    didRegisterMsafeWalletRef.current = true;
  }, []);

  return (
    <WalletContextProvider appName="Suilend">{children}</WalletContextProvider>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  // Mixpanel
  useEffect(() => {
    const projectToken = process.env.NEXT_PUBLIC_MIXPANEL_PROJECT_TOKEN;
    if (!projectToken) return;

    mixpanel.init(projectToken, {
      debug: process.env.NODE_ENV === "development",
      persistence: "localStorage",
    });
  }, []);

  return (
    <>
      <Script id="safary-sdk">
        {`var script=document.createElement('script');script.src="https://tag.safary.club/stag-0.1.19.js";script.async=true;script.setAttribute('data-name','safary-sdk');script.setAttribute('data-product-id','prd_yHDPBSp3sp');script.integrity="sha256-HIiAIcXc6BMTZX//tyipuAVyCNCB67w86gVFLK52pxY=";script.crossOrigin="anonymous";var target=document.head||document.body;target.appendChild(script);`}
      </Script>

      <SpeedInsights />
      <Analytics />
      <Head>
        <title>{TITLE}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </Head>

      <main id="__app_main" className={cn(fontClassNames)}>
        <LDProvider
          clientSideID={
            process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID as string
          }
        >
          <SettingsContextProvider>
            <WalletContextProviderWrapper>
              <AppContextProvider>
                <UserContextProvider>
                  <TooltipProvider>
                    <Layout>
                      <Component {...pageProps} />
                    </Layout>
                    <Toaster />
                  </TooltipProvider>
                </UserContextProvider>
              </AppContextProvider>
            </WalletContextProviderWrapper>
          </SettingsContextProvider>
        </LDProvider>
      </main>
    </>
  );
}
