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
import { cn } from "@/lib/utils";

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

  const filteredAppData = useMemo(
    () =>
      Object.values(allAppData.allLendingMarketData).filter((appData) => {
        const obligation = obligationMap[appData.lendingMarket.id];
        const userData = allUserData[appData.lendingMarket.id];

        const rewardsMap = getRewardsMap(
          obligation,
          userData.rewardMap,
          appData.coinMetadataMap,
        );

        if (!obligation || Object.values(rewardsMap).length === 0) return false;
        return true;
      }),
    [allAppData.allLendingMarketData, obligationMap, allUserData],
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

  if (filteredAppData.length === 0) return null;
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
                filteredAppData.reduce((acc, appData) => {
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
                          appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                        return acc.plus(amount.times(price));
                      },
                      new BigNumber(0),
                    ),
                  );
                }, new BigNumber(0)),
              )}
            </span>
          </>
        ),

        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-px p-0">
        {filteredAppData.map((appData) => {
          const obligation = obligationMap[appData.lendingMarket.id]!; // Checked above
          const userData = allUserData[appData.lendingMarket.id];

          const rewardsMap = getRewardsMap(
            obligation,
            userData.rewardMap,
            appData.coinMetadataMap,
          );

          return (
            <div key={appData.lendingMarket.id} className="w-full">
              <ParentLendingMarket
                id={`rewards-${appData.lendingMarket.id}`}
                lendingMarketId={appData.lendingMarket.id}
                count={formatUsd(
                  Object.entries(rewardsMap).reduce(
                    (acc, [coinType, { amount }]) => {
                      const price =
                        appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                      return acc.plus(amount.times(price));
                    },
                    new BigNumber(0),
                  ),
                )}
                noHeader={filteredAppData.length === 1}
              >
                <div
                  className={cn(
                    "flex w-full flex-col gap-4 p-4",
                    filteredAppData.length === 1 && "pt-0",
                  )}
                >
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
