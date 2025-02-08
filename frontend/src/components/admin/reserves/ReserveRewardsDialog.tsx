import { useRouter } from "next/router";

import { Transaction } from "@mysten/sui/transactions";
import { formatISO } from "date-fns";
import { Sparkle } from "lucide-react";
import { toast } from "sonner";

import { shallowPushQuery, useWalletContext } from "@suilend/frontend-sui-next";
import { ParsedPoolReward, ParsedReserve } from "@suilend/sdk/parsers/reserve";

import AddRewardDialog from "@/components/admin/reserves/AddRewardDialog";
import PoolRewardsTable from "@/components/admin/reserves/PoolRewardsTable";
import Button from "@/components/shared/Button";
import Dialog from "@/components/shared/Dialog";
import Grid from "@/components/shared/Grid";
import LabelWithValue from "@/components/shared/LabelWithValue";
import Tabs from "@/components/shared/Tabs";
import { TLabelSans } from "@/components/shared/Typography";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";

enum QueryParams {
  TAB = "rewardsTab",
}

interface ReserveRewardsDialogProps {
  reserve: ParsedReserve;
}

export default function ReserveRewardsDialog({
  reserve,
}: ReserveRewardsDialogProps) {
  const router = useRouter();
  const queryParams = {
    [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
  };

  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { suilendClient } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  // Tabs
  enum Tab {
    DEPOSITS = "deposits",
    BORROWS = "borrows",
  }

  const tabs = [
    { id: Tab.DEPOSITS, title: "Deposits" },
    { id: Tab.BORROWS, title: "Borrows" },
  ];

  const selectedTab =
    queryParams[QueryParams.TAB] &&
    Object.values(Tab).includes(queryParams[QueryParams.TAB])
      ? queryParams[QueryParams.TAB]
      : Tab.DEPOSITS;
  const onSelectedTabChange = (tab: Tab) => {
    shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
  };

  // Actions
  const poolRewardManager =
    selectedTab === Tab.DEPOSITS
      ? reserve.depositsPoolRewardManager
      : reserve.borrowsPoolRewardManager;

  const onCancelReward = async (poolReward: ParsedPoolReward) => {
    if (!address) throw new Error("Wallet not connected");
    if (!userData.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    const reserveArrayIndex = reserve.arrayIndex;
    const isDepositReward = selectedTab === Tab.DEPOSITS;
    const rewardIndex = BigInt(poolReward.rewardIndex);
    const rewardCoinType = poolReward.coinType;

    try {
      const [unclaimedRewards] = suilendClient.cancelReward(
        userData.lendingMarketOwnerCapId,
        reserveArrayIndex,
        isDepositReward,
        rewardIndex,
        rewardCoinType,
        transaction,
      );
      transaction.transferObjects([unclaimedRewards], address);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Canceled reward");
    } catch (err) {
      toast.error("Failed to cancel reward", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
    }
  };

  const onCloseReward = async (poolReward: ParsedPoolReward) => {
    if (!address) throw new Error("Wallet not connected");
    if (!userData.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    const reserveArrayIndex = reserve.arrayIndex;
    const isDepositReward = selectedTab === Tab.DEPOSITS;
    const rewardIndex = BigInt(poolReward.rewardIndex);
    const rewardCoinType = poolReward.coinType;

    try {
      const [unclaimedRewards] = suilendClient.closeReward(
        userData.lendingMarketOwnerCapId,
        reserveArrayIndex,
        isDepositReward,
        rewardIndex,
        rewardCoinType,
        transaction,
      );
      transaction.transferObjects([unclaimedRewards], address);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Closed reward");
    } catch (err) {
      toast.error("Failed to close reward", {
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
          startIcon={<Sparkle />}
          variant="secondaryOutline"
        >
          Rewards
        </Button>
      }
      dialogContentInnerClassName="max-w-max"
      headerProps={{
        title: {
          icon: <Sparkle />,
          children: `${reserve.token.symbol} Rewards`,
        },
      }}
    >
      <Tabs
        tabs={tabs}
        selectedTab={selectedTab}
        onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
      >
        <Grid>
          <LabelWithValue
            label="$typeName"
            value={poolRewardManager.$typeName}
            isType
          />
          <LabelWithValue label="id" value={poolRewardManager.id} isId />
          <LabelWithValue
            label="totalShares"
            value={poolRewardManager.totalShares.toString()}
          />
          <LabelWithValue
            label="lastUpdateTimeMs"
            value={formatISO(
              new Date(Number(poolRewardManager.lastUpdateTimeMs)),
            )}
          />

          <div className="flex flex-col gap-2 md:col-span-2">
            <TLabelSans>poolRewards</TLabelSans>

            <div className="overflow-hidden rounded-md border">
              <PoolRewardsTable
                poolRewards={poolRewardManager.poolRewards
                  .map((pr) => ({
                    startTime: new Date(pr.startTimeMs),
                    endTime: new Date(pr.endTimeMs),
                    coinType: pr.coinType,
                    totalRewards: pr.totalRewards,
                    allocatedRewards: pr.allocatedRewards,
                    cumulativeRewardsPerShare: pr.cumulativeRewardsPerShare,
                    mintDecimals: pr.mintDecimals,
                    symbol: pr.symbol,
                    poolReward: pr,
                  }))
                  .sort(
                    (a, b) => a.startTime.getTime() - b.startTime.getTime(),
                  )}
                noPoolRewardsMessage={`No ${selectedTab === Tab.DEPOSITS ? "deposit" : "borrow"} rewards`}
                onCancelReward={onCancelReward}
                onCloseReward={onCloseReward}
              />
            </div>

            <AddRewardDialog
              reserve={reserve}
              isDepositReward={selectedTab === Tab.DEPOSITS}
            />
          </div>
        </Grid>
      </Tabs>
    </Dialog>
  );
}
