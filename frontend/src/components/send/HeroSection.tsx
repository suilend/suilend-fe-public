import { useRouter } from "next/router";

import BigNumber from "bignumber.js";
import { cloneDeep } from "lodash";
import { VenetianMask } from "lucide-react";

import {
  WalletContextQueryParams,
  shallowPushQuery,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenLogo from "@/components/send/SendTokenLogo";
import Button from "@/components/shared/Button";
import Tooltip from "@/components/shared/Tooltip";
import { TBodySans, TDisplay } from "@/components/shared/Typography";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAddress, formatToken } from "@/lib/format";
import { Allocation, SEND_TOTAL_SUPPLY } from "@/pages/send";

interface HeroSectionProps {
  allocations: Allocation[];
  isLoading: boolean;
}

export default function HeroSection({
  allocations,
  isLoading,
}: HeroSectionProps) {
  const router = useRouter();

  const { isImpersonating, setIsConnectWalletDropdownOpen, address } =
    useWalletContext();

  // Impersonation mode
  const onImpersonationModeBannerClick = () => {
    const restQuery = cloneDeep(router.query);
    delete restQuery[WalletContextQueryParams.WALLET];
    shallowPushQuery(router, restQuery);
  };

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
        ) : userAllocationPercent.gt(0) || isLoading ? (
          "Your allocation is"
        ) : (
          "Sorry, you're not eligible"
        )}
      </SectionHeading>

      <div className="flex w-full flex-col items-center gap-4">
        {!address ? (
          <Button
            className="h-16 w-[240px] px-10 md:w-[320px]"
            labelClassName="uppercase text-[16px]"
            size="lg"
            onClick={() => setIsConnectWalletDropdownOpen(true)}
          >
            Connect wallet
          </Button>
        ) : (
          <Tooltip title="Allocation is an estimate since some snapshots haven't been taken yet">
            <div className="flex flex-row items-center justify-center gap-4 rounded-md border border-2 border-primary bg-[#0E1932] px-6 py-4 md:px-10">
              <SendTokenLogo className="h-8 w-8" />
              {isLoading ? (
                <Skeleton className="h-10 w-40" />
              ) : (
                <TDisplay className="text-4xl">
                  {formatToken(
                    new BigNumber(SEND_TOTAL_SUPPLY).times(
                      userAllocationPercent.div(100),
                    ),
                    { exact: false },
                  )}
                  <span className="font-sans leading-none">*</span> SEND
                </TDisplay>
              )}
            </div>
          </Tooltip>
        )}

        {isImpersonating && address && (
          <button
            className="group flex flex-row items-center gap-2"
            onClick={onImpersonationModeBannerClick}
          >
            <VenetianMask className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
            <TBodySans className="text-muted-foreground transition-colors group-hover:text-foreground">
              Impersonating {formatAddress(address)}
            </TBodySans>
          </button>
        )}
      </div>
    </div>
  );
}
