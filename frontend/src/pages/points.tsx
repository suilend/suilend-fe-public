import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

import { shallowPushQuery, useWalletContext } from "@suilend/frontend-sui-next";

import PointsHeader from "@/components/points/PointsHeader";
import PointsLeaderboardTable from "@/components/points/PointsLeaderboardTable";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { TBody } from "@/components/shared/Typography";
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
  const { season, leaderboardRowsMap, addressRowMap, fetchLeaderboardRows } =
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
        <title>Suilend | Points</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6">
          <ImpersonationModeBanner className="max-w-[960px]" />

          <PointsHeader
            selectedTab={selectedTab}
            onSelectedTabChange={onSelectedTabChange}
          />
        </div>

        {address && (
          <div className="flex w-full max-w-[960px] flex-col gap-4">
            <TBody className="px-4 text-[16px] uppercase">Your position</TBody>
            <PointsLeaderboardTable
              season={+selectedTab}
              data={addressRow !== undefined ? [addressRow] : undefined}
              skeletonRows={1}
              disableSorting
            />
          </div>
        )}

        <div className="flex w-full max-w-[960px] flex-col gap-4">
          <TBody className="px-4 text-[16px] uppercase">Leaderboard</TBody>
          <PointsLeaderboardTable
            season={+selectedTab}
            data={leaderboardRowsMap?.[+selectedTab]}
            pageSize={100}
          />
        </div>
      </div>
    </>
  );
}
