import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";

import { shallowPushQuery, useWalletContext } from "@suilend/sui-fe-next";

import LeaderboardHeader from "@/components/leaderboard/LeaderboardHeader";
import PointsLeaderboardTable from "@/components/leaderboard/PointsLeaderboardTable";
import TvlLeaderboardTable from "@/components/leaderboard/TvlLeaderboardTable";
import { TBody } from "@/components/shared/Typography";
import {
  LeaderboardContextProvider,
  TAB_POINTS_SEASON_MAP,
  Tab,
  useLeaderboardContext,
} from "@/contexts/LeaderboardContext";

enum QueryParams {
  TAB = "tab",
}

function Page() {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  const { address } = useWalletContext();
  const { points, tvl } = useLeaderboardContext();

  // Tabs
  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : Tab.TVL,
    [queryParams],
  );
  const onSelectedTabChange = (tab: Tab) => {
    if ([Tab.POINTS_S1, Tab.POINTS_S2].includes(tab))
      points.fetchLeaderboardRows(TAB_POINTS_SEASON_MAP[tab]);
    else tvl.fetchLeaderboardRows();

    shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
  };

  useEffect(() => {
    if ([Tab.POINTS_S1, Tab.POINTS_S2].includes(selectedTab))
      points.fetchLeaderboardRows(TAB_POINTS_SEASON_MAP[selectedTab]);
    else tvl.fetchLeaderboardRows();
  }, [selectedTab, points, tvl]);

  return (
    <>
      <Head>
        <title>Suilend | Leaderboard</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-6">
          <LeaderboardHeader
            selectedTab={selectedTab}
            onSelectedTabChange={onSelectedTabChange}
          />
        </div>

        {address && (
          <div className="flex w-full max-w-[960px] flex-col gap-4">
            <TBody className="px-4 text-[16px] uppercase">Your position</TBody>

            {selectedTab === Tab.TVL ? (
              <TvlLeaderboardTable
                data={
                  tvl.addressRow !== undefined ? [tvl.addressRow] : undefined
                }
                skeletonRows={1}
                disableSorting
              />
            ) : (
              <PointsLeaderboardTable
                season={TAB_POINTS_SEASON_MAP[selectedTab]}
                data={
                  points.addressRowMap?.[TAB_POINTS_SEASON_MAP[selectedTab]] !==
                  undefined
                    ? [
                        points.addressRowMap?.[
                          TAB_POINTS_SEASON_MAP[selectedTab]
                        ],
                      ]
                    : undefined
                }
                skeletonRows={1}
                disableSorting
              />
            )}
          </div>
        )}

        <div className="flex w-full max-w-[960px] flex-col gap-4">
          <TBody className="px-4 text-[16px] uppercase">Leaderboard</TBody>

          {selectedTab === Tab.TVL ? (
            <TvlLeaderboardTable data={tvl.leaderboardRows} pageSize={100} />
          ) : (
            <PointsLeaderboardTable
              season={TAB_POINTS_SEASON_MAP[selectedTab]}
              data={
                points.leaderboardRowsMap?.[TAB_POINTS_SEASON_MAP[selectedTab]]
              }
              pageSize={100}
            />
          )}
        </div>
      </div>
    </>
  );
}

export default function Leaderboard() {
  return (
    <LeaderboardContextProvider>
      <Page />
    </LeaderboardContextProvider>
  );
}
