import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import BigNumber from "bignumber.js";
import { intervalToDuration } from "date-fns";
import { cloneDeep } from "lodash";
import { VenetianMask } from "lucide-react";

import {
  NORMALIZED_mSEND_SERIES_1_COINTYPE,
  formatAddress,
  formatList,
  formatToken,
} from "@suilend/sui-fe";
import {
  WalletContextQueryParams,
  shallowPushQuery,
  useWalletContext,
} from "@suilend/sui-fe-next";

import SectionHeading from "@/components/send/SectionHeading";
import Button from "@/components/shared/Button";
import SendTokenLogo from "@/components/shared/SendTokenLogo";
import {
  TBody,
  TBodySans,
  TDisplay,
  TLabelSans,
} from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { AllocationIdS1, AllocationWithUserAllocation } from "@/lib/mSend";
import { TGE_TIMESTAMP_MS } from "@/lib/send";

interface HeroSectionProps {
  allocations: AllocationWithUserAllocation[];
}

export default function HeroSection({ allocations }: HeroSectionProps) {
  const router = useRouter();

  const { isImpersonating, setIsConnectWalletDropdownOpen, address } =
    useWalletContext();

  const { rawUserAllocationsS1 } = useLoadedSendContext();

  // Impersonation mode
  const onImpersonationModeBannerClick = () => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[WalletContextQueryParams.WALLET];
    shallowPushQuery(router, restQuery);
  };

  // User
  const userEligibleSend = allocations.reduce(
    (acc, allocation) =>
      acc.plus(
        allocation.id === AllocationIdS1.ROOTLETS
          ? (allocation.userEligibleSendMap?.[
              NORMALIZED_mSEND_SERIES_1_COINTYPE
            ] ?? 0)
          : (allocation.userEligibleSend ?? 0),
      ),
    new BigNumber(0),
  );
  const userRedeemedMsend = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userRedeemedMsend ?? 0),
    new BigNumber(0),
  );
  const userBridgedMsend = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userBridgedMsend ?? 0),
    new BigNumber(0),
  );

  const isFetchingUserRedeemedMsend = allocations
    .filter(
      (allocation) =>
        allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
        allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1 ||
        allocation.id === AllocationIdS1.ROOTLETS,
    )
    .some((allocation) => allocation.userRedeemedMsend === undefined);
  const isFetchingUserBridgedMsend = allocations
    .filter((allocation) => allocation.id === AllocationIdS1.SAVE)
    .some((allocation) => allocation.userBridgedMsend === undefined);

  const userTotalAllocation = userEligibleSend
    .plus(userRedeemedMsend)
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
      {Date.now() < TGE_TIMESTAMP_MS && (
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
      )}

      <SectionHeading>
        {!address
          ? "Connect your wallet to check your TGE allocation"
          : "Your TGE allocation is"}
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
          <div className="relative flex flex-col">
            <div className="z-[2] flex flex-row items-center justify-center gap-4 rounded-md border border-2 border-primary bg-[#0E1932] px-6 py-4 md:px-10">
              <SendTokenLogo size={32} />

              {rawUserAllocationsS1 === undefined ? (
                <Skeleton className="h-10 w-48" />
              ) : (
                <TDisplay className="text-4xl">
                  {formatToken(userTotalAllocation, { exact: false })}
                  {" SEND"}
                </TDisplay>
              )}
            </div>

            {(isFetchingUserRedeemedMsend || isFetchingUserBridgedMsend) && (
              <div className="relative z-[1] -mt-2 flex flex-row justify-center rounded-b-md bg-primary/25 px-4 pb-2 pt-4">
                <TLabelSans className="animate-pulse">
                  {"Fetching "}
                  {formatList(
                    [
                      isFetchingUserRedeemedMsend ? "redeemed" : null,
                      isFetchingUserBridgedMsend ? "bridged" : null,
                    ].filter(Boolean) as string[],
                  )}
                  {" mSEND"}
                </TLabelSans>
              </div>
            )}
          </div>
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
