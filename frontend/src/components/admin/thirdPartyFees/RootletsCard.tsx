import { bcs } from "@mysten/sui/bcs";
import { Transaction } from "@mysten/sui/transactions";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { formatAddress } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Tooltip from "@/components/shared/Tooltip";
import { TLabel, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadedUserContext } from "@/contexts/UserContext";

const TRANSFER_POLICY =
  "0x43517be5e9399224075d11855e89ef46ad3c3e45276949b2d679f8f79d735f0e";
const TRANSFER_POLICY_CAP =
  "0x63bd98e7aff9cbc75ce7bebce72c379d0b64def811468cbd6da69e9dbb65627a";
const ROOTLET_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

const CAP_OWNER =
  "0x3d8d36f1207c5cccfd9e3b25fa830231da282a03b2874b3737096833aa72edd2";

export default function RootletsCard() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const isEditable = address === CAP_OWNER;

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!isEditable)
      throw new Error("Connected wallet is not the cap owner wallet");

    const transaction = new Transaction();

    try {
      const profit = transaction.moveCall({
        target: `0x2::transfer_policy::withdraw`,
        arguments: [
          transaction.object(TRANSFER_POLICY),
          transaction.object(TRANSFER_POLICY_CAP),
          bcs.option(bcs.u64()).serialize(null),
        ],
        typeArguments: [ROOTLET_TYPE],
      });
      transaction.transferObjects(
        [profit],
        transaction.pure.address(CAP_OWNER),
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Claimed royalties");
    } catch (err) {
      toast.error("Failed to claim royalties", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Rootlets</TTitle>
        <div className="flex flex-row items-center gap-2">
          <TLabelSans>Claimable by:</TLabelSans>
          <Tooltip title={CAP_OWNER}>
            <TLabel className="w-max uppercase">
              {formatAddress(CAP_OWNER)}
            </TLabel>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button
          className="w-max"
          labelClassName="uppercase text-xs"
          startIcon={<Coins />}
          variant="secondaryOutline"
          onClick={submit}
          disabled={!isEditable}
        >
          Claim royalties
        </Button>
      </CardContent>
    </Card>
  );
}
