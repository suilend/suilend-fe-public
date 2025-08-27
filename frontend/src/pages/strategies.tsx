import Head from "next/head";
import { useMemo, useState } from "react";

import { Transaction } from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import BigNumber from "bignumber.js";
import { toast } from "sonner";

import {
  ParsedObligation,
  RewardsMap,
  StrategyOwnerCap,
  getRewardsMap,
} from "@suilend/sdk";
import {
  StrategyType,
  strategyClaimRewardsAndSwap,
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
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import LstStrategyCard from "@/components/strategies/LstStrategyCard";
import LstStrategyDialog from "@/components/strategies/LstStrategyDialog";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  LstStrategyContextProvider,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm border bg-card">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

function Page() {
  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { appData } = useLoadedAppContext();
  const { userData, refresh } = useLoadedUserContext();

  const {
    isMoreParametersOpen,
    setIsMoreParametersOpen,

    hasPosition,

    suiReserve,
    suiBorrowFeePercent,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getDefaultCurrencyReserve,

    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxSuiBorrowedAmount,
    getStepMaxWithdrawnAmount,

    getSimulatedObligation,
    simulateLoopToExposure,
    simulateUnloopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getUnclaimedRewardsAmount,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
  } = useLoadedLstStrategyContext();

  // send.ag
  const cetusSdk = useCetusSdk();

  // Strategy types
  const strategyTypes = Object.values(StrategyType).filter((strategyType) =>
    strategyType === StrategyType.USDC_sSUI_SUI_LOOPING
      ? process.env.NODE_ENV === "development"
      : true,
  );

  // Obligations
  const strategyOwnerCapObligationMap: Record<
    StrategyType,
    { strategyOwnerCap: StrategyOwnerCap; obligation: ParsedObligation }
  > = strategyTypes.reduce(
    (acc, strategyType) => {
      const strategyOwnerCap: StrategyOwnerCap | undefined =
        userData.strategyOwnerCaps.find(
          (soc) => soc.strategyType === strategyType,
        );
      const obligation: ParsedObligation | undefined =
        userData.strategyObligations.find(
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
        userData.rewardMap,
        appData.coinMetadataMap,
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
        await strategyClaimRewardsAndSwap(
          address,
          cetusSdk,
          CETUS_PARTNER_ID,
          allRewardsMap[strategyType as StrategyType],
          getDepositReserves(strategyType as StrategyType).lst,
          strategyOwnerCap.id,
          hasPosition(obligation) ? true : false, // isDepositing (true = deposit)
          transaction,
        );
      }

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      toast.success(
        [
          "Claimed and redeposited",
          formatList(
            allRewardCoinTypes.map(
              (coinType) => appData.coinMetadataMap[coinType].symbol,
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
              (coinType) => appData.coinMetadataMap[coinType].symbol,
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
      <Head>
        <title>Suilend | Strategies</title>
      </Head>

      {strategyTypes.map((strategyType) => (
        <LstStrategyDialog key={strategyType} strategyType={strategyType} />
      ))}

      <div className="flex w-full flex-col gap-6">
        {/* Unclaimed rewards */}
        {hasClaimableRewards && (
          <div className="flex w-full flex-col gap-2.5 sm:h-[20px] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-row items-center gap-2">
              <TBody className="uppercase text-primary-foreground">
                Unclaimed rewards
              </TBody>
              <TLabel>
                {formatUsd(
                  Object.entries(allClaimableRewardsMap).reduce(
                    (acc, [coinType, amount]) => {
                      const price =
                        appData.rewardPriceMap[coinType] ?? new BigNumber(0);

                      return acc.plus(amount.times(price));
                    },
                    new BigNumber(0),
                  ),
                )}
              </TLabel>
            </div>

            <div className="flex w-max flex-row-reverse items-center gap-3 sm:flex-row">
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
                              appData.coinMetadataMap[coinType],
                            )}
                            size={16}
                          />
                          <TLabelSans className="text-foreground">
                            {formatToken(amount, {
                              dp: appData.coinMetadataMap[coinType].decimals,
                            })}{" "}
                            {appData.coinMetadataMap[coinType].symbol}
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
                        getToken(coinType, appData.coinMetadataMap[coinType]),
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
          </div>
        )}

        {/* Open positions */}
        {Object.values(strategyOwnerCapObligationMap).some(({ obligation }) =>
          hasPosition(obligation),
        ) && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-row items-center gap-2">
              <TBody className="uppercase">Open positions</TBody>
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

            {/* Min card width: 400px */}
            <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2 min-[1316px]:grid-cols-3">
              {strategyTypes.map((strategyType) => {
                const obligation =
                  strategyOwnerCapObligationMap[strategyType]?.obligation;

                if (!obligation || !hasPosition(obligation)) return null;
                return (
                  <LstStrategyCard
                    key={strategyType}
                    strategyType={strategyType}
                  />
                );
              })}
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
              {strategyTypes.map((strategyType) => {
                const obligation =
                  strategyOwnerCapObligationMap[strategyType]?.obligation;

                if (!obligation || !hasPosition(obligation))
                  return (
                    <LstStrategyCard
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

        {/* Learn more */}
        <div className="flex w-full flex-col gap-4">
          <TBody className="uppercase">Learn more</TBody>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {/* 1 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What is Suilend Strategies?</TBodySans>
              <TLabelSans>
                <span className="font-medium">Suilend Strategies</span> is a new
                Suilend feature that lets you deploy into preset DeFi strategies
                in one click - turning complex, multi-step processes into a
                simple, streamlined flow.
              </TLabelSans>
            </div>

            {/* 2 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What strategies are available?</TBodySans>
              <TLabelSans>
                1. <span className="font-medium">sSUI/SUI</span> Looping
                strategy that lets you leverage up to 3x, yielding{" "}
                {formatPercent(
                  getAprPercent(
                    StrategyType.sSUI_SUI_LOOPING,
                    undefined,
                    exposureMap[StrategyType.sSUI_SUI_LOOPING].default,
                  ),
                )}{" "}
                APR from sSUI rewards and sSUI staking yield.
              </TLabelSans>
            </div> */}

            {/* 3 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How do I deposit?</TBodySans>
              <TLabelSans>
                In the deposit modal, enter the amount of SUI you want to
                deposit into the strategy and sign the transaction request in
                your Sui wallet.
                <br />
                <br />
                After opening a position, {`you'll`} be able to deposit more
                into the strategy at any time.
              </TLabelSans>
            </div> */}

            {/* 4 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How do I withdraw?</TBodySans>
              <TLabelSans>
                In the withdraw modal, enter the amount of SUI you want to
                withdraw from the strategy, and sign the transaction request in
                your Sui wallet.
                <br />
                <br />
                You can either withdraw all of your position at once by pressing
                the MAX button, or withdraw a portion of it.
              </TLabelSans>
            </div> */}

            {/* 5 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>What are the risks?</TBodySans>
              <TLabelSans>
                Standard DeFi risks apply.
                <br />
                <br />• Liquidation Risk: if borrows exceed your borrow power
                due to interest accruing
                <br />• Smart Contract Risk: tied to SpringSui-issued LSTs such
                as sSUI.
                {/* or stratSUI. */}
                <br />• Oracle Risk: depending on strategy ({`doesn't`} apply to
                SpringSui LST/SUI Looping strategies)
                <br />
                <br />
                Always size your position based on your risk tolerance.
              </TLabelSans>
            </div>

            {/* 6 */}
            {/* <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How does Suilend mitigate risks?</TBodySans>
              <TLabelSans>
                All DeFi protocols, including Suilend, come with risks, which
                are important to understand before depositing significant
                amounts of capital. The main risks involved in using Suilend are
                outlined{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/security/risks"
                  noIcon
                >
                  here
                </TextLink>
                .
                <br />
                <br />
                To mitigate this, Suilend has undergone multiple rigorous
                audits, available{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/security/suilend-audit"
                  noIcon
                >
                  here
                </TextLink>{" "}
                and has an active bug bounty program covering smart contract
                bugs. Suilend is one of the few Sui DeFi protocols to fully
                open-source its smart contracts:{" "}
                <TextLink
                  className="text-muted-foreground decoration-muted-foreground/50 hover:text-foreground hover:decoration-foreground/50"
                  href="https://docs.suilend.fi/ecosystem/suilend-integration-links"
                  noIcon
                >
                  Suilend Integration Links
                </TextLink>
                .
              </TLabelSans>
            </div> */}

            {/* 7 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>Do I need to manage my position?</TBodySans>
              <TLabelSans>
                Suilend Strategies is designed to be low-maintenance and
                requires minimal management, but you can adjust your leverage,
                deposit, or withdraw at any time.
                <br />
                <br />
                Rewards that are listed on Suilend will be autoclaimed and
                redeposited roughly every two weeks. Other rewards will need to
                be claimed and redeposited manually.
              </TLabelSans>
            </div>

            {/* 8 */}
            <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
              <TBodySans>How much leverage should I use?</TBodySans>
              <TLabelSans>
                Higher leverage means higher APR—but also higher risk.
                <br />
                <br />
                For example:
                <br />• 1.5-2x leverage: Lower risk, moderate yield
                <br />• 2.5-3x leverage: Higher liquidation risk, high yield
                <br />
                <br />
                You can adjust your leverage for each strategy at any time
                through the UI.
              </TLabelSans>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <LstStrategyContextProvider>
      <Page />
    </LstStrategyContextProvider>
  );
}
