import { PUBLISHED_AT } from "..";
import { obj, pure } from "../../_framework/util";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export function suiBalance(tx: Transaction, staker: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::sui_balance`,
    arguments: [obj(tx, staker)],
  });
}

export function totalSuiSupply(
  tx: Transaction,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::total_sui_supply`,
    arguments: [obj(tx, staker)],
  });
}

export function init(tx: Transaction, otw: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::init`,
    arguments: [obj(tx, otw)],
  });
}

export function liquidStakingInfo(
  tx: Transaction,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::liquid_staking_info`,
    arguments: [obj(tx, staker)],
  });
}

export interface RebalanceArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function rebalance(tx: Transaction, args: RebalanceArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::rebalance`,
    arguments: [obj(tx, args.staker), obj(tx, args.systemState)],
  });
}

export interface WithdrawArgs {
  staker: TransactionObjectInput;
  withdrawAmount: bigint | TransactionArgument;
  systemState: TransactionObjectInput;
}

export function withdraw(tx: Transaction, args: WithdrawArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::withdraw`,
    arguments: [
      obj(tx, args.staker),
      pure(tx, args.withdrawAmount, `u64`),
      obj(tx, args.systemState),
    ],
  });
}

export interface DepositArgs {
  staker: TransactionObjectInput;
  sui: TransactionObjectInput;
}

export function deposit(tx: Transaction, args: DepositArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::deposit`,
    arguments: [obj(tx, args.staker), obj(tx, args.sui)],
  });
}

export interface ClaimFeesArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function claimFees(tx: Transaction, args: ClaimFeesArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::claim_fees`,
    arguments: [obj(tx, args.staker), obj(tx, args.systemState)],
  });
}

export function createStaker(
  tx: Transaction,
  treasuryCap: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::create_staker`,
    arguments: [obj(tx, treasuryCap)],
  });
}

export function liabilities(tx: Transaction, staker: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::liabilities`,
    arguments: [obj(tx, staker)],
  });
}

export function lstBalance(tx: Transaction, staker: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::lst_balance`,
    arguments: [obj(tx, staker)],
  });
}

export interface UnstakeNSuiArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
  suiAmountOut: bigint | TransactionArgument;
}

export function unstakeNSui(tx: Transaction, args: UnstakeNSuiArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::unstake_n_sui`,
    arguments: [
      obj(tx, args.staker),
      obj(tx, args.systemState),
      pure(tx, args.suiAmountOut, `u64`),
    ],
  });
}
