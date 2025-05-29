import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { LENDING_MARKET_REGISTRY_ID, SuilendClient } from "@suilend/sdk";
import { useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function AddLendingMarketDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [type, setType] = useState<string>("");

  const reset = () => {
    setType("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    if (type === "") {
      toast.error("Enter a type");
      return;
    }

    const transaction = new Transaction();

    try {
      const ownerCap = SuilendClient.createNewLendingMarket(
        LENDING_MARKET_REGISTRY_ID,
        type,
        transaction,
      );
      transaction.transferObjects([ownerCap], address);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Created lending market");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to create lending market", {
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
        <Button icon={<Plus />} variant="secondary" size="icon">
          Create lending market
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Create lending market" },
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
            >
              Add
            </Button>
          </>
        ),
      }}
    >
      <Input
        label="type"
        id="type"
        value={type}
        onChange={setType}
        inputProps={{ autoFocus: true }}
      />
    </Dialog>
  );
}
