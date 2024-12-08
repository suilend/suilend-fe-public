import Image from "next/image";
import Link from "next/link";
import { Fragment } from "react";

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
  NORMALIZED_sSUI_COINTYPE,
  getBalanceChange,
  issSui,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import Card from "@/components/dashboard/Card";
import MsendTokenLogo from "@/components/send/MsendTokenLogo";
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
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
  burnSendPoints,
  burnSuilendCapsules,
  formatDuration,
  mSEND_CONVERSION_END_TIMESTAMP_MS,
  redeemMsendForSend,
} from "@/lib/send";
import { cn, hoverUnderlineClassName } from "@/lib/utils";

interface ConvertTabContentProps {
  sendPointsAllocation: Allocation;
  suilendCapsulesAllocation: Allocation;
  totalClaimableMsend: BigNumber;
  suilendCapsulesTotalAllocationBreakdownMap: Record<
    SuilendCapsuleRarity,
    { percent: BigNumber }
  >;
}

function ConvertTabContent({
  sendPointsAllocation,
  suilendCapsulesAllocation,
  totalClaimableMsend,
  suilendCapsulesTotalAllocationBreakdownMap,
}: ConvertTabContentProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data } = useLoadedAppContext();

  const { mSendCoinMetadataMap, userAllocations, refreshUserAllocations } =
    useLoadedSendContext();

  // Conversion ends
  const conversionEndsDuration = intervalToDuration({
    start: Date.now(),
    end: new Date(mSEND_CONVERSION_END_TIMESTAMP_MS),
  });

  // Submit
  const onSubmitClick = async () => {
    if (!address) return;
    if (userAllocations === undefined) return;

    const transaction = new Transaction();
    try {
      const ownedSendPoints = userAllocations.sendPoints.owned;
      const ownedSuilendCapsules = Object.values(
        userAllocations.suilendCapsules.ownedMap,
      ).reduce((acc, val) => acc.plus(val), new BigNumber(0));

      if (ownedSendPoints.gt(0))
        await burnSendPoints(suilendClient, data, address, transaction);
      if (ownedSuilendCapsules.gt(0))
        await burnSuilendCapsules(suiClient, address, transaction);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_BETA_mSEND_COINTYPE, // TODO
        ...mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE], // TODO
      });

      toast.success(
        [
          "Converted",
          [
            ownedSendPoints.gt(0)
              ? `${formatToken(ownedSendPoints, { exact: false })} SEND Points`
              : undefined,
            ownedSuilendCapsules.gt(0)
              ? `${formatInteger(+ownedSuilendCapsules)} Suilend Capsules`
              : undefined,
          ]
            .filter(Boolean)
            .join(" and "),
          "to",
          balanceChange !== undefined
            ? `${formatToken(balanceChange, {
                dp: mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE] // TODO
                  .decimals,
              })} mSEND`
            : "mSEND",
        ].join(" "),
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
      toast.error(
        "Failed to convert SEND Points and/or Suilend Capsules to mSEND",
        { description: (err as Error)?.message || "An unknown error occurred" },
      );
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
              {sendPointsAllocation.userAllocationPercent?.gt(0) && (
                <>
                  <div className="flex w-full flex-row items-center justify-between gap-4">
                    <div className="flex flex-row items-center gap-3">
                      <Image
                        src={sendPointsAllocation.src}
                        alt="SEND Points"
                        width={24}
                        height={24}
                      />
                      <TBody className="text-[16px]">
                        {formatToken(userAllocations.sendPoints.owned, {
                          exact: false,
                        })}{" "}
                        SEND Points
                      </TBody>
                    </div>

                    <div className="flex flex-row items-center gap-2">
                      <MsendTokenLogo
                        className="h-5 w-5"
                        coinType={NORMALIZED_BETA_mSEND_COINTYPE} // TODO
                      />
                      <TBody className="text-[16px]">
                        {formatToken(
                          sendPointsAllocation.userAllocationPercent
                            .times(SEND_TOTAL_SUPPLY)
                            .div(100),
                          { exact: false },
                        )}
                      </TBody>
                    </div>
                  </div>

                  {suilendCapsulesAllocation.userAllocationPercent?.gt(0) && (
                    <Separator />
                  )}
                </>
              )}

              {/* Suilend Capsules */}
              {suilendCapsulesAllocation.userAllocationPercent?.gt(0) &&
                Object.entries(userAllocations.suilendCapsules.ownedMap)
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
                            {formatInteger(+owned)} {capitalize(rarity)} Suilend
                            Capsule{!owned.eq(1) && "s"}
                          </TBody>
                        </div>

                        <div className="flex flex-row items-center gap-2">
                          <MsendTokenLogo
                            className="h-5 w-5"
                            coinType={NORMALIZED_BETA_mSEND_COINTYPE} // TODO
                          />
                          <TBody className="text-[16px]">
                            {formatToken(
                              owned.times(
                                suilendCapsulesTotalAllocationBreakdownMap[
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
            </div>
          )}

          {/* Total */}
          <div className="relative z-[1] -mt-2 flex w-full flex-row items-center justify-between rounded-b-md bg-border px-4 pb-2 pt-4">
            <TBodySans className="text-muted-foreground">Total</TBodySans>

            <div className="flex flex-row items-center gap-2">
              <MsendTokenLogo
                className="h-5 w-5"
                coinType={NORMALIZED_BETA_mSEND_COINTYPE} // TODO
              />
              <TBody className="text-[16px]">
                {formatToken(totalClaimableMsend, { exact: false })}
              </TBody>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-row items-center justify-between gap-4">
          <TBodySans className="text-muted-foreground">
            Conversion ends in
          </TBodySans>

          <div className="flex flex-row items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Tooltip
              title={formatDate(
                new Date(mSEND_CONVERSION_END_TIMESTAMP_MS),
                "yyyy-MM-dd HH:mm:ss",
              )}
            >
              <TBody
                className={cn(
                  "decoration-foreground/50",
                  hoverUnderlineClassName,
                )}
              >
                {formatDuration(conversionEndsDuration)}
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
        CONVERT TO mSEND
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
    userRedeemedSendMap,
    refreshUserRedeemedSendMap,
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
      await redeemMsendForSend(
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
            ? `${formatToken(balanceChange, {
                dp: sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE].decimals, // TODO
              })} SEND`
            : "SEND",
        ].join(" "),
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
      await refreshUserRedeemedSendMap();
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
          "flex w-full flex-col gap-4",
          !ssuiDepositedAmount.gt(0) && "pointer-events-none opacity-50",
        )}
      >
        <TBody>
          mSEND in wallet:{" "}
          {formatToken(mSendBalanceMap[NORMALIZED_BETA_mSEND_COINTYPE], {
            dp: mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE].decimals, // TODO
          })}
        </TBody>

        <Button
          className="h-14 w-full"
          labelClassName="uppercase text-[16px]"
          size="lg"
          onClick={onSubmitClick}
        >
          Claim SEND
        </Button>

        <div className="flex flex-row items-center gap-2">
          <SendTokenLogo />

          <TBody>
            {userRedeemedSendMap === undefined ? (
              <Skeleton className="inline-block h-5 w-16 align-top" />
            ) : (
              // TODO
              formatToken(userRedeemedSendMap[NORMALIZED_BETA_mSEND_COINTYPE], {
                dp: sendCoinMetadataMap[NORMALIZED_BETA_SEND_COINTYPE].decimals, // TODO
              })
            )}
            {" SEND claimed"}
          </TBody>
        </div>
      </div>
    </>
  );
}

interface ClaimSectionProps {
  allocations: Allocation[];
  suilendCapsulesTotalAllocationBreakdownMap: Record<
    SuilendCapsuleRarity,
    { percent: BigNumber }
  >;
}

export default function ClaimSection({
  allocations,
  suilendCapsulesTotalAllocationBreakdownMap,
}: ClaimSectionProps) {
  const { data } = useLoadedAppContext();

  const { mSendObjectMap, mSendCoinMetadataMap, userAllocations } =
    useLoadedSendContext();

  // Allocations
  const sendPointsAllocation = allocations.find(
    (a) => a.id === AllocationId.SEND_POINTS,
  ) as Allocation;
  const suilendCapsulesAllocation = allocations.find(
    (a) => a.id === AllocationId.SUILEND_CAPSULES,
  ) as Allocation;

  // 1) Convert
  const minMsendAmount =
    10 ** (-1 * mSendCoinMetadataMap[NORMALIZED_BETA_mSEND_COINTYPE].decimals); // TODO

  const totalClaimableMsend = new BigNumber(
    new BigNumber(sendPointsAllocation.userAllocationPercent ?? 0)
      .times(SEND_TOTAL_SUPPLY)
      .div(100),
  ).plus(
    Object.entries(userAllocations?.suilendCapsules.ownedMap ?? {}).reduce(
      (acc, [rarity, owned]) =>
        acc.plus(
          owned.times(
            suilendCapsulesTotalAllocationBreakdownMap[
              rarity as SuilendCapsuleRarity
            ].percent
              .times(SEND_TOTAL_SUPPLY)
              .div(100),
          ),
        ),
      new BigNumber(0),
    ),
  );

  // Tabs
  enum Tab {
    CONVERT = "convert",
    CLAIM = "claim",
  }

  const tabs = [
    { id: Tab.CONVERT, title: "Convert" },
    { id: Tab.CLAIM, title: "Claim" },
  ];

  const selectedTab =
    totalClaimableMsend.gt(minMsendAmount) &&
    Date.now() < mSEND_CONVERSION_END_TIMESTAMP_MS
      ? Tab.CONVERT
      : Tab.CLAIM;

  // Penalty
  const suiReserve = data.reserveMap[NORMALIZED_SUI_COINTYPE];

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-12 py-16 md:py-20">
      <SectionHeading id="claim-section-heading">Claim</SectionHeading>

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
                <TBody className="uppercase">{tab.title}</TBody>
              </div>
            </div>
          ))}
        </div>

        <div className="flex w-full flex-col gap-6 p-4 pt-6">
          {selectedTab === Tab.CONVERT && (
            <ConvertTabContent
              sendPointsAllocation={sendPointsAllocation}
              suilendCapsulesAllocation={suilendCapsulesAllocation}
              totalClaimableMsend={totalClaimableMsend}
              suilendCapsulesTotalAllocationBreakdownMap={
                suilendCapsulesTotalAllocationBreakdownMap
              }
            />
          )}
          {selectedTab === Tab.CLAIM && <ClaimTabContent />}
        </div>
      </Card>

      {/* TODO */}
      {mSendObjectMap[NORMALIZED_BETA_mSEND_COINTYPE].currentPenaltySui.gt(
        0,
      ) && (
        <div className="flex w-full flex-col gap-4">
          <TBody className="text-[16px] uppercase">Penalty Chart</TBody>

          <div className="flex w-full flex-col gap-3">
            {/* Penalty ends in */}
            {Date.now() < mSEND_CONVERSION_END_TIMESTAMP_MS && (
              <div className="flex w-full flex-row justify-between gap-4">
                <TBodySans className="text-muted-foreground">
                  Penalty ends in
                </TBodySans>

                <div className="flex flex-row items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Tooltip
                    title={formatDate(
                      new Date(mSEND_CONVERSION_END_TIMESTAMP_MS),
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
                          end: new Date(mSEND_CONVERSION_END_TIMESTAMP_MS),
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
                        mSendObjectMap[NORMALIZED_BETA_mSEND_COINTYPE] // TODO
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
                          mSendObjectMap[NORMALIZED_BETA_mSEND_COINTYPE] // TODO
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
                      NORMALIZED_BETA_mSEND_COINTYPE // TODO
                    ].currentPenaltySui.times(suiReserve.price),
                  )}
                  {" / SEND"}
                </TLabel>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
