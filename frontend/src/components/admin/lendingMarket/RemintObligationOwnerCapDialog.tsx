import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Replace } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function RemintObligationOwnerCapDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = !!appData.lendingMarketOwnerCapId;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [obligationId, setObligationId] = useState<string>("");

  const reset = () => {
    setObligationId("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (obligationId === "") {
      toast.error("Enter an obligation id");
      return;
    }

    const transaction = new Transaction();

    try {
      appData.suilendClient.newObligationOwnerCap(
        transaction,
        appData.lendingMarketOwnerCapId,
        address,
        obligationId,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reminted obligation owner cap");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to remint obligation owner cap", {
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
          Remint owner cap
        </Button>
      }
      headerProps={{
        title: { icon: <Replace />, children: "Remint owner cap" },
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
    </Dialog>
  );
}
