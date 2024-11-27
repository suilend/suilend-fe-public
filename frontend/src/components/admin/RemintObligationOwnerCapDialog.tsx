import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Replace } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function RemintObligationOwnerCapDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, refresh } = useLoadedAppContext();

  const isEditable = !!data.lendingMarketOwnerCapId;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [obligationId, setObligationId] = useState<string>("");

  const reset = () => {
    setObligationId("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (obligationId === "") {
      toast.error("Enter an obligation id");
      return;
    }

    const transaction = new Transaction();

    try {
      suilendClient.newObligationOwnerCap(
        transaction,
        data.lendingMarketOwnerCapId,
        address,
        obligationId,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reminted obligation owner cap");
    } catch (err) {
      toast.error("Failed to remint obligation owner cap", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refresh();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      contentProps={{ className: "sm:max-w-md" }}
      trigger={
        <Button
          className="w-fit"
          labelClassName="uppercase text-xs"
          startIcon={<Replace />}
          variant="secondaryOutline"
        >
          Remint owner cap
        </Button>
      }
      titleIcon={<Replace />}
      title="Remint owner cap"
      footer={
        <div className="flex w-full flex-row items-center gap-2">
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
        </div>
      }
    >
      <Input
        label="obligationId"
        id="obligationId"
        value={obligationId}
        onChange={setObligationId}
      />
    </Dialog>
  );
}
