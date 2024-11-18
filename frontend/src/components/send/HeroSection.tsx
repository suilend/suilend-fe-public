import SectionHeading from "@/components/send/SectionHeading";
import SendAmount from "@/components/send/SendAmount";
import { TBodySans } from "@/components/shared/Typography";

export default function HeroSection() {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <SectionHeading>
        Connect your wallet and claim
        <SendAmount amount={500} /> tokens!
      </SectionHeading>

      <TBodySans className="text-md">
        Connect your wallet to check eligibility and claim your SEND tokens.
      </TBodySans>
    </div>
  );
}
