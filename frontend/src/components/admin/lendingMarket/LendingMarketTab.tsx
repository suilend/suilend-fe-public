import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";

import Button from "@/components/shared/Button";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface FeeReceiver {
  address: string;
  weight: string;
}

export default function LendingMarketTab() {
  const { signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, refresh } = useLoadedAppContext();
  const [feeReceivers, setFeeReceivers] = useState<FeeReceiver[]>([
    { address: "", weight: "" },
  ]);

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
      await refresh();
    }
  };

  const addRow = () => {
    setFeeReceivers([...feeReceivers, { address: "", weight: "" }]);
  };

  const deleteRow = (index: number) => {
    if (feeReceivers.length > 1) {
      const newReceivers = [...feeReceivers];
      newReceivers.splice(index, 1);
      setFeeReceivers(newReceivers);
    }
  };

  const updateReceiver = (
    index: number,
    field: keyof FeeReceiver,
    value: string,
  ) => {
    const newReceivers = [...feeReceivers];
    newReceivers[index][field] = value;
    setFeeReceivers(newReceivers);
  };

  const handleSubmit = async () => {
    const transaction = new Transaction();
    try {
      suilendClient.setFeeReceiversAndWeights(
        transaction,
        data.lendingMarketOwnerCapId!,
        feeReceivers.map((r) => r.address),
        feeReceivers.map((r) => BigInt(r.weight)),
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Fee receivers set");
    } catch (err) {
      toast.error("Failed to set fee receivers", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  };

  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader>
          <TTitle className="uppercase">Fee Receivers</TTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fee Receiver</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeReceivers.map((receiver, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        value={receiver.address}
                        onChange={(e) =>
                          updateReceiver(index, "address", e.target.value)
                        }
                        placeholder="Enter address"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={receiver.weight}
                        onChange={(e) =>
                          updateReceiver(index, "weight", e.target.value)
                        }
                        placeholder="Enter weight"
                        type="number"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(index)}
                        disabled={feeReceivers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={addRow}
                startIcon={<Plus className="h-4 w-4" />}
              >
                Add Row
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSubmit}
                disabled={!isEditable}
              >
                Submit
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
