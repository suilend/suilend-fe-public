import { useEffect, useRef, useState } from "react";

import { useWalletContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import { TBodySans, TDisplay } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function Basecamp2025() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();

  // Location
  const [isLocationValid, setIsLocationValid] = useState<boolean | undefined>(
    undefined,
  );

  const isFetchingLocationRef = useRef<boolean>(false);
  useEffect(() => {
    if (isFetchingLocationRef.current) return;
    isFetchingLocationRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/ip-address-country");
        if (!res.ok) throw new Error("Request failed");

        const json = await res.json();
        const code = json?.country?.code;
        console.log("XXX", code);
        setIsLocationValid(code === "AE");
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  const isComingSoon = Date.now() < 1746043200000; // 1 May 00:00 (GMT+4)
  const isOver = Date.now() >= 1746043200000 + 3 * 24 * 60 * 1000; // 4 May 00:00 (GMT+4)

  // Actions
  const mintNft = async () => {};

  const burnNft = async () => {};

  return (
    <div className="flex w-full flex-col gap-8 py-4 md:flex-row md:items-stretch md:gap-10">
      {/* Mint */}
      <div className="flex flex-col items-center gap-8 md:flex-1">
        <TDisplay className="text-center text-4xl md:text-5xl">
          Sui Basecamp NFT
        </TDisplay>

        <TBodySans className="max-w-lg text-center leading-5 text-foreground/80">
          As Sui's leading DeFi protocol, Suilend is proud to be a Platinum
          Sponsor for Sui Basecamp 2025 Dubai.
          <br />
          <br />
          Mint our Basecamp 2025 Commemorative NFT to celebrate your time in
          Dubai! Use this NFT to qualify for a chance at exclusive prizes!
        </TBodySans>

        <video
          className="w-full max-w-[320px] bg-muted/10"
          autoPlay
          loop
          muted
          playsInline
          style={{ aspectRatio: "1/1" }}
        >
          <source
            src="https://suilend-assets.s3.us-east-2.amazonaws.com/suilend/basecamp2025/Suilend_NFT_Token.mp4"
            type="video/mp4"
          />
        </video>

        {isLocationValid === undefined ? (
          <Skeleton className="h-14 w-[240px]" />
        ) : (
          <Button
            className={cn(
              "h-14 w-[240px]",
              isLocationValid === false
                ? "disabled:opacity-50"
                : "disabled:opacity-100",
            )}
            labelClassName="text-wrap uppercase"
            disabled={isLocationValid === false || isComingSoon || isOver}
            onClick={mintNft}
          >
            {isComingSoon
              ? "Coming soon"
              : isOver
                ? "Mint finished"
                : "Mint Basecamp NFT"}
          </Button>
        )}
      </div>

      <div className="w-full bg-border max-md:h-px md:w-px" />

      {/* Burn */}
      <div className="flex flex-col items-center gap-8 md:flex-1">
        <TDisplay className="text-center text-4xl md:text-5xl">
          Root Sauce NFT
        </TDisplay>

        <TBodySans className="max-w-lg text-center leading-5 text-foreground/80">
          Spice up your Basecamp experience with a Limited Edition Basecamp Root
          Sauce. Only 100 of these limited edition bottles exist!
          <br />
          <br />
          One Limited Edition Root Sauce NFT has been airdropped to every wallet
          owning a Rootlet. Burn this NFT to redeem a physical bottle of root
          sauce.
        </TBodySans>

        <video
          className="w-full max-w-[320px] bg-muted/10"
          autoPlay
          loop
          muted
          playsInline
          style={{ aspectRatio: "1/1" }}
        >
          <source
            src="https://suilend-assets.s3.us-east-2.amazonaws.com/suilend/basecamp2025/Suilendbasecamp-PROCESSED.mp4"
            type="video/mp4"
          />
        </video>

        {isLocationValid === undefined ? (
          <Skeleton className="h-14 w-[240px]" />
        ) : (
          <Button
            className={cn(
              "h-14 w-[240px] bg-[#EA4630] text-white hover:bg-[#EA3430]",
              isLocationValid === false
                ? "disabled:opacity-50"
                : "disabled:opacity-100",
            )}
            labelClassName="text-wrap uppercase"
            disabled={isLocationValid === false || isComingSoon || isOver}
            onClick={burnNft}
          >
            {isComingSoon
              ? "Coming soon"
              : isOver
                ? "Burn finished"
                : "Burn Root Sauce NFT"}
          </Button>
        )}
      </div>
    </div>
  );
}
