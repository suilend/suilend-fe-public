import BigNumber from "bignumber.js";

import { getRewardsMap } from "@suilend/sdk";
import { formatToken, formatUsd, getToken } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import AutoclaimNotification from "@/components/dashboard/AutoclaimNotification";
import Card from "@/components/dashboard/Card";
import ClaimRewardsDropdownMenu from "@/components/dashboard/ClaimRewardsDropdownMenu";
import Button from "@/components/shared/Button";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useMarketCardContext } from "@/contexts/MarketCardContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";

interface ClaimableRewardProps {
  coinType: string;
  amount: BigNumber;
}

function ClaimableReward({ coinType, amount }: ClaimableRewardProps) {
  const { appData } = useMarketCardContext();

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

export default function RewardsCard() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();
  const { appData } = useMarketCardContext();
  const { userData, obligation } = useLoadedUserContext();

  // Rewards
  const rewardsMap = getRewardsMap(
    obligation,
    userData.rewardMap,
    appData.coinMetadataMap,
  );
  const hasClaimableRewards = Object.values(rewardsMap).some(({ amount }) =>
    amount.gt(0),
  );

  return (
    <>
      <AutoclaimNotification />

      {!address ? (
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
            title: (
              <>
                Unclaimed rewards
                <span className="text-xs text-muted-foreground">
                  {formatUsd(
                    Object.entries(rewardsMap).reduce(
                      (acc, [coinType, { amount }]) => {
                        const price =
                          appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                        return acc.plus(amount.times(price));
                      },
                      new BigNumber(0),
                    ),
                  )}
                </span>
              </>
            ),
            titleClassName: "text-primary-foreground",
            noSeparator: true,
          }}
        >
          <CardContent className="flex flex-col gap-4 rounded-b-[3px] bg-card">
            {/* Rewards */}
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1">
              {Object.entries(rewardsMap).map(([coinType, { amount }]) => (
                <ClaimableReward
                  key={coinType}
                  coinType={coinType}
                  amount={amount}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="w-max">
              <ClaimRewardsDropdownMenu rewardsMap={rewardsMap} />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
