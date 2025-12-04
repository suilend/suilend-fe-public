import {
  CSSProperties,
  PropsWithChildren,
  RefObject,
  useRef,
  useState,
} from "react";

import { useResizeObserver } from "usehooks-ts";

import AppHeader from "@/components/layout/AppHeader";
import Footer from "@/components/layout/Footer";
import LaunchDarklyBanner from "@/components/layout/LaunchDarklyBanner";
import Container from "@/components/shared/Container";
import FullPageSpinner from "@/components/shared/FullPageSpinner";
import { useAppContext } from "@/contexts/AppContext";
import { ReserveAssetDataEventsContextProvider } from "@/contexts/ReserveAssetDataEventsContext";
import { useUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";

export default function Layout({ children }: PropsWithChildren) {
  const { allAppData } = useAppContext();
  const { allUserData, obligationMap, obligationOwnerCapMap } =
    useUserContext();

  // LaunchDarkly banner
  const launchDarklyBannerRef = useRef<HTMLDivElement>(null);
  const [launchDarklyBannerHeight, setLaunchDarklyBannerHeight] = useState<
    number | null
  >(null);

  useResizeObserver({
    ref: launchDarklyBannerRef as RefObject<HTMLDivElement>,
    onResize: ({ height }) => {
      if (height === undefined) return;
      setLaunchDarklyBannerHeight(height);
    },
  });

  return (
    <div
      className="relative z-[1] flex min-h-dvh flex-col max-md:pb-10"
      style={
        {
          background: `url('${ASSETS_URL}/background.svg') bottom no-repeat`,
          "--header-top": `${launchDarklyBannerHeight ?? 0}px`,
        } as CSSProperties
      }
    >
      {/* Header */}
      <LaunchDarklyBanner
        ref={launchDarklyBannerRef}
        height={launchDarklyBannerHeight}
      />
      <AppHeader />

      {/* Content */}
      <div className="relative z-[1] flex flex-1 flex-col py-4 md:py-6">
        <Container className="flex-1">
          {!allAppData ||
          !allUserData ||
          !obligationMap ||
          !obligationOwnerCapMap ? (
            <FullPageSpinner />
          ) : (
            <ReserveAssetDataEventsContextProvider>
              {children}
            </ReserveAssetDataEventsContextProvider>
          )}
        </Container>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
