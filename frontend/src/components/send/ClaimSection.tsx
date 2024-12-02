import SectionHeading from "@/components/send/SectionHeading";
import Button from "@/components/shared/Button";
import { TBody } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatToken } from "@/lib/format";
import { NORMALIZED_mSEND_COINTYPE } from "@/pages/send";

export default function ClaimSection() {
  const { getBalance } = useLoadedAppContext();

  const balance = getBalance(NORMALIZED_mSEND_COINTYPE);

  const claimSend = async () => {
    // TODO: Claim SEND
  };

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <SectionHeading>Claim SEND</SectionHeading>

      <div className="flex flex-row items-center gap-8 rounded-md border px-4 py-3">
        <TBody>mSEND in wallet: {formatToken(balance, { exact: false })}</TBody>
        <Button labelClassName="uppercase" onClick={claimSend}>
          Claim
        </Button>
      </div>
    </div>
  );
}
