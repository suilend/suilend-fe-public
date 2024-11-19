import { ClassValue } from "clsx";

import { TDisplay, TLabel } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

interface PointsHeaderProps {
  className?: ClassValue;
}

export default function PointsHeader({ className }: PointsHeaderProps) {
  return (
    <div className={cn("-mt-4 w-full md:-mt-6", className)}>
      <div className="-mx-4 flex h-[180px] flex-row justify-center md:-mx-10 md:h-[240px]">
        <div
          className="flex w-full max-w-[calc(1440px-40px*2)] flex-col items-center justify-center gap-4 md:gap-6"
          style={{
            backgroundImage: "url('/assets/points/header.png')",
            backgroundPosition: "top center",
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="flex h-6 w-max flex-col justify-center rounded-md bg-secondary px-3">
            <TLabel className="font-bold uppercase text-secondary-foreground">
              Leaderboard
            </TLabel>
          </div>

          <TDisplay className="text-center text-4xl uppercase md:text-5xl">
            SEND Points
          </TDisplay>
        </div>
      </div>
    </div>
  );
}
