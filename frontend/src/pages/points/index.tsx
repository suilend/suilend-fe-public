import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

import { shallowPushQuery, useWalletContext } from "@suilend/frontend-sui-next";

import Card from "@/components/dashboard/Card";
import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import PointsPerDayStat from "@/components/points/PointsPerDayStat";
import RankStat from "@/components/points/RankStat";
import TotalPointsStat from "@/components/points/TotalPointsStat";
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

  const { address } = useWalletContext();
  const { season, seasonMap, addressRowMap, fetchLeaderboardRows } =
    usePointsContext();

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

  // Address row
  const addressRow = useMemo(
    () => addressRowMap?.[+selectedTab],
    [addressRowMap, selectedTab],
  );

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

        {address && (
          <Card
            className="max-w-[960px] p-4"
            style={{ borderColor: seasonMap[+selectedTab].color }}
          >
            <div className="flex flex-row items-center justify-between gap-4">
              <RankStat
                season={+selectedTab}
                rank={addressRow === null ? null : addressRow?.rank}
              />
              <PointsPerDayStat
                season={+selectedTab}
                amount={addressRow === null ? null : addressRow?.pointsPerDay}
              />
              <TotalPointsStat
                season={+selectedTab}
                amount={addressRow === null ? null : addressRow?.totalPoints}
              />
            </div>
          </Card>
        )}

        <PointsLeaderboardTable season={+selectedTab} />
      </div>
    </>
  );
}
