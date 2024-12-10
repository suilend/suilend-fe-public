import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

import { shallowPushQuery } from "@suilend/frontend-sui-next";

import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { Tab, usePointsContext } from "@/contexts/PointsContext";

enum QueryParams {
  TAB = "season",
}

export default function Points() {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  const { season, fetchLeaderboardRows } = usePointsContext();

  // Tabs
  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : (`${season}` as Tab),
    [queryParams, season],
  );
  const onSelectedTabChange = (tab: Tab) => {
    fetchLeaderboardRows(+tab);
    shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
  };

  useEffect(() => {
    fetchLeaderboardRows(+selectedTab);
  }, [fetchLeaderboardRows, selectedTab]);

  return (
    <>
      <Head>
        <title>Suilend | SEND Points</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex w-full flex-col items-center gap-6">
          <PointsHeader
            selectedTab={selectedTab}
            onSelectedTabChange={onSelectedTabChange}
          />
          <ImpersonationModeBanner />
        </div>

        {/* <Card>
          <div className="flex flex-row items-center justify-between gap-4">
            <TotalPointsStat amount={new BigNumber(1000)} />
            <PointsPerDayStat amount={new BigNumber(10)} />
            <RankStat />
          </div>
        </Card> */}

        <PointsLeaderboardTable season={+selectedTab} />
      </div>
    </>
  );
}
