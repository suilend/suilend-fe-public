import Dialog from "@/components/shared/Dialog";
import { TBodySans } from "@/components/shared/Typography";

interface LedgerHashDialogProps {
  isOpen: boolean;
  ledgerHash: string;
}

export default function LedgerHashDialog({
  isOpen,
  ledgerHash,
}: LedgerHashDialogProps) {
  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange: () => {} }}
      headerProps={{
        title: { children: "Using a Ledger?" },
        showCloseButton: false,
      }}
      dialogContentInnerClassName="max-w-sm"
    >
      <TBodySans className="text-muted-foreground">
        If you are using a Ledger to sign the transaction, please verify the
        hash shown on your device matches the hash below.
      </TBodySans>
      <TBodySans className="break-all font-mono">{ledgerHash}</TBodySans>
    </Dialog>
  );
}
