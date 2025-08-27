import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import { X } from "lucide-react";
import { toast } from "sonner";

import { Side } from "@suilend/sdk";
import { useSettingsContext, useWalletContext } from "@suilend/sui-fe-next";

import { useAdminContext } from "@/components/admin/AdminContext";
import AddReserveDialog from "@/components/admin/reserves/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/reserves/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/reserves/ClaimFeesDialog";
import ReserveConfigDialog from "@/components/admin/reserves/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/reserves/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/reserves/ReserveRewardsDialog";
import SteammPoolBadges from "@/components/admin/reserves/SteammPoolBadges";
import Button from "@/components/shared/Button";
import OpenURLButton from "@/components/shared/OpenURLButton";
import TextLink from "@/components/shared/TextLink";
import { TTitle } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { getPoolInfo } from "@/lib/admin";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { cn } from "@/lib/utils";

enum QueryParams {
  COIN_TYPE = "coinType",
}

export default function ReservesTab() {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.COIN_TYPE]: router.query[QueryParams.COIN_TYPE] as string,
    }),
    [router.query],
  );

  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { refresh } = useLoadedUserContext();

  const { appData, steammPoolInfos } = useAdminContext();

  // coinType
  useEffect(() => {
    if (!queryParams[QueryParams.COIN_TYPE]) return;

    const id = `reserve-${queryParams[QueryParams.COIN_TYPE]}`;
    const elem = document.getElementById(id);
    if (!elem) return;

    window.scrollTo({ top: elem.offsetTop - 100, behavior: "smooth" });
  }, [queryParams]);

  // Close all rewards
  const [isClosingRewards, setIsClosingRewards] = useState<boolean>(false);
  const onCloseRewards = async () => {
    if (!address) throw new Error("Wallet not connected");
    if (!appData.lendingMarket.ownerCapId)
      throw new Error("Error: lendingMarket.ownerCapId not defined");

    const transaction = new Transaction();

    try {
      setIsClosingRewards(true);

      let rewardCount = 0;
      for (const reserve of appData.lendingMarket.reserves) {
        for (const side of Object.values(Side)) {
          const poolRewardManager =
            side === Side.DEPOSIT
              ? reserve.depositsPoolRewardManager
              : reserve.borrowsPoolRewardManager;

          for (const poolReward of poolRewardManager.poolRewards) {
            const isClosable =
              Date.now() > new Date(poolReward.endTimeMs).getTime() &&
              +poolReward.numUserRewardManagers.toString() === 0;

            if (isClosable) {
              const reserveArrayIndex = reserve.arrayIndex;
              const isDepositReward = side === Side.DEPOSIT;
              const rewardIndex = BigInt(poolReward.rewardIndex);
              const rewardCoinType = poolReward.coinType;

              const [unclaimedRewards] = appData.suilendClient.closeReward(
                appData.lendingMarket.ownerCapId,
                reserveArrayIndex,
                isDepositReward,
                rewardIndex,
                rewardCoinType,
                transaction,
              );
              transaction.transferObjects([unclaimedRewards], address);

              rewardCount++;
            }
          }
        }
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        `Closed ${rewardCount} reward${rewardCount !== 1 ? "s" : ""}`,
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error("Failed to close rewards", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      refresh();
      setIsClosingRewards(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {appData.lendingMarket.reserves.map((reserve) => {
        const poolInfo = getPoolInfo(steammPoolInfos, reserve.token.coinType);

        return (
          <Card
            key={reserve.id}
            id={`reserve-${reserve.token.coinType}`}
            className={cn(
              queryParams[QueryParams.COIN_TYPE] === reserve.token.coinType &&
                "border-secondary",
            )}
          >
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <TTitle>
                  {reserve.token.symbol}
                  {poolInfo && (
                    <>
                      {" "}
                      <SteammPoolBadges poolInfo={poolInfo} />
                    </>
                  )}
                </TTitle>

                {poolInfo && (
                  <div className="-m-1.5 flex flex-row items-center">
                    <OpenURLButton
                      url={`https://steamm.fi/pool/${poolInfo.poolId}`}
                    >
                      View pool on STEAMM
                    </OpenURLButton>
                  </div>
                )}
              </div>
              <CardDescription>
                <Value
                  value={reserve.id}
                  isId
                  url={explorer.buildObjectUrl(reserve.id)}
                  isExplorerUrl
                />
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-row flex-wrap gap-2">
              <ReserveConfigDialog reserve={reserve} />
              <ReservePropertiesDialog reserve={reserve} />
              <ReserveRewardsDialog reserve={reserve} />
              <ClaimFeesDialog reserve={reserve} />
            </CardContent>
          </Card>
        );
      })}

      <div className="flex flex-row flex-wrap gap-2">
        <AddReserveDialog />
        <AddRewardsDialog />
        <ClaimFeesDialog />

        <Button
          className="w-fit"
          labelClassName={cn("uppercase")}
          startIcon={<X />}
          variant="secondary"
          disabled={isClosingRewards}
          onClick={onCloseRewards}
        >
          Close rewards
        </Button>
      </div>
    </div>
  );
}
