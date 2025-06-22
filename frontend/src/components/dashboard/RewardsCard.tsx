import BigNumber from "bignumber.js";

import { RewardSummary } from "@suilend/sdk";
import { formatToken, getToken, isSendPoints } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import Card from "@/components/dashboard/Card";
import ClaimRewardsDropdownMenu from "@/components/dashboard/ClaimRewardsDropdownMenu";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";

interface ClaimableRewardProps {
  coinType: string;
  amount: BigNumber;
}

function ClaimableReward({ coinType, amount }: ClaimableRewardProps) {
  const { appData } = useLoadedAppContext();

  return (
    <div className="flex flex-row items-center gap-1.5">
      <TokenLogo
        token={getToken(coinType, appData.coinMetadataMap[coinType])}
        size={16}
      />
      <Tooltip
        title={`${formatToken(amount, {
          dp: appData.coinMetadataMap[coinType].decimals,
        })} ${appData.coinMetadataMap[coinType].symbol}`}
      >
        <TBody>
          {formatToken(amount, { exact: false })}{" "}
          {appData.coinMetadataMap[coinType].symbol}
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
  const { userData, obligation } = useLoadedUserContext();

  // Rewards
  const rewardsMap: Record<string, RewardSummary[]> = {};
  const claimableRewardsMap: Record<string, BigNumber> = {};
  if (obligation) {
    Object.values(userData.rewardMap).flatMap((rewards) =>
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

  return !address ? (
    <Card
      style={{
        backgroundImage: `url('${ASSETS_URL}/leaderboard/header.png')`,
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-center justify-center gap-4 bg-card/75 p-4">
        <TBody className="text-center uppercase text-foreground">
          Start earning rewards
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
  ) : hasClaimableRewards ? (
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
        <ClaimableRewards claimableRewardsMap={claimableRewardsMap} />

        {/* Actions */}
        <div className="w-max">
          <ClaimRewardsDropdownMenu rewardsMap={rewardsMap} />
        </div>
      </CardContent>
    </Card>
  ) : null;
}
