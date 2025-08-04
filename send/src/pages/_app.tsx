import type { AppProps } from "next/app";

import { ThemeProvider } from "next-themes";

import Layout from "@/components/Layout";
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
      <main className={cn(fontClassNames)}>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </main>
    </ThemeProvider>
  );
}
