import Head from "next/head";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountsCard from "@/components/dashboard/account/AccountsCard";
import MainMarketLoopingCard from "@/components/dashboard/account/MainMarketLoopingCard";
import AccountOverviewDialog from "@/components/dashboard/account-overview/AccountOverviewDialog";
import { ActionsModalContextProvider } from "@/components/dashboard/actions-modal/ActionsModalContext";
import FirstDepositDialog from "@/components/dashboard/FirstDepositDialog";
import MarketCard from "@/components/dashboard/MarketCard";
import ObligationBorrowsCard from "@/components/dashboard/ObligationBorrowsCard";
import ObligationDepositsCard from "@/components/dashboard/ObligationDepositsCard";
import RewardsCard from "@/components/dashboard/RewardsCard";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { DashboardContextProvider } from "@/contexts/DashboardContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import useBreakpoint from "@/hooks/useBreakpoint";

function Cards() {
  return (
    <>
      <MainMarketLoopingCard />
      <RewardsCard />
      <AccountsCard />
      <ObligationDepositsCard />
      <ObligationBorrowsCard />
    </>
  );
}

function Page() {
  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();

  const { lg } = useBreakpoint();

  // App data list
  const appDataList = Object.values(allAppData.allLendingMarketData).filter(
    (lendingMarket) =>
      !(lendingMarket.lendingMarket.isHidden && address !== ADMIN_ADDRESS),
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
              {appDataList.map((appData) => (
                <LendingMarketContextProvider
                  key={appData.lendingMarket.id}
                  lendingMarketId={appData.lendingMarket.id}
                >
                  <MarketCard />
                </LendingMarketContextProvider>
              ))}
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
                {appDataList.map((appData) => (
                  <LendingMarketContextProvider
                    key={appData.lendingMarket.id}
                    lendingMarketId={appData.lendingMarket.id}
                  >
                    <MarketCard />
                  </LendingMarketContextProvider>
                ))}
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
