import Head from "next/head";
import { useRouter } from "next/router";

import { ADMIN_ADDRESS, LENDING_MARKET_ID } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

import AccountPositionCard from "@/components/dashboard/account/AccountPositionCard";
import LoopingCard from "@/components/dashboard/account/LoopingCard";
import AccountOverviewDialog from "@/components/dashboard/account-overview/AccountOverviewDialog";
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
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import useBreakpoint from "@/hooks/useBreakpoint";

enum QueryParams {
  LENDING_MARKET_ID = "lendingMarketId",
}

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
  const { allUserData, obligationMap, obligationOwnerCapMap } =
    useLoadedUserContext();

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
            <div className="flex w-full flex-col gap-4">
              {appDataList.map((appData) => (
                <LendingMarketContextProvider
                  key={appData.lendingMarket.slug}
                  appData={appData}
                  userData={allUserData[appData.lendingMarket.id]}
                  obligation={obligationMap[appData.lendingMarket.id]}
                  obligationOwnerCap={
                    obligationOwnerCapMap[appData.lendingMarket.id]
                  }
                >
                  <div className="flex w-full flex-col gap-2">
                    <Cards />
                  </div>
                </LendingMarketContextProvider>
              ))}
            </div>

            {/* Markets */}
            <div className="flex w-full flex-col gap-4">
              {appDataList.map((appData) => (
                <LendingMarketContextProvider
                  key={appData.lendingMarket.slug}
                  appData={appData}
                  userData={allUserData[appData.lendingMarket.id]}
                  obligation={obligationMap[appData.lendingMarket.id]}
                  obligationOwnerCap={
                    obligationOwnerCapMap[appData.lendingMarket.id]
                  }
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
              style={{ paddingRight: 360 + 8 * 4 }}
            >
              {/* Markets */}
              <div className="flex w-full flex-col gap-4">
                {appDataList.map((appData) => (
                  <LendingMarketContextProvider
                    key={appData.lendingMarket.slug}
                    appData={appData}
                    userData={allUserData[appData.lendingMarket.id]}
                    obligation={obligationMap[appData.lendingMarket.id]}
                    obligationOwnerCap={
                      obligationOwnerCapMap[appData.lendingMarket.id]
                    }
                  >
                    <MarketCard />
                  </LendingMarketContextProvider>
                ))}
              </div>
            </div>

            <div className="absolute bottom-0 right-0 top-0 w-[360px] overflow-y-auto">
              {/* Cards */}
              <div className="flex w-full flex-col gap-4">
                {appDataList.map((appData) => (
                  <LendingMarketContextProvider
                    key={appData.lendingMarket.slug}
                    appData={appData}
                    userData={allUserData[appData.lendingMarket.id]}
                    obligation={obligationMap[appData.lendingMarket.id]}
                    obligationOwnerCap={
                      obligationOwnerCapMap[appData.lendingMarket.id]
                    }
                  >
                    <div className="flex w-full shrink-0 flex-col gap-4">
                      <Cards />
                    </div>
                  </LendingMarketContextProvider>
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
  const router = useRouter();
  const queryParams = {
    [QueryParams.LENDING_MARKET_ID]: router.query[
      QueryParams.LENDING_MARKET_ID
    ] as string | undefined,
  };

  const { allAppData } = useLoadedAppContext();
  const { allUserData, obligationMap, obligationOwnerCapMap } =
    useLoadedUserContext();

  const appData =
    allAppData.allLendingMarketData[
      queryParams[QueryParams.LENDING_MARKET_ID] ?? LENDING_MARKET_ID
    ];

  const userData = allUserData[appData.lendingMarket.id];
  const obligation = obligationMap[appData.lendingMarket.id];
  const obligationOwnerCap = obligationOwnerCapMap[appData.lendingMarket.id];

  return (
    <LendingMarketContextProvider
      appData={appData}
      userData={userData}
      obligation={obligation}
      obligationOwnerCap={obligationOwnerCap}
    >
      <DashboardContextProvider>
        <Page />

        <ActionsModal />
        <FirstDepositDialog />
        <AccountOverviewDialog />
      </DashboardContextProvider>
    </LendingMarketContextProvider>
  );
}
