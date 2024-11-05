import { useRef } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { cloneDeep } from "lodash";
import { Bolt, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";
import { ParsedRateLimiter } from "@suilend/sdk/parsers/rateLimiter";

import Dialog from "@/components/admin/Dialog";
import DiffLine from "@/components/admin/DiffLine";
import RateLimiterConfig, {
  ConfigState,
  parseConfigState,
  useRateLimiterConfigState,
} from "@/components/admin/RateLimiterConfig";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import { AppData, useAppContext } from "@/contexts/AppContext";

interface DiffProps {
  initialState: ConfigState;
  currentState: ConfigState;
}

function Diff({ initialState, currentState }: DiffProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      {Object.entries(initialState).map(([key, initialValue]) => {
        const newValue = currentState[key as keyof ConfigState];

        return (
          <DiffLine
            key={key}
            label={key}
            initialValue={initialValue as string | number | boolean}
            newValue={newValue as string | number | boolean}
          />
        );
      })}
    </div>
  );
}

export default function RateLimiterConfigDialog() {
  const { refreshData, signExecuteAndWaitForTransaction, ...restAppContext } =
    useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const isEditable = !!data.lendingMarketOwnerCapId;

  const getInitialConfigState = (
    config: ParsedRateLimiter["config"],
  ): ConfigState => ({
    maxOutflow: config.maxOutflow.toString(),
    windowDuration: config.windowDuration.toString(),
  });
  const initialConfigStateRef = useRef<ConfigState>(
    getInitialConfigState(data.lendingMarket.rateLimiter.config),
  );

  const rateLimiterConfigState = useRateLimiterConfigState(
    initialConfigStateRef.current,
  );
  const { configState, resetConfigState } = rateLimiterConfigState;

  // Save
  const saveChanges = async () => {
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState);

    try {
      await suilendClient.updateRateLimiterConfig(
        data.lendingMarketOwnerCapId,
        transaction,
        newConfig,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Rate limiter config updated");
      initialConfigStateRef.current = cloneDeep(configState);
    } catch (err) {
      toast.error("Failed to update rate limiter config", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
    }
  };

  return (
    <Dialog
      trigger={
        <Button
          labelClassName="uppercase text-xs"
          startIcon={<Bolt />}
          variant="secondaryOutline"
        >
          Config
        </Button>
      }
      titleIcon={<Bolt />}
      title="Config"
      footer={
        <div className="flex w-full flex-row items-center gap-2">
          <Button
            tooltip="Revert changes"
            icon={<Undo2 />}
            variant="ghost"
            size="icon"
            onClick={resetConfigState}
          >
            Revert changes
          </Button>
          <Button
            className="flex-1"
            labelClassName="uppercase"
            size="lg"
            onClick={saveChanges}
            disabled={!isEditable}
          >
            Save changes
          </Button>
        </div>
      }
    >
      <Grid>
        <RateLimiterConfig {...rateLimiterConfigState} />
      </Grid>

      <Diff
        initialState={initialConfigStateRef.current}
        currentState={configState}
      />
    </Dialog>
  );
}
