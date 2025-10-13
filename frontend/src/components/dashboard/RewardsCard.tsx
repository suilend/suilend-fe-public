import { useMemo } from "react";

import BigNumber from "bignumber.js";

import { getRewardsMap } from "@suilend/sdk";
import { Token, formatToken, formatUsd, getToken } from "@suilend/sui-fe";
import { useWalletContext } from "@suilend/sui-fe-next";

import AutoclaimNotification from "@/components/dashboard/AutoclaimNotification";
import Card from "@/components/dashboard/Card";
import ClaimRewardsDropdownMenu from "@/components/dashboard/ClaimRewardsDropdownMenu";
import Button from "@/components/shared/Button";
import ParentLendingMarket from "@/components/shared/ParentLendingMarket";
import TokenLogo from "@/components/shared/TokenLogo";
import Tooltip from "@/components/shared/Tooltip";
import { TBody } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";

interface ClaimableRewardProps {
  token: Token;
  amount: BigNumber;
}

function ClaimableReward({ token, amount }: ClaimableRewardProps) {
  return (
    <div className="flex flex-row items-center gap-1.5">
      <TokenLogo token={token} size={16} />
      <Tooltip
        title={`${formatToken(amount, {
          dp: token.decimals,
        })} ${token.symbol}`}
      >
        <TBody>
          {formatToken(amount, { exact: false })} {token.symbol}
        </TBody>
      </Tooltip>
    </div>
  );
}

export default function RewardsCard() {
  const { setIsConnectWalletDropdownOpen, address } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const { allUserData, obligationMap } = useLoadedUserContext();

  const obligationCount = useMemo(
    () =>
      Object.values(obligationMap).filter(
        (obligation) => obligation !== undefined,
      ).length,
    [obligationMap],
  );

  if (!address)
    return (
      <Card
        style={{
          backgroundImage: `url('${ASSETS_URL}/leaderboard/header.png')`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="flex flex-col items-center justify-center gap-4 bg-card/75 p-4">
          <TBody className="text-center uppercase">Start earning rewards</TBody>

          <Button
            labelClassName="uppercase"
            variant="outline"
            onClick={() => setIsConnectWalletDropdownOpen(true)}
          >
            Connect wallet
          </Button>
        </div>
      </Card>
    );

  if (obligationCount === 0) return null;
  return (
    <Card
      id="rewards"
      headerProps={{
        titleClassName: "text-primary-foreground",
        title: (
          <>
            Unclaimed rewards
            <span className="text-xs text-muted-foreground">
              {formatUsd(
                Object.values(allAppData.allLendingMarketData).reduce(
                  (acc, appData) => {
                    const obligation = obligationMap[appData.lendingMarket.id];
                    const userData = allUserData[appData.lendingMarket.id];

                    const rewardsMap = getRewardsMap(
                      obligation,
                      userData.rewardMap,
                      appData.coinMetadataMap,
                    );

                    return acc.plus(
                      Object.entries(rewardsMap).reduce(
                        (acc, [coinType, { amount }]) => {
                          const price =
                            appData.rewardPriceMap[coinType] ??
                            new BigNumber(0);

                          return acc.plus(amount.times(price));
                        },
                        new BigNumber(0),
                      ),
                    );
                  },
                  new BigNumber(0),
                ),
              )}
            </span>
          </>
        ),

        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-px p-0">
        {Object.values(allAppData.allLendingMarketData).map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id];
          const userData = allUserData[appData.lendingMarket.id];

          const rewardsMap = getRewardsMap(
            obligation,
            userData.rewardMap,
            appData.coinMetadataMap,
          );

          if (!obligation) return null;
          return (
            <div key={appData.lendingMarket.id} className="w-full">
              <ParentLendingMarket
                id={`rewards-${appData.lendingMarket.id}`}
                lendingMarketId={appData.lendingMarket.id}
                count={Object.entries(rewardsMap).reduce(
                  (acc, [coinType, { amount }]) => {
                    const price =
                      appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                    return acc.plus(amount.times(price));
                  },
                  new BigNumber(0),
                )}
                countFormatter={formatUsd}
              >
                <div className="flex w-full flex-col gap-4 p-4">
                  {/* Autoclaim notification */}
                  <AutoclaimNotification />

                  {/* Rewards */}
                  <div className="grid w-full grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(rewardsMap).map(
                      ([coinType, { amount }]) => (
                        <ClaimableReward
                          key={coinType}
                          token={getToken(
                            coinType,
                            appData.coinMetadataMap[coinType],
                          )}
                          amount={amount}
                        />
                      ),
                    )}
                  </div>

                  {/* Actions */}
                  <div className="w-max">
                    <ClaimRewardsDropdownMenu
                      lendingMarketId={appData.lendingMarket.id}
                      rewardsMap={rewardsMap}
                    />
                  </div>
                </div>
              </ParentLendingMarket>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
