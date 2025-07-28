import Dialog from "@/components/shared/Dialog";
import { TBodySans } from "@/components/shared/Typography";

interface LedgerHashDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ledgerHash: string;
}

export default function LedgerHashDialog({
  isOpen,
  onClose,
  ledgerHash,
}: LedgerHashDialogProps) {
  return (
    <Dialog
      rootProps={{
        open: isOpen,
        onOpenChange: (isOpen) => {
          if (!isOpen) onClose();
        },
      }}
      headerProps={{
        title: { children: "Verify Ledger Hash" },
      }}
      dialogContentInnerClassName="max-w-sm"
    >
      <TBodySans className="text-muted-foreground">
        Please verify the transaction hash shown on your Ledger matches the hash
        below.
      </TBodySans>
      <TBodySans className="break-all font-mono">{ledgerHash}</TBodySans>
    </Dialog>
  );
}
