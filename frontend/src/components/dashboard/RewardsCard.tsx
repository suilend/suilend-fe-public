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
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { usePointsContext } from "@/contexts/PointsContext";
import { ASSETS_URL } from "@/lib/constants";
import { formatToken } from "@/lib/format";
import { POINTS_URL } from "@/lib/navigation";
import { getPointsStats } from "@/lib/points";

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
}

function ClaimableRewards({ claimableRewardsMap }: ClaimableRewardsProps) {
  return (
    <div className="flex flex-col gap-1">
      <TLabelSans>Claimable rewards</TLabelSans>

      <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1">
        {Object.entries(claimableRewardsMap).map(([coinType, amount]) => (
          <ClaimableReward key={coinType} coinType={coinType} amount={amount} />
        ))}
      </div>
    </div>
  );
}

export default function RewardsCard() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();
  const { data, obligation } = useLoadedAppContext();
  const { season, seasonMap, addressRowMap } = usePointsContext();

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
    <Card
      style={{
        backgroundImage: `url('${ASSETS_URL}/dashboard/rewards-not-connected.png')`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-center justify-center gap-4 p-4">
        <TBody className="text-center uppercase text-foreground">
          Start earning points & rewards
        </TBody>

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
    <Card
      id="rewards"
      className="rounded-[4px] border-none bg-gradient-to-r from-secondary to-border p-[1px]"
      headerProps={{
        className: "rounded-t-[3px] bg-card",
        title: "Rewards",
        titleClassName: "text-primary-foreground",
        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-4 rounded-b-[3px] bg-card">
        {/* Rewards */}
        {hasClaimableRewards && (
          <ClaimableRewards claimableRewardsMap={claimableRewardsMap} />
        )}

        {/* Points */}
        <div className="flex w-full flex-row justify-between">
          <RankStat season={season} rank={addressRowMap?.[season].rank} />

          <TotalPointsStat
            season={season}
            amount={pointsStats.totalPoints.total}
            isCentered
          />

          <PointsPerDayStat
            season={season}
            amount={pointsStats.pointsPerDay.total}
            isRightAligned
          />
        </div>

        {/* Actions */}
        <div className="flex flex-row items-center gap-2">
          <NextLink href={POINTS_URL}>
            <Button
              className="border-secondary text-primary-foreground"
              labelClassName="uppercase"
              variant="secondaryOutline"
            >
              Leaderboard
            </Button>
          </NextLink>
          {hasClaimableRewards && (
            <ClaimRewardsDropdownMenu rewardsMap={rewardsMap} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
