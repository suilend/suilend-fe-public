import { TBodySans, TDisplay } from "@/components/shared/Typography";

export default function BlurbSection() {
  return (
    <div className="flex w-full flex-col items-center gap-12 py-16 md:gap-16 md:py-20">
      <div className="flex w-full max-w-[600px] flex-col gap-4 rounded-md border border-secondary bg-secondary/5 p-4">
        <TDisplay className="uppercase text-secondary">About Suilend</TDisplay>

        <TBodySans className="leading-5">
          {
            "Suilend launched in March 2024 and has quickly become a cornerstone of DeFi on Sui. We're now expanding with the Sui DeFi Suite—a complete lineup of products including  lending, infinite liquid staking with SpringSui and Steamm, our superfluid AMM. At the center of it all is SEND, the token representing our mission and vision. Backed by leading investors, we're ready to take Sui DeFi to the next level. Let's SEND IT!"
          }
        </TBodySans>
      </div>
    </div>
  );
}
