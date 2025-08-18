import type { AppProps } from "next/app";
import Head from "next/head";

import { ThemeProvider } from "next-themes";

import Layout from "@/components/Layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TITLE } from "@/lib/constants";
import { fontClassNames } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import "@/styles/globals.scss";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>{TITLE}</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"
        />
      </Head>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <main id="__app_main" className={cn(fontClassNames)}>
          <TooltipProvider>
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </TooltipProvider>
        </main>
      </ThemeProvider>
    </>
  );
}
