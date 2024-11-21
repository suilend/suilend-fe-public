import BigNumber from "bignumber.js";

import { useWalletContext } from "@suilend/frontend-sui";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import { formatToken } from "@/lib/format";
import { Allocation, SEND_TOTAL_SUPPLY } from "@/pages/send";

import { TBody, TBodySans, TDisplay } from "../shared/Typography";

interface HeroSectionProps {
  allocations: Allocation[];
}

export default function HeroSection({ allocations }: HeroSectionProps) {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();

  // Snapshots
  const allocationsWithSnapshotsTaken = allocations.filter(
    (allocation) => allocation.snapshotTaken,
  );

  // User
  const userAllocationPercent = allocations.reduce(
    (acc, allocation) =>
      acc.plus(
        allocation.snapshotTaken && allocation.allocationPercent !== undefined
          ? allocation.allocationPercent
          : 0,
      ),
    new BigNumber(0),
  );

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <SectionHeading>
        {!address ? (
          <>
            {"Connect your wallet to check your "}
            <SendTokenLogo className="mr-3 inline-block h-8 w-8 md:mr-4 md:h-10 md:w-10" />
            {"SEND allocation"}
          </>
        ) : (
          <>
            {allocationsWithSnapshotsTaken.length === allocations.length
              ? "Your allocation is"
              : "Your current allocation is"}
          </>
        )}
      </SectionHeading>

      <div className="flex w-full flex-col items-center gap-4">
        {!address ? (
          <Button
            className="h-16 w-[240px] px-10"
            labelClassName="uppercase text-[16px]"
            size="lg"
            onClick={() => setIsConnectWalletDropdownOpen(true)}
          >
            Connect wallet
          </Button>
        ) : (
          <div className="flex h-16 min-w-[240px] flex-row items-center justify-center gap-4 rounded-md border border-primary bg-primary/10 px-8">
            <SendTokenLogo className="h-8 w-8" />
            <TDisplay className="text-lg">
              {formatToken(
                new BigNumber(SEND_TOTAL_SUPPLY).times(
                  userAllocationPercent.div(100),
                ),
                { exact: false },
              )}{" "}
              SEND
            </TDisplay>
          </div>
        )}

        <TBodySans className="text-muted-foreground">
          Snapshots taken: {allocationsWithSnapshotsTaken.length} /{" "}
          {allocations.length}
        </TBodySans>
      </div>
    </div>
  );
}
