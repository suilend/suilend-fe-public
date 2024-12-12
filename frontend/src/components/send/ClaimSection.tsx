import Image from "next/image";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { KioskItem } from "@mysten/kiosk";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { ClassValue } from "clsx";
import { formatDate, intervalToDuration } from "date-fns";
import { capitalize } from "lodash";
import { ArrowUpRight, Clock } from "lucide-react";
import { toast } from "sonner";

import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_mSEND_3M_COINTYPE,
  SUI_GAS_MIN,
  getBalanceChange,
  issSui,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import Card from "@/components/dashboard/Card";
import MsendDropdownMenu from "@/components/send/MsendDropdownMenu";
import MsendTokenLogo from "@/components/send/MsendTokenLogo";
import PenaltyLineChart from "@/components/send/PenaltyLineChart";
import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button, { ButtonProps } from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import {
  TBody,
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedSendContext } from "@/contexts/SendContext";
import { ASSETS_URL, TX_TOAST_DURATION } from "@/lib/constants";
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

type SubmitButtonState = {
  isLoading?: boolean;
  isDisabled?: boolean;
  title?: string;
};

interface SubmitButtonProps {
  className?: ClassValue;
  labelClassName?: ClassValue;
  variant?: ButtonProps["variant"];
  state: SubmitButtonState;
  submit: () => Promise<void>;
}

function SubmitButton({
  className,
  labelClassName,
  variant,
  state,
  submit,
}: SubmitButtonProps) {
  return (
    <Button
      className={cn("h-auto min-h-14 w-full rounded-md py-2", className)}
      labelClassName={cn("text-[16px] text-wrap", labelClassName)}
      variant={variant}
      style={{ overflowWrap: "anywhere" }}
      disabled={state.isDisabled}
      onClick={submit}
    >
      {state.isLoading ? <Spinner size="md" /> : state.title}
    </Button>
  );
}

interface RedeemTabContentProps {
  sendPointsAllocation: Allocation;
  rootletsAllocation: Allocation;
  hasSendPointsToRedeem: boolean;
  hasSuilendCapsulesToRedeem: boolean;
  hasRootletsToRedeem: boolean;
  totalRedeemableMsend: BigNumber;
  totalAllocationBreakdownMaps: {
    suilendCapsules: Record<SuilendCapsuleRarity, { percent: BigNumber }>;
  };
}

function RedeemTabContent({
  sendPointsAllocation,
  rootletsAllocation,
  hasSendPointsToRedeem,
  hasSuilendCapsulesToRedeem,
  hasRootletsToRedeem,
  totalRedeemableMsend,
  totalAllocationBreakdownMaps,
}: RedeemTabContentProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, getBalance } = useLoadedAppContext();

  const {
    mSendCoinMetadataMap,
    kioskClient,
    ownedKiosks,
    refreshUserAllocations,
    ...restLoadedSendContext
  } = useLoadedSendContext();
  const userAllocations = restLoadedSendContext.userAllocations!;

  // Balances
  const suiBalance = getBalance(NORMALIZED_SUI_COINTYPE);

  // Redemption ends
  const redemptionEndsDuration = intervalToDuration({
    start: Date.now(),
    end: new Date(mSEND_REDEMPTION_END_TIMESTAMP_MS),
  });

  // Submit
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const submitButtonState: SubmitButtonState = useMemo(() => {
    if (isSubmitting) return { isLoading: true, isDisabled: true };

    if (suiBalance.lt(SUI_GAS_MIN))
      return {
        isDisabled: true,
        title: `${SUI_GAS_MIN} SUI should be saved for gas`,
      };

    return {
      title: "REDEEM mSEND",
    };
  }, [isSubmitting, suiBalance]);

  const submit = async () => {
    if (!address) return;
    if (ownedKiosks === undefined) return;

    if (submitButtonState.isDisabled) return;

    setIsSubmitting(true);

    const transaction = new Transaction();
    try {
      if (hasSendPointsToRedeem)
        await redeemSendPointsMsend(suilendClient, data, address, transaction);
      if (hasSuilendCapsulesToRedeem)
        await redeemSuilendCapsulesMsend(suiClient, address, transaction);
      if (hasRootletsToRedeem)
        await redeemRootletsMsend(
          suiClient,
          kioskClient,
          ownedKiosks,
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
        duration: TX_TOAST_DURATION,
      });
    } finally {
      setIsSubmitting(false);
      await refreshUserAllocations();
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-4">
        <div className="relative flex w-full flex-col">
          {/* Items */}
          <div className="relative z-[2] flex w-full flex-col gap-4 rounded-md border bg-background p-4">
            {/* SEND Points */}
            {hasSendPointsToRedeem && (
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

                {(hasSuilendCapsulesToRedeem || hasRootletsToRedeem) && (
                  <Separator />
                )}
              </>
            )}

            {/* Suilend Capsules */}
            {hasSuilendCapsulesToRedeem && (
              <>
                {Object.entries(userAllocations.suilendCapsules.ownedMap)
                  .filter(([rarity, owned]) => owned.gt(0))
                  .map(([rarity, owned], index, array) => (
                    <Fragment key={rarity}>
                      <div className="flex w-full flex-row items-center justify-between gap-4">
                        <div className="flex flex-row items-center gap-3">
                          <Image
                            src={`${ASSETS_URL}/send/nft/suilend-capsules-${rarity}.png`}
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

                {hasRootletsToRedeem && <Separator />}
              </>
            )}

            {/* Rootlets */}
            {hasRootletsToRedeem && (
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
                      {(ownedKiosks ?? []).reduce(
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
                            "Note: You'll need to unlist your listed Rootlets NFTs to redeem them"
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

          {/* Total */}
          <div className="relative z-[1] -mt-2 flex w-full flex-row items-center justify-between rounded-b-md bg-border px-4 pb-2 pt-4">
            <TBodySans className="text-muted-foreground">Total</TBodySans>

            <div className="flex flex-row items-center gap-2">
              <MsendTokenLogo
                className="h-5 w-5"
                coinType={NORMALIZED_mSEND_3M_COINTYPE}
              />
              <TBody className="text-[16px]">
                {formatToken(totalRedeemableMsend, {
                  dp: mSendCoinMetadataMap[NORMALIZED_mSEND_3M_COINTYPE]
                    .decimals,
                })}
              </TBody>
            </div>
          </div>
        </div>

        {/* Redemption ends in */}
        {(hasSendPointsToRedeem || hasSuilendCapsulesToRedeem) && (
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
        )}
      </div>

      {/* Submit */}
      <SubmitButton state={submitButtonState} submit={submit} />
    </>
  );
}

const INPUT_HEIGHT = 70; // px
const MAX_BUTTON_WIDTH = 60; // px
const MAX_BUTTON_HEIGHT = 40; // px

function ClaimTabContent() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, getBalance, obligationOwnerCap } =
    useLoadedAppContext();

  const {
    mSendObjectMap,
    mSendCoinMetadataMap,
    sendCoinMetadataMap,
    mSendBalanceMap,
    mSendCoinTypesWithBalance,
    selectedMsendCoinType,
  } = useLoadedSendContext();

  // Balances
  const suiBalance = getBalance(NORMALIZED_SUI_COINTYPE);
  const mSendBalance = mSendBalanceMap[selectedMsendCoinType];

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

  // Amount
  const [claimAmount, setClaimAmount] = useState<string>("");
  // new BigNumber(mSendBalance).toFixed(
  //   mSendCoinMetadataMap[selectedMsendCoinType].decimals,
  //   BigNumber.ROUND_DOWN,
  // ); // TODO

  const useMaxAmount = new BigNumber(claimAmount || "").eq(mSendBalance);

  // Penalty
  const suiReserve = data.reserveMap[NORMALIZED_SUI_COINTYPE];

  const claimPenaltyAmountSui = mSendObjectMap[
    selectedMsendCoinType
  ].currentPenaltySui.times(claimAmount || 0);

  // Submit
  const [isSubmitting_claim, setIsSubmitting_claim] = useState<boolean>(false);
  const [isSubmitting_claimAndDeposit, setIsSubmitting_claimAndDeposit] =
    useState<boolean>(false);

  const submitButtonState_claim: SubmitButtonState = useMemo(() => {
    if (isSubmitting_claim) return { isLoading: true, isDisabled: true };

    if (new BigNumber(claimAmount || 0).lte(0))
      return { title: "Enter an amount", isDisabled: true };
    if (new BigNumber(claimAmount).gt(mSendBalance))
      return { title: "Insufficient mSEND balance", isDisabled: true };

    if (suiBalance.lt(SUI_GAS_MIN))
      return {
        title: `${SUI_GAS_MIN} SUI should be saved for gas`,
        isDisabled: true,
      };
    if (suiBalance.lt(claimPenaltyAmountSui))
      return {
        title: "Insufficient SUI balance to pay penalty",
        isDisabled: true,
      };

    return {
      title: "Claim SEND",
      isDisabled: isSubmitting_claimAndDeposit,
    };
  }, [
    isSubmitting_claim,
    claimAmount,
    mSendBalance,
    suiBalance,
    claimPenaltyAmountSui,
    isSubmitting_claimAndDeposit,
  ]);

  const submitButtonState_claimAndDeposit: SubmitButtonState = useMemo(() => {
    if (isSubmitting_claimAndDeposit)
      return { isLoading: true, isDisabled: true };

    return {
      title: "Claim and Deposit SEND",
      isDisabled: submitButtonState_claim.isDisabled || isSubmitting_claim,
    };
  }, [
    isSubmitting_claimAndDeposit,
    submitButtonState_claim.isDisabled,
    isSubmitting_claim,
  ]);

  const submit = async (isDepositing: boolean) => {
    if (!address) return;

    if (isDepositing) {
      if (submitButtonState_claimAndDeposit.isDisabled) return;
    } else {
      if (submitButtonState_claim.isDisabled) return;
    }

    const setIsSubmitting = isDepositing
      ? setIsSubmitting_claimAndDeposit
      : setIsSubmitting_claim;
    setIsSubmitting(true);

    const transaction = new Transaction();
    try {
      await claimSend(
        suiClient,
        suilendClient,
        address,
        claimAmount,
        selectedMsendCoinType,
        false,
        isDepositing,
        transaction,
        obligationOwnerCap?.id,
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_SEND_COINTYPE,
        ...sendCoinMetadataMap[NORMALIZED_SEND_COINTYPE],
      });

      toast.success(
        [
          "Claimed",
          balanceChange !== undefined
            ? formatToken(balanceChange, {
                dp: sendCoinMetadataMap[NORMALIZED_SEND_COINTYPE].decimals,
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
        duration: TX_TOAST_DURATION,
      });
    } finally {
      setIsSubmitting(false);
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
          !ssuiDepositedAmount.gte(0) && "pointer-events-none opacity-50",
        )}
      >
        <div className="flex w-full flex-col gap-4">
          {/* Select mSEND */}
          {mSendCoinTypesWithBalance.length > 1 && <MsendDropdownMenu />}

          {/* Input */}
          <div className="relative flex w-full flex-col">
            <div className="relative z-[2] w-full">
              <div className="absolute left-3 top-1/2 z-[2] -translate-y-2/4">
                <Button
                  className={cn(
                    useMaxAmount &&
                      "border-secondary bg-secondary/5 disabled:opacity-100",
                  )}
                  labelClassName={cn(
                    "uppercase",
                    useMaxAmount && "text-primary-foreground",
                  )}
                  variant="secondaryOutline"
                  onClick={() =>
                    setClaimAmount(
                      mSendBalance.toFixed(
                        mSendCoinMetadataMap[selectedMsendCoinType].decimals,
                        BigNumber.ROUND_DOWN,
                      ),
                    )
                  }
                  disabled={useMaxAmount}
                  style={{
                    width: `${MAX_BUTTON_WIDTH}px`,
                    height: `${MAX_BUTTON_HEIGHT}px`,
                  }}
                >
                  Max
                </Button>
              </div>

              <Input
                className="relative z-[1] border-primary bg-card px-0 py-0 text-right text-2xl"
                type="number"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                style={{
                  height: `${INPUT_HEIGHT}px`,
                  paddingLeft: `${3 * 4 + MAX_BUTTON_WIDTH + 3 * 4}px`,
                  paddingRight: `${3 * 4 + mSendCoinMetadataMap[selectedMsendCoinType].symbol.length * 14.4 + 3 * 4}px`,
                }}
                step="any"
              />

              <div
                className="absolute right-3 top-0 z-[2] flex flex-col items-end justify-center"
                style={{ height: `${INPUT_HEIGHT}px` }}
              >
                <TBody className="text-right text-2xl">
                  {mSendCoinMetadataMap[selectedMsendCoinType].symbol}
                </TBody>
              </div>
            </div>

            <div className="relative z-[1] -mt-2 flex flex-row items-center justify-between rounded-b-md bg-primary/25 px-4 pb-2 pt-4">
              <TBodySans className="text-muted-foreground">Claimable</TBodySans>

              <div className="flex flex-row items-center gap-2">
                <SendTokenLogo className="h-5 w-5" />
                <TBody className="text-[16px]">
                  {formatToken(mSendBalance, {
                    dp: sendCoinMetadataMap[NORMALIZED_SEND_COINTYPE].decimals,
                  })}
                </TBody>
              </div>
            </div>
          </div>

          {/* Penalty */}
          <div className="flex w-full flex-row justify-between gap-4">
            <TBodySans className="text-muted-foreground">Penalty</TBodySans>

            <div className="flex flex-col items-end gap-1">
              <div className="flex flex-row items-center gap-2">
                <TokenLogo className="h-4 w-4" token={suiReserve.token} />
                <Tooltip
                  title={`${formatToken(claimPenaltyAmountSui, {
                    dp: SUI_DECIMALS,
                  })} SUI`}
                >
                  <TBody
                    className={cn(
                      "decoration-foreground/50",
                      hoverUnderlineClassName,
                    )}
                  >
                    {formatToken(claimPenaltyAmountSui, { exact: false })}
                    {" SUI"}
                  </TBody>
                </Tooltip>
              </div>
              <TLabel>
                {formatUsd(claimPenaltyAmountSui.times(suiReserve.price))}
              </TLabel>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex w-full flex-col gap-px">
          {/* Claim */}
          <SubmitButton
            className="rounded-b-none"
            labelClassName="uppercase"
            state={submitButtonState_claim}
            submit={() => submit(false)}
          />

          {/* Claim and deposit */}
          <SubmitButton
            className="min-h-9 rounded-t-none py-1"
            labelClassName="uppercase text-sm"
            variant="secondary"
            state={submitButtonState_claimAndDeposit}
            submit={() => submit(true)}
          />
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

  const {
    mSendObjectMap,
    mSendCoinMetadataMap,
    userAllocations,
    selectedMsendCoinType,
  } = useLoadedSendContext();

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

  const hasSendPointsToRedeem =
    !!sendPointsAllocation.userEligibleSend?.gte(minMsendAmount) &&
    Date.now() < mSEND_REDEMPTION_END_TIMESTAMP_MS;
  const hasSuilendCapsulesToRedeem =
    !!suilendCapsulesAllocation.userEligibleSend?.gte(minMsendAmount) &&
    Date.now() < mSEND_REDEMPTION_END_TIMESTAMP_MS;
  const hasRootletsToRedeem =
    !!rootletsAllocation.userEligibleSend?.gte(minMsendAmount);

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
    (Date.now() < mSEND_REDEMPTION_END_TIMESTAMP_MS || hasRootletsToRedeem)
      ? Tab.REDEEM
      : Tab.CLAIM;

  // Penalty
  const suiReserve = data.reserveMap[NORMALIZED_SUI_COINTYPE];

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center gap-12 py-16 md:py-20">
      <SectionHeading id="claim">Claim</SectionHeading>

      {userAllocations === undefined ? (
        <Skeleton className="h-80 w-full max-w-[480px] rounded-md" />
      ) : (
        <>
          <Card className="rounded-md">
            {/* Tabs */}
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
                  rootletsAllocation={rootletsAllocation}
                  hasSendPointsToRedeem={hasSendPointsToRedeem}
                  hasSuilendCapsulesToRedeem={hasSuilendCapsulesToRedeem}
                  hasRootletsToRedeem={hasRootletsToRedeem}
                  totalRedeemableMsend={totalRedeemableMsend}
                  totalAllocationBreakdownMaps={totalAllocationBreakdownMaps}
                />
              )}
              {selectedTab === Tab.CLAIM && <ClaimTabContent />}
            </div>
          </Card>

          {selectedTab === Tab.CLAIM &&
            mSendObjectMap[selectedMsendCoinType].currentPenaltySui.gt(0) && (
              <div className="flex w-full flex-col gap-4">
                <TBody className="text-[16px]">PENALTY</TBody>

                <div className="flex w-full flex-col gap-3">
                  {/* Penalty ends in */}
                  {Date.now() <
                    +mSendObjectMap[selectedMsendCoinType].penaltyEndTimeS *
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
                              +mSendObjectMap[selectedMsendCoinType]
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
                                  +mSendObjectMap[selectedMsendCoinType]
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
                        <TokenLogo
                          className="h-4 w-4"
                          token={suiReserve.token}
                        />
                        <TBody>
                          <Tooltip
                            title={`${formatToken(
                              mSendObjectMap[selectedMsendCoinType]
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
                                mSendObjectMap[selectedMsendCoinType]
                                  .currentPenaltySui,
                                { exact: false },
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
                            selectedMsendCoinType
                          ].currentPenaltySui.times(suiReserve.price),
                        )}
                        {" / SEND"}
                      </TLabel>
                    </div>
                  </div>
                </div>

                <PenaltyLineChart mSendCoinType={selectedMsendCoinType} />
              </div>
            )}
        </>
      )}
    </div>
  );
}
