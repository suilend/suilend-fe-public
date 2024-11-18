import Image from "next/image";
import { useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import PointsIcon from "@/components/points/PointsIcon";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody, TTitle } from "@/components/shared/Typography";
import { cn } from "@/lib/utils";

import styles from "./DropSourceCard.module.scss";

function DropSourceCard({ eligible }: { eligible?: boolean }) {
  const [flip, setFlip] = useState(false);

  return (
    <div
      onClick={() => setFlip(!flip)}
      className={cn(
        "h-[300px] w-[250px] cursor-pointer",
        flip ? styles.dead : styles.live,
      )}
    >
      <div className={cn("relative h-full w-full", styles.flipCardInner)}>
        <div
          className={cn(
            styles.front,
            "absolute h-full w-full overflow-hidden rounded-lg",
          )}
        >
          <div className="border-line flex h-full w-full flex-col items-center gap-6 border bg-background p-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <PointsIcon />
                <TTitle>50</TTitle>
              </div>
              <ChevronDown />
            </div>
            <Image
              src="https://pbs.twimg.com/profile_images/1814512450823507968/3tdxrI4o_400x400.jpg"
              alt="Send banner"
              width={100}
              height={100}
            />
            <div className="gap-6">Rootlet 3</div>
          </div>
        </div>
        <div
          className={cn(
            styles.back,
            "absolute h-full w-full overflow-hidden rounded-lg",
          )}
        >
          <div className="border-line flex h-full w-full flex-col items-center gap-6 border bg-card p-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <TTitle>Rootlets 3</TTitle>
              </div>
              <ChevronUp />
            </div>
            <TBody>
              Rootlets are unique, living NFTs that evolve with your collection,
              offering rare bonuses and dynamic visual changes.
            </TBody>

            <div className="divide-line flex w-full flex-col divide-y divide-solid">
              <LabelWithValue
                label="Expiry"
                value="6 months"
                horizontal
                className="my-2"
              />

              <LabelWithValue
                label="Allocation"
                value="50 SEND"
                className="my-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DropSourceCard;
