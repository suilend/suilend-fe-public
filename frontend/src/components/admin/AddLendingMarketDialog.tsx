import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";
import {
  ADMIN_ADDRESS,
  LENDING_MARKET_REGISTRY_ID,
  SuilendClient,
} from "@suilend/sdk";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function AddLendingMarketDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedAppContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [type, setType] = useState<string>("");

  const reset = () => {
    setType("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!isEditable)
      throw new Error("Connected wallet is not the admin wallet");

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
      await refresh();
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
              disabled={!isEditable}
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
