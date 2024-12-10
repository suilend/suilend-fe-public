import { CSSProperties } from "react";

import Tabs from "@/components/shared/Tabs";
import { TDisplay, TLabel } from "@/components/shared/Typography";
import { Tab, usePointsContext } from "@/contexts/PointsContext";
import { cn } from "@/lib/utils";

interface PointsHeaderProps {
  selectedTab: Tab;
  onSelectedTabChange: (tab: Tab) => void;
}

export default function PointsHeader({
  selectedTab,
  onSelectedTabChange,
}: PointsHeaderProps) {
  const { seasonMap } = usePointsContext();

  // Tabs
  const tabs = [
    { id: Tab.SEASON_1, title: "Season 1" },
    { id: Tab.SEASON_2, title: "Season 2" },
  ];

  return (
    <div className="-mt-4 w-full md:-mt-6">
      <div className="-mx-4 flex h-[210px] flex-row justify-center md:-mx-10 md:h-[270px]">
        <div className="relative w-full max-w-[calc(1440px-40px*2)]">
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage: "url('/assets/points/header.png')",
              backgroundPosition: "top center",
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              maskImage:
                "linear-gradient(to bottom, black 50%, transparent 100%)",
            }}
          />

          <div className="relative z-[2] flex h-full w-full flex-col items-center justify-center gap-6 md:gap-8">
            <div className="flex h-6 w-max flex-col justify-center rounded-sm bg-border px-2">
              <TLabel className="uppercase text-muted-foreground">
                Leaderboard
              </TLabel>
            </div>

            <TDisplay className="text-center text-4xl md:text-5xl">
              SEND Points
            </TDisplay>

            <Tabs
              tabs={tabs}
              selectedTab={selectedTab}
              onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
              listClassName="mb-0 w-[200px] md:w-[240px] bg-border rounded-sm p-0"
              listStyle={Object.entries(seasonMap).reduce(
                (acc, [season, { color }]) => ({
                  ...acc,
                  [`--active-bg-season-${season}`]: color,
                }),
                {} as CSSProperties,
              )}
              triggerClassName={(tab) =>
                cn(
                  "h-8 md:h-9 text-muted-foreground",
                  tab.id === Tab.SEASON_1 &&
                    "data-[state=active]:bg-[var(--active-bg-season-1)] data-[state=active]:text-primary-foreground",
                  tab.id === Tab.SEASON_2 &&
                    "data-[state=active]:bg-[var(--active-bg-season-2)] data-[state=active]:text-background",
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
