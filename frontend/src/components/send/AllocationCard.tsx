import Link from "next/link";
import { PropsWithChildren, useState } from "react";

import BigNumber from "bignumber.js";
import { ArrowUpRight, Info } from "lucide-react";

import styles from "@/components/send/AllocationCard.module.scss";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody, TBodySans, TDisplay } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Separator } from "@/components/ui/separator";
import useBreakpoint from "@/hooks/useBreakpoint";
import { formatToken } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Allocation, AssetType, SEND_TOTAL_SUPPLY } from "@/pages/send";

interface StatusProps {
  allocation: Allocation;
}

function Status({ allocation }: StatusProps) {
  const isEligible =
    allocation.userAllocationPercent !== undefined &&
    allocation.userAllocationPercent.gt(0);
  const isIneligible =
    allocation.userAllocationPercent !== undefined &&
    allocation.userAllocationPercent.eq(0);

  const isSnapshotTaken = allocation.snapshotTaken === true;
  const isSnapshotNotTaken = allocation.snapshotTaken === false;

  return (
    (isEligible || isIneligible || isSnapshotTaken || isSnapshotNotTaken) && (
      <div
        className={cn(
          "relative z-[1] -mb-2 flex h-11 w-full flex-row items-center rounded-t-md px-4 pb-2",
          isEligible
            ? "justify-between bg-[#5DF886]"
            : cn(
                "justify-center",
                isSnapshotNotTaken ? "bg-[#8FDCF4]" : "bg-[#192A3A]",
              ),
        )}
      >
        {isEligible ? (
          <>
            <TBody className="text-[#030917]">Eligible</TBody>
            <div className="flex flex-row items-center gap-1.5">
              <SendTokenLogo />
              <TBody className="text-[16px] text-[#030917]">
                {formatToken(
                  new BigNumber(SEND_TOTAL_SUPPLY).times(
                    allocation.userAllocationPercent!.div(100),
                  ),
                  { exact: false },
                )}
              </TBody>
            </div>
          </>
        ) : (
          <TBody
            className={cn(
              isSnapshotNotTaken ? "text-[#030917]" : "text-[#8FDCF4]",
            )}
          >
            {isIneligible
              ? "Not eligible"
              : isSnapshotTaken
                ? "Snapshot taken"
                : "Snapshot not taken"}
          </TBody>
        )}
      </div>
    )
  );
}

interface CtaButtonProps {
  allocation: Allocation;
}

function CtaButton({ allocation }: CtaButtonProps) {
  return (
    allocation.cta &&
    !allocation.snapshotTaken && (
      <Link
        className="flex"
        target="_blank"
        href={allocation.cta!.href}
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
          {allocation.cta!.title}
        </Button>
      </Link>
    )
  );
}

function Wrapper({ children }: PropsWithChildren) {
  const { sm } = useBreakpoint();

  return sm ? (
    <AspectRatio ratio={sm ? 280 / 396 : 1}>{children}</AspectRatio>
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

  const isIneligible =
    allocation.userAllocationPercent !== undefined &&
    allocation.userAllocationPercent.eq(0);

  return (
    <Wrapper>
      <button
        className={cn(
          "group h-full w-full text-left",
          isFlipped && styles.flipped,
        )}
        onClick={() => setIsFlipped((is) => !is)}
        style={{ perspective: "1000px" }}
      >
        <div className={cn("relative h-full w-full", styles.cardInner)}>
          {/* Front */}
          <div
            className={cn(
              styles.front,
              "absolute inset-0 flex flex-col",
              isIneligible &&
                "opacity-50 transition-opacity group-hover:opacity-100",
            )}
          >
            <Status allocation={allocation} />

            <div className="relative z-[2] flex flex-1 flex-col rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-[#4F677E]">
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
                <div className="absolute right-4 top-4 z-[2] flex h-7 flex-col justify-center">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Icon */}
                <div
                  className="absolute inset-y-4 left-1/2 z-[1] w-full max-w-28 -translate-x-1/2"
                  style={{
                    backgroundImage: `url('${allocation.src}')`,
                    backgroundPosition: "center",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>

              <Separator className="bg-[#192A3A]" />

              {/* Bottom */}
              <div className="flex w-full flex-col gap-1 p-4">
                <TDisplay>{allocation.title}</TDisplay>

                {allocation.assetType && (
                  <TBodySans className="text-muted-foreground">
                    {assetTypeTitleMap[allocation.assetType]}
                  </TBodySans>
                )}
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 rounded-md border border-[#192A3A] bg-[#0D1221] transition-colors group-hover:border-[#4F677E]",
            )}
          >
            {/* TODO: Add Status */}

            <div className="flex h-full w-full flex-col justify-between gap-6 overflow-y-auto p-4">
              {/* Top */}
              <div className="flex w-full flex-col gap-3">
                {/* Title */}
                <TDisplay>{allocation.title}</TDisplay>

                {/* Description */}
                <TBodySans className="text-muted-foreground">
                  {allocation.description}
                </TBodySans>
              </div>

              {/* Bottom */}
              <div className="flex w-full flex-col gap-4">
                <div className="flex w-full flex-col gap-2.5">
                  <div className="flex w-full flex-col gap-1.5">
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
                        labelClassName="text-sm pl-1"
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
                        value={allocation.eligibleWallets}
                        horizontal
                      />
                    </>
                  )}

                  {allocation.snapshotTaken !== undefined && (
                    <>
                      <Separator className="bg-[#192A3A]" />
                      <LabelWithValue
                        labelClassName="text-sm"
                        label="Snapshot"
                        value={allocation.snapshotTaken ? "Taken" : "Not taken"}
                        horizontal
                      />
                    </>
                  )}
                </div>

                <CtaButton allocation={allocation} />
              </div>
            </div>
          </div>
        </div>
      </button>
    </Wrapper>
  );
}
