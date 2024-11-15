import { useEffect, useRef, useState } from "react";

import { Settings } from "lucide-react";
import { toast } from "sonner";

import { EXPLORERS, ExplorerId, RPCS, RpcId } from "@suilend/frontend-sui";

import Dialog from "@/components/dashboard/Dialog";
import ExplorerSelect from "@/components/layout/ExplorerSelect";
import RpcSelect from "@/components/layout/RpcSelect";
import Button from "@/components/shared/Button";
import Input from "@/components/shared/Input";
import { TLabelSans } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { useAppContext } from "@/contexts/AppContext";
import { useSettingsContext } from "@/contexts/SettingsContext";

export default function SettingsDialog() {
  const { gasBudget, setGasBudget } = useSettingsContext();
  const { rpc, customRpcUrl, setRpc, explorer, setExplorerId } =
    useAppContext();

  // State
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const onOpenChange = (_isOpen: boolean) => {
    setIsOpen(_isOpen);
  };

  // Rpc
  type RpcState = {
    id: RpcId;
    customUrl: string;
  };

  const [rpcState, setRpcState] = useState<RpcState>({
    id: rpc.id,
    customUrl: customRpcUrl,
  });
  const initialRpcStateRef = useRef<RpcState>(rpcState);

  useEffect(() => {
    if (!isOpen) return;

    const newRpcState = { id: rpc.id, customUrl: customRpcUrl };
    setRpcState(newRpcState);
    initialRpcStateRef.current = newRpcState;
  }, [isOpen, rpc, customRpcUrl]);

  const onRpcIdChange = (id: RpcId) => {
    const newRpc = RPCS.find((r) => r.id === id);
    if (!newRpc) return;

    setRpcState((s) => ({ ...s, id: newRpc.id }));

    if (newRpc.id !== RpcId.CUSTOM) {
      setRpc(newRpc.id, "");
      toast.info(`Switched to ${newRpc.name}`);
    }
  };

  const onCustomRpcUrlChange = (customUrl: string) => {
    setRpcState((s) => ({ ...s, customUrl }));
  };

  const saveCustomRpc = () => {
    setRpc(RpcId.CUSTOM, rpcState.customUrl);

    toast.info("Switched to custom RPC", {
      description: rpcState.customUrl,
    });
  };

  // Explorer
  const onExplorerIdChange = (id: ExplorerId) => {
    const newExplorer = EXPLORERS.find((e) => e.id === id);
    if (!newExplorer) return;

    setExplorerId(newExplorer.id);
    toast.info(`Switched to ${newExplorer.name}`);
  };

  return (
    <Dialog
      rootProps={{ open: isOpen, onOpenChange }}
      trigger={
        <Button icon={<Settings />} variant="ghost" size="icon">
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
                value={rpcState.id}
                onChange={(id) => onRpcIdChange(id as RpcId)}
              />
            </div>
          </div>

          {rpcState.id === RpcId.CUSTOM && (
            <>
              <div className="flex flex-row items-center gap-4">
                <TLabelSans>Custom RPC</TLabelSans>

                <div className="flex-1">
                  <Input
                    id="customRpcUrl"
                    value={rpcState.customUrl}
                    onChange={onCustomRpcUrlChange}
                    inputProps={{
                      className: "h-8 rounded-sm bg-card font-sans",
                      autoFocus: initialRpcStateRef.current.customUrl === "",
                    }}
                  />
                </div>
              </div>

              <div className="flex w-full flex-row justify-end gap-2">
                <Button
                  labelClassName="uppercase"
                  disabled={!rpcState.customUrl}
                  onClick={saveCustomRpc}
                >
                  Save
                </Button>
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
              onChange={(id) => onExplorerIdChange(id as ExplorerId)}
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
