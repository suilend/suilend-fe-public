import { useState } from "react";

import { Settings } from "lucide-react";

import { ExplorerId, RpcId } from "@suilend/frontend-sui";
import { useSettingsContext } from "@suilend/frontend-sui-next";

import Dialog from "@/components/dashboard/Dialog";
import ExplorerSelect from "@/components/layout/ExplorerSelect";
import RpcSelect from "@/components/layout/RpcSelect";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
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

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpenChange = (_isOpen: boolean) => {
    setIsOpen(_isOpen);
  };

  // Custom RPC URL
  const [customRpcUrl, setCustomRpcUrl] = useState<string>(
    rpc.id === RpcId.CUSTOM ? rpc.url : "",
  );

  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange }}
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
      dialogContentProps={{
        className: "max-w-md",
      }}
      headerProps={{ title: "Settings" }}
      isDialogAutoHeight
      isDrawerAutoHeight
    >
      <div className="flex w-full flex-col gap-4 overflow-y-auto p-4 pt-0">
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
      </div>
    </Dialog>
  );
}
