import Link from "next/link";
import { PropsWithChildren, useMemo, useRef, useState } from "react";

import { ArrowUpRight, Info } from "lucide-react";

import { formatToken } from "@suilend/sui-fe";
import useIsTouchscreen from "@suilend/sui-fe-next/hooks/useIsTouchscreen";

import styles from "@/components/send/AllocationCard.module.scss";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody, TBodySans, TDisplay } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import useBreakpoint from "@/hooks/useBreakpoint";
import {
  ASSET_TYPE_NAME_MAP,
  AllocationIdS1,
  AllocationWithUserAllocation,
} from "@/lib/mSend";
import {
  S1_mSEND_REDEMPTION_END_TIMESTAMP_MS,
  SEND_TOTAL_SUPPLY,
  TGE_TIMESTAMP_MS,
} from "@/lib/send";
import { cn } from "@/lib/utils";

interface StatusProps {
  allocation: AllocationWithUserAllocation;
  isEligible?: boolean;
  isNotEligible?: boolean;
  hasRedeemedMsend?: boolean;
  hasBridgedMsend?: boolean;
}

function Status({
  allocation,
  isEligible,
  isNotEligible,
  hasRedeemedMsend,
  hasBridgedMsend,
}: StatusProps) {
  const getSnapshotNotTakenStatus = () => {
    if (Date.now() >= TGE_TIMESTAMP_MS) {
      if (
        allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
        allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1
      ) {
        return Date.now() < S1_mSEND_REDEMPTION_END_TIMESTAMP_MS
          ? "Redemptions open"
          : "Redemptions closed";
      }
      if (allocation.id === AllocationIdS1.SAVE) return "Conversions open";
      if (allocation.id === AllocationIdS1.ROOTLETS) return "Redemptions open";
    }

    return "Snapshot not taken";
  };

  return (
    <div
      className={cn(
        "relative z-[1] -mb-2 flex min-h-11 w-full flex-row items-center rounded-t-md px-4 pb-3.5 pt-1.5",
        isEligible || hasRedeemedMsend || hasBridgedMsend
          ? cn("justify-between", isEligible ? "bg-[#5DF886]" : "bg-[#1A4533]")
          : cn(
              "justify-center",
              !allocation.snapshotTaken ? "bg-secondary" : "bg-[#192A3A]",
            ),
      )}
    >
      {isEligible || hasRedeemedMsend || hasBridgedMsend ? (
        <>
          <TBody
            className={cn(
              isEligible ? "uppercase text-background" : "text-[#5DF886]",
            )}
          >
            {isEligible
              ? allocation.airdropSent &&
                allocation.id !== AllocationIdS1.ROOTLETS
                ? "Airdropped"
                : "Eligible"
              : hasRedeemedMsend
                ? "Redeemed"
                : "Bridged"}
          </TBody>

          <div className="flex flex-row items-center gap-2">
            <SendTokenLogo className="rounded-[50%] bg-background outline outline-[0.5px] outline-background" />
            <TBody
              className={cn(
                "text-[16px]",
                isEligible ? "text-background" : "text-[#5DF886]",
              )}
            >
              {formatToken(
                isEligible
                  ? allocation.userEligibleSend!
                  : hasRedeemedMsend
                    ? allocation.userRedeemedMsend!
                    : allocation.userBridgedMsend!,
                { exact: false },
              )}
            </TBody>
          </div>
        </>
      ) : (
        <TBody
          className={cn(
            "uppercase",
            !allocation.snapshotTaken ? "text-background" : "text-secondary",
          )}
        >
          {!allocation.snapshotTaken
            ? getSnapshotNotTakenStatus()
            : isNotEligible
              ? "Not eligible"
              : "Snapshot taken"}
        </TBody>
      )}
    </div>
  );
}

interface CtaButtonProps {
  allocation: AllocationWithUserAllocation;
  isEligible?: boolean;
}

function CtaButton({ allocation, isEligible }: CtaButtonProps) {
  const onRedeemClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    const claimSectionHeadingElement = document.getElementById("claim");
    if (!claimSectionHeadingElement) return;

    window.scrollTo({
      top: claimSectionHeadingElement.offsetTop - 40,
      behavior: "smooth",
    });
  };

  if (Date.now() >= TGE_TIMESTAMP_MS) {
    if (
      allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
      allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1
    ) {
      return Date.now() < S1_mSEND_REDEMPTION_END_TIMESTAMP_MS ? (
        isEligible ? (
          <Button
            className="h-10 w-full border-secondary text-primary-foreground"
            labelClassName="text-[16px]"
            variant="secondaryOutline"
            onClick={onRedeemClick}
          >
            REDEEM mSEND
          </Button>
        ) : (
          <div className="h-10 w-full max-sm:hidden" />
        )
      ) : (
        <div className="h-10 w-full max-sm:hidden" />
      );
    }
    if (allocation.id === AllocationIdS1.ROOTLETS) {
      return isEligible ? (
        <Button
          className="h-10 w-full border-secondary text-primary-foreground"
          labelClassName="text-[16px]"
          variant="secondaryOutline"
          onClick={onRedeemClick}
        >
          REDEEM mSEND
        </Button>
      ) : (
        <div className="h-10 w-full max-sm:hidden" />
      );
    }
  }

  return allocation.cta !== undefined && !allocation.snapshotTaken ? (
    <Link
      className="flex"
      target="_blank"
      href={allocation.cta.href}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Button
        className="h-10 w-full border-secondary text-primary-foreground"
        labelClassName="uppercase text-[16px]"
        endIcon={<ArrowUpRight className="h-4 w-4" />}
        variant="secondaryOutline"
      >
        {allocation.cta.title}
      </Button>
    </Link>
  ) : (
    <div className="h-10 w-full max-sm:hidden" />
  );
}

function Wrapper({ children }: PropsWithChildren) {
  const { sm } = useBreakpoint();

  return sm ? (
    <AspectRatio ratio={280 / 396}>{children}</AspectRatio>
  ) : (
    <div className="h-[320px] w-full">{children}</div>
  );
}

interface AllocationCardProps {
  allocation: AllocationWithUserAllocation;
}

export default function AllocationCard({ allocation }: AllocationCardProps) {
  const isTouchscreen = useIsTouchscreen();

  // State
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Video
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onCardMouseEnter = () => {
    if (isTouchscreen) return;

    setIsVideoPlaying(true);

    if (!videoRef.current) return;
    videoRef.current.play();
  };
  const onCardMouseLeave = () => {
    if (isTouchscreen) return;

    setIsVideoPlaying(false);
    setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }, 300);
  };

  // Status
  const isEligible = useMemo(
    () => allocation.userEligibleSend?.gt(0),
    [allocation.userEligibleSend],
  );
  const isNotEligible = useMemo(
    () => allocation.snapshotTaken && allocation.userEligibleSend?.eq(0),
    [allocation.snapshotTaken, allocation.userEligibleSend],
  );

  const hasRedeemedMsend = useMemo(
    () => allocation.userRedeemedMsend?.gt(0),
    [allocation.userRedeemedMsend],
  );
  const hasBridgedMsend = useMemo(
    () => allocation.userBridgedMsend?.gt(0),
    [allocation.userBridgedMsend],
  );

  return (
    <Wrapper>
      <button
        className={cn(
          "group h-full w-full text-left",
          isFlipped && styles.flipped,
        )}
        onClick={() => setIsFlipped((is) => !is)}
        onMouseEnter={onCardMouseEnter}
        onMouseLeave={onCardMouseLeave}
        style={{ perspective: "1000px" }}
      >
        <div className={cn("relative h-full w-full", styles.cardInner)}>
          {/* Front */}
          <div className={cn(styles.front, "absolute inset-0 flex flex-col")}>
            <Status
              allocation={allocation}
              isEligible={isEligible}
              isNotEligible={isNotEligible}
              hasRedeemedMsend={hasRedeemedMsend}
              hasBridgedMsend={hasBridgedMsend}
            />

            <div className="relative z-[2] flex flex-1 flex-col rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-secondary/25">
              {/* Top */}
              <div className="relative flex flex-1 flex-row items-center justify-center rounded-t-md bg-background">
                {/* Total allocation */}
                <div className="absolute left-4 top-4 z-[2] flex h-7 flex-row items-center gap-2 rounded-sm bg-muted/15 px-2 backdrop-blur-md">
                  <SendTokenLogo />
                  <TBody className="text-[16px]">
                    {formatToken(
                      allocation.totalAllocationPercent
                        .times(SEND_TOTAL_SUPPLY)
                        .div(100),
                      { exact: false },
                    )}
                  </TBody>
                </div>

                {/* Info */}
                <div className="flex-column absolute right-4 top-4 z-[2] flex h-7 justify-center">
                  <Info className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>

                {/* Image/video */}
                <div className="absolute inset-y-0 left-1/2 z-[1] flex w-full max-w-28 -translate-x-1/2 flex-row items-center justify-center">
                  {/* Image */}
                  <div
                    className="absolute inset-0 z-[1]"
                    style={{
                      backgroundImage: `url('${allocation.src}')`,
                      backgroundPosition: "center",
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                    }}
                  />

                  {/* Video */}
                  {allocation.hoverSrc && !isTouchscreen && (
                    <video
                      ref={videoRef}
                      className={cn(
                        "relative z-[2] h-full w-full transition-opacity",
                        isVideoPlaying ? "opacity-100" : "opacity-0",
                      )}
                      controls={false}
                      loop
                      muted
                      playsInline
                      disablePictureInPicture
                      disableRemotePlayback
                    >
                      <source src={allocation.hoverSrc} type="video/mp4" />
                    </video>
                  )}
                </div>
              </div>

              <Separator className="bg-[#192A3A]" />

              {/* Bottom */}
              <div className="flex w-full flex-col gap-4 p-4">
                <div className="flex w-full flex-col gap-1">
                  <TDisplay className="uppercase">{allocation.title}</TDisplay>

                  {allocation.assetType && (
                    <TBodySans className="text-muted-foreground">
                      {ASSET_TYPE_NAME_MAP[allocation.assetType]}
                    </TBodySans>
                  )}
                </div>

                <CtaButton allocation={allocation} isEligible={isEligible} />
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-secondary/25",
            )}
          >
            <div className="flex h-full w-full flex-col justify-between gap-6 overflow-y-auto p-4">
              {/* Top */}
              <div className="flex w-full flex-col gap-3">
                {/* Title */}
                <TDisplay className="uppercase">{allocation.title}</TDisplay>

                {/* Description */}
                <TBodySans className="text-muted-foreground">
                  {allocation.description}
                </TBodySans>
              </div>

              {/* Bottom */}
              <div className="flex w-full flex-col gap-3">
                <div className="flex w-full flex-col gap-2">
                  <LabelWithValue
                    labelClassName="text-sm"
                    label="Total allocation"
                    valueClassName="gap-2 items-center"
                    valueStartDecorator={<SendTokenLogo />}
                    value={formatToken(
                      allocation.totalAllocationPercent
                        .times(SEND_TOTAL_SUPPLY)
                        .div(100),
                      { exact: false },
                    )}
                    horizontal
                  />
                  {Object.values(allocation.totalAllocationBreakdownMap).map(
                    (breakdown) => (
                      <LabelWithValue
                        key={breakdown.title}
                        labelClassName="text-sm pl-1 gap-2"
                        labelStartDecorator={
                          <div className="h-1 w-1 rounded-[50%] bg-muted" />
                        }
                        label={breakdown.title}
                        valueClassName="gap-2 items-center"
                        valueStartDecorator={<SendTokenLogo />}
                        value={formatToken(
                          breakdown.percent.times(SEND_TOTAL_SUPPLY).div(100),
                          { exact: false },
                        )}
                        horizontal
                      />
                    ),
                  )}
                </div>

                {allocation.eligibleWallets !== undefined && (
                  <>
                    <Separator className="bg-[#192A3A]" />
                    <LabelWithValue
                      labelClassName="text-sm"
                      label="Eligible wallets"
                      valueClassName="uppercase"
                      value={allocation.eligibleWallets}
                      horizontal
                    />
                  </>
                )}

                {!(
                  Date.now() >= TGE_TIMESTAMP_MS &&
                  (allocation.id === AllocationIdS1.SEND_POINTS_S1 ||
                    allocation.id === AllocationIdS1.SUILEND_CAPSULES_S1 ||
                    allocation.id === AllocationIdS1.SAVE ||
                    allocation.id === AllocationIdS1.ROOTLETS)
                ) && (
                  <>
                    <Separator className="bg-[#192A3A]" />
                    <LabelWithValue
                      labelClassName="text-sm"
                      label="Snapshot"
                      valueClassName="uppercase"
                      value={allocation.snapshotTaken ? "Taken" : "Not taken"}
                      horizontal
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </Wrapper>
  );
}
