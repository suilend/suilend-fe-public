import Head from "next/head";
import { useState } from "react";

import BigNumber from "bignumber.js";

import { NORMALIZED_mSEND_SERIES_1_COINTYPE } from "@suilend/sui-fe";

import AllocationCard from "@/components/send/AllocationCard";
import BlurbSection from "@/components/send/BlurbSection";
import ClaimSection from "@/components/send/ClaimSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import TokenomicsSection from "@/components/send/TokenomicsSection";
import Button from "@/components/shared/Button";
import { Separator } from "@/components/ui/separator";
import {
  SendContextProvider,
  useLoadedSendContext,
} from "@/contexts/SendContext";
import {
  AllocationIdS1,
  AllocationWithUserAllocation,
  BluefinLeague,
  SuilendCapsuleS1Rarity,
  allocations,
} from "@/lib/mSend";
import { SEND_TOTAL_SUPPLY, TGE_TIMESTAMP_MS } from "@/lib/send";
import { cn } from "@/lib/utils";

function Page() {
  const { rawUserAllocationsS1 } = useLoadedSendContext();
  const userAllocations = rawUserAllocationsS1;

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // Allocations (S1)
  const earlyUsers = allocations.s1[AllocationIdS1.EARLY_USERS];
  const sendPointsS1 = allocations.s1[AllocationIdS1.SEND_POINTS_S1];
  const suilendCapsulesS1 = allocations.s1[AllocationIdS1.SUILEND_CAPSULES_S1];
  const save = allocations.s1[AllocationIdS1.SAVE];
  const rootlets = allocations.s1[AllocationIdS1.ROOTLETS];

  const bluefinLeagues = allocations.s1[AllocationIdS1.BLUEFIN_LEAGUES];
  const bluefinSendTraders =
    allocations.s1[AllocationIdS1.BLUEFIN_SEND_TRADERS];

  const primeMachin = allocations.s1[AllocationIdS1.PRIME_MACHIN];
  const egg = allocations.s1[AllocationIdS1.EGG];
  const doubleUpCitizen = allocations.s1[AllocationIdS1.DOUBLEUP_CITIZEN];
  const kumo = allocations.s1[AllocationIdS1.KUMO];

  const anima = allocations.s1[AllocationIdS1.ANIMA];

  const fud = allocations.s1[AllocationIdS1.FUD];
  const aaa = allocations.s1[AllocationIdS1.AAA];
  const octo = allocations.s1[AllocationIdS1.OCTO];
  const tism = allocations.s1[AllocationIdS1.TISM];

  const allocationsWithUserAllocationMap: Record<
    AllocationIdS1,
    AllocationWithUserAllocation
  > = {
    [AllocationIdS1.EARLY_USERS]: {
      ...earlyUsers,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.earlyUsers.isInSnapshot
            ? earlyUsers.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.SEND_POINTS_S1]: {
      ...sendPointsS1,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.sendPointsS1.owned
              .div(1000)
              .times(
                sendPointsS1.totalAllocationBreakdownMap.thousand.percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.sendPointsS1.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.SUILEND_CAPSULES_S1]: {
      ...suilendCapsulesS1,

      userEligibleSend:
        userAllocations !== undefined
          ? new BigNumber(
              new BigNumber(
                userAllocations.suilendCapsulesS1.ownedObjectsMap[
                  SuilendCapsuleS1Rarity.COMMON
                ].length,
              ).times(
                suilendCapsulesS1.totalAllocationBreakdownMap[
                  SuilendCapsuleS1Rarity.COMMON
                ].percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              ),
            )
              .plus(
                new BigNumber(
                  userAllocations.suilendCapsulesS1.ownedObjectsMap[
                    SuilendCapsuleS1Rarity.UNCOMMON
                  ].length,
                ).times(
                  suilendCapsulesS1.totalAllocationBreakdownMap[
                    SuilendCapsuleS1Rarity.UNCOMMON
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
              .plus(
                new BigNumber(
                  userAllocations.suilendCapsulesS1.ownedObjectsMap[
                    SuilendCapsuleS1Rarity.RARE
                  ].length,
                ).times(
                  suilendCapsulesS1.totalAllocationBreakdownMap[
                    SuilendCapsuleS1Rarity.RARE
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.suilendCapsulesS1.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.SAVE]: {
      ...save,

      userEligibleSend: undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend:
        userAllocations !== undefined
          ? userAllocations.save.bridgedMsend
          : undefined,
    },
    [AllocationIdS1.ROOTLETS]: {
      ...rootlets,

      userEligibleSend:
        userAllocations !== undefined
          ? (Date.now() >= TGE_TIMESTAMP_MS
              ? new BigNumber(
                  Object.keys(
                    userAllocations.rootlets.ownedMsendObjectsMap,
                  ).length,
                )
              : userAllocations.rootlets.owned
            ).times(
              rootlets.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.rootlets.redeemedMsend?.[
              NORMALIZED_mSEND_SERIES_1_COINTYPE
            ] // SERIES 1 only
          : undefined,
      userBridgedMsend: undefined,
    },

    [AllocationIdS1.BLUEFIN_LEAGUES]: {
      ...bluefinLeagues,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.bluefinLeagues.isInSnapshot
            ? bluefinLeagues.totalAllocationBreakdownMap[
                userAllocations.bluefinLeagues.isInSnapshot as BluefinLeague
              ].percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.BLUEFIN_SEND_TRADERS]: {
      ...bluefinSendTraders,

      userEligibleSend:
        userAllocations !== undefined
          ? new BigNumber(
              userAllocations.bluefinSendTraders.makerVolumeUsd
                .div(1000)
                .times(
                  bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdMakerVolume.percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
            ).plus(
              userAllocations.bluefinSendTraders.takerVolumeUsd
                .div(1000)
                .times(
                  bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdTakerVolume.percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    [AllocationIdS1.PRIME_MACHIN]: {
      ...primeMachin,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.primeMachin.owned.times(
              primeMachin.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.EGG]: {
      ...egg,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.egg.owned.times(
              egg.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.DOUBLEUP_CITIZEN]: {
      ...doubleUpCitizen,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.doubleUpCitizen.owned.times(
              doubleUpCitizen.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.KUMO]: {
      ...kumo,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.kumo.owned.times(
              kumo.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    [AllocationIdS1.ANIMA]: {
      ...anima,

      userEligibleSend: undefined,
      // isInAnimaSnapshot !== undefined
      //   ? isInAnimaSnapshot
      //     ? anima.totalAllocationBreakdownMap!.percent.times(SEND_TOTAL_SUPPLY).div(100)
      //     : new BigNumber(0)
      //   : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    [AllocationIdS1.FUD]: {
      ...fud,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.fud.isInSnapshot
            ? fud.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.AAA]: {
      ...aaa,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.aaa.isInSnapshot
            ? aaa.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.OCTO]: {
      ...octo,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.octo.isInSnapshot
            ? octo.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.TISM]: {
      ...tism,

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.tism.isInSnapshot
            ? tism.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
  };

  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="relative flex w-full flex-col items-center">
        <SendHeader />

        <div className="relative z-[2] flex w-full flex-col items-center">
          <div className="flex w-full flex-col items-center gap-12 pb-16 pt-36 md:gap-16 md:pb-20 md:pt-12">
            <HeroSection
              allocations={Object.values(allocationsWithUserAllocationMap)}
            />

            <div
              className={cn(
                "relative w-full",
                isCollapsed && "h-[400px] overflow-hidden md:h-[600px]",
              )}
            >
              <div
                className={cn(
                  "relative z-[1] h-full w-full",
                  isCollapsed && "pointer-events-none",
                )}
                style={
                  isCollapsed
                    ? {
                        maskImage:
                          "linear-gradient(to bottom, black 0%, transparent 100%)",
                      }
                    : undefined
                }
              >
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {Object.values(allocationsWithUserAllocationMap).map(
                    (allocationWithUserAllocation) => (
                      <AllocationCard
                        key={allocationWithUserAllocation.title}
                        allocation={allocationWithUserAllocation}
                      />
                    ),
                  )}
                </div>
              </div>

              {isCollapsed && (
                <Button
                  className="absolute bottom-0 left-1/2 z-[2] -translate-x-1/2 border-secondary"
                  labelClassName="text-[16px] uppercase text-primary-foreground"
                  variant="secondaryOutline"
                  size="lg"
                  onClick={() => setIsCollapsed(false)}
                >
                  Show full list
                </Button>
              )}
            </div>
          </div>

          {Date.now() >= TGE_TIMESTAMP_MS && (
            <>
              <Separator />
              <ClaimSection
                allocations={Object.values(allocationsWithUserAllocationMap)}
              />
            </>
          )}

          <Separator />
          <BlurbSection />

          <Separator />
          <TokenomicsSection />
        </div>
      </div>
    </>
  );
}

export default function Send() {
  return (
    <SendContextProvider>
      <Page />
    </SendContextProvider>
  );
}
