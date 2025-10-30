import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { Transaction } from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { toast } from "sonner";
import {
  LENDING_MARKET_ID,
  ParsedObligation,
  RewardsMap,
  StrategyOwnerCap,
  getRewardsMap,
} from "@suilend/sdk";
import {
  StrategyType,
  strategyClaimRewardsAndSwapForCoinType,
} from "@suilend/sdk/lib/strategyOwnerCap";
import {
  TX_TOAST_DURATION,
  formatList,
  formatToken,
  formatUsd,
  getToken,
} from "@suilend/sui-fe";
import {
  showErrorToast,
  useSettingsContext,
  useWalletContext,
} from "@suilend/sui-fe-next";
import Button from "@/components/shared/Button";
import Spinner from "@/components/shared/Spinner";
import TextLink from "@/components/shared/TextLink";
import TokenLogo from "@/components/shared/TokenLogo";
import TokenLogos from "@/components/shared/TokenLogos";
import Tooltip from "@/components/shared/Tooltip";
import {
  TBody,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import StrategyCard from "@/components/strategies/StrategyCard";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import LstStrategyDialog from "./LstStrategyDialog";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm border bg-card">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

export default function StrategyPanel() {
  const router = useRouter();

  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { allUserData, refresh } = useLoadedUserContext();
  const userDataMainMarket = allUserData[LENDING_MARKET_ID];

  const {
    hasPosition,
    getDepositReserves,
    getDefaultCurrencyReserve,
    getTvlAmount,
  } = useLoadedLstStrategyContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // Obligations
  const strategyOwnerCapObligationMap: Record<
    StrategyType,
    { strategyOwnerCap: StrategyOwnerCap; obligation: ParsedObligation }
  > = Object.values(StrategyType).reduce(
    (acc, strategyType) => {
      const strategyOwnerCap: StrategyOwnerCap | undefined =
        userDataMainMarket.strategyOwnerCaps.find(
          (soc) => soc.strategyType === strategyType,
        );
      const obligation: ParsedObligation | undefined =
        userDataMainMarket.strategyObligations.find(
          (so) => so.id === strategyOwnerCap?.obligationId,
        );
      if (!strategyOwnerCap || !obligation) return acc;

      return {
        ...acc,
        [strategyType]: { strategyOwnerCap, obligation },
      };
    },
    {} as Record<
      StrategyType,
      { strategyOwnerCap: StrategyOwnerCap; obligation: ParsedObligation }
    >,
  );

  // Rewards
  const allRewardsMap = Object.entries(strategyOwnerCapObligationMap).reduce(
    (acc, [strategyType, { strategyOwnerCap, obligation }]) => ({
      ...acc,
      [strategyType]: getRewardsMap(
        obligation,
        userDataMainMarket.rewardMap,
        appDataMainMarket.coinMetadataMap,
      ),
    }),
    {} as Record<StrategyType, RewardsMap>,
  );
  const hasClaimableRewards = Object.values(allRewardsMap).some((rewardsMap) =>
    Object.values(rewardsMap).some(({ amount }) => amount.gt(0)),
  );

  const allRewardCoinTypes = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(allRewardsMap).reduce(
            (acc, rewardsMap) => [...acc, ...Object.keys(rewardsMap)],
            [] as string[],
          ),
        ),
      ),
    [allRewardsMap],
  );

  // Rewards - compound
  const [isCompoundingRewards, setIsCompoundingRewards] =
    useState<boolean>(false);

  const onCompoundRewardsClick = async () => {
    if (isCompoundingRewards) return;

    setIsCompoundingRewards(true);

    try {
      if (!address) throw Error("Wallet not connected");

      const transaction = new Transaction();

      for (const [
        strategyType,
        { strategyOwnerCap, obligation },
      ] of Object.entries(strategyOwnerCapObligationMap)) {
        if (
          Object.keys(allRewardsMap[strategyType as StrategyType]).length === 0
        )
          continue;

        const depositReserves = getDepositReserves(
          strategyType as StrategyType,
        );

        try {
          await strategyClaimRewardsAndSwapForCoinType(
            address,
            cetusSdk,
            CETUS_PARTNER_ID,
            allRewardsMap[strategyType as StrategyType],
            appDataMainMarket.rewardPriceMap,
            (depositReserves.lst ?? depositReserves.base)!, // Must have base if no LST
            strategyOwnerCap.id,
            hasPosition(obligation) ? true : false, // isDepositing (true = deposit)
            transaction,
          );
        } catch (err) {
          console.error(err);
          continue;
        }
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        [
          "Claimed and redeposited",
          formatList(
            allRewardCoinTypes.map(
              (coinType) => appDataMainMarket.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
        ]
          .filter(Boolean)
          .join(" "),
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
      Sentry.captureException(err);
      console.error(err);
      showErrorToast(
        [
          "Failed to claim and redeposit",
          formatList(
            allRewardCoinTypes.map(
              (coinType) => appDataMainMarket.coinMetadataMap[coinType].symbol,
            ),
          ),
          "rewards",
        ]
          .filter(Boolean)
          .join(" "),
        err as Error,
        undefined,
        true,
      );
    } finally {
      setIsCompoundingRewards(false);
      refresh();
    }
  };

  const allClaimableRewardsMap: Record<string, BigNumber> = {};
  for (const [strategyType, rewardsMap] of Object.entries(allRewardsMap)) {
    for (const [coinType, { amount, rawAmount, rewards }] of Object.entries(
      rewardsMap,
    )) {
      allClaimableRewardsMap[coinType] = (
        allClaimableRewardsMap[coinType] ?? new BigNumber(0)
      ).plus(amount);
    }
  }

  return (
    <>
    
    {Object.values(StrategyType).map((strategyType) => (
        <LstStrategyDialog key={strategyType} strategyType={strategyType} />
      ))}
      <div className="flex w-full flex-col gap-6">
        {/* Open positions */}
        {Object.values(strategyOwnerCapObligationMap).some(({ obligation }) =>
          hasPosition(obligation),
        ) && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-row items-center gap-2 justify-between">
            <div className="flex flex-row items-center gap-2">
              <TBody className="uppercase">Open strategies</TBody>
              <TLabel>
                {formatUsd(
                  Object.entries(strategyOwnerCapObligationMap).reduce(
                    (acc, [strategyType, { obligation }]) => {
                      // Reserves
                      const depositReserves = getDepositReserves(
                        strategyType as StrategyType,
                      );
                      const defaultCurrencyReserve = getDefaultCurrencyReserve(
                        strategyType as StrategyType,
                      );

                      // Stats - TVL
                      const tvlAmount = getTvlAmount(
                        strategyType as StrategyType,
                        obligation,
                      );

                      return acc.plus(
                        tvlAmount.times(defaultCurrencyReserve.price),
                      );
                    },
                    new BigNumber(0),
                  ),
                )}
              </TLabel>
            </div>
            {hasClaimableRewards && (
          <div className="flex w-max flex-row-reverse items-center gap-3 sm:flex-row">

<TLabel>
                {formatUsd(
                  Object.entries(allClaimableRewardsMap).reduce(
                    (acc, [coinType, amount]) => {
                      const price =
                        appDataMainMarket.rewardPriceMap[coinType] ??
                        new BigNumber(0);

                      return acc.plus(amount.times(price));
                    },
                    new BigNumber(0),
                  ),
                )}
              </TLabel>
          <Tooltip
            content={
              <div className="flex flex-col gap-1">
                {Object.entries(allClaimableRewardsMap).map(
                  ([coinType, amount]) => (
                    <div
                      key={coinType}
                      className="flex flex-row items-center gap-2"
                    >
                      <TokenLogo
                        token={getToken(
                          coinType,
                          appDataMainMarket.coinMetadataMap[coinType],
                        )}
                        size={16}
                      />
                      <TLabelSans className="text-foreground">
                        {formatToken(amount, {
                          dp: appDataMainMarket.coinMetadataMap[coinType]
                            .decimals,
                        })}{" "}
                        {appDataMainMarket.coinMetadataMap[coinType].symbol}
                      </TLabelSans>
                    </div>
                  ),
                )}
              </div>
            }
          >
            <div className="w-max">
              <TokenLogos
                tokens={Object.keys(allClaimableRewardsMap).map(
                  (coinType) =>
                    getToken(
                      coinType,
                      appDataMainMarket.coinMetadataMap[coinType],
                    ),
                )}
                size={16}
              />
            </div>
          </Tooltip>

          <Button
            className="w-[134px]"
            labelClassName="uppercase"
            disabled={isCompoundingRewards}
            onClick={onCompoundRewardsClick}
          >
            {isCompoundingRewards ? <Spinner size="sm" /> : "Claim rewards"}
          </Button>
        </div>
        )}

            </div>

            {/* Min card width: 400px */}
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
              {Object.entries(strategyOwnerCapObligationMap).map(
                ([strategyType, { obligation }]) => {
                  if (!hasPosition(obligation)) return null;
                  return (
                    <StrategyCard
                      key={strategyType}
                      strategyType={strategyType as StrategyType}
                    />
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* All strategies */}
        {Object.values(StrategyType).some(
          (strategyType) =>
            !strategyOwnerCapObligationMap[strategyType] ||
            !hasPosition(
              strategyOwnerCapObligationMap[strategyType].obligation,
            ),
        ) && (
          <div className="flex w-full flex-col gap-4">
            <TBody className="uppercase">All strategies</TBody>

            {/* Min card width: 400px */}
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
              {Object.values(StrategyType)
                .filter((strategyType) =>
                  strategyType === StrategyType.xBTC_wBTC_LOOPING
                    ? process.env.NODE_ENV === "development" ||
                      router.query.xbtcwbtc === "true" ||
                      Date.now() >= 1759237200000 // 2025/09/30 13:00:00 UTC
                    : true,
                )
                .map((strategyType) => {
                  const obligation =
                    strategyOwnerCapObligationMap[strategyType]?.obligation;

                  if (!obligation || !hasPosition(obligation))
                    return (
                      <StrategyCard
                        key={strategyType}
                        strategyType={strategyType}
                      />
                    );
                  return null;
                })}

              <ComingSoonStrategyCard />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
