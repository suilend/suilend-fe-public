import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import BigNumber from "bignumber.js";
import { ChevronLeftIcon } from "lucide-react";

import { formatPercent, formatToken, formatUsd } from "@suilend/sui-fe";

import Button from "@/components/shared/Button";
import FullPageSpinner from "@/components/shared/FullPageSpinner";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import AllocationPie from "@/components/strategies/AllocationPie";
import CreateObligationDialog from "@/components/strategies/CreateObligationDialog";
import VaultObligationCard from "@/components/strategies/VaultObligationCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { VaultContextProvider, useVaultContext } from "@/contexts/VaultContext";

function Page() {
  const { vaultData, isLoadingVaultData, claimManagerFees } = useVaultContext();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const baseCoinType = vaultData?.baseCoinType;

  const isLoading = isLoadingVaultData;

  const obligations = vaultData?.obligations ?? [];
  const isLoadingObligations = isLoadingVaultData;
  if (!vaultData) return <FullPageSpinner />;

  return (
    <>
      <CreateObligationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        vault={vaultData}
      />
      <Head>
        <title>Suilend | Manage Vault</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <div className="flex items-center gap-6">
          <Link href="/earn/admin" className="flex flex-row items-center gap-2">
            <ChevronLeftIcon className="h-4 w-4" />
          </Link>
          <TBody className="uppercase">Manage Vault</TBody>
        </div>
        <div className="flex w-full gap-6">
          <div className="flex flex-1 flex-col gap-6">
            <Card className="h-fit">
              <CardHeader>
                <TBody className="uppercase">Vault Overview</TBody>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <TLabelSans>Loading…</TLabelSans>
                ) : !vaultData ? (
                  <TLabelSans>Vault not found or invalid type.</TLabelSans>
                ) : (
                  <div className="flex flex-col gap-4">
                    <AllocationPie vault={vaultData} />
                    <LabelWithValue
                      label="Vault ID"
                      value={vaultData.id}
                      horizontal
                      isId
                    />
                    <LabelWithValue
                      label="Base coin type"
                      value={baseCoinType ?? "-"}
                      horizontal
                      isType
                    />
                    <LabelWithValue
                      label="Utilization"
                      value={formatPercent(vaultData.utilization.times(100))}
                      horizontal
                    />
                    <LabelWithValue
                      label="Management fee"
                      value={formatPercent(
                        BigNumber(vaultData.managementFeeBps).div(100),
                      )}
                      horizontal
                    />

                    <LabelWithValue
                      label="Performance fee"
                      value={formatPercent(
                        BigNumber(vaultData.performanceFeeBps).div(100),
                      )}
                      horizontal
                    />

                    <LabelWithValue
                      label="Deposit fee"
                      value={formatPercent(
                        BigNumber(vaultData.depositFeeBps).div(100),
                      )}
                      horizontal
                    />

                    <LabelWithValue
                      label="Withdrawal fee"
                      value={formatPercent(
                        BigNumber(vaultData.withdrawalFeeBps).div(100),
                      )}
                      horizontal
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TBody className="uppercase">Fees</TBody>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <TLabelSans>Manager fees</TLabelSans>
                  <div className="flex items-end gap-2">
                    <TLabelSans className="uppercase">
                      {formatUsd(
                        new BigNumber(vaultData.managerFees).times(
                          vaultData.navPerShare,
                        ),
                      )}
                    </TLabelSans>
                    <TBody className="uppercase">
                      {formatToken(new BigNumber(vaultData.managerFees))} Shares
                    </TBody>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    claimManagerFees({
                      vault: vaultData,
                      amount: vaultData.managerFees,
                    });
                  }}
                >
                  CLAIM
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-1 flex-col gap-2">
            {/* Obligations */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-border">
                <TBody className="uppercase">Obligations</TBody>
                <Button
                  variant="secondaryOutline"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  CREATE OBLIGATION
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingObligations ? (
                  <TLabelSans>Loading…</TLabelSans>
                ) : obligations.length === 0 ? (
                  <TLabelSans>No obligations found.</TLabelSans>
                ) : (
                  <div className="divide-y divide-border">
                    {obligations.map((o, idx) => (
                      <VaultObligationCard
                        key={`${o.obligationId}-${idx}`}
                        vaultData={vaultData}
                        obligation={o}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AdminVaultsPage() {
  return (
    <VaultContextProvider>
      <Page />
    </VaultContextProvider>
  );
}
