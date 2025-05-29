import { useRef } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { cloneDeep } from "lodash";
import { Bolt, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_ADDRESS } from "@suilend/sdk";
import { ParsedRateLimiter } from "@suilend/sdk/parsers/rateLimiter";
import { useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import DiffLine from "@/components/admin/DiffLine";
import RateLimiterConfig, {
  ConfigState,
  parseConfigState,
  useRateLimiterConfigState,
} from "@/components/admin/lendingMarket/RateLimiterConfig";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import { useLoadedUserContext } from "@/contexts/UserContext";

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
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  const getInitialConfigState = (
    config: ParsedRateLimiter["config"],
  ): ConfigState => ({
    maxOutflow: config.maxOutflow.toString(),
    windowDuration: config.windowDuration.toString(),
  });
  const initialConfigStateRef = useRef<ConfigState>(
    getInitialConfigState(appData.lendingMarket.rateLimiter.config),
  );

  const rateLimiterConfigState = useRateLimiterConfigState(
    initialConfigStateRef.current,
  );
  const { configState, resetConfigState } = rateLimiterConfigState;

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState);

    try {
      appData.suilendClient.updateRateLimiterConfig(
        appData.lendingMarket.ownerCapId,
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
      refresh();
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
      headerProps={{
        title: { icon: <Bolt />, children: "Config" },
      }}
      footerProps={{
        children: (
          <>
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
              onClick={submit}
              disabled={!isEditable}
            >
              Save changes
            </Button>
          </>
        ),
      }}
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
