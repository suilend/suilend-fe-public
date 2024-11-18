import Head from "next/head";

import { useWalletContext } from "@suilend/frontend-sui";

import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { cn } from "@/lib/utils";

export default function Points() {
  const { isImpersonating, address } = useWalletContext();

  const hasImpersonationModeBanner = isImpersonating && address;

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
