import Head from "next/head";

import AccountPositionCard from "@/components/dashboard/account/AccountPositionCard";
import LoopingCard from "@/components/dashboard/account/LoopingCard";
import ActionsModal from "@/components/dashboard/actions-modal/ActionsModal";
import FirstDepositDialog from "@/components/dashboard/FirstDepositDialog";
import MarketTable from "@/components/dashboard/market-table/MarketTable";
import MarketOverview from "@/components/dashboard/MarketOverview";
import ObligationBorrowsCard from "@/components/dashboard/ObligationBorrowsCard";
import ObligationDepositsCard from "@/components/dashboard/ObligationDepositsCard";
import RewardsCard from "@/components/dashboard/RewardsCard";
import WalletAssetsCard from "@/components/dashboard/WalletBalancesCard";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
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
  const { lg } = useBreakpoint();

  return (
    <DashboardContextProvider>
      <Head>
        <title>Suilend | Dashboard</title>
      </Head>

      <div className="flex w-full flex-1 flex-col gap-6">
        <ImpersonationModeBanner />

        {!lg ? (
          // Vertical layout
          <div className="flex w-full flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Cards />
            </div>

            <div className="flex w-full flex-col gap-6">
              <MarketOverview />
              <MarketTable />
            </div>
          </div>
        ) : (
          // Horizontal layout
          <div className="relative w-full flex-1">
            <div
              className="flex w-full min-w-0 flex-col gap-6"
              style={{ paddingRight: 360 + 8 * 4 }}
            >
              <MarketOverview />
              <MarketTable />
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
