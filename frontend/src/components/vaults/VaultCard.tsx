import { useState } from "react";

import { TBody, TBodySans } from "@/components/shared/Typography";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";

interface VaultCardProps {
  vault: ParsedVault;
}

export default function VaultCard({ vault }: VaultCardProps) {
  const { depositIntoVault, withdrawFromVault } = useVaultContext();
  const firstObligationLmId = vault.obligations[0]?.lendingMarketId;
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  return (
    <div className="flex w-full flex-col gap-3 rounded-sm border p-4">
      <TBody className="break-all">Vault {vault.id}</TBody>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TBodySans>Deposit amount (base)</TBodySans>
          <div className="flex flex-row gap-2">
            <Input
              inputMode="numeric"
              value={depositAmount}
              onChange={(e) =>
                setDepositAmount(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
            <Button
              disabled={isDepositing || !depositAmount || !firstObligationLmId}
              onClick={async () => {
                setIsDepositing(true);
                try {
                  await depositIntoVault({
                    vaultId: vault.id,
                    baseCoinType: vault.baseCoinType || "",
                    amount: depositAmount,
                    pricingLendingMarketId: vault.pricingLendingMarketId,
                  });
                  setDepositAmount("");
                } finally {
                  setIsDepositing(false);
                }
              }}
            >
              {isDepositing ? "Depositing..." : "Deposit"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <TBodySans>Withdraw shares (u64)</TBodySans>
          <div className="flex flex-row gap-2">
            <Input
              inputMode="numeric"
              value={withdrawShares}
              onChange={(e) =>
                setWithdrawShares(e.target.value.replace(/[^0-9]/g, ""))
              }
            />
            <Button
              disabled={
                isWithdrawing || !withdrawShares || !firstObligationLmId
              }
              onClick={async () => {
                setIsWithdrawing(true);
                try {
                  await withdrawFromVault({
                    vaultId: vault.id,
                    baseCoinType: vault.baseCoinType || "",
                    sharesAmount: withdrawShares,
                    pricingLendingMarketId: vault.pricingLendingMarketId,
                  });
                  setWithdrawShares("");
                } finally {
                  setIsWithdrawing(false);
                }
              }}
            >
              {isWithdrawing ? "Withdrawing..." : "Withdraw"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
