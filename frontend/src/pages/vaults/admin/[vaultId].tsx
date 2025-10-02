import { useEffect, useMemo, useState } from "react";

import Head from "next/head";
import { useRouter } from "next/router";

import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SuiObjectResponse } from "@mysten/sui/client";
import Value from "@/components/shared/Value";
import { useVaultContext, VaultContextProvider } from "@/contexts/VaultContext";
import { toast } from "sonner";

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

interface ObligationEntry {
  marketType: string;
  lendingMarketId?: string;
  index: number;
  obligationId: string;
}

function Page() {
  const router = useRouter();
  const { vaultId } = router.query as { vaultId?: string };
  const {
    createObligation,
    deployFunds,
    withdrawDeployedFunds,
    compoundPerformanceFees,
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
  const error = undefined;

  const obligations: ObligationEntry[] = (vaultData?.obligations as any) ?? [];
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
            ) : error ? (
              <TLabelSans className="text-red-500">{error}</TLabelSans>
            ) : !fields ? (
              <TLabelSans>Vault not found or invalid type.</TLabelSans>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Vault ID</TBodySans>
                  <Value value={fields.id.id} isId />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Base coin type</TBodySans>
                  <Value value={baseCoinType ?? "-"} isType />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Fee receiver</TBodySans>
                  <Value value={fields.fee_receiver} isId />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Total shares</TBodySans>
                  <Value value={fields.total_shares} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Management fee (bps)</TBodySans>
                  <Value value={fields.management_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Performance fee (bps)</TBodySans>
                  <Value value={fields.performance_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Deposit fee (bps)</TBodySans>
                  <Value value={fields.deposit_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Withdrawal fee (bps)</TBodySans>
                  <Value value={fields.withdrawal_fee_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Utilization (bps)</TBodySans>
                  <Value value={fields.utilization_rate_bps} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Last NAV per share</TBodySans>
                  <Value value={fields.last_nav_per_share} />
                </div>

                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Fee last update (s)</TBodySans>
                  <Value
                    value={fields.fee_last_update_timestamp_s}
                    valueTooltip={new Date(
                      Number(fields.fee_last_update_timestamp_s) * 1000,
                    ).toLocaleString()}
                  />
                </div>

                {/* Deployment metrics */}
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Undeployed (base)</TBodySans>
                  <Value value={vaultData?.undeployedAmount?.toString() ?? "0"} />
                </div>
                <div className="flex flex-col gap-1">
                  <TBodySans className="text-muted-foreground">Deployed (base)</TBodySans>
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
                      <CardTitle className="text-base">Obligation #{o.index}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">Obligation ID</TBodySans>
                          <Value value={o.obligationId} isId />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">Market type (L)</TBodySans>
                          <Value value={o.marketType || "-"} isType />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">Lending market ID</TBodySans>
                          <Value value={o.lendingMarketId ?? "Unresolved"} isId />
                        </div>
                        <div className="flex flex-col gap-1">
                          <TBodySans className="text-muted-foreground">Deployed (base)</TBodySans>
                          <Value value={(vaultData?.obligations as any)?.find((x: any) => x.obligationId === o.obligationId)?.deployedAmount?.toString?.() ?? "0"} />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {/* Deploy */}
                        <form
                          className="flex flex-col gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget as HTMLFormElement;
                            const amount = (form.elements.namedItem("amount") as HTMLInputElement).value;
                            try {
                              if (!fields?.id.id || !baseCoinType) throw new Error("Vault not loaded");
                              if (!o.lendingMarketId) throw new Error("Unknown lending market for this obligation");
                              const aggregatorMarkets = Array.from(
                                new Map(
                                  obligations
                                    .filter((x) => x.marketType && x.lendingMarketId)
                                    .map((x) => [
                                      x.marketType,
                                      {
                                        lendingMarketType: x.marketType,
                                        lendingMarketId: x.lendingMarketId!,
                                      },
                                    ]),
                                ).values(),
                              ) as { lendingMarketId: string; lendingMarketType: string }[];
                              await deployFunds({
                                vaultId: fields.id.id,
                                lendingMarketId: o.lendingMarketId,
                                obligationIndex: o.index,
                                amount,
                                baseCoinType,
                                aggregatorMarkets,
                              });
                              (form.elements.namedItem("amount") as HTMLInputElement).value = "";
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to deploy");
                            }
                          }}
                        >
                          <TBodySans>Deploy funds</TBodySans>
                          <div className="flex flex-row gap-2">
                            <Input name="amount" placeholder="Amount (u64)" inputMode="numeric" />
                            <Button type="submit">Deploy</Button>
                          </div>
                        </form>

                        {/* Withdraw */}
                        <form
                          className="flex flex-col gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            const form = e.currentTarget as HTMLFormElement;
                            const ctokenAmount = (form.elements.namedItem("ctokenAmount") as HTMLInputElement).value;
                            try {
                              if (!fields?.id.id || !baseCoinType) throw new Error("Vault not loaded");
                              if (!o.lendingMarketId) throw new Error("Unknown lending market for this obligation");
                              const aggregatorMarkets = Array.from(
                                new Map(
                                  obligations
                                    .filter((x) => x.marketType && x.lendingMarketId)
                                    .map((x) => [
                                      x.marketType,
                                      {
                                        lendingMarketType: x.marketType,
                                        lendingMarketId: x.lendingMarketId!,
                                      },
                                    ]),
                                ).values(),
                              ) as { lendingMarketId: string; lendingMarketType: string }[];
                              await withdrawDeployedFunds({
                                vaultId: fields.id.id,
                                lendingMarketId: o.lendingMarketId,
                                obligationIndex: o.index,
                                ctokenAmount,
                                baseCoinType,
                                aggregatorMarkets,
                              });
                              (form.elements.namedItem("ctokenAmount") as HTMLInputElement).value = "";
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to withdraw");
                            }
                          }}
                        >
                          <TBodySans>Withdraw funds</TBodySans>
                          <div className="flex flex-row gap-2">
                            <Input name="ctokenAmount" placeholder="cToken amount (u64)" inputMode="numeric" />
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
              onSubmit={async (args) => {
                try {
                  if (!args.vaultId || !args.baseCoinType)
                    throw new Error("Missing vault or base coin type");
                  if (!args.lendingMarketId || !args.lendingMarketType)
                    throw new Error("Enter lending market ID and type");
                  await createObligation(args);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to create obligation");
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deploy funds to obligation</CardTitle>
          </CardHeader>
          <CardContent>
            <DeployFundsForm
              vaultId={fields?.id.id}
              baseCoinType={baseCoinType}
              onSubmit={async (args) => {
                try {
                  if (!args.vaultId || !args.baseCoinType)
                    throw new Error("Missing vault or base coin type");
                  if (!args.lendingMarketId || !args.lendingMarketType)
                    throw new Error("Enter lending market ID and type");
                  if (!args.amount || !args.obligationIndex.toString())
                    throw new Error("Enter amount and obligation index");
                  if (!args.aggregatorMarkets.length)
                    throw new Error("Add at least one aggregator market");
                  await deployFunds(args);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to deploy funds");
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdraw deployed funds</CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawFundsForm
              vaultId={fields?.id.id}
              baseCoinType={baseCoinType}
              onSubmit={async (args) => {
                try {
                  if (!args.vaultId || !args.baseCoinType)
                    throw new Error("Missing vault or base coin type");
                  if (!args.lendingMarketId || !args.lendingMarketType)
                    throw new Error("Enter lending market ID and type");
                  if (!args.ctokenAmount || !args.obligationIndex.toString())
                    throw new Error("Enter cToken amount and obligation index");
                  if (!args.aggregatorMarkets.length)
                    throw new Error("Add at least one aggregator market");
                  await withdrawDeployedFunds(args);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to withdraw funds");
                }
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Compound performance fees</CardTitle>
          </CardHeader>
          <CardContent>
            <CompoundFeesForm
              vaultId={fields?.id.id}
              baseCoinType={baseCoinType}
              onSubmit={async (args) => {
                try {
                  if (!args.vaultId || !args.baseCoinType)
                    throw new Error("Missing vault or base coin type");
                  if (!args.aggregatorMarkets.length)
                    throw new Error("Add at least one aggregator market");
                  await compoundPerformanceFees(args);
                } catch (err: any) {
                  toast.error(err?.message || "Failed to compound fees");
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
}: {
  vaultId?: string;
  baseCoinType?: string;
  onSubmit: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType: string;
    baseCoinType: string;
  }) => Promise<void>;
}) {
  const [lendingMarketId, setLendingMarketId] = useState("");
  const [lendingMarketType, setLendingMarketType] = useState("");
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
            lendingMarketType,
            baseCoinType: baseCoinType!,
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
        <Input placeholder="0x..." value={lendingMarketId} onChange={(e) => setLendingMarketId(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Lending market type (L)</TBodySans>
        <Input placeholder="0x...::module::Type" value={lendingMarketType} onChange={(e) => setLendingMarketType(e.target.value)} />
      </div>
      <div className="col-span-full flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create obligation"}
        </Button>
      </div>
    </form>
  );
}

function DeployFundsForm({
  vaultId,
  baseCoinType,
  onSubmit,
}: {
  vaultId?: string;
  baseCoinType?: string;
  onSubmit: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType: string;
    obligationIndex: number;
    amount: string;
    baseCoinType: string;
    aggregatorMarkets: { lendingMarketId: string; lendingMarketType: string }[];
  }) => Promise<void>;
}) {
  const [lendingMarketId, setLendingMarketId] = useState("");
  const [lendingMarketType, setLendingMarketType] = useState("");
  const [obligationIndex, setObligationIndex] = useState("0");
  const [amount, setAmount] = useState("");
  const [aggregatorMarketsInput, setAggregatorMarketsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseAggregator = () =>
    aggregatorMarketsInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [id, type] = l.split(",").map((s) => s.trim());
        return { lendingMarketId: id, lendingMarketType: type };
      });

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
            lendingMarketType,
            obligationIndex: Number(obligationIndex || 0),
            amount,
            baseCoinType: baseCoinType!,
            aggregatorMarkets: parseAggregator(),
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
        <TBodySans>Lending market ID (target)</TBodySans>
        <Input placeholder="0x..." value={lendingMarketId} onChange={(e) => setLendingMarketId(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Lending market type (target)</TBodySans>
        <Input placeholder="0x...::module::Type" value={lendingMarketType} onChange={(e) => setLendingMarketType(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Obligation index</TBodySans>
        <Input inputMode="numeric" pattern="[0-9]*" value={obligationIndex} onChange={(e) => setObligationIndex(e.target.value.replace(/[^0-9]/g, ""))} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Amount (u64 units of base asset)</TBodySans>
        <Input inputMode="numeric" pattern="[0-9]*" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} />
      </div>
      <div className="col-span-full flex flex-col gap-1">
        <TBodySans>Aggregator markets (one per line: id,type)</TBodySans>
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={aggregatorMarketsInput}
          onChange={(e) => setAggregatorMarketsInput(e.target.value)}
        />
      </div>
      <div className="col-span-full flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Deploying..." : "Deploy funds"}
        </Button>
      </div>
    </form>
  );
}

function WithdrawFundsForm({
  vaultId,
  baseCoinType,
  onSubmit,
}: {
  vaultId?: string;
  baseCoinType?: string;
  onSubmit: (args: {
    vaultId: string;
    lendingMarketId: string;
    lendingMarketType: string;
    obligationIndex: number;
    ctokenAmount: string;
    baseCoinType: string;
    aggregatorMarkets: { lendingMarketId: string; lendingMarketType: string }[];
  }) => Promise<void>;
}) {
  const [lendingMarketId, setLendingMarketId] = useState("");
  const [lendingMarketType, setLendingMarketType] = useState("");
  const [obligationIndex, setObligationIndex] = useState("0");
  const [ctokenAmount, setCtokenAmount] = useState("");
  const [aggregatorMarketsInput, setAggregatorMarketsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parseAggregator = () =>
    aggregatorMarketsInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [id, type] = l.split(",").map((s) => s.trim());
        return { lendingMarketId: id, lendingMarketType: type };
      });

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
            lendingMarketType,
            obligationIndex: Number(obligationIndex || 0),
            ctokenAmount,
            baseCoinType: baseCoinType!,
            aggregatorMarkets: parseAggregator(),
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
        <TBodySans>Lending market ID (target)</TBodySans>
        <Input placeholder="0x..." value={lendingMarketId} onChange={(e) => setLendingMarketId(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Lending market type (target)</TBodySans>
        <Input placeholder="0x...::module::Type" value={lendingMarketType} onChange={(e) => setLendingMarketType(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>Obligation index</TBodySans>
        <Input inputMode="numeric" pattern="[0-9]*" value={obligationIndex} onChange={(e) => setObligationIndex(e.target.value.replace(/[^0-9]/g, ""))} />
      </div>
      <div className="flex flex-col gap-1">
        <TBodySans>cToken amount (u64)</TBodySans>
        <Input inputMode="numeric" pattern="[0-9]*" value={ctokenAmount} onChange={(e) => setCtokenAmount(e.target.value.replace(/[^0-9]/g, ""))} />
      </div>
      <div className="col-span-full flex flex-col gap-1">
        <TBodySans>Aggregator markets (one per line: id,type)</TBodySans>
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={aggregatorMarketsInput}
          onChange={(e) => setAggregatorMarketsInput(e.target.value)}
        />
      </div>
      <div className="col-span-full flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Withdrawing..." : "Withdraw funds"}
        </Button>
      </div>
    </form>
  );
}

function CompoundFeesForm({
  vaultId,
  baseCoinType,
  onSubmit,
}: {
  vaultId?: string;
  baseCoinType?: string;
  onSubmit: (args: {
    vaultId: string;
    baseCoinType: string;
    aggregatorMarkets: { lendingMarketId: string; lendingMarketType: string }[];
  }) => Promise<void>;
}) {
  const [aggregatorMarketsInput, setAggregatorMarketsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parseAggregator = () =>
    aggregatorMarketsInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [id, type] = l.split(",").map((s) => s.trim());
        return { lendingMarketId: id, lendingMarketType: type };
      });
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
            baseCoinType: baseCoinType!,
            aggregatorMarkets: parseAggregator(),
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
      <div className="col-span-full flex flex-col gap-1">
        <TBodySans>Aggregator markets (one per line: id,type)</TBodySans>
        <textarea
          className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          value={aggregatorMarketsInput}
          onChange={(e) => setAggregatorMarketsInput(e.target.value)}
        />
      </div>
      <div className="col-span-full flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Compounding..." : "Compound fees"}
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