import {
  RouterData as CetusRouterData,
  AggregatorClient as CetusSdk,
} from "@cetusprotocol/aggregator-sdk";
import {
  Transaction,
  TransactionObjectArgument,
  TransactionObjectInput,
  TransactionResult,
} from "@mysten/sui/transactions";
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_SYSTEM_STATE_OBJECT_ID,
} from "@mysten/sui/utils";
import BN from "bn.js";

import {
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_stratSUI_COINTYPE,
  isSui,
} from "@suilend/sui-fe";

import {
  ClaimRewardsReward,
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
} from "../client";

import { RewardsMap, Side, StrategyOwnerCap } from "./types";

export const STRATEGY_WRAPPER_PACKAGE_ID =
  "0xba97dc73a07638d03d77ad2161484eb21db577edc9cadcd7035fef4b4f2f6fa1";

export enum StrategyType {
  sSUI_SUI_LOOPING = "1",
  stratSUI_SUI_LOOPING = "2",
}
export const STRATEGY_TYPE_INFO_MAP: Record<
  StrategyType,
  {
    queryParam: string;
    coinTypes: string[];
    lstCoinType: string;
    title: string;
    type: string;
    tooltip: string;
  }
> = {
  [StrategyType.sSUI_SUI_LOOPING]: {
    queryParam: "sSUI-SUI-looping",
    coinTypes: [NORMALIZED_sSUI_COINTYPE, NORMALIZED_SUI_COINTYPE],
    lstCoinType: NORMALIZED_sSUI_COINTYPE,
    title: "sSUI/SUI",
    type: "Looping",
    tooltip:
      "Sets up a sSUI/SUI Looping strategy by depositing sSUI and borrowing SUI to the desired leverage",
  },
  [StrategyType.stratSUI_SUI_LOOPING]: {
    queryParam: "stratSUI-SUI-looping",
    coinTypes: [NORMALIZED_stratSUI_COINTYPE, NORMALIZED_SUI_COINTYPE],
    lstCoinType: NORMALIZED_stratSUI_COINTYPE,
    title: "stratSUI/SUI",
    type: "Looping",
    tooltip:
      "Sets up a stratSUI/SUI Looping strategy by depositing stratSUI and borrowing SUI to the desired leverage",
  },
};

export const strategyDeposit = (
  coin: TransactionObjectInput,
  coinType: string,
  strategyOwnerCap: TransactionObjectInput,
  reserveArrayIndex: bigint,
  transaction: Transaction,
) =>
  transaction.moveCall({
    target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::deposit_liquidity_and_deposit_into_obligation`,
    typeArguments: [LENDING_MARKET_TYPE, coinType],
    arguments: [
      transaction.object(strategyOwnerCap),
      transaction.object(LENDING_MARKET_ID),
      transaction.pure.u64(reserveArrayIndex),
      transaction.object(SUI_CLOCK_OBJECT_ID),
      transaction.object(coin),
    ],
  });

export const strategyBorrow = (
  coinType: string,
  strategyOwnerCap: TransactionObjectInput,
  reserveArrayIndex: bigint,
  value: bigint,
  transaction: Transaction,
) =>
  isSui(coinType)
    ? transaction.moveCall({
        target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::borrow_sui_from_obligation`,
        typeArguments: [LENDING_MARKET_TYPE],
        arguments: [
          transaction.object(strategyOwnerCap),
          transaction.object(LENDING_MARKET_ID),
          transaction.pure.u64(reserveArrayIndex),
          transaction.object(SUI_CLOCK_OBJECT_ID),
          transaction.pure.u64(value),
          transaction.object(SUI_SYSTEM_STATE_OBJECT_ID),
        ],
      })
    : transaction.moveCall({
        target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::borrow_from_obligation`,
        typeArguments: [LENDING_MARKET_TYPE, coinType],
        arguments: [
          transaction.object(strategyOwnerCap),
          transaction.object(LENDING_MARKET_ID),
          transaction.pure.u64(reserveArrayIndex),
          transaction.object(SUI_CLOCK_OBJECT_ID),
          transaction.pure.u64(value),
        ],
      });

export const strategyWithdraw = (
  coinType: string,
  strategyOwnerCap: TransactionObjectInput,
  reserveArrayIndex: bigint,
  value: bigint,
  transaction: Transaction,
) =>
  transaction.moveCall({
    target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::withdraw_from_obligation_and_redeem`,
    typeArguments: [LENDING_MARKET_TYPE, coinType],
    arguments: [
      transaction.object(strategyOwnerCap),
      transaction.object(LENDING_MARKET_ID),
      transaction.pure.u64(reserveArrayIndex),
      transaction.object(SUI_CLOCK_OBJECT_ID),
      transaction.pure.u64(value),
    ],
  });

const strategyClaimRewards = (
  coinType: string,
  strategyOwnerCap: TransactionObjectInput,
  reserveArrayIndex: bigint,
  rewardIndex: bigint,
  side: Side,
  transaction: Transaction,
) =>
  transaction.moveCall({
    target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::claim_rewards`,
    typeArguments: [LENDING_MARKET_TYPE, coinType],
    arguments: [
      transaction.object(strategyOwnerCap),
      transaction.object(LENDING_MARKET_ID),
      transaction.object(SUI_CLOCK_OBJECT_ID),
      transaction.pure.u64(reserveArrayIndex),
      transaction.pure.u64(rewardIndex),
      transaction.pure.bool(side === Side.DEPOSIT),
    ],
  });
const strategyClaimRewardsAndMergeCoins = (
  rewardsMap: RewardsMap,
  strategyOwnerCap: TransactionObjectInput,
  transaction: Transaction,
): Record<string, TransactionObjectArgument> => {
  // 1) Get rewards
  const rewards: ClaimRewardsReward[] = Object.values(rewardsMap)
    .flatMap((r) => r.rewards)
    .map((r) => ({
      reserveArrayIndex: Object.values(r.obligationClaims)[0].reserveArrayIndex,
      rewardIndex: BigInt(r.stats.rewardIndex),
      rewardCoinType: r.stats.rewardCoinType,
      side: r.stats.side,
    }));

  // 2) Claim rewards and merge coins
  const mergeCoinsMap: Record<string, TransactionObjectArgument[]> = {};
  for (const reward of rewards) {
    const [claimedCoin] = strategyClaimRewards(
      reward.rewardCoinType,
      strategyOwnerCap,
      reward.reserveArrayIndex,
      reward.rewardIndex,
      reward.side,
      transaction,
    );

    if (mergeCoinsMap[reward.rewardCoinType] === undefined)
      mergeCoinsMap[reward.rewardCoinType] = [];
    mergeCoinsMap[reward.rewardCoinType].push(claimedCoin);
  }

  const mergedCoinsMap: Record<string, TransactionObjectArgument> = {};
  for (const [rewardCoinType, coins] of Object.entries(mergeCoinsMap)) {
    const mergedCoin = coins[0];
    if (coins.length > 1) transaction.mergeCoins(mergedCoin, coins.slice(1));

    mergedCoinsMap[rewardCoinType] = mergedCoin;
  }

  return mergedCoinsMap;
};
export const strategyClaimRewardsAndSendToUser = (
  address: string,
  rewardsMap: RewardsMap,
  strategyOwnerCap: TransactionObjectInput,
  transaction: Transaction,
) => {
  // 1) Claim rewards and merge coins
  const mergedCoinsMap: Record<string, TransactionObjectArgument> =
    strategyClaimRewardsAndMergeCoins(
      rewardsMap,
      strategyOwnerCap,
      transaction,
    );

  // 2) Send coins to user
  for (const [coinType, coin] of Object.entries(mergedCoinsMap))
    transaction.transferObjects([coin], transaction.pure.address(address));
};
export const strategyCompoundRewards = async (
  cetusSdk: CetusSdk,
  cetusPartnerId: string,
  rewardsMap: RewardsMap,
  targetCoinType: string,
  targetReserveArrayIndex: bigint,
  strategyOwnerCap: TransactionObjectInput,
  transaction: Transaction,
) => {
  const rewards: ClaimRewardsReward[] = Object.values(rewardsMap)
    .flatMap((r) => r.rewards)
    .map((r) => ({
      reserveArrayIndex: Object.values(r.obligationClaims)[0].reserveArrayIndex,
      rewardIndex: BigInt(r.stats.rewardIndex),
      rewardCoinType: r.stats.rewardCoinType,
      side: r.stats.side,
    }));

  // 1) Claim and merge coins
  const mergeCoinsMap: Record<string, TransactionObjectArgument[]> = {};
  for (const reward of rewards) {
    const [claimedCoin] = strategyClaimRewards(
      reward.rewardCoinType,
      strategyOwnerCap,
      reward.reserveArrayIndex,
      reward.rewardIndex,
      reward.side,
      transaction,
    );

    if (mergeCoinsMap[reward.rewardCoinType] === undefined)
      mergeCoinsMap[reward.rewardCoinType] = [];
    mergeCoinsMap[reward.rewardCoinType].push(claimedCoin);
  }

  const mergedCoinsMap: Record<string, TransactionObjectArgument> = {};
  for (const [rewardCoinType, coins] of Object.entries(mergeCoinsMap)) {
    const mergedCoin = coins[0];
    if (coins.length > 1) transaction.mergeCoins(mergedCoin, coins.slice(1));

    mergedCoinsMap[rewardCoinType] = mergedCoin;
  }

  // 2) Prepare
  const nonSwappedCoinTypes = Object.keys(mergedCoinsMap).filter(
    (coinType) => coinType === targetCoinType,
  );
  const swappedCoinTypes = Object.keys(mergedCoinsMap).filter(
    (coinType) => coinType !== targetCoinType,
  );

  let resultCoin: TransactionObjectArgument | undefined = undefined;

  // 3.1) Non-swapped coins
  for (const [coinType, coin] of Object.entries(mergedCoinsMap).filter(
    ([coinType]) => nonSwappedCoinTypes.includes(coinType),
  )) {
    if (resultCoin) transaction.mergeCoins(resultCoin, [coin]);
    else resultCoin = coin;
  }

  // 3.2) Swapped coins
  // 3.2.1) Get routers
  const amountsAndSortedQuotesMap: Record<
    string,
    {
      coin: TransactionObjectArgument;
      routers: CetusRouterData;
    }
  > = Object.fromEntries(
    await Promise.all(
      Object.entries(mergedCoinsMap)
        .filter(([coinType]) => swappedCoinTypes.includes(coinType))
        .map(([coinType, coin]) =>
          (async () => {
            // Get amount
            const { rawAmount: amount } = rewardsMap[coinType]; // Use underestimate (rewards keep accruing)

            // Get routes
            const routers = await cetusSdk.findRouters({
              from: coinType,
              target: targetCoinType,
              amount: new BN(amount.toString()), // Underestimate (rewards keep accruing)
              byAmountIn: true,
            });
            if (!routers) throw new Error("No swap quote found");
            console.log("[compoundRewards] routers", {
              coinType,
              routers,
            });

            return [coinType, { coin, routers }];
          })(),
        ),
    ),
  );
  console.log("[compoundRewards] amountsAndSortedQuotesMap", {
    amountsAndSortedQuotesMap,
  });

  // 3.2.2) Swap
  for (const [coinType, { coin: coinIn, routers }] of Object.entries(
    amountsAndSortedQuotesMap,
  )) {
    console.log("[compoundRewards] swapping coinType", coinType);
    const slippagePercent = 3;

    let coinOut: TransactionObjectArgument;
    try {
      coinOut = await cetusSdk.fixableRouterSwap({
        routers,
        inputCoin: coinIn,
        slippage: slippagePercent / 100,
        txb: transaction,
        partner: cetusPartnerId,
      });
    } catch (err) {
      throw new Error("No swap quote found");
    }

    if (resultCoin) transaction.mergeCoins(resultCoin, [coinOut]);
    else resultCoin = coinOut;
  }

  // 4) Deposit
  if (!resultCoin) throw new Error("No coin to deposit or transfer");
  strategyDeposit(
    resultCoin,
    targetCoinType,
    strategyOwnerCap,
    targetReserveArrayIndex,
    transaction,
  );
};

export const createStrategyOwnerCapIfNoneExists = (
  strategyType: StrategyType,
  strategyOwnerCap: StrategyOwnerCap | undefined,
  transaction: Transaction,
): { strategyOwnerCapId: string | TransactionResult; didCreate: boolean } => {
  let strategyOwnerCapId: string | TransactionResult;
  let didCreate = false;
  if (strategyOwnerCap) strategyOwnerCapId = strategyOwnerCap.id;
  else {
    strategyOwnerCapId = transaction.moveCall({
      target: `${STRATEGY_WRAPPER_PACKAGE_ID}::strategy_wrapper::create_strategy_owner_cap`,
      typeArguments: [LENDING_MARKET_TYPE],
      arguments: [
        transaction.object(LENDING_MARKET_ID),
        transaction.pure.u8(+strategyType),
      ],
    });
    didCreate = true;
  }

  return { strategyOwnerCapId, didCreate };
};

export const sendStrategyOwnerCapToUser = (
  strategyOwnerCapId: string | TransactionResult,
  address: string,
  transaction: Transaction,
) => {
  transaction.transferObjects(
    [strategyOwnerCapId],
    transaction.pure.address(address),
  );
};
