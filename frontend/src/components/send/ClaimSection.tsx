import SectionHeading from "@/components/send/SectionHeading";
import Button from "@/components/shared/Button";
import { TBody } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatToken } from "@/lib/format";
import {
  NORMALIZED_mSEND_12_MONTHS_COINTYPE,
  NORMALIZED_mSEND_3_MONTHS_COINTYPE,
  NORMALIZED_mSEND_6_MONTHS_COINTYPE,
} from "@/pages/send";

export default function ClaimSection() {
  const { getBalance } = useLoadedAppContext();

  const balanceMsend3Months = getBalance(NORMALIZED_mSEND_3_MONTHS_COINTYPE);
  const balanceMsend6Months = getBalance(NORMALIZED_mSEND_6_MONTHS_COINTYPE);
  const balanceMsend12Months = getBalance(NORMALIZED_mSEND_12_MONTHS_COINTYPE);

  const claimSend = async () => {
    // TODO: Claim SEND
  };

  return (
    <div className="flex w-full flex-col items-center gap-16">
      <SectionHeading>Claim SEND</SectionHeading>

      <div className="flex flex-col gap-4 rounded-md border px-4 py-3">
        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (3 months) in wallet:{" "}
            {formatToken(balanceMsend3Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>

        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (6 months) in wallet:{" "}
            {formatToken(balanceMsend6Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>

        <div className="flex flex-row items-center gap-8">
          <TBody>
            mSEND (12 months) in wallet:{" "}
            {formatToken(balanceMsend12Months, { exact: false })}
          </TBody>
          <Button labelClassName="uppercase" onClick={claimSend}>
            Claim
          </Button>
        </div>
      </div>
    </div>
  );
}
