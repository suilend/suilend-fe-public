import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

import { TBody, TBodySans, TLabelSans } from "@/components/shared/Typography";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VaultContextProvider, useVaultContext } from "@/contexts/VaultContext";

function Page() {
  const { createVault, vaults } = useVaultContext();

  const [baseCoinType, setBaseCoinType] = useState<string>("");
  const [feeReceiver, setFeeReceiver] = useState<string>("");
  const [managementFeeBps, setManagementFeeBps] = useState<string>("0");
  const [performanceFeeBps, setPerformanceFeeBps] = useState<string>("0");
  const [depositFeeBps, setDepositFeeBps] = useState<string>("0");
  const [withdrawalFeeBps, setWithdrawalFeeBps] = useState<string>("0");

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Vaults come from context via unified fetcher

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
        feeReceiver,
      });
    } catch (err) {
      console.error("onSubmit error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Suilend | Vaults Admin</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <TBody className="uppercase">Vaults Admin</TBody>

        <Card>
          <CardHeader>
            <CardTitle>Your vaults</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {vaults.length === 0 ? (
                <TLabelSans>No vaults found.</TLabelSans>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {vaults.map((v) => (
                    <Card key={v.id}>
                      <CardHeader>
                        <CardTitle className="break-all text-base">
                          Vault {v.id}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col gap-2">
                        <TLabelSans className="break-all">
                          Base coin: {v.baseCoinType ?? "-"}
                        </TLabelSans>
                        <div>
                          <Link
                            className="underline"
                            href={`/vaults/admin/${v.id}`}
                          >
                            Manage
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create vault</CardTitle>
          </CardHeader>
          <CardContent>
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
                <TBodySans>Fee receiver (optional)</TBodySans>
                <Input
                  placeholder="0x... (defaults to your address)"
                  value={feeReceiver}
                  onChange={(e) => setFeeReceiver(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <TBodySans>Management fee (bps)</TBodySans>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={managementFeeBps}
                  onChange={(e) =>
                    setManagementFeeBps(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <TBodySans>Performance fee (bps)</TBodySans>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={performanceFeeBps}
                  onChange={(e) =>
                    setPerformanceFeeBps(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <TBodySans>Deposit fee (bps)</TBodySans>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={depositFeeBps}
                  onChange={(e) =>
                    setDepositFeeBps(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <TBodySans>Withdrawal fee (bps)</TBodySans>
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={withdrawalFeeBps}
                  onChange={(e) =>
                    setWithdrawalFeeBps(e.target.value.replace(/[^0-9]/g, ""))
                  }
                />
              </div>

              <div className="col-span-full flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create vault"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default function AdminVaults() {
  return (
    <VaultContextProvider>
      <Page />
    </VaultContextProvider>
  );
}
