import { useEffect, useMemo, useRef, useState } from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { isEqual } from "lodash";
import { Eraser, Plus, Rss } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import {
  getCoinMetadataMap,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui";

import CoinPopover from "@/components/admin/CoinPopover";
import Dialog from "@/components/admin/Dialog";
import ReserveConfig, {
  ConfigState,
  parseConfigState,
  useReserveConfigState,
} from "@/components/admin/ReserveConfig";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { parseCoinBalances } from "@/lib/coinBalance";

export default function AddReserveDialog() {
  const { suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient, data, refresh } = useLoadedAppContext();

  const isEditable = !!data.lendingMarketOwnerCapId;

  // Coin metadata
  const uniqueCoinTypes = useMemo(() => {
    const existingReserveCoinTypes = data.lendingMarket.reserves.map(
      (r) => r.coinType,
    );
    const coinTypes = data.coinBalancesRaw
      .map((cb) => cb.coinType)
      .filter((coinType) => !existingReserveCoinTypes.includes(coinType));

    return Array.from(new Set(coinTypes));
  }, [data.lendingMarket.reserves, data.coinBalancesRaw]);

  const fetchingCoinTypesRef = useRef<string[] | undefined>(undefined);
  const [coinMetadataMap, setCoinMetadataMap] = useState<
    Record<string, CoinMetadata>
  >({});
  useEffect(() => {
    (async () => {
      const filteredCoinTypes = uniqueCoinTypes.filter(
        (coinType) => !coinMetadataMap[coinType],
      );
      if (filteredCoinTypes.length === 0) return;

      if (
        fetchingCoinTypesRef.current !== undefined &&
        !isEqual(filteredCoinTypes, fetchingCoinTypesRef.current)
      )
        return;

      fetchingCoinTypesRef.current = filteredCoinTypes;
      const result = await getCoinMetadataMap(suiClient, filteredCoinTypes);
      setCoinMetadataMap(result);
    })();
  }, [uniqueCoinTypes, coinMetadataMap, suiClient]);

  const coinBalancesMap = parseCoinBalances(
    data.coinBalancesRaw,
    uniqueCoinTypes,
    undefined,
    coinMetadataMap,
  );

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [coinType, setCoinType] = useState<string | undefined>(undefined);
  const coin = useMemo(
    () => (coinType !== undefined ? coinBalancesMap[coinType] : undefined),
    [coinType, coinBalancesMap],
  );

  const [pythPriceId, setPythPriceId] = useState<string>("");

  const initialConfigStateRef = useRef<ConfigState>({
    openLtvPct: "",
    closeLtvPct: "",
    maxCloseLtvPct: "",
    borrowWeightBps: "",
    depositLimit: "",
    borrowLimit: "",
    liquidationBonusBps: "",
    maxLiquidationBonusBps: "",
    depositLimitUsd: "",
    borrowLimitUsd: "",
    borrowFeeBps: "",
    spreadFeeBps: "",
    protocolLiquidationFeeBps: "",
    isolated: false,
    openAttributedBorrowLimitUsd: "",
    closeAttributedBorrowLimitUsd: "",
    interestRate: [
      {
        id: uuidv4(),
        utilPercent: "0",
        aprPercent: "0",
      },
    ],
  });

  const reserveConfigState = useReserveConfigState(
    initialConfigStateRef.current,
  );
  const { configState, resetConfigState } = reserveConfigState;

  const reset = () => {
    setCoinType(undefined);
    setPythPriceId("");

    resetConfigState();
  };

  // Submit
  const createPriceFeed = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (pythPriceId === "") {
      toast.error("Enter a pyth price id");
      return;
    }

    const transaction = new Transaction();

    try {
      const priceUpdateData =
        await suilendClient.pythConnection.getPriceFeedsUpdateData([
          pythPriceId,
        ]);
      await suilendClient.pythClient.createPriceFeed(
        transaction as any,
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

  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (coinType === undefined) {
      toast.error("Select a coin");
      return;
    }
    if (!coin) {
      toast.error("Invalid coin selected");
      return;
    }
    if (pythPriceId === "") {
      toast.error("Enter a pyth price id");
      return;
    }
    if (
      configState.openLtvPct === "" ||
      configState.closeLtvPct === "" ||
      configState.maxCloseLtvPct === "" ||
      configState.borrowWeightBps === "" ||
      configState.depositLimit === "" ||
      configState.borrowLimit === "" ||
      configState.liquidationBonusBps === "" ||
      configState.maxLiquidationBonusBps === "" ||
      configState.depositLimitUsd === "" ||
      configState.borrowLimitUsd === "" ||
      configState.borrowFeeBps === "" ||
      configState.spreadFeeBps === "" ||
      configState.protocolLiquidationFeeBps === "" ||
      configState.openAttributedBorrowLimitUsd === "" ||
      configState.closeAttributedBorrowLimitUsd === ""
    ) {
      toast.error("Some config values missing");
      return;
    }

    const transaction = new Transaction();
    const newConfig = parseConfigState(configState, coin.mintDecimals);

    try {
      await suilendClient.createReserve(
        data.lendingMarketOwnerCapId,
        transaction,
        pythPriceId,
        coinType,
        newConfig,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Reserve added");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to add reserve", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refresh();
    }
  };

  return (
    <Dialog
      rootProps={{ open: isDialogOpen, onOpenChange: setIsDialogOpen }}
      trigger={
        <Button
          className="w-fit"
          labelClassName="uppercase"
          startIcon={<Plus />}
          variant="secondary"
        >
          Add reserve
        </Button>
      }
      titleIcon={<Plus />}
      title="Add reserve"
      footer={
        <div className="flex w-full flex-row items-center gap-2">
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
            disabled={!isEditable}
          >
            Add
          </Button>
        </div>
      }
    >
      <Grid>
        <CoinPopover
          coinBalancesMap={coinBalancesMap}
          value={coinType}
          onChange={setCoinType}
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
            Remove row
          </Button>
        </div>

        <ReserveConfig symbol={coin?.symbol} {...reserveConfigState} />
      </Grid>
    </Dialog>
  );
}
