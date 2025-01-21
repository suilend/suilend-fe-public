import "@/lib/abortSignalPolyfill";
import type { AppProps } from "next/app";
import Head from "next/head";
import { PropsWithChildren, useEffect, useRef } from "react";

// import { registerWallet } from "@mysten/wallet-standard";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LDProvider } from "launchdarkly-react-client-sdk";
import mixpanel from "mixpanel-browser";

import {
  SettingsContextProvider,
  WalletContextProvider,
  useSettingsContext,
} from "@suilend/frontend-sui-next";

import Layout from "@/components/layout/Layout";
import Toaster from "@/components/shared/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContextProvider } from "@/contexts/AppContext";
import { PointsContextProvider } from "@/contexts/PointsContext";
import { TITLE } from "@/lib/constants";
import "@/styles/globals.scss";

function WalletContextProviderWrapper({ children }: PropsWithChildren) {
  const { rpc } = useSettingsContext();

  // MSafe Wallet
  const didRegisterMsafeWalletRef = useRef<boolean>(false);
  useEffect(() => {
    if (didRegisterMsafeWalletRef.current) return;

    // registerWallet(new MSafeWallet("Suilend", rpc.url, "sui:mainnet"));
    didRegisterMsafeWalletRef.current = true;
  }, [rpc.url]);

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
      debug: process.env.NEXT_PUBLIC_DEBUG === "true",
      persistence: "localStorage",
    });
  }, []);

  return (
    <>
      <SpeedInsights />
      <Analytics />
      <Head>
        <title>{TITLE}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </Head>

      <main id="__app_main">
        <LDProvider
          clientSideID={
            process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID as string
          }
        >
          <SettingsContextProvider>
            <WalletContextProviderWrapper>
              <AppContextProvider>
                <PointsContextProvider>
                  <TooltipProvider>
                    <Layout>
                      <Component {...pageProps} />
                    </Layout>
                    <Toaster />
                  </TooltipProvider>
                </PointsContextProvider>
              </AppContextProvider>
            </WalletContextProviderWrapper>
          </SettingsContextProvider>
        </LDProvider>
      </main>
    </>
  );
}
