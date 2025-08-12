import type { AppProps } from "next/app";

import { ThemeProvider } from "next-themes";

import Layout from "@/components/Layout";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fontClassNames } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import "@/styles/globals.scss";

export default function App({ Component, pageProps }: AppProps) {
  return (
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
  );
}
