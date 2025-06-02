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
  AllocationIdS2,
  AllocationWithUserAllocation,
  BluefinLeague,
  SuilendCapsuleS1Rarity,
  SuilendCapsuleS2Rarity,
  allocations,
} from "@/lib/mSend";
import { SEND_TOTAL_SUPPLY, TGE_TIMESTAMP_MS } from "@/lib/send";
import { cn } from "@/lib/utils";

function Page() {
  const { rawUserAllocationsS1, rawUserAllocationsS2 } = useLoadedSendContext();

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

  const allocationsWithUserAllocationS1Map: Record<
    AllocationIdS1,
    AllocationWithUserAllocation
  > = {
    [AllocationIdS1.EARLY_USERS]: {
      ...earlyUsers,

      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.earlyUsers.isInSnapshot
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

      owned:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.sendPointsS1.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.sendPointsS1.owned
              .div(1000)
              .times(
                sendPointsS1.totalAllocationBreakdownMap.thousand.percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              )
          : undefined,
      userRedeemedMsend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.sendPointsS1.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.SUILEND_CAPSULES_S1]: {
      ...suilendCapsulesS1,

      ownedMap:
        rawUserAllocationsS1 !== undefined
          ? {
              [SuilendCapsuleS1Rarity.COMMON]: new BigNumber(
                rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
                  SuilendCapsuleS1Rarity.COMMON
                ].length,
              ),
              [SuilendCapsuleS1Rarity.UNCOMMON]: new BigNumber(
                rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
                  SuilendCapsuleS1Rarity.UNCOMMON
                ].length,
              ),
              [SuilendCapsuleS1Rarity.RARE]: new BigNumber(
                rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
                  SuilendCapsuleS1Rarity.RARE
                ].length,
              ),
            }
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? new BigNumber(
              new BigNumber(
                rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
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
                  rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
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
                  rawUserAllocationsS1.suilendCapsulesS1.ownedObjectsMap[
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
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.suilendCapsulesS1.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS1.SAVE]: {
      ...save,

      userEligibleSend: undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.save.bridgedMsend
          : undefined,
    },
    [AllocationIdS1.ROOTLETS]: {
      ...rootlets,

      owned:
        rawUserAllocationsS1 !== undefined
          ? new BigNumber(
              Object.keys(
                rawUserAllocationsS1.rootlets.ownedMsendObjectsMap,
              ).length,
            )
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? Object.values(
              rawUserAllocationsS1.rootlets.ownedMsendObjectsMap,
            ).reduce((acc, curr) => acc.plus(curr.ownedMsend), new BigNumber(0))
          : undefined,
      userRedeemedMsend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.rootlets.redeemedMsend?.[
              NORMALIZED_mSEND_SERIES_1_COINTYPE
            ] // SERIES 1 only
          : undefined,
      userBridgedMsend: undefined,
    },

    [AllocationIdS1.BLUEFIN_LEAGUES]: {
      ...bluefinLeagues,

      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.bluefinLeagues.isInSnapshot
            ? bluefinLeagues.totalAllocationBreakdownMap[
                rawUserAllocationsS1.bluefinLeagues
                  .isInSnapshot as BluefinLeague
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
        rawUserAllocationsS1 !== undefined
          ? new BigNumber(
              rawUserAllocationsS1.bluefinSendTraders.makerVolumeUsd
                .div(1000)
                .times(
                  bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdMakerVolume.percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
            ).plus(
              rawUserAllocationsS1.bluefinSendTraders.takerVolumeUsd
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

      owned:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.primeMachin.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.primeMachin.owned.times(
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

      owned:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.egg.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.egg.owned.times(
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

      owned:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.doubleUpCitizen.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.doubleUpCitizen.owned.times(
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

      owned:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.kumo.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.kumo.owned.times(
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
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.fud.isInSnapshot
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
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.aaa.isInSnapshot
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
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.octo.isInSnapshot
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
        rawUserAllocationsS1 !== undefined
          ? rawUserAllocationsS1.tism.isInSnapshot
            ? tism.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
  };

  // Allocations (S2)
  const sendPointsS2 = allocations.s2[AllocationIdS2.SEND_POINTS_S2];
  const steammPoints = allocations.s2[AllocationIdS2.STEAMM_POINTS];
  const suilendCapsulesS2 = allocations.s2[AllocationIdS2.SUILEND_CAPSULES_S2];

  const allocationsWithUserAllocationS2Map: Record<
    AllocationIdS2,
    AllocationWithUserAllocation
  > = {
    [AllocationIdS2.SEND_POINTS_S2]: {
      ...sendPointsS2,

      owned:
        rawUserAllocationsS2 !== undefined
          ? rawUserAllocationsS2.sendPointsS2.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS2 !== undefined
          ? rawUserAllocationsS2.sendPointsS2.owned
              .div(1000)
              .times(
                sendPointsS2.totalAllocationBreakdownMap.thousand.percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              )
          : undefined,
      userRedeemedMsend:
        rawUserAllocationsS2 !== undefined
          ? new BigNumber(0) // N/A
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS2.STEAMM_POINTS]: {
      ...steammPoints,

      owned:
        rawUserAllocationsS2 !== undefined
          ? rawUserAllocationsS2.steammPoints.owned
          : undefined,
      userEligibleSend:
        rawUserAllocationsS2 !== undefined
          ? rawUserAllocationsS2.steammPoints.owned
              .div(1000)
              .times(
                steammPoints.totalAllocationBreakdownMap.thousand.percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              )
          : undefined,
      userRedeemedMsend:
        rawUserAllocationsS2 !== undefined
          ? new BigNumber(0) // N/A
          : undefined,
      userBridgedMsend: undefined,
    },
    [AllocationIdS2.SUILEND_CAPSULES_S2]: {
      ...suilendCapsulesS2,

      ownedMap:
        rawUserAllocationsS2 !== undefined
          ? {
              [SuilendCapsuleS2Rarity.COMMON]: new BigNumber(
                rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                  SuilendCapsuleS2Rarity.COMMON
                ].length,
              ),
              [SuilendCapsuleS2Rarity.UNCOMMON]: new BigNumber(
                rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                  SuilendCapsuleS2Rarity.UNCOMMON
                ].length,
              ),
              [SuilendCapsuleS2Rarity.RARE]: new BigNumber(
                rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                  SuilendCapsuleS2Rarity.RARE
                ].length,
              ),
            }
          : undefined,
      userEligibleSend:
        rawUserAllocationsS2 !== undefined
          ? new BigNumber(
              new BigNumber(
                rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                  SuilendCapsuleS2Rarity.COMMON
                ].length,
              ).times(
                suilendCapsulesS2.totalAllocationBreakdownMap[
                  SuilendCapsuleS2Rarity.COMMON
                ].percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              ),
            )
              .plus(
                new BigNumber(
                  rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                    SuilendCapsuleS2Rarity.UNCOMMON
                  ].length,
                ).times(
                  suilendCapsulesS2.totalAllocationBreakdownMap[
                    SuilendCapsuleS2Rarity.UNCOMMON
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
              .plus(
                new BigNumber(
                  rawUserAllocationsS2.suilendCapsulesS2.ownedObjectsMap[
                    SuilendCapsuleS2Rarity.RARE
                  ].length,
                ).times(
                  suilendCapsulesS2.totalAllocationBreakdownMap[
                    SuilendCapsuleS2Rarity.RARE
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
          : undefined,
      userRedeemedMsend:
        rawUserAllocationsS2 !== undefined
          ? new BigNumber(0) // N/A
          : undefined,
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
              allocations={Object.values(allocationsWithUserAllocationS1Map)}
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
                  {Object.values(allocationsWithUserAllocationS1Map).map(
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
                allocations={[
                  ...Object.values(allocationsWithUserAllocationS1Map),
                  ...Object.values(allocationsWithUserAllocationS2Map),
                ]}
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
