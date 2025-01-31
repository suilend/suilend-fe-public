import { Transaction } from "@mysten/sui/transactions";
import { Coins } from "lucide-react";
import { toast } from "sonner";

import { NORMALIZED_SUI_COINTYPE } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import Tooltip from "@/components/shared/Tooltip";
import { TLabel, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatAddress } from "@/lib/format";

const NFT_PROTOCOL_PACKAGE_ID =
  "0xbdd1811dd6e8feb2c7311d193bbf92cb45d3d6a8fb2b6ec60dc19adf20c18796";
const COLLECTION_OBJECT_ID =
  "0xaf72329cb525301289ba10668b4d25da52516cd75ff485d3669a7b7805f8bc67";
const ROYALTY_OBJECT_ID =
  "0xfa48f9adcc1ea9ea1b07d103dde9e9079deddac9807aba5cced6feacd0def8e3";

const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

const CAPSULES_WALLET =
  "0x5d13b1a570fe5765487eaec67e33698c89266954e48aae4fc7e2450db1c429a8";

export default function SuilendCapsulesCard() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedAppContext();

  const isEditable = address === CAPSULES_WALLET;

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    const transaction = new Transaction();

    try {
      transaction.moveCall({
        target: `${NFT_PROTOCOL_PACKAGE_ID}::royalty_strategy_bps::collect_royalties`,
        arguments: [
          transaction.object(COLLECTION_OBJECT_ID),
          transaction.object(ROYALTY_OBJECT_ID),
        ],
        typeArguments: [SUILEND_CAPSULE_TYPE, NORMALIZED_SUI_COINTYPE],
      });
      transaction.moveCall({
        target: `${NFT_PROTOCOL_PACKAGE_ID}::royalty::distribute_royalties`,
        arguments: [transaction.object(COLLECTION_OBJECT_ID)],
        typeArguments: [SUILEND_CAPSULE_TYPE, NORMALIZED_SUI_COINTYPE],
      });

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Claimed royalties");
    } catch (err) {
      toast.error("Failed to claim royalties", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Suilend Capsules</TTitle>
        <Tooltip title={CAPSULES_WALLET}>
          <TLabel className="w-max uppercase">
            {formatAddress(CAPSULES_WALLET)}
          </TLabel>
        </Tooltip>
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
