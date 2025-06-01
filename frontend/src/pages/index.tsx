import Head from "next/head";
import { useRouter } from "next/router";

import { shallowPushQuery } from "@suilend/sui-fe-next";

import AccountPositionCard from "@/components/dashboard/account/AccountPositionCard";
import LoopingCard from "@/components/dashboard/account/LoopingCard";
import ActionsModal from "@/components/dashboard/actions-modal/ActionsModal";
import FirstDepositDialog from "@/components/dashboard/FirstDepositDialog";
import MarketCard from "@/components/dashboard/MarketCard";
import ObligationBorrowsCard from "@/components/dashboard/ObligationBorrowsCard";
import ObligationDepositsCard from "@/components/dashboard/ObligationDepositsCard";
import RewardsCard from "@/components/dashboard/RewardsCard";
import WalletAssetsCard from "@/components/dashboard/WalletBalancesCard";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import Tabs from "@/components/shared/Tabs";
import {
  QueryParams as AppContextQueryParams,
  useLoadedAppContext,
} from "@/contexts/AppContext";
import { DashboardContextProvider } from "@/contexts/DashboardContext";
import useBreakpoint from "@/hooks/useBreakpoint";

function Cards() {
  return (
    <>
      <LoopingCard />
      <RewardsCard />
      <AccountPositionCard />
      <ObligationDepositsCard />
      <ObligationBorrowsCard />
      <WalletAssetsCard />
    </>
  );
}

export default function Home() {
  const router = useRouter();

  const { lg } = useBreakpoint();

  const { allAppData, appData } = useLoadedAppContext();

  // Tabs
  const tabs = Object.values(allAppData.allLendingMarketData)
    .filter((lendingMarket) => !lendingMarket.lendingMarket.isHidden)
    .map((_appData) => ({
      id: _appData.lendingMarket.slug,
      title: _appData.lendingMarket.name,
    }));

  const selectedTab = appData.lendingMarket.slug;
  const onSelectedTabChange = (tab: string) => {
    shallowPushQuery(router, {
      ...router.query,
      [AppContextQueryParams.LENDING_MARKET]: tab,
    });
  };

  return (
    <DashboardContextProvider>
      <Head>
        <title>Suilend | Lend</title>
      </Head>

      <div className="flex w-full flex-1 flex-col gap-6">
        <ImpersonationModeBanner />

        {!lg ? (
          // Vertical layout
          <div className="flex w-full flex-col gap-6">
            <div className="flex w-full flex-col gap-2">
              <Cards />
            </div>

            <div className="flex w-full flex-col gap-4">
              {tabs.length > 1 && (
                <Tabs
                  listClassName="mb-0"
                  tabs={tabs}
                  selectedTab={selectedTab}
                  onTabChange={(tab) => onSelectedTabChange(tab)}
                />
              )}
              <MarketCard />
            </div>
          </div>
        ) : (
          // Horizontal layout
          <div className="relative w-full flex-1">
            <div
              className="flex w-full min-w-0 flex-col gap-4"
              style={{ paddingRight: 360 + 8 * 4 }}
            >
              {tabs.length > 1 && (
                <Tabs
                  listClassName="mb-0 w-max"
                  triggerClassName={() => "px-4"}
                  tabs={tabs}
                  selectedTab={selectedTab}
                  onTabChange={(tab) => onSelectedTabChange(tab)}
                />
              )}
              <MarketCard />
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-[360px] overflow-y-auto">
              <div className="flex w-full shrink-0 flex-col gap-4">
                <Cards />
              </div>
            </div>
          </div>
        )}
      </div>

      <ActionsModal />
      <FirstDepositDialog />
    </DashboardContextProvider>
  );
}
