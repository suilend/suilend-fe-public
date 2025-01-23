import NextLink from "next/link";

import BigNumber from "bignumber.js";

import { isSendPoints } from "@suilend/frontend-sui";
import { useWalletContext } from "@suilend/frontend-sui-next";
import { RewardSummary } from "@suilend/sdk";

import Card from "@/components/dashboard/Card";
import ClaimRewardsDropdownMenu from "@/components/dashboard/ClaimRewardsDropdownMenu";
import PointsPerDayStat from "@/components/points/PointsPerDayStat";
import RankStat from "@/components/points/RankStat";
import TotalPointsStat from "@/components/points/TotalPointsStat";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans, TTitle } from "@/components/shared/Typography";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
import useBreakpoint from "@/hooks/useBreakpoint";
import { ASSETS_URL } from "@/lib/constants";
import { formatToken } from "@/lib/format";
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

      {Object.entries(claimableRewardsMap).map(([coinType, amount]) => (
        <ClaimableReward key={coinType} coinType={coinType} amount={amount} />
      ))}
    </div>
  );
}

export default function RewardsCard() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();
  const { data, obligation } = useLoadedAppContext();
  const { season, seasonMap, addressRowMap } = usePointsContext();

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
  const pointsStats = getPointsStats(
    seasonMap[season].coinType,
    data.rewardMap,
    data.obligations,
  );

  return !address ? (
    <Card className="bg-background">
      <div
        className="flex h-[100px] flex-col items-center justify-center gap-4 sm:h-[110px]"
        style={{
          backgroundImage: `url('${ASSETS_URL}/dashboard/rewards-not-connected.png')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <TTitle className="text-center uppercase text-foreground sm:text-[16px]">
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
      <div className="rounded-[3px] bg-background p-4">
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
                  <ClaimRewardsDropdownMenu rewardsMap={rewardsMap} />
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
              <TotalPointsStat
                season={season}
                amount={pointsStats.totalPoints.total}
              />
              <PointsPerDayStat
                season={season}
                amount={pointsStats.pointsPerDay.total}
              />
              <RankStat
                season={season}
                rank={addressRowMap?.[season].rank}
                isRightAligned
              />
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
                season={season}
                amount={pointsStats.totalPoints.total}
                isCentered
              />

              <PointsPerDayStat
                season={season}
                amount={pointsStats.pointsPerDay.total}
                isCentered
              />
              <RankStat
                season={season}
                rank={addressRowMap?.[season].rank}
                isCentered
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
