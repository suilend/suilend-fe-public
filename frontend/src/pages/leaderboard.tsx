import Head from "next/head";

import { useWalletContext } from "@suilend/sui-fe-next";

import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import LeaderboardTable from "@/components/leaderboard/LeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { TBody } from "@/components/shared/Typography";
import { useLeaderboardContext } from "@/contexts/LeaderboardContext";

export default function Leaderboard() {
  const { address } = useWalletContext();
  const { leaderboardRows, addressRow } = useLeaderboardContext();

  return (
    <>
      <Head>
        <title>Suilend | Leaderboard</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6">
          <ImpersonationModeBanner className="max-w-[960px]" />

          <LeaderboardHeader />
        </div>

        {address && (
          <div className="flex w-full max-w-[960px] flex-col gap-4">
            <TBody className="px-4 text-[16px] uppercase">Your position</TBody>
            <LeaderboardTable
              data={addressRow !== undefined ? [addressRow] : undefined}
              skeletonRows={1}
              disableSorting
            />
          </div>
        )}

        <div className="flex w-full max-w-[960px] flex-col gap-4">
          <TBody className="px-4 text-[16px] uppercase">Leaderboard</TBody>
          <LeaderboardTable data={leaderboardRows} pageSize={100} />
        </div>
      </div>
    </>
  );
}
