import "@/lib/abortSignalPolyfill";

import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";

import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LDProvider } from "launchdarkly-react-client-sdk";
import mixpanel from "mixpanel-browser";

import {
  SettingsContextProvider,
  WalletContextProvider,
} from "@suilend/frontend-sui-next";

import Layout from "@/components/layout/Layout";
import Toaster from "@/components/shared/Toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppContextProvider } from "@/contexts/AppContext";
import { PointsContextProvider } from "@/contexts/PointsContext";
import { WormholeConnectContextProvider } from "@/contexts/WormholeConnectContext";
import { TITLE } from "@/lib/constants";
import { fontClassNames } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import "@/styles/globals.scss";

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

      <main id="__app_main" className={cn("relative", ...fontClassNames)}>
        <LDProvider
          clientSideID={
            process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_SIDE_ID as string
          }
        >
          <SettingsContextProvider>
            <WalletContextProvider appName="Suilend">
              <AppContextProvider>
                <PointsContextProvider>
                  <WormholeConnectContextProvider>
                    <TooltipProvider>
                      <Layout>
                        <Component {...pageProps} />
                      </Layout>
                      <Toaster />
                    </TooltipProvider>
                  </WormholeConnectContextProvider>
                </PointsContextProvider>
              </AppContextProvider>
            </WalletContextProvider>
          </SettingsContextProvider>
        </LDProvider>
      </main>
    </>
  );
}
