import { useWalletContext } from "@suilend/frontend-sui";

import SectionHeading from "@/components/send/SectionHeading";
import SendTokenAmount from "@/components/send/SendTokenAmount";

import Button from "../shared/Button";

export default function HeroSection() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();

  const allocation = 400;

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <SectionHeading>
        {!address ? (
          <>
            {"Connect your wallet to check your "}
            <SendTokenAmount />
            {" allocation"}
          </>
        ) : (
          <>
            {"Your allocation is "}
            <SendTokenAmount amount={allocation} />
          </>
        )}
      </SectionHeading>

      {!address && (
        <Button
          labelClassName="uppercase"
          variant="outline"
          size="lg"
          onClick={() => setIsConnectWalletDropdownOpen(true)}
        >
          Connect wallet
        </Button>
      )}
    </div>
  );
}
