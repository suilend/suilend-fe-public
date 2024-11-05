import { useEffect, useMemo, useRef, useState } from "react";

import { CoinMetadata } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { isEqual } from "lodash";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "@suilend/sdk/client";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import CoinPopover from "@/components/admin/CoinPopover";
import Dialog from "@/components/admin/Dialog";
import Button from "@/components/shared/Button";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useWalletContext } from "@/contexts/WalletContext";
import { parseCoinBalances } from "@/lib/coinBalance";
import { getCoinMetadataMap } from "@/lib/coinMetadata";
import { formatToken } from "@/lib/format";

interface AddRewardDialogProps {
  reserve: ParsedReserve;
  isDepositReward: boolean;
}

export default function AddRewardDialog({
  reserve,
  isDepositReward,
}: AddRewardDialogProps) {
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
    const coinTypes = data.coinBalancesRaw.map((cb) => cb.coinType);

    return Array.from(new Set(coinTypes));
  }, [data.coinBalancesRaw]);

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

  const [amount, setAmount] = useState<string>("");
  const [startTimeMs, setStartTimeMs] = useState<string>("");
  const [endTimeMs, setEndTimeMs] = useState<string>("");

  const reset = () => {
    setCoinIndex(null);
    setAmount("");
    setStartTimeMs("");
    setEndTimeMs("");
  };

  // Submit
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
    if (amount === "") {
      toast.error("Enter an amount");
      return;
    }
    if (startTimeMs === "") {
      toast.error("Enter a start time");
      return;
    }
    if (endTimeMs === "") {
      toast.error("Enter an end time");
      return;
    }
    if (!(Number(startTimeMs) < Number(endTimeMs))) {
      toast.error("Start time must be before end time");
      return;
    }
    if (Number(endTimeMs) < Date.now()) {
      toast.error("End time must be in the future");
      return;
    }

    const transaction = new Transaction();

    const reserveArrayIndex = reserve.arrayIndex;
    const rewardCoinType = coin.coinType;
    const rewardValue = new BigNumber(amount)
      .times(10 ** coin.mintDecimals)
      .toString();

    try {
      await suilendClient.addReward(
        address,
        data.lendingMarketOwnerCapId,
        reserveArrayIndex,
        isDepositReward,
        rewardCoinType,
        rewardValue,
        BigInt(startTimeMs),
        BigInt(endTimeMs),
        transaction,
      );

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Added reward");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to add reward", {
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
          Add reward
        </Button>
      }
      contentProps={{ className: "sm:max-w-lg" }}
      titleIcon={<Plus />}
      title="Add Reward"
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
          label="amount"
          labelRight={
            coin
              ? `Max: ${formatToken(coin.balance, { dp: coin.mintDecimals })}`
              : undefined
          }
          id="amount"
          type="number"
          value={amount}
          onChange={setAmount}
          inputProps={{ disabled: coinIndex === null }}
          endDecorator={coin ? coin.symbol : undefined}
        />
        <Input
          label="startTimeMs"
          id="startTimeMs"
          type="number"
          value={startTimeMs}
          onChange={setStartTimeMs}
          endDecorator="ms"
        />
        <Input
          label="endTimeMs"
          id="endTimeMs"
          type="number"
          value={endTimeMs}
          onChange={setEndTimeMs}
          endDecorator="ms"
        />
      </Grid>
    </Dialog>
  );
}
