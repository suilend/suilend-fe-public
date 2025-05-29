import { useEffect, useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { Minus, Plus, Undo2 } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { ADMIN_ADDRESS, SuilendClient } from "@suilend/sdk";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import Button from "@/components/shared/Button";
import Input, { getInputId } from "@/components/shared/Input";
import { TLabelSans, TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface FeeReceiverRow {
  id: string;
  address: string;
  weight: string;
}

export default function FeeReceiversCard() {
  const { suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const initialFeeReceiverRowsRef = useRef<FeeReceiverRow[] | undefined>(
    undefined,
  );
  const [feeReceiverRows, setFeeReceiverRows] = useState<FeeReceiverRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const feeReceivers = await SuilendClient.getFeeReceivers(
          suiClient,
          appData.lendingMarket.id,
        );

        const rows: FeeReceiverRow[] = feeReceivers.receivers.map(
          (receiver, index) => ({
            id: uuidv4(),
            address: receiver,
            weight: feeReceivers.weights[index].toString(),
          }),
        );

        initialFeeReceiverRowsRef.current = rows;
        setFeeReceiverRows(initialFeeReceiverRowsRef.current);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [suiClient, appData.lendingMarket.id]);

  const onChange = (id: string, key: keyof FeeReceiverRow) => (value: string) =>
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
  const revert = () => {
    if (!initialFeeReceiverRowsRef.current) return;

    setFeeReceiverRows(initialFeeReceiverRowsRef.current);
  };

  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    const transaction = new Transaction();

    try {
      appData.suilendClient.setFeeReceiversAndWeights(
        transaction,
        appData.lendingMarket.ownerCapId,
        feeReceiverRows.map((r) => r.address),
        feeReceiverRows.map((r) => BigInt(r.weight)),
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Fee receivers set");
    } catch (err) {
      toast.error("Failed to set fee receivers", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Fee Receivers</TTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {/* Table */}
          <div className="flex flex-col gap-2">
            {feeReceiverRows.map((row, index) => (
              <div key={row.id} className="flex w-full flex-row gap-2">
                {/* Address */}
                <div className="flex flex-1 flex-col gap-2">
                  {index === 0 && (
                    <div className="flex flex-row justify-between">
                      <label htmlFor={getInputId(`address-${row.id}`)}>
                        <TLabelSans>address</TLabelSans>
                      </label>
                    </div>
                  )}
                  <TextareaAutosize
                    id={getInputId(`address-${row.id}`)}
                    className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={row.address}
                    onChange={(e) =>
                      onChange(row.id, "address")(e.target.value)
                    }
                    minRows={1}
                  />
                </div>

                {/* Weight */}
                <div className="w-[80p] md:w-[120px]">
                  <Input
                    label={index === 0 ? "weight" : undefined}
                    id={`weight-${row.id}`}
                    type="number"
                    value={row.weight}
                    onChange={onChange(row.id, "weight")}
                    inputProps={{
                      min: 0,
                      max: 100,
                    }}
                    endDecorator="%"
                  />
                </div>

                {/* Remove row */}
                <div className="flex flex-col gap-2">
                  {index === 0 && (
                    <TLabelSans className="opacity-0">-</TLabelSans>
                  )}
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
              </div>
            ))}

            {/* Add row */}
            <div className="w-full pr-10">
              <Button
                className="w-full"
                labelClassName="uppercase"
                startIcon={<Plus />}
                variant="secondary"
                onClick={() => addRow()}
              >
                Add row
              </Button>
            </div>
          </div>

          {/* Submit */}
          <div className="flex w-full flex-row items-center gap-2">
            <Button
              tooltip="Revert changes"
              icon={<Undo2 />}
              variant="ghost"
              size="icon"
              onClick={revert}
            >
              Revert changes
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
