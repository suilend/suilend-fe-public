import {
  Transaction,
  TransactionObjectInput,
  TransactionResult,
} from "@mysten/sui/transactions";
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_SYSTEM_STATE_OBJECT_ID,
} from "@mysten/sui/utils";

import { isSui } from "@suilend/sui-fe";

import { LENDING_MARKET_ID, LENDING_MARKET_TYPE } from "../client";

import { Side, StrategyOwnerCap } from "./types";

export const STRATEGY_WRAPPER_PACKAGE_ID =
  "0xba97dc73a07638d03d77ad2161484eb21db577edc9cadcd7035fef4b4f2f6fa1";
export const STRATEGY_SUI_LOOPING_SSUI = 1;

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

export const strategyClaimRewards = (
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

export const createStrategyOwnerCapIfNoneExists = (
  transaction: Transaction,
  strategyOwnerCap?: StrategyOwnerCap,
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
        transaction.pure.u8(STRATEGY_SUI_LOOPING_SSUI),
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
