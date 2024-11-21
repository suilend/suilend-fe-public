import NextLink from "next/link";

import BigNumber from "bignumber.js";

import {
  RewardSummary,
  isSendPoints,
  useWalletContext,
} from "@suilend/frontend-sui";

import Card from "@/components/dashboard/Card";
import ClaimRewardsPopover from "@/components/dashboard/ClaimRewardsPopover";
import PointsCount from "@/components/points/PointsCount";
import PointsRank from "@/components/points/PointsRank";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { formatToken } from "@/lib/format";
import { getIsLooping, getWasLooping } from "@/lib/looping";
import { POINTS_URL } from "@/lib/navigation";
import { getPointsStats } from "@/lib/points";
import { cn } from "@/lib/utils";

interface ClaimableRewardProps {
  coinType: string;
  amount: BigNumber;
}

function ClaimableReward({ coinType, amount }: ClaimableRewardProps) {
  const { data } = useLoadedAppContext();

  const coinMetadata = data.coinMetadataMap[coinType];

  return (
    <div className="flex flex-row items-center gap-1.5">
      <TokenLogo
        className="h-4 w-4"
        token={{
          coinType,
          symbol: coinMetadata.symbol,
          iconUrl: coinMetadata.iconUrl,
        }}
      />
      <Tooltip
        title={`${formatToken(amount, {
          dp: coinMetadata.decimals,
        })} ${coinMetadata.symbol}`}
      >
        <TBody>
          {formatToken(amount, { exact: false })} {coinMetadata.symbol}
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
  return (
    <div className={cn("flex flex-col gap-1", isCentered && "items-center")}>
      <TLabelSans className={cn(isCentered && "text-center")}>
        Claimable rewards
      </TLabelSans>

      <div className="flex flex-col gap-1">
        {Object.entries(claimableRewardsMap).map(([coinType, amount]) => (
          <ClaimableReward key={coinType} coinType={coinType} amount={amount} />
        ))}
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
  const { data, obligation } = useLoadedAppContext();

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
  const { data, obligation } = useLoadedAppContext();

  const { rank } = usePointsContext();

  const { md } = useBreakpoint();

  // Rewards
  const rewardsMap: Record<string, RewardSummary[]> = {};
  const claimableRewardsMap: Record<string, BigNumber> = {};
  if (obligation) {
    Object.values(data.rewardMap).flatMap((rewards) =>
      [...rewards.deposit, ...rewards.borrow].forEach((r) => {
        if (isSendPoints(r.stats.rewardCoinType)) return;
        if (!r.obligationClaims[obligation.id]) return;
        if (r.obligationClaims[obligation.id].claimableAmount.eq(0)) return;

        const minAmount = 10 ** (-1 * r.stats.mintDecimals);
        if (r.obligationClaims[obligation.id].claimableAmount.lt(minAmount))
          return;

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

  const hasClaimableRewards = Object.values(claimableRewardsMap).some(
    (amount) => amount.gt(0),
  );

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
                  <ClaimRewardsPopover rewardsMap={rewardsMap} />
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
