import { useCallback, useEffect, useRef, useState } from "react";

import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { DebouncedFunc, debounce } from "lodash";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { TX_TOAST_DURATION } from "@suilend/sui-fe";
import { useSettingsContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TextLink from "@/components/shared/TextLink";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";

interface PublishPackageDialogProps {
  address: string;
  isMultisig: boolean;
  refresh: () => Promise<void>;
}
export default function PublishPackageDialog({
  address,
  isMultisig,
  refresh,
}: PublishPackageDialogProps) {
  const { explorer, suiClient } = useSettingsContext();
  const { mutateAsync: signAndExecuteTransaction } =
    useSignAndExecuteTransaction();

  const { data: session } = useSession();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [bytecode, setBytecode] = useState<string>("");

  // Transaction
  const [transactionBase64, setTransactionBase64] = useState<string>("");

  const getTransaction = useCallback((_address: string, _bytecode: string) => {
    const transaction = new Transaction();
    transaction.setSender(_address);

    // 1) Publish
    // const [upgradeCap] = transaction.publish({
    //   modules: build.modules,
    //   dependencies: build.dependencies,
    // });
    // transaction.transferObjects(
    //   [upgradeCap],
    //   transaction.pure.address(_address),
    // );

    return transaction;
  }, []);
  const getTransactionBase64 = useCallback(
    async (_address: string, _bytecode: string) => {
      const transaction = getTransaction(_address, _bytecode);

      const transactionBytes = await transaction.build({ client: suiClient });
      const base64 = Buffer.from(transactionBytes).toString("base64");
      setTransactionBase64(base64);
    },
    [getTransaction, suiClient],
  );
  const debouncedGetTransactionBase64Ref = useRef<
    DebouncedFunc<typeof getTransactionBase64>
  >(debounce(getTransactionBase64, 100));

  // Submit
  const reset = useCallback(() => {
    setBytecode("");
    setTransactionBase64("");
  }, []);

  useEffect(() => {
    if (!isDialogOpen) reset();
  }, [isDialogOpen, reset]);

  const submit = async () => {
    try {
      const transaction = getTransaction(address, bytecode);

      const res1 = await signAndExecuteTransaction({ transaction });
      const res = await suiClient.waitForTransaction({
        digest: res1.digest,
        options: {
          showBalanceChanges: true,
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
        },
      });
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Published package", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });

      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to register package", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  // On change
  const onBytecodeChange = useCallback(
    async (_bytecode: string) => {
      setBytecode(_bytecode);

      if (!isMultisig) return;
      try {
        await debouncedGetTransactionBase64Ref.current(address, _bytecode);
      } catch (err) {
        console.error(err);
        // Fail silently
      }
    },
    [isMultisig, address],
  );

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-max"
          labelClassName="uppercase"
          startIcon={<Plus />}
          disabled={!session || !address}
        >
          Publish package
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Publish package" },
      }}
      footerProps={{
        children: (
          <>
            {isMultisig ? (
              <div className="flex w-full flex-col gap-4">
                <Separator className="-mx-4 w-auto" />

                <div className="flex w-full flex-col gap-2">
                  <TLabelSans>Transaction base64</TLabelSans>
                  <textarea
                    id="transactionBase64"
                    className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    value={transactionBase64}
                    readOnly
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <Button
                className="w-full"
                labelClassName="uppercase"
                size="lg"
                onClick={submit}
              >
                Publish
              </Button>
            )}
          </>
        ),
      }}
    >
      <div className="flex w-full flex-col gap-4">
        {/* Version */}
        <Input
          label="Version"
          id="version"
          value="1"
          onChange={() => {}}
          inputProps={{
            className: "bg-transparent",
            readOnly: true,
          }}
        />

        {/* Bytecode */}
        <div className="flex w-full flex-col gap-2">
          <TLabelSans>Bytecode</TLabelSans>
          <textarea
            id="bytecode"
            className="border-divider flex min-h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
            value={bytecode}
            onChange={(e) => onBytecodeChange(e.target.value)}
            rows={16}
          />
        </div>
      </div>
    </Dialog>
  );
}
