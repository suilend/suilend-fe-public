import { useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import { Eraser, Plus } from "lucide-react";
import { toast } from "sonner";

import { Token, formatToken } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import { ADMIN_ADDRESS } from "@suilend/sdk";
import { ParsedReserve } from "@suilend/sdk/parsers/reserve";

import { useAdminContext } from "@/components/admin/AdminContext";
import AdminTokenSelectionDialog from "@/components/admin/AdminTokenSelectionDialog";
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
  const { getBalance, refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [token, setToken] = useState<Token | undefined>(undefined);
  const [amount, setAmount] = useState<string>("");
  const [startTimeMs, setStartTimeMs] = useState<string>("");
  const [endTimeMs, setEndTimeMs] = useState<string>("");

  const reset = () => {
    setToken(undefined);
    setAmount("");
    setStartTimeMs("");
    setEndTimeMs("");
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    if (token === undefined) {
      toast.error("Select a coin");
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
      .times(10 ** token.decimals)
      .toString();

    try {
      await appData.suilendClient.addReward(
        address,
        appData.lendingMarket.ownerCapId,
        reserve.arrayIndex,
        isDepositReward,
        token.coinType,
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
        <AdminTokenSelectionDialog token={token} onSelectToken={setToken} />
        <Input
          label="amount"
          labelRight={
            token
              ? `Max: ${formatToken(getBalance(token.coinType), { dp: token.decimals })}`
              : undefined
          }
          id="amount"
          type="number"
          value={amount}
          onChange={setAmount}
          inputProps={{ disabled: token === undefined }}
          endDecorator={token?.symbol}
        />
        <Input
          label="startTimeMs"
          labelRight={
            startTimeMs.length >= 13
              ? formatDate(new Date(+startTimeMs), "yyyy-MM-dd HH:mm:ss")
              : undefined
          }
          id="startTimeMs"
          type="number"
          value={startTimeMs}
          onChange={setStartTimeMs}
          endDecorator="ms"
        />
        <Input
          label="endTimeMs"
          labelRight={
            endTimeMs.length >= 13
              ? formatDate(new Date(+endTimeMs), "yyyy-MM-dd HH:mm:ss")
              : undefined
          }
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
