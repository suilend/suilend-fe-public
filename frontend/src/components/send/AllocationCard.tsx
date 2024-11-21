import Image from "next/image";
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

interface AllocationCardCtaButtonProps {
  allocation: Allocation;
}

function AllocationCardCtaButton({ allocation }: AllocationCardCtaButtonProps) {
  return (
    <Link
      className="flex"
      target="_blank"
      href={allocation.cta!.href}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <Button
        className="w-full border-secondary text-primary-foreground"
        labelClassName="uppercase"
        endIcon={<ArrowUpRight />}
        variant="secondaryOutline"
      >
        {allocation.cta!.title}
      </Button>
    </Link>
  );
}

function Wrapper({ children }: PropsWithChildren) {
  const { sm } = useBreakpoint();

  return sm ? (
    <AspectRatio ratio={sm ? 3 / 4 : 1}>{children}</AspectRatio>
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
    [AssetType.NFT]: "NFT",
    [AssetType.TOKEN]: "Token",
    [AssetType.POINTS]: "Points",
  };

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
              "absolute inset-0 rounded-md border border-secondary/15 bg-secondary/5",
              allocation.snapshotTaken &&
                allocation.allocationPercent?.eq(0) &&
                "opacity-50 transition-opacity group-hover:opacity-100",
            )}
          >
            <div className="flex h-full w-full flex-col">
              {/* Status */}
              <div
                className={cn(
                  "-mb-2 flex h-12 w-full flex-row items-center rounded-t-[5px] bg-secondary/15 px-4 pb-2",
                  allocation.snapshotTaken &&
                    allocation.allocationPercent?.gt(0) &&
                    "justify-between bg-[#5DF886]",
                )}
              >
                {!(
                  allocation.snapshotTaken &&
                  allocation.allocationPercent?.gt(0)
                ) ? (
                  <TBody className="text-secondary">
                    {!allocation.snapshotTaken
                      ? "Snapshot not taken"
                      : allocation.allocationPercent === undefined
                        ? "TBC"
                        : "Not eligible"}
                  </TBody>
                ) : (
                  <>
                    <TBody className="text-background">Eligible</TBody>
                    <div className="flex flex-row items-center gap-2">
                      <SendTokenLogo />
                      <TBody className="text-background">
                        {formatToken(
                          new BigNumber(SEND_TOTAL_SUPPLY).times(
                            allocation.allocationPercent.div(100),
                          ),
                          { exact: false },
                        )}
                      </TBody>
                    </div>
                  </>
                )}
              </div>

              {/* Top */}
              <div className="relative flex flex-1 flex-row items-center justify-center overflow-hidden rounded-t-md bg-background">
                {/* Total allocation */}
                {allocation.totalAllocationPercent !== undefined && (
                  <div className="absolute left-4 top-4 z-[2] flex flex-row items-center gap-2">
                    <SendTokenLogo />
                    <TBody>
                      {formatToken(
                        new BigNumber(SEND_TOTAL_SUPPLY).times(
                          allocation.totalAllocationPercent.div(100),
                        ),
                        { exact: false },
                      )}
                    </TBody>
                  </div>
                )}

                {/* Icon */}
                <Image
                  className="absolute left-[50%] top-[50%] z-[1] -ml-14 -mt-14 h-28 w-28"
                  src="https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg"
                  alt={allocation.title}
                  width={112}
                  height={112}
                />
              </div>

              {/* Bottom */}
              <div className="flex w-full flex-col gap-4 p-4">
                <div className="flex w-full flex-col gap-1">
                  <div className="flex w-full flex-row items-center justify-between gap-2">
                    <TDisplay className="flex-1">{allocation.title}</TDisplay>
                    <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>

                  {allocation.assetType && (
                    <TBodySans className="text-muted-foreground">
                      {assetTypeTitleMap[allocation.assetType]}
                    </TBodySans>
                  )}
                </div>

                {allocation.cta && (
                  <AllocationCardCtaButton allocation={allocation} />
                )}
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 rounded-md border border-secondary/15 bg-secondary/5",
            )}
          >
            <div className="flex h-full w-full flex-col justify-between gap-6 overflow-y-auto p-4">
              {/* Top */}
              <div className="flex w-full flex-col gap-3">
                {/* Title */}
                <TDisplay>{allocation.title}</TDisplay>

                {/* Description */}
                <TBodySans className="text-muted-foreground">
                  Rootlets are unique, living NFTs that evolve with your
                  collection, offering rare bonuses and dynamic visual changes.
                </TBodySans>
              </div>

              {/* Bottom */}
              <div className="flex w-full flex-col gap-4">
                <Separator className="bg-secondary/15" />

                <div className="flex w-full flex-col gap-3">
                  <LabelWithValue
                    labelClassName="text-sm"
                    label="Total allocation"
                    valueClassName="gap-2 items-center"
                    valueStartDecorator={<SendTokenLogo />}
                    value={formatToken(
                      new BigNumber(SEND_TOTAL_SUPPLY).times(
                        allocation.totalAllocationPercent.div(100),
                      ),
                      { exact: false },
                    )}
                    horizontal
                  />

                  <LabelWithValue
                    labelClassName="text-sm"
                    label="Eligible wallets"
                    value={allocation.eligibleWallets}
                    horizontal
                  />

                  <LabelWithValue
                    labelClassName="text-sm"
                    label="Snapshot"
                    value={allocation.snapshotTaken ? "Taken" : "Not taken"}
                    horizontal
                  />
                </div>

                {allocation.cta && (
                  <AllocationCardCtaButton allocation={allocation} />
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    </Wrapper>
  );
}
