import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import BigNumber from "bignumber.js";
import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

import { useWalletContext } from "@suilend/frontend-sui";

import styles from "@/components/send/AllocationCard.module.scss";
import {
  Allocation,
  SEND_TOTAL_SUPPLY,
} from "@/components/send/AllocationCardsSection";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { formatToken } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AllocationCardProps {
  allocation: Allocation;
}

export default function AllocationCard({ allocation }: AllocationCardProps) {
  const { address } = useWalletContext();

  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  return (
    <AspectRatio ratio={1}>
      <button
        className={cn("h-full w-full text-left", isFlipped && styles.flipped)}
        onClick={() => setIsFlipped((is) => !is)}
        style={{ perspective: "1000px" }}
      >
        <div className={cn("relative h-full w-full", styles.cardInner)}>
          {/* Front */}
          <div
            className={cn(
              styles.front,
              "absolute inset-0 flex flex-col overflow-hidden rounded-lg border bg-card p-4",
            )}
          >
            {/* Header */}
            <div className="flex w-full flex-row items-center justify-between">
              {address ? (
                <div className="flex flex-row items-center gap-2">
                  <SendTokenLogo />
                  <TBodySans>50</TBodySans>
                </div>
              ) : (
                <div />
              )}

              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <Image
                className="h-20 w-20 md:h-24 md:w-24"
                src="https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg"
                alt={allocation.title}
                width={80}
                height={80}
              />
              <div className="flex flex-row items-center gap-2">
                <TBodySans>{allocation.title}</TBodySans>
                {allocation.cta && (
                  <Link
                    className="flex"
                    target="_blank"
                    href={allocation.cta.href}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    <Button
                      className="px-1.5"
                      labelClassName="text-xs font-sans"
                      endIcon={<ArrowUpRight />}
                      variant="secondary"
                      size="sm"
                    >
                      {allocation.cta.title}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-lg border bg-card p-4",
            )}
          >
            <div className="flex w-full flex-col gap-3">
              {/* Header */}
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-2">
                  <Image
                    src="https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg"
                    alt={allocation.title}
                    width={20}
                    height={20}
                  />
                  <TBodySans>{allocation.title}</TBodySans>
                </div>

                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Description */}
              <TLabelSans>{allocation.description}</TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-3">
              <LabelWithValue
                label="Total allocation"
                valueClassName="gap-2"
                value={formatToken(
                  new BigNumber(SEND_TOTAL_SUPPLY)
                    .times(allocation.totalAllocationPercent)
                    .div(100),
                  { exact: false },
                )}
                valueEndDecorator={<SendTokenLogo />}
                horizontal
              />
              <LabelWithValue
                label="Eligible wallets"
                valueClassName="uppercase"
                value={allocation.eligibleWallets}
                horizontal
              />
            </div>
          </div>
        </div>
      </button>
    </AspectRatio>
  );
}
