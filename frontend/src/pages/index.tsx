import Head from "next/head";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

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
import { useLoadedAppContext } from "@/contexts/AppContext";
import { DashboardContextProvider } from "@/contexts/DashboardContext";
import { MarketCardContextProvider } from "@/contexts/MarketCardContext";
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

function Page() {
  const { lg } = useBreakpoint();

  const { address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();

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
            <div className="flex w-full flex-col gap-6">
              {appDataList.map((appData) => (
                <MarketCardContextProvider
                  key={appData.lendingMarket.slug}
                  appData={appData}
                >
                  <div className="flex w-full flex-col gap-2">
                    <Cards />
                  </div>
                </MarketCardContextProvider>
              ))}
            </div>

            {/* Markets */}
            <div className="flex w-full flex-col gap-6">
              {appDataList.map((appData) => (
                <MarketCardContextProvider
                  key={appData.lendingMarket.slug}
                  appData={appData}
                >
                  <MarketCard />
                </MarketCardContextProvider>
              ))}
            </div>
          </div>
        ) : (
          // Horizontal layout
          <div className="relative w-full flex-1">
            <div
              className="w-full min-w-0"
              style={{ paddingRight: 360 + 8 * 4 }}
            >
              {/* Markets */}
              <div className="flex w-full flex-col gap-6">
                {appDataList.map((appData) => (
                  <MarketCardContextProvider
                    key={appData.lendingMarket.slug}
                    appData={appData}
                  >
                    <MarketCard />
                  </MarketCardContextProvider>
                ))}
              </div>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-[360px] overflow-y-auto">
              {/* Cards */}
              <div className="flex w-full flex-col gap-6">
                {appDataList.map((appData) => (
                  <MarketCardContextProvider
                    key={appData.lendingMarket.slug}
                    appData={appData}
                  >
                    <div className="flex w-full shrink-0 flex-col gap-4">
                      <Cards />
                    </div>
                  </MarketCardContextProvider>
                ))}
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
      <Page />

      <ActionsModal />
      <FirstDepositDialog />
    </DashboardContextProvider>
  );
}
