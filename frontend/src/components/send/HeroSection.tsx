import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { intervalToDuration } from "date-fns";
import { cloneDeep } from "lodash";
import { VenetianMask } from "lucide-react";

import {
  WalletContextQueryParams,
  shallowPushQuery,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TDisplay } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { formatAddress, formatToken } from "@/lib/format";
import { Allocation, SEND_TOTAL_SUPPLY, TGE_TIMESTAMP_MS } from "@/lib/send";

interface HeroSectionProps {
  allocations: Allocation[];
}

export default function HeroSection({ allocations }: HeroSectionProps) {
  const router = useRouter();

  const { isImpersonating, setIsConnectWalletDropdownOpen, address } =
    useWalletContext();

  const { userAllocations } = useLoadedSendContext();

  // Impersonation mode
  const onImpersonationModeBannerClick = () => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[WalletContextQueryParams.WALLET];
    shallowPushQuery(router, restQuery);
  };

  // User
  const userAllocationPercent = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userAllocationPercent ?? 0),
    new BigNumber(0),
  );
  const userClaimedMsend = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userClaimedMsend ?? 0),
    new BigNumber(0),
  );
  const userBridgedMsend = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userBridgedMsend ?? 0),
    new BigNumber(0),
  );

  const userTotalAllocation = new BigNumber(
    userAllocationPercent.times(SEND_TOTAL_SUPPLY).div(100),
  )
    .plus(userClaimedMsend)
    .plus(userBridgedMsend);

  // Countdown
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const tgeDuration = intervalToDuration({
    start: currentDate,
    end: new Date(TGE_TIMESTAMP_MS),
  });

  return (
    <div className="flex w-full flex-col items-center gap-8 md:gap-12">
      {/* Countdown */}
      <div className="-mb-4 flex flex-row gap-2 md:-mb-8">
        {/* Days */}
        <div className="flex flex-col items-center">
          <TDisplay className="text-2xl md:text-3xl">
            {`${tgeDuration.days ?? 0}`.padStart(2, "0")}
          </TDisplay>
          <TBody>DD</TBody>
        </div>

        <TDisplay className="text-2xl md:text-3xl">:</TDisplay>

        {/* Hours */}
        <div className="flex flex-col items-center">
          <TDisplay className="text-2xl md:text-3xl">
            {`${tgeDuration.hours ?? 0}`.padStart(2, "0")}
          </TDisplay>
          <TBody>HH</TBody>
        </div>

        <TDisplay className="text-2xl md:text-3xl">:</TDisplay>

        {/* Minutes */}
        <div className="flex flex-col items-center">
          <TDisplay className="text-2xl md:text-3xl">
            {`${tgeDuration.minutes ?? 0}`.padStart(2, "0")}
          </TDisplay>
          <TBody>MM</TBody>
        </div>

        <TDisplay className="text-2xl md:text-3xl">:</TDisplay>

        {/* Seconds */}
        <div className="flex flex-col items-center">
          <TDisplay className="text-2xl md:text-3xl">
            {`${tgeDuration.seconds ?? 0}`.padStart(2, "0")}
          </TDisplay>
          <TBody>SS</TBody>
        </div>
      </div>

      <SectionHeading>
        {!address
          ? "Connect your wallet to check your allocation"
          : userTotalAllocation.gt(0) || userAllocations === undefined
            ? "Your allocation is"
            : "Sorry, you're not eligible"}
      </SectionHeading>

      <div className="flex w-full flex-col items-center gap-4">
        {!address ? (
          <Button
            className="h-16 w-[240px] md:w-[320px]"
            labelClassName="uppercase text-[16px]"
            size="lg"
            onClick={() => setIsConnectWalletDropdownOpen(true)}
          >
            Connect wallet
          </Button>
        ) : (
          <Tooltip title="Allocation is an estimate since some snapshots haven't been taken yet">
            <div className="flex flex-row items-center justify-center gap-4 rounded-md border border-2 border-primary bg-[#0E1932] px-6 py-4 md:px-10">
              <SendTokenLogo className="h-8 w-8" />
              {userAllocations === undefined ? (
                <Skeleton className="h-10 w-48" />
              ) : (
                <TDisplay className="text-4xl">
                  {formatToken(userTotalAllocation, { exact: false })}
                  {" SEND"}
                </TDisplay>
              )}
            </div>
          </Tooltip>
        )}

        {isImpersonating && address && (
          <button
            className="group flex flex-row items-center gap-2"
            onClick={onImpersonationModeBannerClick}
          >
            <VenetianMask className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <TBodySans className="text-muted-foreground transition-colors group-hover:text-foreground">
              Impersonating {formatAddress(address)}
            </TBodySans>
          </button>
        )}
      </div>
    </div>
  );
}
