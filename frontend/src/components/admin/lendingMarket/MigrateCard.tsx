import { Transaction } from "@mysten/sui/transactions";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

export default function MigrateCard() {
  const { signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  const isEditable = !!userData.lendingMarketOwnerCapId;

  // Submit
  const submit = async () => {
    if (!userData.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    try {
      suilendClient.migrate(transaction, userData.lendingMarketOwnerCapId);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Migrated");
    } catch (err) {
      toast.error("Failed to migrate", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Migrate</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <Button
          labelClassName="uppercase text-xs"
          startIcon={<Package />}
          variant="secondaryOutline"
          onClick={submit}
          disabled={!isEditable}
        >
          Migrate
        </Button>
      </CardContent>
    </Card>
  );
}
