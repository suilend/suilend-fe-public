import { useState } from "react";

import { PlusIcon } from "lucide-react";

import Dialog from "@/components/shared/Dialog";
import { TLabelSans } from "@/components/shared/Typography";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";
import { LENDING_MARKET_METADATA_MAP } from "@/fetchers/useFetchAppData";

import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export default function CreateObligationDialog({
  isOpen,
  onClose,
  vault,
}: {
  isOpen: boolean;
  onClose: () => void;
  vault: ParsedVault;
}) {
  const { createObligation } = useVaultContext();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lendingMarketId, setLendingMarketId] = useState<string>("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createObligation({
        vault,
        lendingMarketId,
      });
      onClose();
    } catch (err) {
      console.error("onSubmit error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      headerProps={{
        title: {
          icon: <PlusIcon />,
          children: "Create obligation",
        },
      }}
      dialogContentInnerClassName="max-w-lg"
      rootProps={{
        open: isOpen,
        onOpenChange: onClose,
      }}
    >
      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
          <TLabelSans>Lending market</TLabelSans>
          <Select value={lendingMarketId} onValueChange={setLendingMarketId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a lending market" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(LENDING_MARKET_METADATA_MAP).map(
                (lendingMarket) => (
                  <SelectItem key={lendingMarket.id} value={lendingMarket.id}>
                    {lendingMarket.name}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          </div>
          <Button type="submit" className="w-full">
            CREATE
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
