import { Transaction } from "@mysten/sui/transactions";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui";
import { SuilendClient } from "@suilend/sdk";

import Button from "@/components/shared/Button";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AppData, useAppContext } from "@/contexts/AppContext";

export default function LendingMarketTab() {
  const { signExecuteAndWaitForTransaction } = useWalletContext();
  const { refreshData, ...restAppContext } = useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const isEditable = !!data.lendingMarketOwnerCapId;

  const onMigrate = async () => {
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    try {
      suilendClient.migrate(transaction, data.lendingMarketOwnerCapId);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Migrated");
    } catch (err) {
      toast.error("Failed to migrate", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Lending market</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <Button
          labelClassName="uppercase text-xs"
          startIcon={<Package />}
          variant="secondaryOutline"
          onClick={onMigrate}
          disabled={!isEditable}
        >
          Migrate
        </Button>
      </CardContent>
    </Card>
  );
}
