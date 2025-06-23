import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { isValidSuiAddress } from "@mysten/sui/utils";
import { Eraser, Replace } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function RemintObligationOwnerCapDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [obligationId, setObligationId] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");

  const reset = () => {
    setObligationId("");
    setDestinationAddress("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    if (obligationId === "") {
      toast.error("Enter an obligation id");
      return;
    }
    if (destinationAddress !== "" && !isValidSuiAddress(destinationAddress)) {
      toast.error("Invalid destination address");
      return;
    }

    const transaction = new Transaction();

    try {
      appData.suilendClient.newObligationOwnerCap(
        transaction,
        appData.lendingMarket.ownerCapId,
        destinationAddress !== "" ? destinationAddress : address,
        obligationId,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reminted ObligationOwnerCap", {
        description: `ObligationOwnerCap transferred to ${destinationAddress !== "" ? destinationAddress : address}`,
      });
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to remint ObligationOwnerCap", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-fit"
          labelClassName="uppercase text-xs"
          startIcon={<Replace />}
          variant="secondaryOutline"
        >
          Remint Owner Cap
        </Button>
      }
      headerProps={{
        title: { icon: <Replace />, children: "Remint Owner Cap" },
      }}
      dialogContentInnerClassName="max-w-md"
      footerProps={{
        children: (
          <>
            <Button
              tooltip="Clear"
              icon={<Eraser />}
              variant="ghost"
              size="icon"
              onClick={reset}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
              disabled={!isEditable}
            >
              Remint
            </Button>
          </>
        ),
      }}
    >
      <Input
        label="obligationId"
        id="obligationId"
        value={obligationId}
        onChange={setObligationId}
        inputProps={{ autoFocus: true }}
      />
      <Input
        label="Destination address (optional)"
        id="destinationAddress"
        value={destinationAddress}
        onChange={setDestinationAddress}
      />
    </Dialog>
  );
}
