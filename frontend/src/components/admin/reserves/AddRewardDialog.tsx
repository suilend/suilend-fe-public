import { useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { formatToken } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import { ADMIN_ADDRESS } from "@suilend/sdk";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import { useAdminContext } from "@/components/admin/AdminContext";
import CoinDropdownMenu from "@/components/admin/CoinDropdownMenu";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import Input from "@/components/shared/Input";
import { useLoadedUserContext } from "@/contexts/UserContext";

interface AddRewardDialogProps {
  reserve: ParsedReserve;
  isDepositReward: boolean;
}

export default function AddRewardDialog({
  reserve,
  isDepositReward,
}: AddRewardDialogProps) {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { balancesCoinMetadataMap, getBalance, refresh } =
    useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [coinType, setCoinType] = useState<string | undefined>(undefined);
  const coinMetadata = useMemo(
    () =>
      coinType !== undefined ? balancesCoinMetadataMap?.[coinType] : undefined,
    [coinType, balancesCoinMetadataMap],
  );

  const [amount, setAmount] = useState<string>("");
  const [startTimeMs, setStartTimeMs] = useState<string>("");
  const [endTimeMs, setEndTimeMs] = useState<string>("");

  const reset = () => {
    setCoinType(undefined);
    setAmount("");
    setStartTimeMs("");
    setEndTimeMs("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    if (coinType === undefined) {
      toast.error("Select a coin");
      return;
    }
    if (!coinMetadata) {
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

    const rewardValue = new BigNumber(amount)
      .times(10 ** coinMetadata.decimals)
      .toString();

    try {
      await appData.suilendClient.addReward(
        address,
        appData.lendingMarket.ownerCapId,
        reserve.arrayIndex,
        isDepositReward,
        coinType,
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
      refresh();
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
      dialogContentInnerClassName="max-w-xl"
      headerProps={{
        title: { icon: <Plus />, children: "Add Reward" },
      }}
      footerProps={{
        children: (
          <>
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
          </>
        ),
      }}
    >
      <Grid>
        <CoinDropdownMenu
          coinMetadataMap={balancesCoinMetadataMap}
          value={coinType}
          onChange={setCoinType}
        />
        <Input
          label="amount"
          labelRight={
            coinType && coinMetadata
              ? `Max: ${formatToken(getBalance(coinType), { dp: coinMetadata.decimals })}`
              : undefined
          }
          id="amount"
          type="number"
          value={amount}
          onChange={setAmount}
          inputProps={{ disabled: coinType === undefined }}
          endDecorator={coinMetadata?.symbol}
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
