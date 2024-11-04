import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";

import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import { useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";

export default function MintObligationOwnerCapDialog() {
  const { address } = useWalletContext();
  const { refreshData, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    const transaction = new Transaction();

    try {
      const createdObligationOwnerCap =
        suilendClient.createObligation(transaction);

      transaction.transferObjects(
        [createdObligationOwnerCap],
        transaction.pure.address(address),
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Minted obligation owner cap");
    } catch (err) {
      toast.error("Failed to mint obligation owner cap", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
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
          startIcon={<Plus />}
          variant="secondaryOutline"
        >
          Mint owner cap
        </Button>
      }
      titleIcon={<Plus />}
      title="Mint owner cap"
      footer={
        <div className="flex w-full flex-row items-center gap-2">
          <Button
            className="flex-1"
            labelClassName="uppercase"
            size="lg"
            onClick={submit}
          >
            Mint
          </Button>
        </div>
      }
    />
  );
}
