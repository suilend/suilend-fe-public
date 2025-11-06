import { useState } from "react";

import { PlusIcon } from "lucide-react";

import Dialog from "@/components/shared/Dialog";
import { TBodySans } from "@/components/shared/Typography";
import { useVaultContext } from "@/contexts/VaultContext";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function CreateVaultDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { createVault } = useVaultContext();
  const [baseCoinType, setBaseCoinType] = useState<string>("");
  const [managementFeeBps, setManagementFeeBps] = useState<string>("0");
  const [performanceFeeBps, setPerformanceFeeBps] = useState<string>("0");
  const [depositFeeBps, setDepositFeeBps] = useState<string>("0");
  const [withdrawalFeeBps, setWithdrawalFeeBps] = useState<string>("0");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await createVault({
        baseCoinType,
        managementFeeBps: Number(managementFeeBps || 0),
        performanceFeeBps: Number(performanceFeeBps || 0),
        depositFeeBps: Number(depositFeeBps || 0),
        withdrawalFeeBps: Number(withdrawalFeeBps || 0),
      });
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
          children: "Create vault",
        },
      }}
      rootProps={{
        open: isOpen,
        onOpenChange: onClose,
      }}
    >
      <form
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        onSubmit={onSubmit}
      >
        <div className="flex flex-col gap-1">
          <TBodySans>Base coin type</TBodySans>
          <Input
            placeholder="0x...::module::Coin"
            value={baseCoinType}
            onChange={(e) => setBaseCoinType(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <TBodySans>Management fee (bps)</TBodySans>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={managementFeeBps}
            onChange={(e) => setManagementFeeBps(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <TBodySans>Performance fee (bps)</TBodySans>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={performanceFeeBps}
            onChange={(e) => setPerformanceFeeBps(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <TBodySans>Deposit fee (bps)</TBodySans>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={depositFeeBps}
            onChange={(e) => setDepositFeeBps(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <TBodySans>Withdrawal fee (bps)</TBodySans>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            value={withdrawalFeeBps}
            onChange={(e) => setWithdrawalFeeBps(e.target.value)}
          />
        </div>
        <div className="col-span-full flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create vault"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
