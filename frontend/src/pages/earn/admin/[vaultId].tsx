import Head from "next/head";
import { useState } from "react";

import { toast } from "sonner";

import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  VaultContext,
  VaultContextProvider,
  useVaultContext,
} from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";

function Page() {
  const {
    createObligation,
    deployFunds,
    withdrawDeployedFunds,
    claimManagerFees,
    compoundRewards,
    vaultData,
    isLoadingVaultData,
  } = useVaultContext();

  const baseCoinType = vaultData?.baseCoinType;

  const isLoading = isLoadingVaultData;

  const obligations = vaultData?.obligations ?? [];
  const isLoadingObligations = isLoadingVaultData;

  return (
    <>
      <Head>
        <title>Suilend | Vault details</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <TBody className="uppercase">Vault details</TBody>

        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TLabelSans>Loading…</TLabelSans>
            ) : !vaultData ? (
              <TLabelSans>Vault not found or invalid type.</TLabelSans>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Vault ID
                  </TBodySans>
                  <Value value={vaultData.id} isId />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Base coin type
                  </TBodySans>
                  <Value value={baseCoinType ?? "-"} isType />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Total shares
                  </TBodySans>
                  <Value value={vaultData.totalShares} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Management fee (bps)
                  </TBodySans>
                  <Value value={vaultData.managementFeeBps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Performance fee (bps)
                  </TBodySans>
                  <Value value={vaultData.performanceFeeBps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Deposit fee (bps)
                  </TBodySans>
                  <Value value={vaultData.depositFeeBps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Withdrawal fee (bps)
                  </TBodySans>
                  <Value value={vaultData.withdrawalFeeBps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Utilization (bps)
                  </TBodySans>
                  <Value value={vaultData.utilizationRateBps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Last NAV per share
                  </TBodySans>
                  <Value value={vaultData.lastNavPerShare} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Fee last update (s)
                  </TBodySans>
                  <Value
                    value={vaultData.feeLastUpdateTimestampS}
                    valueTooltip={new Date(
                      Number(vaultData.feeLastUpdateTimestampS) * 1000,
                    ).toLocaleString()}
                  />
                </div>

                {/* Deployment metrics */}
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Undeployed (base)
                  </TBodySans>
                  <Value
                    value={vaultData?.undeployedAmount?.toString() ?? "0"}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Deployed (base)
                  </TBodySans>
                  <Value value={vaultData?.deployedAmount?.toString() ?? "0"} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Obligations */}
        <Card>
          <CardHeader>
            <CardTitle>Obligations</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingObligations ? (
              <TLabelSans>Loading…</TLabelSans>
            ) : obligations.length === 0 ? (
              <TLabelSans>No obligations found.</TLabelSans>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {obligations.map((o, idx) => (
                  <Card key={`${o.obligationId}-${idx}`}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Obligation #{o.index}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">
                            Obligation ID
                          </TBodySans>
                          <Value value={o.obligationId} isId />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">
                            Market type (L)
                          </TBodySans>
                          <Value value={o.marketType || "-"} isType />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">
                            Lending market ID
                          </TBodySans>
                          <Value
                            value={o.lendingMarketId ?? "Unresolved"}
                            isId
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">
                            Deployed (base)
                          </TBodySans>
                          <Value
                            value={
                              vaultData?.obligations
                                ?.find((x) => x.obligationId === o.obligationId)
                                ?.deployedAmount?.toString?.() ?? "0"
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Deploy */}
                        <form
                          className="flex flex-col gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget as HTMLFormElement;
                            const amount = (
                              form.elements.namedItem(
                                "amount",
                              ) as HTMLInputElement
                            ).value;
                            try {
                              if (!vaultData || !baseCoinType)
                                throw new Error("Vault not loaded");
                              if (!vaultData.managerCapId)
                                throw new Error(
                                  "Manager cap not found in connected wallet",
                                );
                              await deployFunds({
                                vault: vaultData,
                                lendingMarketId: o.lendingMarketId,
                                amount: amount.toString(),
                              });
                              (
                                form.elements.namedItem(
                                  "amount",
                                ) as HTMLInputElement
                              ).value = "";
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to deploy");
                            }
                          }}
                        >
                          <TBodySans>Deploy funds</TBodySans>
                          <div className="flex flex-row gap-2">
                            <Input
                              name="amount"
                              placeholder="Amount (u64)"
                              inputMode="numeric"
                            />
                            <Button type="submit">Deploy</Button>
                          </div>
                        </form>

                        {/* Withdraw */}
                        <form
                          className="flex flex-col gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget as HTMLFormElement;
                            const ctokenAmount = (
                              form.elements.namedItem(
                                "ctokenAmount",
                              ) as HTMLInputElement
                            ).value;
                            try {
                              if (!vaultData || !baseCoinType)
                                throw new Error("Vault not loaded");
                              if (!vaultData.managerCapId)
                                throw new Error(
                                  "Manager cap not found in connected wallet",
                                );
                              await withdrawDeployedFunds({
                                vault: vaultData,
                                lendingMarketId: o.lendingMarketId,
                                ctokenAmount: ctokenAmount.toString(),
                              });
                              (
                                form.elements.namedItem(
                                  "ctokenAmount",
                                ) as HTMLInputElement
                              ).value = "";
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to withdraw");
                            }
                          }}
                        >
                          <TBodySans>Withdraw funds</TBodySans>
                          <div className="flex flex-row gap-2">
                            <Input
                              name="ctokenAmount"
                              placeholder="cToken amount (u64)"
                              inputMode="numeric"
                            />
                            <Button type="submit">Withdraw</Button>
                          </div>
                        </form>
                      </div>

                      {/* Compound Rewards */}
                      <form
                        className="flex flex-col gap-2"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const form = e.currentTarget as HTMLFormElement;
                          const obligationIndex = (
                            form.elements.namedItem(
                              "obligationIndex",
                            ) as HTMLInputElement
                          ).value;
                          const rewardReserveIndex = (
                            form.elements.namedItem(
                              "rewardReserveIndex",
                            ) as HTMLInputElement
                          ).value;
                          const rewardIndex = (
                            form.elements.namedItem(
                              "rewardIndex",
                            ) as HTMLInputElement
                          ).value;
                          const isDepositReward = (
                            form.elements.namedItem(
                              "isDepositReward",
                            ) as HTMLInputElement
                          ).checked;
                          const depositReserveIndex = (
                            form.elements.namedItem(
                              "depositReserveIndex",
                            ) as HTMLInputElement
                          ).value;
                          try {
                            if (!vaultData || !baseCoinType)
                              throw new Error("Vault not loaded");
                            if (!o.lendingMarketId)
                              throw new Error("Lending market ID not resolved");
                            await compoundRewards({
                              vault: vaultData,
                              lendingMarketId: o.lendingMarketId,
                              obligationIndex: obligationIndex.toString(),
                              rewardReserveIndex: rewardReserveIndex.toString(),
                              rewardIndex: rewardIndex.toString(),
                              isDepositReward,
                              depositReserveIndex:
                                depositReserveIndex.toString(),
                            });
                            (
                              form.elements.namedItem(
                                "obligationIndex",
                              ) as HTMLInputElement
                            ).value = "";
                            (
                              form.elements.namedItem(
                                "rewardReserveIndex",
                              ) as HTMLInputElement
                            ).value = "";
                            (
                              form.elements.namedItem(
                                "rewardIndex",
                              ) as HTMLInputElement
                            ).value = "";
                            (
                              form.elements.namedItem(
                                "isDepositReward",
                              ) as HTMLInputElement
                            ).checked = false;
                            (
                              form.elements.namedItem(
                                "depositReserveIndex",
                              ) as HTMLInputElement
                            ).value = "";
                          } catch (err: any) {
                            toast.error(
                              err?.message || "Failed to compound rewards",
                            );
                          }
                        }}
                      >
                        <TBodySans>Compound rewards</TBodySans>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Input
                            name="obligationIndex"
                            placeholder="Obligation index (u64)"
                            inputMode="numeric"
                            defaultValue={o.index.toString()}
                          />
                          <Input
                            name="rewardReserveIndex"
                            placeholder="Reward reserve index (u64)"
                            inputMode="numeric"
                          />
                          <Input
                            name="rewardIndex"
                            placeholder="Reward index (u64)"
                            inputMode="numeric"
                          />
                          <div className="flex flex-row items-center gap-2">
                            <input
                              type="checkbox"
                              name="isDepositReward"
                              id={`isDepositReward-${idx}`}
                              className="h-4 w-4"
                            />
                            <TBodySans>
                              <label htmlFor={`isDepositReward-${idx}`}>
                                Is deposit reward
                              </label>
                            </TBodySans>
                          </div>
                          <Input
                            name="depositReserveIndex"
                            placeholder="Deposit reserve index (u64)"
                            inputMode="numeric"
                          />
                        </div>
                        <Button type="submit">Compound</Button>
                      </form>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {vaultData && (
          <Card>
            <CardHeader>
              <CardTitle>Create obligation</CardTitle>
            </CardHeader>
            <CardContent>
              <CreateObligationForm
                vault={vaultData}
                onSubmit={async (args) => {
                  try {
                    if (!args.vault.id || !args.vault.baseCoinType)
                      throw new Error("Missing vault or base coin type");
                    if (!args.lendingMarketId)
                      throw new Error("Enter lending market ID and type");
                    await createObligation(args);

                  } catch (err: any) {
                    console.error("Create obligation error", err);
                    toast.error(err?.message || "Failed to create obligation");
                  }
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Claim Manager Fees */}
        {vaultData && (
          <Card>
            <CardHeader>
              <CardTitle>Claim Manager Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget as HTMLFormElement;
                  const amount = (
                    form.elements.namedItem("amount") as HTMLInputElement
                  ).value;
                  try {
                    if (!vaultData) throw new Error("Vault not loaded");
                    if (!vaultData.managerCapId)
                      throw new Error(
                        "Manager cap not found in connected wallet",
                      );
                    await claimManagerFees({
                      vault: vaultData,
                      amount: amount.toString(),
                    });
                    (
                      form.elements.namedItem("amount") as HTMLInputElement
                    ).value = "";
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to claim manager fees");
                  }
                }}
              >
                <TBodySans>Claim manager fees</TBodySans>
                <div className="flex flex-row gap-2">
                  <Input
                    name="amount"
                    placeholder="Amount (u64)"
                    inputMode="numeric"
                  />
                  <Button type="submit">Claim</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

// Forms
function CreateObligationForm({
  vault,
  onSubmit,
}: {
  vault: ParsedVault;
  onSubmit: VaultContext["createObligation"];
}) {
  const [lendingMarketId, setLendingMarketId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <form
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
          await onSubmit({
            vault,
            lendingMarketId,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <TBodySans>Vault</TBodySans>
        <Value value={vault.id} isId />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Base coin type</TBodySans>
        <Value value={vault.baseCoinType} isType />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Lending market ID (L)</TBodySans>
        <Input
          placeholder="0x..."
          value={lendingMarketId}
          onChange={(e) => setLendingMarketId(e.target.value)}
        />
      </div>
      {/* Market type auto-detected in backend */}
      <div className="col-span-full flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create obligation"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminVaultsPage() {
  return (
    <VaultContextProvider>
      <Page />
    </VaultContextProvider>
  );
}
