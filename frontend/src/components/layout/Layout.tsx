import { useRouter } from "next/router";
import { CSSProperties, PropsWithChildren, useRef, useState } from "react";

import { useResizeObserver } from "usehooks-ts";

import AccountOverviewDialog from "@/components/dashboard/account-overview/AccountOverviewDialog";
import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";
import LaunchDarklyBanner from "@/components/layout/LaunchDarklyBanner";
import Container from "@/components/shared/Container";
import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useAppContext } from "@/contexts/AppContext";
import { ReserveAssetDataEventsContextProvider } from "@/contexts/ReserveAssetDataEventsContext";
import { ROOT_URL } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function Layout({ children }: PropsWithChildren) {
  const router = useRouter();

  const { suilendClient, data } = useAppContext();

  // LaunchDarkly banner
  const launchDarklyBannerRef = useRef<HTMLDivElement>(null);
  const [launchDarklyBannerHeight, setLaunchDarklyBannerHeight] = useState<
    number | null
  >(null);

  useResizeObserver<HTMLDivElement>({
    ref: launchDarklyBannerRef,
    onResize: ({ height }) => {
      if (height === undefined) return;
      setLaunchDarklyBannerHeight(height);
    },
  });

  // Loading
  const isOnLandingPage = router.asPath === ROOT_URL;

  const isDataLoading = !suilendClient || !data;
  const isPageLoading = isOnLandingPage ? false : isDataLoading;

  return (
    <div
      className="relative z-[1] flex min-h-dvh flex-col"
      style={
        {
          background: "url('/assets/footer.svg') bottom no-repeat",
          "--header-top": `${launchDarklyBannerHeight ?? 0}px`,
        } as CSSProperties
      }
    >
      <LaunchDarklyBanner
        ref={launchDarklyBannerRef}
        height={launchDarklyBannerHeight}
      />
      {!isOnLandingPage && <AppHeader />}

      <div
        className={cn(
          "relative z-[1] flex-1",
          !isOnLandingPage && "flex flex-col justify-stretch py-4 md:py-6",
        )}
      >
        {!isOnLandingPage ? (
          <Container className="flex-1">
            {isPageLoading ? (
              <FullPageSpinner />
            ) : (
              <ReserveAssetDataEventsContextProvider>
                {children}
                <AccountOverviewDialog />
              </ReserveAssetDataEventsContextProvider>
            )}
          </Container>
        ) : (
          children
        )}
      </div>

      {!isOnLandingPage && <Footer />}
    </div>
  );
}
