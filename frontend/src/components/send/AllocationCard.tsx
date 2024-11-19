import Image from "next/image";
import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import { useWalletContext } from "@suilend/frontend-sui";

import styles from "@/components/send/AllocationCard.module.scss";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

export default function AllocationCard() {
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
              "absolute inset-0 flex flex-col overflow-hidden rounded-sm border bg-card p-4",
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
                alt="Rootlets"
                width={80}
                height={80}
              />
              <TBodySans>Rootlets 3</TBodySans>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              styles.back,
              "absolute inset-0 flex flex-col justify-between overflow-hidden rounded-sm border bg-card p-4",
            )}
          >
            <div className="flex w-full flex-col gap-3">
              {/* Header */}
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-2">
                  <Image
                    src="https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg"
                    alt="Rootlets"
                    width={20}
                    height={20}
                  />
                  <TBodySans>Rootlets 3</TBodySans>
                </div>

                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Description */}
              <TLabelSans>
                Rootlets are unique, living NFTs that evolve with your
                collection, offering rare bonuses and dynamic visual changes.
              </TLabelSans>
            </div>

            <div className="flex w-full flex-col gap-2">
              <LabelWithValue label="Expires" value="6 months" horizontal />
              <LabelWithValue label="Allocation" value="50 SEND" horizontal />
            </div>
          </div>
        </div>
      </button>
    </AspectRatio>
  );
}
