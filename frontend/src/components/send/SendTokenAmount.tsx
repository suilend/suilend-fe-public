import SendTokenLogo from "@/components/send/SendTokenLogo";

interface SendTokenAmountProps {
  amount?: number;
}

export default function SendTokenAmount({ amount }: SendTokenAmountProps) {
  return (
    <>
      <SendTokenLogo className="inline-block h-10 w-10" />
      {amount !== undefined && ` ${amount}`}
      {" SEND"}
    </>
  );
}
