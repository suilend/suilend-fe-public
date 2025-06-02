import Tabs from "@/components/shared/Tabs";
import { TDisplay } from "@/components/shared/Typography";
import { Tab } from "@/contexts/PointsContext";
import { ASSETS_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PointsHeaderProps {
  selectedTab: Tab;
  onSelectedTabChange: (tab: Tab) => void;
}

export default function PointsHeader({
  selectedTab,
  onSelectedTabChange,
}: PointsHeaderProps) {
  // Tabs
  const tabs = [
    { id: Tab.SEASON_1, title: "Season 1" },
    { id: Tab.SEASON_2, title: "Season 2" },
  ];

  return (
    <div className="-mt-4 w-full md:-mt-6">
      <div className="-mx-4 flex h-[160px] flex-row justify-center md:-mx-10 md:h-[200px]">
        <div className="relative w-full max-w-[calc(1440px-40px*2)]">
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage: `url('${ASSETS_URL}/points/header-s${selectedTab}.png')`,
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
              SEND Points
            </TDisplay>

            <Tabs
              listClassName="mb-0 w-[200px] md:w-[240px] bg-border rounded-sm p-0"
              triggerClassName={(tab) =>
                cn(
                  "h-9 text-muted-foreground",
                  tab.id === Tab.SEASON_1 &&
                    "data-[state=active]:bg-[var(--points-season-1)] data-[state=active]:text-primary-foreground",
                  tab.id === Tab.SEASON_2 &&
                    "data-[state=active]:bg-[var(--points-season-2)] data-[state=active]:text-background",
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
