import { useEffect, useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Eraser, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { useWalletContext } from "@suilend/frontend-sui-next";
import { SuilendClient } from "@suilend/sdk";
import { PUBLISHED_AT } from "@suilend/sdk/_generated/suilend";

import Button from "@/components/shared/Button";
import Input, { getInputId } from "@/components/shared/Input";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

interface FeeReceiverRow {
  id: string;
  address: string;
  weight: string;
}

export default function FeeReceiversCard() {
  const { signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data } = useLoadedAppContext();

  const isEditable = !!data.lendingMarketOwnerCapId;
  const [reset, setReset] = useState(true);

  // State
  const [feeReceiverRows, setFeeReceiverRows] = useState<FeeReceiverRow[]>([
    { id: uuidv4(), address: "", weight: "" },
  ]);

  // Load initial fee receivers
  useEffect(() => {
    const loadFeeReceivers = async () => {
      try {
        const feeReceivers = await SuilendClient.getFeeReceivers(
          suilendClient.client,
          suilendClient.lendingMarket.id,
        );

        const rows = feeReceivers.receivers.map((receiver, i) => ({
          id: uuidv4(),
          address: receiver,
          weight: feeReceivers.weights[i].toString(),
        }));

        setFeeReceiverRows(rows);
      } catch (err) {
        console.error("Failed to load fee receivers:", err);
        toast.error("Failed to load fee receivers");
      }
    };

    if (reset) {
      loadFeeReceivers();
      setReset(false);
    }
  }, [suilendClient.client, suilendClient.lendingMarket.id, reset]);

  const onValueChange =
    (id: string, key: keyof FeeReceiverRow) => (value: string) =>
      setFeeReceiverRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
      );

  const removeRow = (id: string) => {
    setFeeReceiverRows((prev) => prev.filter((row) => row.id !== id));
  };

  const addRow = () => {
    const rowId = uuidv4();
    setFeeReceiverRows((prev) => [
      ...prev,
      { id: rowId, address: "", weight: "" },
    ]);

    setTimeout(() => {
      document.getElementById(getInputId(`address-${rowId}`))?.focus();
    });
  };

  // Submit
  const submit = async () => {
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    try {
      suilendClient.setFeeReceiversAndWeights(
        transaction,
        data.lendingMarketOwnerCapId!,
        feeReceiverRows.map((r) => r.address),
        feeReceiverRows.map((r) => BigInt(r.weight)),
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
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Fee Receivers</TTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 rounded-md border p-4">
            {feeReceiverRows.map((row, index) => (
              <div
                key={row.id}
                className="flex w-full flex-row items-end gap-2"
              >
                <div className="flex-1">
                  <Input
                    label={index === 0 ? "address" : undefined}
                    id={`address-${row.id}`}
                    type="text"
                    value={row.address}
                    onChange={onValueChange(row.id, "address")}
                  />
                </div>

                <div className="flex-1">
                  <Input
                    label={index === 0 ? "weight" : undefined}
                    id={`weight-${row.id}`}
                    type="number"
                    value={row.weight}
                    onChange={onValueChange(row.id, "weight")}
                    inputProps={{
                      min: 0,
                      max: 100,
                    }}
                    endDecorator="%"
                  />
                </div>

                <Button
                  className="my-1"
                  tooltip="Remove row"
                  icon={<Minus />}
                  variant="secondary"
                  size="icon"
                  disabled={feeReceiverRows.length < 2}
                  onClick={() => removeRow(row.id)}
                >
                  Remove row
                </Button>
              </div>
            ))}

            <Button
              className="w-full"
              labelClassName="uppercase"
              startIcon={<Plus />}
              variant="secondary"
              size="lg"
              onClick={() => addRow()}
            >
              Add row
            </Button>
          </div>

          <div className="flex w-full flex-row items-center gap-2">
            <Button
              tooltip="Clear"
              icon={<Eraser />}
              variant="ghost"
              size="icon"
              onClick={() => setReset(true)}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
              disabled={!isEditable}
            >
              Save changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
