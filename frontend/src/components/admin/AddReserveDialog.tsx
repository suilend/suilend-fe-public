import { useEffect, useMemo, useRef, useState } from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { isEqual } from "lodash";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

import { SuilendClient } from "@suilend/sdk";

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
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { parseCoinBalances } from "@/lib/coinBalance";
import { getCoinMetadataMap } from "@/lib/coinMetadata";

export default function AddReserveDialog() {
  const { address } = useWalletContext();
  const {
    suiClient,
    refreshData,
    signExecuteAndWaitForTransaction,
    ...restAppContext
  } = useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

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

  const [coinIndex, setCoinIndex] = useState<number | null>(null);
  const coin =
    coinIndex !== null ? Object.values(coinBalancesMap)[coinIndex] : undefined;

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
    setCoinIndex(null);
    setPythPriceId("");

    resetConfigState();
  };

  // Save
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (coinIndex === null) {
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
        coin.coinType,
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
      await refreshData();
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
          index={coinIndex}
          onIndexChange={setCoinIndex}
        />
        <Input
          label="pythPriceId"
          id="pythPriceId"
          value={pythPriceId}
          onChange={setPythPriceId}
        />

        <ReserveConfig
          symbol={coin ? coin.symbol : undefined}
          {...reserveConfigState}
        />
      </Grid>
    </Dialog>
  );
}
