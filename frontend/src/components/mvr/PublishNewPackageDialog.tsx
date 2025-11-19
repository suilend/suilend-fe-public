import { useCallback, useEffect, useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { DebouncedFunc, debounce } from "lodash";
import { Plus } from "lucide-react";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import { TLabelSans } from "@/components/shared/Typography";

interface PublishNewPackageDialogProps {
  multisigAddress: string;
}
export default function PublishNewPackageDialog({
  multisigAddress,
}: PublishNewPackageDialogProps) {
  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [bytecode, setBytecode] = useState<string>("");
  const [transactionJSON, setTransactionJSON] = useState<string>("");

  const getTransactionJSON = async (
    _multisigAddress: string,
    _bytecode: string,
  ) => {
    // 1) Publish
    const transaction = new Transaction();
    transaction.setSender(_multisigAddress);

    const [upgradeCap] = transaction.publish({
      modules: [[...Buffer.from(_bytecode, "base64")]],
      dependencies: [normalizeSuiAddress("0x1"), normalizeSuiAddress("0x2")],
    });
    transaction.transferObjects(
      [upgradeCap],
      transaction.pure.address(_multisigAddress),
    );

    const json = await transaction.toJSON();
    setTransactionJSON(json);
  };
  const debouncedGetTransactionJSONRef = useRef<
    DebouncedFunc<typeof getTransactionJSON>
  >(debounce(getTransactionJSON, 100));

  const onBytecodeChange = useCallback(
    (_bytecode: string) => {
      setBytecode(_bytecode);
      debouncedGetTransactionJSONRef.current(multisigAddress, _bytecode);
    },
    [multisigAddress],
  );

  // Reset
  const reset = useCallback(() => {
    setBytecode("");
    setTransactionJSON("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          variant="secondary"
          startIcon={<Plus />}
        >
          Publish new package
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Publish new package" },
      }}
    >
      <div className="flex w-full flex-row gap-4">
        {/* Bytecode */}
        <div className="flex flex-1 flex-col gap-2">
          <TLabelSans>Bytecode</TLabelSans>
          <textarea
            id="bytecode"
            className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
            value={bytecode}
            onChange={(e) => onBytecodeChange(e.target.value)}
            rows={24}
          />
        </div>

        {/* Transaction JSON */}
        <div className="flex flex-1 flex-col gap-2">
          <TLabelSans>Transaction JSON</TLabelSans>
          <textarea
            id="transactionJSON"
            className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            value={transactionJSON}
            readOnly
            rows={24}
          />
        </div>
      </div>
    </Dialog>
  );
}
