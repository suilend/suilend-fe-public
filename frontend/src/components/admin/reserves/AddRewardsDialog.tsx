import { Fragment, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";
import { formatDate } from "date-fns";
import { Eraser, Sparkle } from "lucide-react";
import { toast } from "sonner";

import { ADMIN_ADDRESS, ParsedReserve } from "@suilend/sdk";
import { Side } from "@suilend/sdk/lib/types";
import { TX_TOAST_DURATION, Token, getToken } from "@suilend/sui-fe";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import AdminTokenSelectionDialog from "@/components/admin/AdminTokenSelectionDialog";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Input from "@/components/shared/Input";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import { TBody } from "@/components/shared/Typography";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getPoolInfo } from "@/lib/admin";
import { cn } from "@/lib/utils";

export default function AddRewardsDialog() {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { rawBalancesMap, balancesCoinMetadataMap, refresh } =
    useLoadedUserContext();

  const { appData, userData, steammPoolInfos } = useAdminContext();

  const isEditable = address === ADMIN_ADDRESS;

  // State
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);

  const [token, setToken] = useState<Token | undefined>(undefined);
  const [startTimeMs, setStartTimeMs] = useState<string>("");
  const [endTimeMs, setEndTimeMs] = useState<string>("");

  const [rewardsMap, setRewardsMap] = useState<
    Record<string, Record<Side, string>>
  >({});
  const setRewardsValue = (coinType: string, side: Side) => (value: string) =>
    setRewardsMap((prev) => ({
      ...prev,
      [coinType]: { ...prev[coinType], [side]: value },
    }));

  const onSelectToken = (token: Token) => {
    setToken(token);

    const reservesWithExistingRewards = (
      appData.lendingMarket.reserves.map((reserve) => [
        reserve,
        userData.rewardMap[reserve.coinType]?.[Side.DEPOSIT]?.some(
          (r) => r.stats.rewardCoinType === token.coinType,
        ) ?? false,
        userData.rewardMap[reserve.coinType]?.[Side.BORROW]?.some(
          (r) => r.stats.rewardCoinType === token.coinType,
        ) ?? false,
      ]) as [ParsedReserve, boolean, boolean][]
    ).filter(
      ([reserve, isDepositReward, isBorrowReward]) =>
        isDepositReward || isBorrowReward,
    );
    const reservesWithNoExistingRewards = appData.lendingMarket.reserves.filter(
      (reserve) =>
        !reservesWithExistingRewards.some(
          ([_reserve]) => _reserve.coinType === reserve.coinType,
        ),
    );

    setRewardsMap({
      ...reservesWithExistingRewards.reduce(
        (acc, [reserve, isDepositReward, isBorrowReward]) => ({
          ...acc,
          [reserve.coinType]: {
            [Side.DEPOSIT]: isDepositReward ? "0" : "",
            [Side.BORROW]: isBorrowReward ? "0" : "",
          },
        }),
        {} as Record<string, Record<Side, string>>,
      ),
      ...reservesWithNoExistingRewards.reduce(
        (acc, reserve) => ({
          ...acc,
          [reserve.coinType]: {
            [Side.DEPOSIT]: "",
            [Side.BORROW]: "",
          },
        }),
        {} as Record<string, Record<Side, string>>,
      ),
    });
  };

  const reset = () => {
    setToken(undefined);
    setStartTimeMs("");
    setEndTimeMs("");

    setRewardsMap({});
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
            .times(10 ** token.decimals)
            .toString();

          if (rewardValue !== "0") {
            await appData.suilendClient.addReward(
              address,
              appData.lendingMarket.ownerCapId,
              reserveArrayIndex,
              side === Side.DEPOSIT,
              token.coinType,
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

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(`Added ${token.symbol} rewards`, {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
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

  // Next Tuesday UTC
  const getNextTuesdayUTC = (offsetWeeks: number) => {
    const referenceMs = 1757980800000;
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    let nextMs = referenceMs;
    while (nextMs <= nowMs) nextMs += oneWeekMs;

    if (offsetWeeks > 0) nextMs += offsetWeeks * oneWeekMs;

    const date = new Date(nextMs);
    date.setUTCHours(0, 0, 0, 0);
    return date;
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
        title: {
          icon: <Sparkle />,
          children: "Add Rewards",
        },
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
      <div className="grid w-full grid-cols-3 gap-4">
        {/* Row 1 */}
        <AdminTokenSelectionDialog
          token={token}
          tokens={Object.entries(rawBalancesMap ?? {})
            .filter(([coinType]) => !!balancesCoinMetadataMap?.[coinType])
            .map(([coinType]) =>
              getToken(coinType, balancesCoinMetadataMap![coinType]),
            )}
          onSelectToken={onSelectToken}
        />
        <div className="flex flex-col gap-2">
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

          <div className="flex flex-row gap-2">
            {[0, 1, 2, 3, 4].map((offsetWeeks) => (
              <Button
                key={offsetWeeks}
                className="rounded-full"
                labelClassName="uppercase text-xs"
                variant={
                  startTimeMs ===
                  getNextTuesdayUTC(offsetWeeks).getTime().toString()
                    ? "secondary"
                    : "secondaryOutline"
                }
                size="sm"
                onClick={() => {
                  setStartTimeMs(
                    getNextTuesdayUTC(offsetWeeks).getTime().toString(),
                  );
                }}
              >
                N+{offsetWeeks}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
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

          <div className="flex flex-row gap-2">
            {[0, 1, 2, 3, 4].map((offsetWeeks) => (
              <Button
                key={offsetWeeks}
                className="rounded-full"
                labelClassName="uppercase text-xs"
                variant={
                  endTimeMs ===
                  getNextTuesdayUTC(offsetWeeks).getTime().toString()
                    ? "secondary"
                    : "secondaryOutline"
                }
                size="sm"
                onClick={() => {
                  setEndTimeMs(
                    getNextTuesdayUTC(offsetWeeks).getTime().toString(),
                  );
                }}
              >
                N+{offsetWeeks}
              </Button>
            ))}
          </div>
        </div>

        {/* Row 2-N */}
        {Object.entries(rewardsMap).map(([coinType, rewards], index) => {
          const reserve = appData.lendingMarket.reserves.find(
            (r) => r.coinType === coinType,
          );
          if (!reserve) return null;

          const poolInfo = getPoolInfo(steammPoolInfos, reserve.token.coinType);

          return (
            <Fragment key={coinType}>
              <div
                className={cn(
                  "flex flex-row items-center gap-2",
                  index === 0 && "pt-8",
                )}
              >
                <TokenLogo token={reserve.token} size={16} />
                <TBody>
                  {reserve.token.symbol}
                  {poolInfo && (
                    <>
                      <br />
                      <SteammPoolBadges poolInfo={poolInfo} />
                    </>
                  )}
                </TBody>
              </div>
              <Input
                className={cn(index === 0 && "pt-2")}
                label={index === 0 ? "depositRewards" : undefined}
                id={`depositRewards-${reserve.token.symbol}`}
                type="number"
                value={rewards?.[Side.DEPOSIT] ?? ""}
                onChange={setRewardsValue(reserve.coinType, Side.DEPOSIT)}
                endDecorator={token?.symbol}
              />
              <Input
                className={cn(index === 0 && "pt-2")}
                label={index === 0 ? "borrowRewards" : undefined}
                id={`borrowRewards-${reserve.token.symbol}`}
                type="number"
                value={rewards?.[Side.BORROW] ?? ""}
                onChange={setRewardsValue(reserve.coinType, Side.BORROW)}
                endDecorator={token?.symbol}
              />
            </Fragment>
          );
        })}
      </div>
    </Dialog>
  );
}
