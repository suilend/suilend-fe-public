import { Transaction } from "@mysten/sui/transactions";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function MintObligationOwnerCapDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, refresh } = useLoadedAppContext();

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
      await refresh();
    }
  };

  return (
    <Dialog
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
      headerProps={{
        title: { icon: <Plus />, children: "Mint owner cap" },
      }}
      dialogContentInnerClassName="max-w-md"
      footerProps={{
        children: (
          <>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
            >
              Mint
            </Button>
          </>
        ),
      }}
    >
      <TLabelSans>Mint a new ObligationOwnerCap object.</TLabelSans>
    </Dialog>
  );
}
