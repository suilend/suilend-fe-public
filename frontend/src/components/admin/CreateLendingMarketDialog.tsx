import { useState } from "react";

import init, { update_identifiers } from "@mysten/move-bytecode-template";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { LENDING_MARKET_REGISTRY_ID, SuilendClient } from "@suilend/sdk";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TextLink from "@/components/shared/TextLink";
import { TBody } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { TX_TOAST_DURATION } from "@/lib/constants";

const generate_bytecode = (module: string, type: string) => {
  const bytecode = Buffer.from(
    "oRzrCwYAAAAFAQACAgIEBwYeCCQgCkQFAAIAAAIACFRFTVBMQVRFC2R1bW15X2ZpZWxkCHRlbXBsYXRlAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgEBAQA=",
    "base64",
  );

  const updated = update_identifiers(bytecode, {
    TEMPLATE: type,
    template: module,
  });

  return updated;
};

export default function CreateLendingMarketDialog() {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [module, setModule] = useState<string>("");
  const [type, setType] = useState<string>("");

  const reset = () => {
    setType("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");

    if (module === "") {
      toast.error("Enter a module");
      return;
    }
    if (type === "") {
      toast.error("Enter a type");
      return;
    }

    let fullType: string | undefined;
    try {
      // 0) Prepare
      await init();

      // 1) Publish
      const transaction = new Transaction();

      const bytecode = generate_bytecode(module, type);

      const [upgradeCap] = transaction.publish({
        modules: [[...bytecode]],
        dependencies: [normalizeSuiAddress("0x1"), normalizeSuiAddress("0x2")],
      });
      transaction.transferObjects(
        [upgradeCap],
        transaction.pure.address(address),
      );

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Created type", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });

      const packageId: string = (
        res.objectChanges?.find((o) => o.type === "published") as any
      ).packageId;
      fullType = `${packageId}::${module}::${type}`;
    } catch (err) {
      toast.error("Failed to create type", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }

    if (!fullType) return;
    try {
      const transaction = new Transaction();

      const ownerCap = SuilendClient.createNewLendingMarket(
        LENDING_MARKET_REGISTRY_ID,
        fullType,
        transaction,
      );
      transaction.transferObjects([ownerCap], address);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Created lending market", {
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
      toast.error("Failed to create lending market", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button icon={<Plus />} variant="secondary" size="icon">
          Create lending market
        </Button>
      }
      headerProps={{
        title: { icon: <Plus />, children: "Create lending market" },
      }}
      dialogContentInnerClassName="max-w-lg"
      footerProps={{
        children: (
          <>
            <Button
              tooltip="Clear"
              icon={<Eraser />}
              variant="ghost"
              size="icon"
              onClick={reset}
            >
              Clear
            </Button>
            <Button
              className="flex-1"
              labelClassName="uppercase"
              size="lg"
              onClick={submit}
            >
              Create
            </Button>
          </>
        ),
      }}
    >
      <div className="flex flex-row items-end">
        <Input
          className="flex-1"
          label="package"
          id="package"
          value="GENERATED"
          onChange={() => {}}
          inputProps={{ disabled: true }}
        />
        <div className="flex h-10 flex-row items-center">
          <TBody>::</TBody>
        </div>
        <Input
          className="flex-1"
          label="module"
          id="module"
          value={module}
          onChange={setModule}
          inputProps={{ autoFocus: true }}
        />
        <div className="flex h-10 flex-row items-center">
          <TBody>::</TBody>
        </div>
        <Input
          className="flex-1"
          label="type"
          id="type"
          value={type}
          onChange={setType}
        />
      </div>
    </Dialog>
  );
}
