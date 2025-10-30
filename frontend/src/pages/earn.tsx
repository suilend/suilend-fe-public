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
  TBodySans,
  TLabel,
  TLabelSans,
} from "@/components/shared/Typography";
import LstStrategyDialog from "@/components/strategies/LstStrategyDialog";
import StrategyCard from "@/components/strategies/StrategyCard";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { LendingMarketContextProvider } from "@/contexts/LendingMarketContext";
import {
  LstStrategyContextProvider,
  useLoadedLstStrategyContext,
} from "@/contexts/LstStrategyContext";
import { useLoadedUserContext } from "@/contexts/UserContext";
import { CETUS_PARTNER_ID } from "@/lib/cetus";
import { useCetusSdk } from "@/lib/swap";
import StrategyPanel from "@/components/strategies/StrategyPanel";
import VaultPanel from "@/components/strategies/VaultPanel";
import { VaultContextProvider } from "@/contexts/VaultContext";

function ComingSoonStrategyCard() {
  return (
    <div className="flex h-[74px] w-full flex-row items-center justify-center rounded-sm border bg-card">
      <TLabelSans>Coming soon</TLabelSans>
    </div>
  );
}

function Page() {
  const router = useRouter();

  const { explorer } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];
  const { allUserData, refresh } = useLoadedUserContext();
  const userDataMainMarket = allUserData[LENDING_MARKET_ID];

  const {
    isMoreDetailsOpen,
    setIsMoreDetailsOpen,

    hasPosition,

    suiReserve,

    lstMap,
    getLstMintFee,
    getLstRedeemFee,

    exposureMap,

    getDepositReserves,
    getBorrowReserve,
    getDefaultCurrencyReserve,

    getSimulatedObligation,
    getDepositedAmount,
    getBorrowedAmount,
    getTvlAmount,
    getExposure,
    getStepMaxBorrowedAmount,
    getStepMaxWithdrawnAmount,

    simulateLoopToExposure,
    simulateDeposit,
    simulateDepositAndLoopToExposure,

    getGlobalTvlAmountUsd,
    getUnclaimedRewardsAmount,
    getHistory,
    getHistoricalTvlAmount,
    getAprPercent,
    getHealthPercent,
    getLiquidationPrice,
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
      <Head>
        <title>Suilend | Earn</title>
      </Head>

      <div className="flex w-full flex-col gap-6">
        <VaultPanel />
        <StrategyPanel />
      </div>
    </>
  );
}

export default function Strategies() {
  return (
    <VaultContextProvider>  
    <LstStrategyContextProvider>
      <LendingMarketContextProvider lendingMarketId={LENDING_MARKET_ID}>
        <Page />
      </LendingMarketContextProvider>
    </LstStrategyContextProvider>
    </VaultContextProvider>
  );
}
