import {
  RouterDataV3 as CetusQuote,
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
import BigNumber from "bignumber.js";
import BN from "bn.js";

import {
  MAX_U64,
  NORMALIZED_AUSD_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_USDC_COINTYPE,
  NORMALIZED_sSUI_COINTYPE,
  NORMALIZED_stratSUI_COINTYPE,
  NORMALIZED_wBTC_COINTYPE,
  NORMALIZED_xBTC_COINTYPE,
  isSui,
} from "@suilend/sui-fe";

import {
  ClaimRewardsReward,
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
} from "../client";
import { ParsedObligation, ParsedReserve } from "../parsers";

import { RewardsMap, Side, StrategyOwnerCap } from "./types";

export const STRATEGY_WRAPPER_PACKAGE_ID_V1 =
  "0xba97dc73a07638d03d77ad2161484eb21db577edc9cadcd7035fef4b4f2f6fa1";
const STRATEGY_WRAPPER_PACKAGE_ID_V6 =
  "0xb4e22255bb2ef58c4451eaf5a93135bb9acac58951b1755f1d2aaaad675a0f47";

export enum StrategyType {
  sSUI_SUI_LOOPING = "1",
  stratSUI_SUI_LOOPING = "2",
  USDC_sSUI_SUI_LOOPING = "3",
  AUSD_sSUI_SUI_LOOPING = "4",
  xBTC_sSUI_SUI_LOOPING = "100", // Used to be for Slush Strategies #0
  xBTC_wBTC_LOOPING = "101", // Used to be for Slush Strategies #1
}
export const STRATEGY_TYPE_INFO_MAP: Record<
  StrategyType,
  {
    queryParam: string;
    header: {
      coinTypes: string[];
      title: string;
      tooltip: string;
      type: string;
    };

    depositBaseCoinType?: string;
    depositLstCoinType?: string;
    borrowCoinType: string;

    currencyCoinTypes: string[];
    defaultCurrencyCoinType: string;
  }
> = {
  [StrategyType.sSUI_SUI_LOOPING]: {
    queryParam: "sSUI-SUI-looping",
    header: {
      coinTypes: [NORMALIZED_sSUI_COINTYPE, NORMALIZED_SUI_COINTYPE],
      title: "sSUI/SUI",
      tooltip:
        "Sets up a sSUI/SUI Looping strategy by depositing sSUI and borrowing SUI to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: undefined,
    depositLstCoinType: NORMALIZED_sSUI_COINTYPE,
    borrowCoinType: NORMALIZED_SUI_COINTYPE,

    currencyCoinTypes: [NORMALIZED_SUI_COINTYPE, NORMALIZED_sSUI_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_SUI_COINTYPE,
  },
  [StrategyType.stratSUI_SUI_LOOPING]: {
    queryParam: "stratSUI-SUI-looping",
    header: {
      coinTypes: [NORMALIZED_stratSUI_COINTYPE, NORMALIZED_SUI_COINTYPE],
      title: "stratSUI/SUI",
      tooltip:
        "Sets up a stratSUI/SUI Looping strategy by depositing stratSUI and borrowing SUI to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: undefined,
    depositLstCoinType: NORMALIZED_stratSUI_COINTYPE,
    borrowCoinType: NORMALIZED_SUI_COINTYPE,

    currencyCoinTypes: [NORMALIZED_SUI_COINTYPE, NORMALIZED_stratSUI_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_SUI_COINTYPE,
  },
  [StrategyType.USDC_sSUI_SUI_LOOPING]: {
    queryParam: "USDC-sSUI-SUI-looping",
    header: {
      coinTypes: [NORMALIZED_USDC_COINTYPE],
      title: "USDC sSUI/SUI",
      tooltip:
        "Sets up a USDC sSUI/SUI Looping strategy by depositing USDC and looping sSUI/SUI to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: NORMALIZED_USDC_COINTYPE,
    depositLstCoinType: NORMALIZED_sSUI_COINTYPE,
    borrowCoinType: NORMALIZED_SUI_COINTYPE,

    currencyCoinTypes: [NORMALIZED_USDC_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_USDC_COINTYPE,
  },
  [StrategyType.AUSD_sSUI_SUI_LOOPING]: {
    queryParam: "AUSD-sSUI-SUI-looping",
    header: {
      coinTypes: [NORMALIZED_AUSD_COINTYPE],
      title: "AUSD sSUI/SUI",
      tooltip:
        "Sets up an AUSD sSUI/SUI Looping strategy by depositing AUSD and looping sSUI/SUI to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: NORMALIZED_AUSD_COINTYPE,
    depositLstCoinType: NORMALIZED_sSUI_COINTYPE,
    borrowCoinType: NORMALIZED_SUI_COINTYPE,

    currencyCoinTypes: [NORMALIZED_AUSD_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_AUSD_COINTYPE,
  },
  [StrategyType.xBTC_sSUI_SUI_LOOPING]: {
    queryParam: "xBTC-sSUI-SUI-looping",
    header: {
      coinTypes: [NORMALIZED_xBTC_COINTYPE],
      title: "xBTC sSUI/SUI",
      tooltip:
        "Sets up an xBTC sSUI/SUI Looping strategy by depositing xBTC and looping sSUI/SUI to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: NORMALIZED_xBTC_COINTYPE,
    depositLstCoinType: NORMALIZED_sSUI_COINTYPE,
    borrowCoinType: NORMALIZED_SUI_COINTYPE,

    currencyCoinTypes: [NORMALIZED_xBTC_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_xBTC_COINTYPE,
  },
  [StrategyType.xBTC_wBTC_LOOPING]: {
    queryParam: "xBTC-wBTC-looping",
    header: {
      coinTypes: [NORMALIZED_xBTC_COINTYPE, NORMALIZED_wBTC_COINTYPE],
      title: "xBTC/wBTC",
      tooltip:
        "Sets up an xBTC/wBTC Looping strategy by depositing xBTC and borrowing wBTC to the desired leverage",
      type: "Looping",
    },

    depositBaseCoinType: NORMALIZED_xBTC_COINTYPE,
    depositLstCoinType: undefined,
    borrowCoinType: NORMALIZED_wBTC_COINTYPE,

    currencyCoinTypes: [NORMALIZED_xBTC_COINTYPE, NORMALIZED_wBTC_COINTYPE],
    defaultCurrencyCoinType: NORMALIZED_xBTC_COINTYPE,
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
    target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::deposit_liquidity_and_deposit_into_obligation`,
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
        target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::borrow_sui_from_obligation`,
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
        target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::borrow_from_obligation`,
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
    target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::withdraw_from_obligation_and_redeem`,
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
    target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::claim_rewards`,
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
export const strategyClaimRewardsAndSwapForCoinType = async (
  address: string,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,
  rewardsMap: RewardsMap,
  rewardPriceMap: Record<string, BigNumber | undefined>,
  depositReserve: ParsedReserve,
  strategyOwnerCap: TransactionObjectInput,
  isDepositing: boolean,
  transaction: Transaction,
) => {
  const filteredRewardsMap = Object.fromEntries(
    Object.entries(rewardsMap).filter(
      ([coinType]) =>
        (rewardPriceMap[coinType] ?? new BigNumber(0))
          .times(rewardsMap[coinType].amount)
          .gte(0.01), // Filter out rewards with value < $0.01 (will most likely fail to get a swap quote)
    ),
  );

  // 1) Claim rewards and merge coins
  const mergedCoinsMap: Record<string, TransactionObjectArgument> =
    strategyClaimRewardsAndMergeCoins(
      filteredRewardsMap,
      strategyOwnerCap,
      transaction,
    );

  // 2) Prepare
  const nonSwappedCoinTypes = Object.keys(mergedCoinsMap).filter(
    (coinType) => coinType === depositReserve.coinType,
  );
  const swappedCoinTypes = Object.keys(mergedCoinsMap).filter(
    (coinType) => coinType !== depositReserve.coinType,
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
      routers: CetusQuote;
    }
  > = Object.fromEntries(
    await Promise.all(
      Object.entries(mergedCoinsMap)
        .filter(([coinType]) => swappedCoinTypes.includes(coinType))
        .map(([coinType, coin]) =>
          (async () => {
            // Get amount
            const { rawAmount: amount } = filteredRewardsMap[coinType]; // Use underestimate (rewards keep accruing)

            // Get routes
            const routers = await cetusSdk.findRouters({
              from: coinType,
              target: depositReserve.coinType,
              amount: new BN(amount.toString()), // Underestimate (rewards keep accruing)
              byAmountIn: true,
            });
            if (!routers)
              throw new Error(`No swap quote found for ${coinType}`);
            console.log("[strategyClaimRewardsAndSwapForCoinType] routers", {
              coinType,
              routers,
            });

            return [coinType, { coin, routers }];
          })(),
        ),
    ),
  );
  console.log(
    "[strategyClaimRewardsAndSwapForCoinType] amountsAndSortedQuotesMap",
    { amountsAndSortedQuotesMap },
  );

  // 3.2.2) Swap
  for (const [coinType, { coin: coinIn, routers }] of Object.entries(
    amountsAndSortedQuotesMap,
  )) {
    console.log(
      "[strategyClaimRewardsAndSwapForCoinType] swapping coinType",
      coinType,
    );

    let coinOut: TransactionObjectArgument;
    try {
      coinOut = await cetusSdk.fixableRouterSwapV3({
        router: routers,
        inputCoin: coinIn,
        slippage: 3 / 100,
        txb: transaction,
        partner: cetusPartnerId,
      });
    } catch (err) {
      throw new Error(`No swap quote found for ${coinType}`);
    }

    if (resultCoin) transaction.mergeCoins(resultCoin, [coinOut]);
    else resultCoin = coinOut;
  }

  // 4) Deposit
  if (!resultCoin) throw new Error("No coin to deposit or transfer");
  if (isDepositing) {
    strategyDeposit(
      resultCoin,
      depositReserve.coinType,
      strategyOwnerCap,
      depositReserve.arrayIndex,
      transaction,
    );
  } else {
    transaction.transferObjects(
      [resultCoin],
      transaction.pure.address(address),
    );
  }
};

export const strategySwapSomeDepositsForCoinType = async (
  strategyType: StrategyType,
  cetusSdk: CetusSdk,
  cetusPartnerId: string,
  obligation: ParsedObligation,
  noSwapCoinTypes: string[], // coinTypes to not swap for depositReserve.coinType
  swapPercent: BigNumber, // percent of deposit to swap for depositReserve.coinType (0-100)
  depositReserve: ParsedReserve,
  strategyOwnerCap: TransactionObjectInput,
  transaction: Transaction,
) => {
  // 1) MAX withdraw non-swapCoinTypes deposits
  const swapCoinTypeDeposits = obligation.deposits.filter(
    (deposit) => !noSwapCoinTypes.includes(deposit.coinType),
  );
  if (swapCoinTypeDeposits.length === 0) return;

  const withdrawnCoinsMap: Record<
    string,
    {
      deposit: ParsedObligation["deposits"][number];
      coin: TransactionObjectArgument;
    }
  > = {};

  for (const deposit of swapCoinTypeDeposits) {
    const [withdrawnCoin] = strategyWithdraw(
      deposit.coinType,
      strategyOwnerCap,
      deposit.reserve.arrayIndex,
      swapPercent.eq(100)
        ? BigInt(MAX_U64.toString())
        : BigInt(
            new BigNumber(
              new BigNumber(deposit.depositedAmount.times(swapPercent.div(100)))
                .times(10 ** deposit.reserve.token.decimals)
                .integerValue(BigNumber.ROUND_DOWN)
                .toString(),
            )
              .div(deposit.reserve.cTokenExchangeRate)
              .integerValue(BigNumber.ROUND_UP)
              .toString(),
          ),
      transaction,
    );

    withdrawnCoinsMap[deposit.coinType] = {
      deposit,
      coin: withdrawnCoin,
    };
  }

  // 2) Swap
  let resultCoin: TransactionObjectArgument | undefined = undefined;

  // 2.1) Get routers
  const amountsAndSortedQuotesMap: Record<
    string,
    {
      coin: TransactionObjectArgument;
      routers: CetusQuote;
    }
  > = Object.fromEntries(
    await Promise.all(
      Object.entries(withdrawnCoinsMap).map(([coinType, { deposit, coin }]) =>
        (async () => {
          // Get amount
          const amount = new BigNumber(
            deposit.depositedAmount.times(swapPercent.div(100)),
          )
            .times(10 ** deposit.reserve.token.decimals)
            .integerValue(BigNumber.ROUND_DOWN); // Use underestimate (deposits keep accruing if deposit APR >0)

          // Get routes
          const routers = await cetusSdk.findRouters({
            from: deposit.coinType,
            target: depositReserve.coinType,
            amount: new BN(amount.toString()), // Underestimate (deposits keep accruing if deposit APR >0)
            byAmountIn: true,
          });
          if (!routers)
            throw new Error(`No swap quote found for ${deposit.coinType}`);
          console.log("[strategySwapSomeDepositsForCoinType] routers", {
            coinType: deposit.coinType,
            routers,
          });

          return [deposit.coinType, { coin, routers }];
        })(),
      ),
    ),
  );
  console.log(
    "[strategySwapSomeDepositsForCoinType] amountsAndSortedQuotesMap",
    { amountsAndSortedQuotesMap },
  );

  // 2.2) Swap
  for (const [coinType, { coin: coinIn, routers }] of Object.entries(
    amountsAndSortedQuotesMap,
  )) {
    console.log(
      "[strategySwapSomeDepositsForCoinType] swapping coinType",
      coinType,
    );

    let coinOut: TransactionObjectArgument;
    try {
      coinOut = await cetusSdk.fixableRouterSwapV3({
        router: routers,
        inputCoin: coinIn,
        slippage: 3 / 100,
        txb: transaction,
        partner: cetusPartnerId,
      });
    } catch (err) {
      throw new Error(`No swap quote found for ${coinType}`);
    }

    if (resultCoin) transaction.mergeCoins(resultCoin, [coinOut]);
    else resultCoin = coinOut;
  }

  // 3) Deposit
  if (!resultCoin) throw new Error("No coin to deposit or transfer");

  console.log("[strategySwapSomeDepositsForCoinType] depositing resultCoin");
  strategyDeposit(
    resultCoin,
    depositReserve.coinType,
    strategyOwnerCap,
    depositReserve.arrayIndex,
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
      target: `${STRATEGY_WRAPPER_PACKAGE_ID_V6}::strategy_wrapper::create_strategy_owner_cap`,
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
