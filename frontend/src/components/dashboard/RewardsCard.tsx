import NextLink from "next/link";
import React, { useState } from "react";

import BigNumber from "bignumber.js";
import { toast } from "sonner";

import { isSendPoints } from "@suilend/frontend-sui";
import { ParsedReserve } from "@suilend/sdk/parsers";

import Card from "@/components/dashboard/Card";
import PointsCount from "@/components/points/PointsCount";
import PointsRank from "@/components/points/PointsRank";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { usePointsContext } from "@/contexts/PointsContext";
import { useWalletContext } from "@/contexts/WalletContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatToken } from "@/lib/format";
import { RewardSummary } from "@/lib/liquidityMining";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import { POINTS_URL } from "@/lib/navigation";
import { getPointsStats } from "@/lib/points";
import { cn } from "@/lib/utils";

interface ClaimableRewardProps {
  reserve: ParsedReserve;
  claimableRewards: BigNumber;
}

function ClaimableReward({ reserve, claimableRewards }: ClaimableRewardProps) {
  return (
    <div className="flex flex-row items-center gap-1.5">
      <TokenLogo
        className="h-4 w-4"
        token={{
          coinType: reserve.coinType,
          symbol: reserve.symbol,
          iconUrl: reserve.iconUrl,
        }}
      />
      <Tooltip
        title={`${formatToken(claimableRewards, {
          dp: reserve.mintDecimals,
        })} ${reserve.symbol}`}
      >
        <TBody>
          {formatToken(claimableRewards, { exact: false })} {reserve.symbol}
        </TBody>
      </Tooltip>
    </div>
  );
}

interface ClaimableRewardsProps {
  claimableRewardsMap: Record<string, BigNumber>;
  isCentered?: boolean;
}

function ClaimableRewards({
  claimableRewardsMap,
  isCentered,
}: ClaimableRewardsProps) {
  const appContext = useAppContext();
  const data = appContext.data as AppData;

  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Claimable rewards
      </TLabelSans>

      <div className="flex flex-col gap-1">
        {Object.entries(claimableRewardsMap).map(
          ([coinType, claimableRewards]) => {
            const reserve = data.lendingMarket.reserves.find(
              (r) => r.coinType === coinType,
            );

            if (!reserve) return null;
            return (
              <ClaimableReward
                key={coinType}
                reserve={reserve}
                claimableRewards={claimableRewards}
              />
            );
          },
        )}
      </div>
    </div>
  );
}

interface TotalPointsStatProps {
  totalPoints: BigNumber;
  isCentered?: boolean;
}

function TotalPointsStat({ totalPoints, isCentered }: TotalPointsStatProps) {
  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Total SEND Points
      </TLabelSans>
      <PointsCount points={totalPoints} />
    </div>
  );
}

interface PointsPerDayStatProps {
  pointsPerDay: BigNumber;
  isCentered?: boolean;
}

function PointsPerDayStat({ pointsPerDay, isCentered }: PointsPerDayStatProps) {
  const { obligation, ...restAppContext } = useAppContext();
  const data = restAppContext.data as AppData;

  const isLooping = getIsLooping(data, obligation);
  const wasLooping = getWasLooping(data, obligation);

  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        SEND Points per day
      </TLabelSans>
      <PointsCount
        points={pointsPerDay}
        labelClassName={cn((isLooping || wasLooping) && "text-warning")}
      />
    </div>
  );
}

interface RankStatProps {
  rank?: number | null;
  isCentered?: boolean;
}

function RankStat({ rank, isCentered }: RankStatProps) {
  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>Rank</TLabelSans>
      <PointsRank rank={rank} isCentered={isCentered} />
    </div>
  );
}

export default function RewardsCard() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();
  const { refreshData, explorer, obligation, ...restAppContext } =
    useAppContext();
  const data = restAppContext.data as AppData;
  const { rank } = usePointsContext();
  const { claimRewards } = useDashboardContext();

  const { md } = useBreakpoint();

  // Rewards
  const rewardsMap: Record<string, RewardSummary[]> = {};
  const claimableRewardsMap: Record<string, BigNumber> = {};
  if (obligation) {
    Object.values(data.rewardMap).flatMap((rewards) =>
      [...rewards.deposit, ...rewards.borrow].forEach((r) => {
        if (isSendPoints(r.stats.rewardCoinType)) return;
        if (!r.obligationClaims[obligation.id]) return;

        const claimableRewards = Object.values(r.obligationClaims).reduce(
          (acc, claim) => acc.plus(claim.claimableAmount),
          new BigNumber(0),
        );
        if (claimableRewards.eq(0)) return;

        const minAmount = 10 ** (-1 * r.stats.mintDecimals);
        if (claimableRewards.lt(minAmount)) return;

        if (!rewardsMap[r.stats.rewardCoinType])
          rewardsMap[r.stats.rewardCoinType] = [];
        rewardsMap[r.stats.rewardCoinType].push(r);
      }),
    );

    Object.entries(rewardsMap).forEach(([coinType, rewards]) => {
      claimableRewardsMap[coinType] = rewards.reduce(
        (acc, reward) =>
          acc.plus(reward.obligationClaims[obligation.id].claimableAmount),
        new BigNumber(0),
      );
    });
  }

  const hasClaimableRewards =
    Object.values(claimableRewardsMap).length > 0 &&
    Object.values(claimableRewardsMap).some((claimableRewards) =>
      claimableRewards.gt(0),
    );

  const [isClaiming, setIsClaiming] = useState<boolean>(false);

  const onClaimRewardsClick = async () => {
    if (isClaiming) return;

    setIsClaiming(true);

    try {
      const res = await claimRewards(rewardsMap);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success("Claimed rewards", {
        action: (
          <TextLink className="block" href={txUrl}>
            View tx on {explorer.name}
          </TextLink>
        ),
        duration: TX_TOAST_DURATION,
      });
    } catch (err) {
      toast.error("Failed to claim rewards", {
        description: (err as Error)?.message || "An unknown error occurred",
        duration: TX_TOAST_DURATION,
      });
    } finally {
      setIsClaiming(false);
      await refreshData();
    }
  };

  // Points
  const pointsStats = getPointsStats(data.rewardMap, data.obligations);

  return !address ? (
    <Card className="bg-background">
      <div
        className="flex h-[100px] flex-col items-center justify-center gap-4 sm:h-[110px]"
        style={{
          backgroundImage: "url('/assets/dashboard/rewards-not-connected.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <TTitle className="text-center uppercase text-primary-foreground sm:text-[16px]">
          Start earning SEND Points & rewards
        </TTitle>

        <Button
          labelClassName="uppercase"
          variant="outline"
          onClick={() => setIsConnectWalletDropdownOpen(true)}
        >
          Connect wallet
        </Button>
      </div>
    </Card>
  ) : (
    <Card className="rounded-[4px] border-none bg-gradient-to-r from-secondary to-border p-[1px]">
      <div
        className="rounded-[3px] bg-background p-4"
        style={{
          backgroundImage: "url('/assets/dashboard/rewards-connected.png')",
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <TTitle className="uppercase text-primary-foreground">
                Rewards
              </TTitle>
              <TLabelSans>Boost your earnings with bonus rewards.</TLabelSans>
            </div>

            <div className="flex flex-row gap-2">
              <div className="flex-1 sm:flex-initial">
                <NextLink href={POINTS_URL}>
                  <Button
                    className="w-full border-secondary"
                    labelClassName="uppercase text-primary-foreground"
                    variant="secondaryOutline"
                  >
                    Leaderboard
                  </Button>
                </NextLink>
              </div>

              {hasClaimableRewards && (
                <div className="flex-1 sm:flex-initial">
                  <Button
                    className="w-full sm:w-[134px]"
                    labelClassName="uppercase"
                    onClick={onClaimRewardsClick}
                  >
                    {isClaiming ? <Spinner size="sm" /> : "Claim rewards"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {md ? (
            <div className="flex flex-row items-center justify-between gap-4">
              {hasClaimableRewards && (
                <ClaimableRewards claimableRewardsMap={claimableRewardsMap} />
              )}
              <TotalPointsStat totalPoints={pointsStats.totalPoints.total} />
              <PointsPerDayStat pointsPerDay={pointsStats.pointsPerDay.total} />
              <RankStat rank={rank} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {hasClaimableRewards && (
                <ClaimableRewards
                  claimableRewardsMap={claimableRewardsMap}
                  isCentered
                />
              )}
              <TotalPointsStat
                totalPoints={pointsStats.totalPoints.total}
                isCentered
              />

              <PointsPerDayStat
                pointsPerDay={pointsStats.pointsPerDay.total}
                isCentered
              />
              <RankStat rank={rank} isCentered />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
