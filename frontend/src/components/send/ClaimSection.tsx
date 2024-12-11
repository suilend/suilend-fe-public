import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

import { KioskItem } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { formatDate, intervalToDuration } from "date-fns";
import { capitalize } from "lodash";
import { ArrowUpRight, Clock } from "lucide-react";
import { toast } from "sonner";

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_BETA_mSEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_mSEND_3M_COINTYPE,
  getBalanceChange,
  issSui,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import Card from "@/components/dashboard/Card";
import MsendTokenLogo from "@/components/send/MsendTokenLogo";
import PenaltyLineChart from "@/components/send/PenaltyLineChart";
import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatInteger, formatToken, formatUsd } from "@/lib/format";
import { DASHBOARD_URL } from "@/lib/navigation";
import {
  Allocation,
  AllocationId,
  ROOTLETS_TYPE,
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
  claimSend,
  formatDuration,
  mSEND_REDEMPTION_END_TIMESTAMP_MS,
  redeemRootletsMsend,
  redeemSendPointsMsend,
  redeemSuilendCapsulesMsend,
} from "@/lib/send";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface RedeemTabContentProps {
  sendPointsAllocation: Allocation;
  suilendCapsulesAllocation: Allocation;
  rootletsAllocation: Allocation;
  totalRedeemableMsend: BigNumber;
  totalAllocationBreakdownMaps: {
    suilendCapsules: Record<SuilendCapsuleRarity, { percent: BigNumber }>;
  };
}

function RedeemTabContent({
  sendPointsAllocation,
  suilendCapsulesAllocation,
  rootletsAllocation,
  totalRedeemableMsend,
  totalAllocationBreakdownMaps,
}: RedeemTabContentProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data } = useLoadedAppContext();

  const {
    mSendCoinMetadataMap,
    kioskClient,
    ownedKiosksWithKioskOwnerCaps,
    userAllocations,
    refreshUserAllocations,
  } = useLoadedSendContext();

  // Items
  const minMsendAmount =
    10 ** (-1 * mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals);

  const hasSendPointsItem =
    sendPointsAllocation.userEligibleSend?.gte(minMsendAmount);
  const hasSuilendCapsulesItem =
    suilendCapsulesAllocation.userEligibleSend?.gte(minMsendAmount);
  const hasRootletsItem =
    rootletsAllocation.userEligibleSend?.gte(minMsendAmount);

  // Redemption ends
  const redemptionEndsDuration = intervalToDuration({
    start: Date.now(),
    end: new Date(mSEND_REDEMPTION_END_TIMESTAMP_MS),
  });

  // Submit
  const onSubmitClick = async () => {
    if (!address) return;
    if (ownedKiosksWithKioskOwnerCaps === undefined) return;
    if (userAllocations === undefined) return;

    const transaction = new Transaction();
    try {
      if (hasSendPointsItem)
        await redeemSendPointsMsend(suilendClient, data, address, transaction);
      if (hasSuilendCapsulesItem)
        await redeemSuilendCapsulesMsend(suiClient, address, transaction);
      if (hasRootletsItem)
        await redeemRootletsMsend(
          suiClient,
          kioskClient,
          ownedKiosksWithKioskOwnerCaps,
          address,
          transaction,
        );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_mSEND_3M_COINTYPE,
        ...mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE],
      });

      toast.success(
        [
          "Redeemed",
          balanceChange !== undefined
            ? formatToken(balanceChange, {
                dp: mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals,
              })
            : null,
          "mSEND",
        ]
          .filter(Boolean)
          .join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to redeem mSEND", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshUserAllocations();
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="relative flex w-full flex-col">
          {/* List */}
          {userAllocations !== undefined && (
            <div className="relative z-[2] flex w-full flex-col gap-4 rounded-md border bg-background p-4">
              {/* SEND Points */}
              {hasSendPointsItem && (
                <>
                  <div className="flex w-full flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-3">
                      <Image
                        src={sendPointsAllocation.src}
                        alt="SEND Points S1"
                        width={24}
                        height={24}
                      />
                      <TBody className="text-[16px]">
                        {formatToken(userAllocations.sendPoints.owned, {
                          exact: false,
                        })}{" "}
                        SEND Points S1
                      </TBody>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <MsendTokenLogo
                        className="h-5 w-5"
                        coinType={NORMALIZED_mSEND_3M_COINTYPE}
                      />
                      <TBody className="text-[16px]">
                        {formatToken(sendPointsAllocation.userEligibleSend!, {
                          exact: false,
                        })}
                      </TBody>
                    </div>
                  </div>

                  {(hasSuilendCapsulesItem || hasRootletsItem) && <Separator />}
                </>
              )}

              {/* Suilend Capsules */}
              {hasSuilendCapsulesItem && (
                <>
                  {Object.entries(userAllocations.suilendCapsules.ownedMap)
                    .filter(([rarity, owned]) => owned.gt(0))
                    .map(([rarity, owned], index, array) => (
                      <Fragment key={rarity}>
                        <div className="flex w-full flex-row items-center justify-between gap-4">
                          <div className="flex flex-row items-center gap-3">
                            <Image
                              src={`/assets/send/nft/suilend-capsules-${rarity}.png`}
                              alt={`${capitalize(rarity)} Suilend Capsule`}
                              width={24}
                              height={24}
                            />
                            <TBody className="text-[16px]">
                              {formatInteger(+owned)} {capitalize(rarity)}{" "}
                              Suilend Capsule{!owned.eq(1) && "s"}
                            </TBody>
                          </div>

                          <div className="flex flex-row items-center gap-2">
                            <MsendTokenLogo
                              className="h-5 w-5"
                              coinType={NORMALIZED_mSEND_3M_COINTYPE}
                            />
                            <TBody className="text-[16px]">
                              {formatToken(
                                owned.times(
                                  totalAllocationBreakdownMaps.suilendCapsules[
                                    rarity as SuilendCapsuleRarity
                                  ].percent
                                    .times(SEND_TOTAL_SUPPLY)
                                    .div(100),
                                ),
                                { exact: false },
                              )}
                            </TBody>
                          </div>
                        </div>

                        {index !== array.length - 1 && <Separator />}
                      </Fragment>
                    ))}

                  {hasRootletsItem && <Separator />}
                </>
              )}

              {/* Rootlets */}
              {hasRootletsItem && (
                <>
                  <div className="flex w-full flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-3">
                      <Image
                        src={rootletsAllocation.src}
                        alt="Rootlets"
                        width={24}
                        height={24}
                      />
                      <div className="flex flex-col gap-1">
                        <TBody className="text-[16px]">
                          {formatInteger(+userAllocations.rootlets.msendOwning)}{" "}
                          Rootlets NFT
                          {!userAllocations.rootlets.msendOwning.eq(1) && "s"}
                        </TBody>
                        {(ownedKiosksWithKioskOwnerCaps ?? []).reduce(
                          (acc, { kiosk }) => [
                            ...acc,
                            ...kiosk.items.filter(
                              (item) =>
                                item.type === ROOTLETS_TYPE && item.listing,
                            ),
                          ],
                          [] as KioskItem[],
                        ).length > 0 && (
                          <TLabelSans>
                            {
                              "You'll need to unlist your listed Rootlets NFTs to redeem them"
                            }
                          </TLabelSans>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <MsendTokenLogo
                        className="h-5 w-5"
                        coinType={NORMALIZED_mSEND_3M_COINTYPE}
                      />
                      <TBody className="text-[16px]">
                        {formatToken(rootletsAllocation.userEligibleSend!, {
                          exact: false,
                        })}
                      </TBody>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Total */}
          <div className="relative z-[1] -mt-2 flex w-full flex-row items-center justify-between rounded-b-md bg-border px-4 pb-2 pt-4">
            <TBodySans className="text-muted-foreground">Total</TBodySans>

            <div className="flex flex-row items-center gap-2">
              <MsendTokenLogo
                className="h-5 w-5"
                coinType={NORMALIZED_mSEND_3M_COINTYPE}
              />
              <TBody className="text-[16px]">
                {formatToken(totalRedeemableMsend, { exact: false })}
              </TBody>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-between gap-4">
          <TBodySans className="text-muted-foreground">
            Redemption ends in
          </TBodySans>

          <div className="flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Tooltip
              title={formatDate(
                new Date(mSEND_REDEMPTION_END_TIMESTAMP_MS),
                "yyyy-MM-dd HH:mm:ss",
              )}
            >
              <TBody
                className={cn(
                  "decoration-foreground/50",
                  hoverUnderlineClassName,
                )}
              >
                {formatDuration(redemptionEndsDuration)}
              </TBody>
            </Tooltip>
          </div>
        </div>
      </div>

      <Button
        className="h-14 w-full"
        labelClassName="text-[16px]"
        size="lg"
        onClick={onSubmitClick}
      >
        REDEEM mSEND
      </Button>
    </>
  );
}

function ClaimTabContent() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { data } = useLoadedAppContext();

  const {
    mSendCoinMetadataMap,
    sendCoinMetadataMap,
    mSendBalanceMap,
    userClaimedSendMap,
    refreshUserClaimedSendMap,
  } = useLoadedSendContext();

  // Deposit sSUI
  const ssuiDepositedAmount = (data.obligations ?? []).reduce(
    (acc, obligation) =>
      acc.plus(
        obligation.deposits.reduce(
          (acc2, d) => acc2.plus(issSui(d.coinType) ? d.depositedAmount : 0),
          new BigNumber(0),
        ),
      ),
    new BigNumber(0),
  );

  // Submit
  const onSubmitClick = async () => {
    if (!address) return;

    const transaction = new Transaction();
    try {
      await claimSend(
        suiClient,
        address,
        NORMALIZED_BETA_mSEND_COINTYPE, // TODO
        transaction,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_BETA_SEND_COINTYPE, // TODO
        ...sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE], // TODO
      });

      toast.success(
        [
          "Claimed",
          balanceChange !== undefined
            ? formatToken(balanceChange, {
                dp: sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE].decimals, // TODO
              })
            : null,
          "SEND",
        ]
          .filter(Boolean)
          .join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to claim SEND", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshUserClaimedSendMap();
    }
  };

  return (
    <>
      {/* Deposit sSUI */}
      <div
        className={cn(
          "flex w-full flex-row items-center gap-4",
          ssuiDepositedAmount.gt(0) && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex flex-1 flex-col gap-1">
          <TBody className="text-[16px]">DEPOSIT sSUI</TBody>
          <TBodySans className="text-muted-foreground">
            Deposit any amount of sSUI
          </TBodySans>
        </div>

        <Link href={`${DASHBOARD_URL}?asset=sSUI`}>
          <Button labelClassName="uppercase" endIcon={<ArrowUpRight />}>
            Deposit
          </Button>
        </Link>
      </div>

      <Separator />

      <div
        className={cn(
          "flex w-full flex-col gap-6",
          !ssuiDepositedAmount.gt(0) && "pointer-events-none opacity-50",
        )}
      >
        <TBody>
          mSEND in wallet:{" "}
          {formatToken(mSendBalanceMap[NORMALIZED_BETA_mSEND_COINTYPE], {
            dp: mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE].decimals, // TODO
          })}
        </TBody>

        <div className="flex w-full flex-col gap-4">
          <div className="flex w-full flex-col gap-px">
            <Button
              className="h-14 w-full"
              labelClassName="uppercase text-[16px]"
              size="lg"
              onClick={onSubmitClick}
            >
              Claim SEND
            </Button>
          </div>

          <div className="flex flex-row items-center gap-2">
            <SendTokenLogo />

            <TBody>
              {userClaimedSendMap === undefined ? (
                <Skeleton className="inline-block h-5 w-16 align-top" />
              ) : (
                // TODO
                formatToken(
                  userClaimedSendMap[NORMALIZED_BETA_mSEND_COINTYPE],
                  {
                    dp: sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE]
                      .decimals, // TODO
                  },
                )
              )}
              {" SEND claimed"}
            </TBody>
          </div>
        </div>
      </div>
    </>
  );
}

interface ClaimSectionProps {
  allocations: Allocation[];
  totalAllocationBreakdownMaps: {
    suilendCapsules: Record<SuilendCapsuleRarity, { percent: BigNumber }>;
  };
}

export default function ClaimSection({
  allocations,
  totalAllocationBreakdownMaps,
}: ClaimSectionProps) {
  const { data } = useLoadedAppContext();

  const { mSendObjectMap, mSendCoinMetadataMap } = useLoadedSendContext();

  // Allocations
  const sendPointsAllocation = allocations.find(
    (a) => a.id === AllocationId.SEND_POINTS,
  ) as Allocation;
  const suilendCapsulesAllocation = allocations.find(
    (a) => a.id === AllocationId.SUILEND_CAPSULES,
  ) as Allocation;
  const rootletsAllocation = allocations.find(
    (a) => a.id === AllocationId.ROOTLETS,
  ) as Allocation;

  // 1) Redeem mSEND
  const minMsendAmount =
    10 ** (-1 * mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE].decimals);

  const totalRedeemableMsend = new BigNumber(
    sendPointsAllocation.userEligibleSend ?? 0,
  )
    .plus(suilendCapsulesAllocation.userEligibleSend ?? 0)
    .plus(rootletsAllocation.userEligibleSend ?? 0);

  // Tabs
  enum Tab {
    REDEEM = "redeem",
    CLAIM = "claim",
  }

  const tabs = [
    { id: Tab.REDEEM, title: "REDEEM mSEND" },
    { id: Tab.CLAIM, title: "CLAIM SEND" },
  ];

  const selectedTab =
    totalRedeemableMsend.gt(minMsendAmount) &&
    Date.now() < mSEND_REDEMPTION_END_TIMESTAMP_MS
      ? Tab.REDEEM
      : Tab.CLAIM;

  // Penalty
  const suiReserve = data.reserveMap[NORMALIZED_SUI_COINTYPE];

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-12 py-16 md:py-20">
      <SectionHeading id="claim">Claim</SectionHeading>

      <Card className="rounded-md">
        <div className="flex w-full flex-row items-stretch">
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              className={cn(
                "flex flex-1 flex-row items-center justify-center border-b px-4 py-4",
                tab.id === selectedTab
                  ? "border-b-primary bg-primary/5"
                  : "pointer-events-none bg-background/50",
              )}
            >
              <div
                className={cn(
                  "flex flex-row items-center gap-2.5",
                  tab.id !== selectedTab && "opacity-50",
                )}
              >
                <div className="flex h-4 w-4 flex-row items-center justify-center rounded-sm bg-primary">
                  <TLabelSans className="text-foreground">
                    {index + 1}
                  </TLabelSans>
                </div>
                <TBody>{tab.title}</TBody>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-6 p-4 pt-6">
          {selectedTab === Tab.REDEEM && (
            <RedeemTabContent
              sendPointsAllocation={sendPointsAllocation}
              suilendCapsulesAllocation={suilendCapsulesAllocation}
              rootletsAllocation={rootletsAllocation}
              totalRedeemableMsend={totalRedeemableMsend}
              totalAllocationBreakdownMaps={totalAllocationBreakdownMaps}
            />
          )}
          {selectedTab === Tab.CLAIM && <ClaimTabContent />}
        </div>
      </Card>

      {/* TODO */}
      {mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE].currentPenaltySui.gt(0) && (
        <div className="flex w-full flex-col gap-4">
          <TBody className="text-[16px]">PENALTY</TBody>

          <div className="flex w-full flex-col gap-3">
            {/* Penalty ends in */}
            {Date.now() <
              +mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE].penaltyEndTimeS *
                1000 && (
              <div className="flex w-full flex-row justify-between gap-4">
                <TBodySans className="text-muted-foreground">
                  Penalty ends in
                </TBodySans>

                <div className="flex flex-row items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Tooltip
                    title={formatDate(
                      new Date(
                        +mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE]
                          .penaltyEndTimeS * 1000,
                      ),
                      "yyyy-MM-dd HH:mm:ss",
                    )}
                  >
                    <TBody
                      className={cn(
                        "decoration-foreground/50",
                        hoverUnderlineClassName,
                      )}
                    >
                      {formatDuration(
                        intervalToDuration({
                          start: Date.now(),
                          end: new Date(
                            +mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE]
                              .penaltyEndTimeS * 1000,
                          ),
                        }),
                      )}
                    </TBody>
                  </Tooltip>
                </div>
              </div>
            )}

            {/* Current penalty */}
            <div className="flex w-full flex-row justify-between gap-4">
              <TBodySans className="text-muted-foreground">
                Current penalty
              </TBodySans>

              <div className="flex flex-col items-end gap-1">
                <div className="flex flex-row items-center gap-2">
                  <TokenLogo className="h-4 w-4" token={suiReserve.token} />
                  <TBody>
                    <Tooltip
                      title={`${formatToken(
                        mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE]
                          .currentPenaltySui,
                        { dp: SUI_DECIMALS },
                      )} SUI`}
                    >
                      <span
                        className={cn(
                          "decoration-foreground/50",
                          hoverUnderlineClassName,
                        )}
                      >
                        {formatToken(
                          mSendObjectMap[NORMALIZED_mSEND_3M_COINTYPE]
                            .currentPenaltySui,
                        )}
                        {" SUI"}
                      </span>
                    </Tooltip>
                    {" / SEND"}
                  </TBody>
                </div>
                <TLabel>
                  {formatUsd(
                    mSendObjectMap[
                      NORMALIZED_mSEND_3M_COINTYPE
                    ].currentPenaltySui.times(suiReserve.price),
                  )}
                  {" / SEND"}
                </TLabel>
              </div>
            </div>
          </div>

          <PenaltyLineChart mSendCoinType={NORMALIZED_mSEND_3M_COINTYPE} />
        </div>
      )}
    </div>
  );
}
