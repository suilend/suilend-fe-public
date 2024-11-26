import Head from "next/head";

import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";

export default function Points() {
  return (
    <>
      <Head>
        <title>Suilend | Points</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-6">
          <PointsHeader />
          <ImpersonationModeBanner />
        </div>

        <PointsLeaderboardTable />
      </div>
    </>
  );
}
