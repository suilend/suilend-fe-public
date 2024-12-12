import { TBodySans, TDisplay } from "@/components/shared/Typography";
import { ASSETS_URL } from "@/lib/constants";

export default function BlurbSection() {
  const logoSrcs = [
    ["robot-ventures.png"],
    [
      "delphi-ventures.png",
      "big-brain-holdings.png",
      "figment-capital.png",
      "alliance.png",
    ],
    [
      "mechanism-capital.png",
      "bodhi-ventures.png",
      "karatage.png",
      "comma3-ventures.png",
    ],
  ];

  return (
    <div className="flex w-full flex-col items-center gap-12 py-16 md:gap-16 md:py-20">
      <div className="flex w-full max-w-[600px] flex-col gap-4 rounded-md border border-secondary bg-secondary/5 p-4">
        <TDisplay className="uppercase text-secondary">About Suilend</TDisplay>

        <TBodySans className="leading-5">
          {
            "Suilend launched in March 2024 and has quickly become a cornerstone of DeFi on Sui. We're now expanding with the Sui DeFi Suite—a complete lineup of products including  lending, infinite liquid staking with SpringSui and Steamm, our superfluid AMM. At the center of it all is SEND, the token representing our mission and vision. Backed by leading investors, we're ready to take Sui DeFi to the next level. Let's SEND IT!"
          }
        </TBodySans>

        <div className="flex w-full flex-col gap-4 p-2 opacity-50 md:gap-5">
          {logoSrcs.map((row, index) => (
            <div key={index} className="flex w-full flex-row gap-4 md:gap-8">
              {row.map((logoSrc, index2) => (
                <div
                  key={index2}
                  className="h-6 flex-1"
                  style={{
                    backgroundImage: `url('${ASSETS_URL}/send/investors/${logoSrc}')`,
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
