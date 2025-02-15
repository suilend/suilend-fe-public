import { Fragment, useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { Eraser, Sparkle } from "lucide-react";
import { toast } from "sonner";

import { useWalletContext } from "@suilend/frontend-sui-next";
import { Side } from "@suilend/sdk/lib/types";

import { useAdminContext } from "@/components/admin/AdminContext";
import CoinDropdownMenu from "@/components/admin/CoinDropdownMenu";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { cn } from "@/lib/utils";

export default function AddRewardsDialog() {
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { balancesCoinMetadataMap, refresh } = useLoadedUserContext();

  const { appData } = useAdminContext();

  const isEditable = !!appData.lendingMarketOwnerCapId;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [coinType, setCoinType] = useState<string | undefined>(undefined);
  const coinMetadata = useMemo(
    () =>
      coinType !== undefined ? balancesCoinMetadataMap?.[coinType] : undefined,
    [coinType, balancesCoinMetadataMap],
  );

  const [startTimeMs, setStartTimeMs] = useState<string>("");
  const [endTimeMs, setEndTimeMs] = useState<string>("");

  const [rewardsMap, setRewardsMap] = useState<
    Record<string, Record<string, string>>
  >({});
  const setRewardsValue =
    (coinType: string, rewardType: string) => (value: string) =>
      setRewardsMap((prev) => ({
        ...prev,
        [coinType]: { ...prev[coinType], [rewardType]: value },
      }));

  const reset = () => {
    setCoinType(undefined);
    setStartTimeMs("");
    setEndTimeMs("");

    setRewardsMap({});
  };

  // Submit
  const submit = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    if (coinType === undefined) {
      toast.error("Select a coin");
      return;
    }
    if (!coinMetadata) {
      toast.error("Invalid coin selected");
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

    try {
      let isFirstReward = true;
      for (const side of Object.values(Side)) {
        for (const reserve of appData.lendingMarket.reserves) {
          const reserveArrayIndex = reserve.arrayIndex;

          const rewardValue = new BigNumber(
            rewardsMap?.[reserve.coinType]?.[side] || 0,
          )
            .times(10 ** coinMetadata.decimals)
            .toString();

          if (rewardValue !== "0") {
            await appData.suilendClient.addReward(
              address,
              appData.lendingMarketOwnerCapId,
              reserveArrayIndex,
              side === Side.DEPOSIT,
              coinType,
              rewardValue,
              BigInt(startTimeMs),
              BigInt(endTimeMs),
              transaction,
              isFirstReward,
            );
            isFirstReward = false;
          }
        }
      }

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Added rewards");
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      toast.error("Failed to add rewards", {
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
          startIcon={<Sparkle />}
          variant="secondary"
        >
          Add rewards
        </Button>
      }
      headerProps={{
        title: { icon: <Sparkle />, children: "Add Rewards" },
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
      <div className="grid w-full grid-cols-3 gap-x-4 gap-y-6">
        <CoinDropdownMenu
          coinMetadataMap={balancesCoinMetadataMap}
          value={coinType}
          onChange={setCoinType}
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

        {appData.lendingMarket.reserves.map((reserve, index) => (
          <Fragment key={reserve.coinType}>
            <div
              className={cn(
                "flex flex-row items-center gap-2",
                index === 0 && "pt-6",
              )}
            >
              <TokenLogo
                className="h-4 w-4"
                token={{
                  coinType: reserve.coinType,
                  symbol: reserve.symbol,
                  iconUrl: reserve.iconUrl,
                }}
              />
              <TBody>{reserve.symbol}</TBody>
            </div>

            <Input
              label={index === 0 ? "depositRewards" : undefined}
              id={`depositRewards-${reserve.coinType}`}
              type="number"
              value={rewardsMap?.[reserve.coinType]?.deposit || ""}
              onChange={setRewardsValue(reserve.coinType, Side.DEPOSIT)}
              endDecorator={coinMetadata?.symbol}
            />
            <Input
              label={index === 0 ? "borrowRewards" : undefined}
              id={`borrowRewards-${reserve.coinType}`}
              type="number"
              value={rewardsMap?.[reserve.coinType]?.borrow || ""}
              onChange={setRewardsValue(reserve.coinType, Side.BORROW)}
              endDecorator={coinMetadata?.symbol}
            />
          </Fragment>
        ))}
      </div>
    </Dialog>
  );
}
