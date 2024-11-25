import BigNumber from "bignumber.js";

import { useWalletContext } from "@suilend/frontend-sui";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import { TDisplay } from "@/components/shared/Typography";
import { formatToken } from "@/lib/format";
import { Allocation, SEND_TOTAL_SUPPLY } from "@/pages/send";

interface HeroSectionProps {
  allocations: Allocation[];
}

export default function HeroSection({ allocations }: HeroSectionProps) {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();

  // User
  const userAllocationPercent = allocations.reduce(
    (acc, allocation) => acc.plus(allocation.userAllocationPercent ?? 0),
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
          "Your current allocation is"
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
          <div className="flex h-[72px] min-w-[300px] flex-row items-center justify-center gap-5 rounded-md border border-primary bg-[#0E1932] px-8">
            <SendTokenLogo className="h-10 w-10" />
            <TDisplay className="text-3xl">
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
      </div>
    </div>
  );
}
