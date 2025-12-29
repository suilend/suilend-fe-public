import Head from "next/head";

import { useLocalStorage } from "usehooks-ts";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountsCard from "@/components/dashboard/account/AccountsCard";
import MainMarketLoopingCard from "@/components/dashboard/account/MainMarketLoopingCard";
import AccountOverviewDialog from "@/components/dashboard/account-overview/AccountOverviewDialog";
import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import BorrowsCard from "@/components/dashboard/BorrowsCard";
import DepositsCard from "@/components/dashboard/DepositsCard";
import FirstDepositDialog from "@/components/dashboard/FirstDepositDialog";
import MarketCard from "@/components/dashboard/MarketCard";
import UnclaimedRewardsCard from "@/components/dashboard/UnclaimedRewardsCard";
import WalletCard from "@/components/dashboard/WalletCard";
import Collapsible from "@/components/shared/Collapsible";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { DashboardContextProvider } from "@/contexts/DashboardContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import useBreakpoint from "@/hooks/useBreakpoint";

function Cards() {
  return (
    <>
      <MainMarketLoopingCard />
      <UnclaimedRewardsCard />
      <AccountsCard />
      <DepositsCard />
      <BorrowsCard />
      <WalletCard />
    </>
  );
}

function Page() {
  const { address } = useWalletContext();
  const { allAppData, featuredLendingMarketIds, deprecatedLendingMarketIds } =
    useLoadedAppContext();

  const { lg } = useBreakpoint();

  // App data list
  const appDataList = Object.values(allAppData.allLendingMarketData).filter(
    (lendingMarket) =>
      !(lendingMarket.lendingMarket.isHidden && address !== ADMIN_ADDRESS),
  );
  const featuredAppDataList = appDataList.filter(
    (appData) =>
      (featuredLendingMarketIds ?? []).includes(appData.lendingMarket.id) &&
      !(deprecatedLendingMarketIds ?? []).includes(appData.lendingMarket.id),
  );
  const nonFeaturedAppDataList = appDataList.filter(
    (appData) =>
      !(featuredLendingMarketIds ?? []).includes(appData.lendingMarket.id) &&
      !(deprecatedLendingMarketIds ?? []).includes(appData.lendingMarket.id),
  );
  const deprecatedAppDataList = appDataList.filter((appData) =>
    (deprecatedLendingMarketIds ?? []).includes(appData.lendingMarket.id),
  );

  const [isDeprecatedOpen, setIsDeprecatedOpen] = useLocalStorage<boolean>(
    "Lend_isDeprecatedOpen",
    false,
  );

  return (
    <>
      <Head>
        <title>Suilend | Lend</title>
      </Head>

      <div className="flex w-full flex-1 flex-col gap-6">
        <ImpersonationModeBanner />

        {!lg ? (
          // Vertical layout
          <div className="flex w-full flex-col gap-6">
            {/* Cards */}
            <div className="flex w-full flex-col gap-2">
              <Cards />
            </div>

            {/* Markets */}
            <div className="flex w-full flex-col gap-4">
              {[...featuredAppDataList, ...nonFeaturedAppDataList].map(
                (appData) => (
                  <LendingMarketContextProvider
                    key={appData.lendingMarket.id}
                    lendingMarketId={appData.lendingMarket.id}
                  >
                    <MarketCard />
                  </LendingMarketContextProvider>
                ),
              )}

              <Collapsible
                open={isDeprecatedOpen}
                onOpenChange={setIsDeprecatedOpen}
                title={
                  <>
                    Deprecated markets
                    <span className="text-xs text-muted-foreground">
                      {deprecatedAppDataList.length}
                    </span>
                  </>
                }
                buttonClassName="gap-2 !text-primary w-full"
                buttonLabelClassName="flex-1 flex flex-row items-center gap-2"
                hasSeparator
                isEndIcon={false}
              >
                <div className="flex w-full flex-col gap-4 pt-4">
                  {deprecatedAppDataList.map((appData) => (
                    <LendingMarketContextProvider
                      key={appData.lendingMarket.id}
                      lendingMarketId={appData.lendingMarket.id}
                    >
                      <MarketCard />
                    </LendingMarketContextProvider>
                  ))}
                </div>
              </Collapsible>
            </div>
          </div>
        ) : (
          // Horizontal layout
          <div className="relative w-full flex-1">
            <div
              className="w-full min-w-0"
              style={{ paddingRight: 360 + 6 * 4 }}
            >
              {/* Markets */}
              <div className="flex w-full flex-col gap-4">
                {[...featuredAppDataList, ...nonFeaturedAppDataList].map(
                  (appData) => (
                    <LendingMarketContextProvider
                      key={appData.lendingMarket.id}
                      lendingMarketId={appData.lendingMarket.id}
                    >
                      <MarketCard />
                    </LendingMarketContextProvider>
                  ),
                )}

                <Collapsible
                  open={isDeprecatedOpen}
                  onOpenChange={setIsDeprecatedOpen}
                  title={
                    <>
                      Deprecated markets
                      <span className="text-xs text-muted-foreground">
                        {deprecatedAppDataList.length}
                      </span>
                    </>
                  }
                  buttonClassName="gap-2 !text-primary w-full"
                  buttonLabelClassName="flex-1 flex flex-row items-center gap-2"
                  hasSeparator
                  isEndIcon={false}
                >
                  <div className="flex w-full flex-col gap-4 pt-4">
                    {deprecatedAppDataList.map((appData) => (
                      <LendingMarketContextProvider
                        key={appData.lendingMarket.id}
                        lendingMarketId={appData.lendingMarket.id}
                      >
                        <MarketCard />
                      </LendingMarketContextProvider>
                    ))}
                  </div>
                </Collapsible>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-[360px] overflow-y-auto">
              {/* Cards */}
              <div className="flex w-full flex-col gap-2">
                <Cards />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function Dashboard() {
  return (
    <DashboardContextProvider>
      <ActionsModalContextProvider>
        <Page />

        <FirstDepositDialog />
        <AccountOverviewDialog />
      </ActionsModalContextProvider>
    </DashboardContextProvider>
  );
}
