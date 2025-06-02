import { TDisplay } from "@/components/shared/Typography";
import { ASSETS_URL } from "@/lib/constants";

export default function LeaderboardHeader() {
  return (
    <div className="-mt-4 w-full md:-mt-6">
      <div className="-mx-4 flex h-[160px] flex-row justify-center md:-mx-10 md:h-[200px]">
        <div className="relative w-full max-w-[calc(1440px-40px*2)]">
          <div
            className="absolute inset-0 z-[1]"
            style={{
              backgroundImage: `url('${ASSETS_URL}/leaderboard/header.png')`,
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

          <div className="relative z-[2] flex h-full w-full flex-col items-center justify-center">
            <TDisplay className="text-center text-4xl uppercase md:text-5xl">
              Leaderboard
            </TDisplay>
          </div>
        </div>
      </div>
    </div>
  );
}
