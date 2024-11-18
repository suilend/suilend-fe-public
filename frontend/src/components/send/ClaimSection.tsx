import SectionHeading from "@/components/send/SectionHeading";
import SendAmount from "@/components/send/SendAmount";

export default function ClaimSection() {
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <SectionHeading>
        Claim
        <SendAmount /> tokens!
      </SectionHeading>
    </div>
  );
}
