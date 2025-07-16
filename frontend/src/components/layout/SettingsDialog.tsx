import { useState } from "react";

import { Settings } from "lucide-react";

import { ExplorerId, RpcId } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import ExplorerSelect from "@/components/layout/ExplorerSelect";
import RpcSelect from "@/components/layout/RpcSelect";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import Switch from "@/components/shared/Switch";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";

export default function SettingsDialog() {
  const {
    rpc,
    setRpcId,
    setRpcUrl,
    explorer,
    setExplorerId,
    gasBudget,
    setGasBudget,
  } = useSettingsContext();
  const { isUsingLedger, setIsUsingLedger } = useWalletContext();

  // Custom RPC URL
  const [customRpcUrl, setCustomRpcUrl] = useState<string>(
    rpc.id === RpcId.CUSTOM ? rpc.url : "",
  );

  return (
    <Dialog
      trigger={
        <Button
          className="text-muted-foreground"
          icon={<Settings />}
          variant="ghost"
          size="icon"
        >
          Settings
        </Button>
      }
      headerProps={{
        title: { children: "Settings" },
      }}
      dialogContentInnerClassName="max-w-md"
    >
      {/* RPC */}
      <div className="flex w-full flex-col gap-4">
        <div className="flex flex-row items-center gap-4">
          <TLabelSans className="flex-1">RPC</TLabelSans>

          <div className="flex-1">
            <RpcSelect
              value={rpc.id}
              onChange={(id) => setRpcId(id as RpcId)}
            />
          </div>
        </div>

        {rpc.id === RpcId.CUSTOM && (
          <>
            <div className="flex flex-row items-center gap-4">
              <TLabelSans>Custom RPC</TLabelSans>

              <div className="flex-1">
                <Input
                  id="customRpcUrl"
                  value={customRpcUrl}
                  onChange={setCustomRpcUrl}
                  inputProps={{
                    className: "h-8 rounded-sm bg-card font-sans",
                    autoFocus: rpc.url === "",
                    onBlur: () => setRpcUrl(customRpcUrl),
                  }}
                />
              </div>
            </div>

            <Separator />
          </>
        )}
      </div>

      {/* Explorer */}
      <div className="flex flex-row items-center gap-4">
        <TLabelSans className="flex-1">Explorer</TLabelSans>

        <div className="flex-1">
          <ExplorerSelect
            value={explorer.id}
            onChange={(id) => setExplorerId(id as ExplorerId)}
          />
        </div>
      </div>

      {/* Gas budget */}
      <div className="flex flex-row items-center justify-between gap-4">
        <TLabelSans>Gas budget (leave blank for auto)</TLabelSans>

        <div className="w-[120px]">
          <Input
            id="gasBudget"
            value={gasBudget}
            onChange={setGasBudget}
            inputProps={{ className: "h-8 rounded-sm bg-card font-sans" }}
            endDecorator="SUI"
          />
        </div>
      </div>

      {/* Ledger */}
      <Switch
        className="w-full justify-between"
        id="isUsingLedger"
        label="Using a Ledger"
        horizontal
        isChecked={isUsingLedger}
        onToggle={setIsUsingLedger}
      />
    </Dialog>
  );
}
