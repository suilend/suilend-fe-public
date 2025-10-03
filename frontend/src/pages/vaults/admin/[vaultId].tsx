import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { SuiObjectResponse } from "@mysten/sui/client";
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

interface VaultFields {
  id: { id: string };
  version: string;
  obligations: any;
  share_supply: any;
  deposit_asset: any;
  total_shares: string;
  fee_receiver: string;
  management_fee_bps: string;
  performance_fee_bps: string;
  deposit_fee_bps: string;
  withdrawal_fee_bps: string;
  utilization_rate_bps: string;
  last_nav_per_share: string;
  fee_last_update_timestamp_s: string;
}

function Page() {
  const router = useRouter();
  const { vaultId } = router.query as { vaultId?: string };
  const {
    createObligation,
    deployFunds,
    withdrawDeployedFunds,
    // Context-managed vault page data
    vaultPageVaultId,
    setVaultPageVaultId,
    vaultData,
    isLoadingVaultData,
  } = useVaultContext();

  // Sync route param into context state
  useEffect(() => {
    if (vaultId && vaultId !== vaultPageVaultId) setVaultPageVaultId(vaultId);
  }, [vaultId, vaultPageVaultId, setVaultPageVaultId]);

  const obj = vaultData?.object as SuiObjectResponse | undefined;
  const baseCoinType = vaultData?.baseCoinType;

  const fields: VaultFields | undefined = useMemo(() => {
    const content = obj?.data?.content as any;
    if (!content || content.dataType !== "moveObject") return undefined;
    return content.fields as VaultFields;
  }, [obj]);

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
            ) : !fields ? (
              <TLabelSans>Vault not found or invalid type.</TLabelSans>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Vault ID
                  </TBodySans>
                  <Value value={fields.id.id} isId />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Base coin type
                  </TBodySans>
                  <Value value={baseCoinType ?? "-"} isType />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Fee receiver
                  </TBodySans>
                  <Value value={fields.fee_receiver} isId />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Total shares
                  </TBodySans>
                  <Value value={fields.total_shares} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Management fee (bps)
                  </TBodySans>
                  <Value value={fields.management_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Performance fee (bps)
                  </TBodySans>
                  <Value value={fields.performance_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Deposit fee (bps)
                  </TBodySans>
                  <Value value={fields.deposit_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Withdrawal fee (bps)
                  </TBodySans>
                  <Value value={fields.withdrawal_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Utilization (bps)
                  </TBodySans>
                  <Value value={fields.utilization_rate_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Last NAV per share
                  </TBodySans>
                  <Value value={fields.last_nav_per_share} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">
                    Fee last update (s)
                  </TBodySans>
                  <Value
                    value={fields.fee_last_update_timestamp_s}
                    valueTooltip={new Date(
                      Number(fields.fee_last_update_timestamp_s) * 1000,
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
                              (vaultData?.obligations as any)
                                ?.find(
                                  (x: any) => x.obligationId === o.obligationId,
                                )
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
                                vaultId: vaultData.id,
                                lendingMarketId: o.lendingMarketId,
                                lendingMarketType: o.marketType,
                                obligationIndex: o.index,
                                amount,
                                baseCoinType,
                                managerCapId: vaultData?.managerCapId,
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
                                vaultId: vaultData.id,
                                lendingMarketId: o.lendingMarketId,
                                lendingMarketType: o.marketType,
                                obligationIndex: o.index,
                                ctokenAmount,
                                baseCoinType,
                                managerCapId: vaultData.managerCapId,
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Create obligation</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateObligationForm
              vaultId={fields?.id.id}
              baseCoinType={baseCoinType}
              managerCapId={vaultData?.managerCapId}
              onSubmit={async (args) => {
                try {
                  if (!args.vaultId || !args.baseCoinType)
                    throw new Error("Missing vault or base coin type");
                  if (!args.lendingMarketId)
                    throw new Error("Enter lending market ID and type");
                  await createObligation(args);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to create obligation");
                }
              }}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// Forms
function CreateObligationForm({
  vaultId,
  baseCoinType,
  onSubmit,
  managerCapId,
}: {
  vaultId?: string;
  baseCoinType?: string;
  managerCapId?: string;
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
            vaultId: vaultId!,
            lendingMarketId,
            baseCoinType: baseCoinType!,
            managerCapId: managerCapId!,
          });
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <TBodySans>Vault</TBodySans>
        <Value value={vaultId ?? "-"} isId />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Base coin type</TBodySans>
        <Value value={baseCoinType ?? "-"} isType />
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
