import Head from "next/head";

import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { useWalletContext } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";

export default function Points() {
  const { address, isImpersonatingAddress } = useWalletContext();
  const hasImpersonationModeBanner = address && isImpersonatingAddress;

  return (
    <>
      <Head>
        <title>Suilend | Points</title>
      </Head>

      <ImpersonationModeBanner />

      <div className="flex w-full flex-col items-center">
        <div
          className={cn(
            "w-full",
            !hasImpersonationModeBanner && "-mt-4 md:-mt-6",
          )}
        >
          <PointsHeader />
        </div>

        <PointsLeaderboardTable />
      </div>
    </>
  );
}
