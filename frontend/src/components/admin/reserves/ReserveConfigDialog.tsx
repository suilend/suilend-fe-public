import { useRef, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { cloneDeep } from "lodash";
import { Bolt, Rss, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import { useAdminContext } from "@/components/admin/AdminContext";
import DiffLine, { InterestRateDiffLine } from "@/components/admin/DiffLine";
import ReserveConfig, {
  ConfigState,
  getSortedInterestRate,
  parseConfigState,
  useReserveConfigState,
} from "@/components/admin/reserves/ReserveConfig";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import LabelWithValue from "@/components/shared/LabelWithValue";
import { useLoadedUserContext } from "@/contexts/UserContext";

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
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = !!appData.lendingMarketOwnerCapId;

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

  const revert = () => {
    setPythPriceId(reserve.priceIdentifier);

    resetConfigState();
  };

  // Save
  const createPriceFeed = async () => {
    if (pythPriceId === "") {
      toast.error("Enter a pyth price id");
      return;
    }

    const transaction = new Transaction();

    try {
      const priceUpdateData =
        await appData.suilendClient.pythConnection.getPriceFeedsUpdateData([
          pythPriceId,
        ]);
      await appData.suilendClient.pythClient.createPriceFeed(
        transaction,
        priceUpdateData,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Pyth price feed created");
    } catch (err) {
      toast.error("Failed to create Pyth price feed", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    }
  };

  const saveChanges = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!isEditable) throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState, reserve.mintDecimals);

    try {
      if (pythPriceId !== initialPythPriceIdRef.current)
        await appData.suilendClient.changeReservePriceFeed(
          appData.lendingMarketOwnerCapId,
          reserve.coinType,
          pythPriceId,
          transaction,
        );
      appData.suilendClient.updateReserveConfig(
        appData.lendingMarketOwnerCapId,
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
        title: { icon: <Bolt />, children: `${reserve.token.symbol} Config` },
      }}
      footerProps={{
        children: (
          <>
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
              onClick={saveChanges}
              disabled={!isEditable}
            >
              Save changes
            </Button>
          </>
        ),
      }}
    >
      <Grid>
        <LabelWithValue
          label="$typeName"
          value={reserve.config.$typeName}
          isType
        />
        <div className="flex w-full flex-row items-end gap-2">
          <Input
            className="flex-1"
            label="pythPriceId"
            id="pythPriceId"
            value={pythPriceId}
            onChange={setPythPriceId}
          />
          <Button
            className="my-1"
            tooltip="Create price feed"
            icon={<Rss />}
            variant="secondary"
            size="icon"
            onClick={createPriceFeed}
          >
            Create price feed
          </Button>
        </div>

        <ReserveConfig
          symbol={reserve.symbol}
          reserve={reserve}
          {...reserveConfigState}
        />
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
