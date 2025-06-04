import { CSSProperties } from "react";

import Tabs from "@/components/shared/Tabs";
import { TDisplay } from "@/components/shared/Typography";
import {
  POINTS_SEASON_MAP,
  TAB_POINTS_SEASON_MAP,
  Tab,
} from "@/contexts/LeaderboardContext";
import { ASSETS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface LeaderboardHeaderProps {
  selectedTab: Tab;
  onSelectedTabChange: (tab: Tab) => void;
}

export default function LeaderboardHeader({
  selectedTab,
  onSelectedTabChange,
}: LeaderboardHeaderProps) {
  // Tabs
  const tabs = [
    { id: Tab.POINTS_S1, title: "Points S1" },
    { id: Tab.POINTS_S2, title: "Points S2" },
    { id: Tab.TVL, title: "TVL" },
  ];

  return (
    <div
      className="-mt-4 w-full md:-mt-6"
      style={
        {
          "--points-season-1": POINTS_SEASON_MAP[1].color,
          "--points-season-2": POINTS_SEASON_MAP[2].color,
        } as CSSProperties
      }
    >
      <div className="-mx-4 flex h-[160px] flex-row justify-center md:-mx-10 md:h-[200px]">
        <div className="relative w-full max-w-[calc(1440px-40px*2)]">
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage:
                selectedTab === Tab.TVL
                  ? `url('${ASSETS_URL}/leaderboard/header.png')`
                  : `url('${ASSETS_URL}/points/header-s${TAB_POINTS_SEASON_MAP[selectedTab]}.png')`,
              backgroundPosition: "top center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div
            className="absolute inset-x-0 bottom-0 z-[2] h-px bg-border/50 max-lg:![mask-image:none]"
            style={{
              maskImage:
                "linear-gradient(to right, transparent 0px, black 48px, black calc(100% - 48px), transparent 100%)",
            }}
          />

          <div className="relative z-[2] flex h-full w-full flex-col items-center justify-center gap-6 md:gap-8">
            <TDisplay className="text-center text-4xl uppercase md:text-5xl">
              Leaderboard
            </TDisplay>

            <Tabs
              listClassName="mb-0 w-[300px] md:w-[320px] bg-border rounded-sm"
              triggerClassName={(tab) =>
                cn(
                  "h-9 text-muted-foreground",
                  tab.id === Tab.POINTS_S1 &&
                    "data-[state=active]:bg-[var(--points-season-1)] data-[state=active]:text-primary-foreground",
                  tab.id === Tab.POINTS_S2 &&
                    "data-[state=active]:bg-[var(--points-season-2)] data-[state=active]:text-background",
                  tab.id === Tab.TVL &&
                    "data-[state=active]:bg-foreground data-[state=active]:text-background",
                )
              }
              tabs={tabs}
              selectedTab={selectedTab}
              onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
