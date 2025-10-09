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
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawShares, setWithdrawShares] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const vaultHasObligations = vault.obligations.length > 0;

  return (
    <div className="flex w-full flex-col gap-3 rounded-sm border p-4">
      <TBody className="break-all">Vault {vault.id}</TBody>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <TBodySans>Deposit amount</TBodySans>
          <div className="flex flex-row gap-2">
            <Input
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <Button
              disabled={isDepositing || !depositAmount || !vaultHasObligations}
              onClick={async () => {
                setIsDepositing(true);
                try {
                  if (
                    !vault.pricingLendingMarketId ||
                    !vault.pricingLendingMarketType
                  )
                    throw new Error("Vault doesn't have any obligations");

                  await depositIntoVault({
                    vaultId: vault.id,
                    baseCoinType: vault.baseCoinType || "",
                    amount: depositAmount,
                    pricingLendingMarketId: vault.pricingLendingMarketId,
                    lendingMarketType: vault.pricingLendingMarketType,
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
          <TBodySans>Withdraw shares</TBodySans>
          <div className="flex flex-row gap-2">
            <Input
              value={withdrawShares}
              onChange={(e) => setWithdrawShares(e.target.value)}
            />
            <Button
              disabled={
                isWithdrawing || !withdrawShares || !vaultHasObligations
              }
              onClick={async () => {
                setIsWithdrawing(true);
                try {
                  if (
                    !vault.pricingLendingMarketId ||
                    !vault.pricingLendingMarketType
                  )
                    throw new Error("Vault doesn't have any obligations");

                  await withdrawFromVault({
                    vaultId: vault.id,
                    baseCoinType: vault.baseCoinType || "",
                    sharesAmount: withdrawShares,
                    pricingLendingMarketId: vault.pricingLendingMarketId,
                    lendingMarketType: vault.pricingLendingMarketType,
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
