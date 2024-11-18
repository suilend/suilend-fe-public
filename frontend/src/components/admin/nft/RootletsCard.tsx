import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui";

import Button from "@/components/shared/Button";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useAppContext } from "@/contexts/AppContext";

const TRANSFER_POLICY =
  "0x43517be5e9399224075d11855e89ef46ad3c3e45276949b2d679f8f79d735f0e";
const TRANSFER_POLICY_CAP =
  "0x63bd98e7aff9cbc75ce7bebce72c379d0b64def811468cbd6da69e9dbb65627a";
const CAP_OWNER =
  "0x3d8d36f1207c5cccfd9e3b25fa830231da282a03b2874b3737096833aa72edd2";
const ROOTLET_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

export default function RootletsCard() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refreshData } = useAppContext();

  const isEditable = address === CAP_OWNER;

  const collectRoyalties = async () => {
    const nullOption = bcs.option(bcs.u64()).serialize(null);

    const transaction = new Transaction();

    try {
      const profit = transaction.moveCall({
        target: `0x2::transfer_policy::withdraw`,
        arguments: [
          transaction.object(TRANSFER_POLICY),
          transaction.object(TRANSFER_POLICY_CAP),
          nullOption,
        ],
        typeArguments: [ROOTLET_TYPE],
      });
      transaction.transferObjects(
        [profit],
        transaction.pure.address(CAP_OWNER),
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Collected royalties");
    } catch (err) {
      toast.error("Failed to collect royalties", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Rootlets</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <Button
          labelClassName="uppercase text-xs"
          startIcon={<Coins />}
          variant="secondaryOutline"
          onClick={collectRoyalties}
          disabled={!isEditable}
        >
          Collect royalties
        </Button>
      </CardContent>
    </Card>
  );
}
