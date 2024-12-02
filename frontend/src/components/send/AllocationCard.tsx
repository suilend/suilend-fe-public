import Link from "next/link";
import { PropsWithChildren, useMemo, useRef, useState } from "react";

import BigNumber from "bignumber.js";
import { ArrowUpRight, Info } from "lucide-react";

import styles from "@/components/send/AllocationCard.module.scss";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TBodySans, TDisplay } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import useBreakpoint from "@/hooks/useBreakpoint";
import { formatToken } from "@/lib/format";
import { cn, hoverUnderlineClassName } from "@/lib/utils";
import {
  Allocation,
  AllocationId,
  AssetType,
  SEND_TOTAL_SUPPLY,
} from "@/pages/send";

interface StatusProps {
  allocation: Allocation;
}

function Status({ allocation }: StatusProps) {
  const isEligible = allocation.userAllocationPercent?.gt(0);
  const isNotEligible = useMemo(
    () => allocation.snapshotTaken && allocation.userAllocationPercent?.eq(0),
    [allocation.snapshotTaken, allocation.userAllocationPercent],
  );

  return (
    <div
      className={cn(
        "relative z-[1] -mb-2 flex h-11 w-full flex-row items-center rounded-t-md px-4 pb-2",
        isEligible
          ? "justify-between bg-[#5DF886]"
          : cn(
              "justify-center",
              !allocation.snapshotTaken ? "bg-[#8FDCF4]" : "bg-[#192A3A]",
            ),
      )}
    >
      {isEligible ? (
        <>
          <TBody className="uppercase text-[#030917]">Eligible</TBody>
          <div className="flex flex-row items-center gap-1.5">
            <SendTokenLogo className="rounded-[50%] bg-[#020818] outline outline-[0.5px] outline-[#020818]" />
            <Tooltip
              title={
                allocation.id === AllocationId.SEND_POINTS
                  ? "Allocation is an estimate since SEND Points are still ongoing"
                  : [
                        AllocationId.FUD,
                        AllocationId.AAA,
                        AllocationId.OCTO,
                        AllocationId.TISM,
                      ].includes(allocation.id)
                    ? "Allocation is an estimate since the final snapshot has not been taken yet"
                    : undefined
              }
            >
              <TBody
                className={cn(
                  "text-[16px] text-[#030917] decoration-[#030917]/50",
                  hoverUnderlineClassName,
                )}
              >
                {formatToken(
                  new BigNumber(SEND_TOTAL_SUPPLY).times(
                    allocation.userAllocationPercent!.div(100),
                  ),
                  { exact: false },
                )}
                {[
                  AllocationId.SEND_POINTS,
                  AllocationId.FUD,
                  AllocationId.AAA,
                  AllocationId.OCTO,
                  AllocationId.TISM,
                ].includes(allocation.id) && "*"}
              </TBody>
            </Tooltip>
          </div>
        </>
      ) : (
        <TBody
          className={cn(
            "uppercase",
            !allocation.snapshotTaken ? "text-[#030917]" : "text-[#8FDCF4]",
          )}
        >
          {!allocation.snapshotTaken
            ? "Snapshot not taken"
            : isNotEligible
              ? "Not eligible"
              : "Snapshot taken"}
        </TBody>
      )}
    </div>
  );
}

interface CtaButtonProps {
  allocation: Allocation;
}

function CtaButton({ allocation }: CtaButtonProps) {
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
  allocation: Allocation;
}

export default function AllocationCard({ allocation }: AllocationCardProps) {
  // State
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const assetTypeTitleMap: Record<AssetType, string> = {
    [AssetType.LENDING]: "Lending",
    [AssetType.NFT]: "NFT",
    [AssetType.TOKEN]: "Token",
    [AssetType.TRADING]: "Trading",
    [AssetType.POINTS]: "Points",
  };

  // Video
  const [isVideoPlaying, setIsVideoPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onCardMouseEnter = () => {
    setIsVideoPlaying(true);

    if (!videoRef.current) return;
    videoRef.current.play();
  };
  const onCardMouseLeave = () => {
    setIsVideoPlaying(false);

    setTimeout(() => {
      if (!videoRef.current) return;
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }, 300);
  };

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
        onTouchStart={onCardMouseEnter}
        onTouchEnd={onCardMouseLeave}
        style={{ perspective: "1000px" }}
      >
        <div className={cn("relative h-full w-full", styles.cardInner)}>
          {/* Front */}
          <div className={cn(styles.front, "absolute inset-0 flex flex-col")}>
            <Status allocation={allocation} />

            <div className="relative z-[2] flex flex-1 flex-col rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-secondary/25">
              {/* Top */}
              <div className="relative flex flex-1 flex-row items-center justify-center rounded-t-md bg-[#030917]">
                {/* Total allocation */}
                <div className="absolute left-4 top-4 z-[2] flex h-7 flex-row items-center gap-1.5 rounded-sm bg-[#202639] px-2">
                  <SendTokenLogo />
                  <TBody className="text-[16px]">
                    {formatToken(
                      new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.totalAllocationPercent.div(100),
                      ),
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
                  {allocation.hoverSrc && (
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
                      {assetTypeTitleMap[allocation.assetType]}
                    </TBodySans>
                  )}
                </div>

                <CtaButton allocation={allocation} />
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
                    valueClassName="gap-1.5 items-center"
                    valueStartDecorator={<SendTokenLogo />}
                    value={formatToken(
                      new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.totalAllocationPercent.div(100),
                      ),
                      { exact: false },
                    )}
                    horizontal
                  />
                  {allocation.totalAllocationBreakdown.map((breakdown) => (
                    <LabelWithValue
                      key={breakdown.title}
                      labelClassName="text-sm pl-1 items-center gap-2"
                      labelStartDecorator={
                        <div className="h-1 w-1 rounded-[50%] bg-muted" />
                      }
                      label={breakdown.title}
                      valueClassName="gap-1.5 items-center"
                      valueStartDecorator={<SendTokenLogo />}
                      value={formatToken(
                        new BigNumber(SEND_TOTAL_SUPPLY).times(
                          breakdown.percent.div(100),
                        ),
                        { exact: false },
                      )}
                      horizontal
                    />
                  ))}
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

                <Separator className="bg-[#192A3A]" />
                <LabelWithValue
                  labelClassName="text-sm"
                  label="Snapshot"
                  valueClassName="uppercase"
                  value={allocation.snapshotTaken ? "Taken" : "Not taken"}
                  horizontal
                />
              </div>
            </div>
          </div>
        </div>
      </button>
    </Wrapper>
  );
}
