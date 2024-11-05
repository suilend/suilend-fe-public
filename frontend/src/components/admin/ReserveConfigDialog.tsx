import { useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { cloneDeep } from "lodash";
import { Bolt, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import Dialog from "@/components/admin/Dialog";
import DiffLine, { InterestRateDiffLine } from "@/components/admin/DiffLine";
import ReserveConfig, {
  ConfigState,
  getSortedInterestRate,
  parseConfigState,
  useReserveConfigState,
} from "@/components/admin/ReserveConfig";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { TBody } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";

interface DiffProps {
  initialState: { pythPriceId: string } & ConfigState;
  currentState: { pythPriceId: string } & ConfigState;
}

function Diff({ initialState, currentState }: DiffProps) {
  return (
    <div className="flex w-full flex-col gap-1">
      {Object.entries(initialState).map(([key, initialValue]) => {
        const newValue = currentState[key as keyof ConfigState];

        if (key === "interestRate") {
          return (
            <InterestRateDiffLine
              key={key}
              label={key}
              initialValue={initialValue as ConfigState["interestRate"]}
              newValue={getSortedInterestRate(
                newValue as ConfigState["interestRate"],
              )}
            />
          );
        }
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

interface ReserveConfigDialogProps {
  reserve: ParsedReserve;
}

export default function ReserveConfigDialog({
  reserve,
}: ReserveConfigDialogProps) {
  const { address } = useWalletContext();
  const {
    refreshData,
    explorer,
    signExecuteAndWaitForTransaction,
    ...restAppContext
  } = useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const isEditable = !!data.lendingMarketOwnerCapId;

  const [pythPriceId, setPythPriceId] = useState<string>(
    reserve.priceIdentifier,
  );
  const initialPythPriceIdRef = useRef<string>(pythPriceId);

  const getInitialConfigState = (
    config: ParsedReserve["config"],
  ): ConfigState => ({
    openLtvPct: config.openLtvPct.toString(),
    closeLtvPct: config.closeLtvPct.toString(),
    maxCloseLtvPct: config.maxCloseLtvPct.toString(),
    borrowWeightBps: config.borrowWeightBps.toString(),
    depositLimit: config.depositLimit.toString(),
    borrowLimit: config.borrowLimit.toString(),
    liquidationBonusBps: config.liquidationBonusBps.toString(),
    maxLiquidationBonusBps: config.maxLiquidationBonusBps.toString(),
    depositLimitUsd: config.depositLimitUsd.toString(),
    borrowLimitUsd: config.borrowLimitUsd.toString(),
    borrowFeeBps: config.borrowFeeBps.toString(),
    spreadFeeBps: config.spreadFeeBps.toString(),
    protocolLiquidationFeeBps: config.protocolLiquidationFeeBps.toString(),
    isolated: config.isolated,
    openAttributedBorrowLimitUsd:
      config.openAttributedBorrowLimitUsd.toString(),
    closeAttributedBorrowLimitUsd:
      config.closeAttributedBorrowLimitUsd.toString(),
    interestRate: config.interestRate.map((row) => ({
      ...row,
      utilPercent: row.utilPercent.toString(),
      aprPercent: row.aprPercent.toString(),
    })),
  });
  const initialConfigStateRef = useRef<ConfigState>(
    getInitialConfigState(reserve.config),
  );

  const reserveConfigState = useReserveConfigState(
    initialConfigStateRef.current,
  );
  const { configState, resetConfigState } = reserveConfigState;

  const reset = () => {
    setPythPriceId(reserve.priceIdentifier);

    resetConfigState();
  };

  // Save
  const saveChanges = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState, reserve.mintDecimals);

    try {
      if (pythPriceId !== initialPythPriceIdRef.current)
        await suilendClient.changeReservePriceFeed(
          data.lendingMarketOwnerCapId,
          reserve.coinType,
          pythPriceId,
          transaction,
        );
      await suilendClient.updateReserveConfig(
        address,
        data.lendingMarketOwnerCapId,
        transaction,
        reserve.coinType,
        newConfig,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reserve config updated");
      initialConfigStateRef.current = cloneDeep(configState);
    } catch (err) {
      toast.error("Failed to update reserve config", {
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
      description={
        <div className="flex flex-row gap-2">
          <TBody>{reserve.symbol}</TBody>
          <Value
            value={reserve.id}
            isId
            url={explorer.buildObjectUrl(reserve.id)}
            isExplorerUrl
          />
        </div>
      }
      descriptionAsChild
      footer={
        <div className="flex w-full flex-row items-center gap-2">
          <Button
            tooltip="Revert changes"
            icon={<Undo2 />}
            variant="ghost"
            size="icon"
            onClick={reset}
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
        <LabelWithValue
          label="$typeName"
          value={reserve.config.$typeName}
          isType
        />
        <Input
          label="pythPriceId"
          id="pythPriceId"
          value={pythPriceId}
          onChange={setPythPriceId}
        />

        <ReserveConfig symbol={reserve.symbol} {...reserveConfigState} />
      </Grid>

      <Diff
        initialState={{
          pythPriceId: initialPythPriceIdRef.current,
          ...initialConfigStateRef.current,
        }}
        currentState={{
          pythPriceId,
          ...configState,
        }}
      />
    </Dialog>
  );
}
