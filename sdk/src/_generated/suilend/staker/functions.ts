import { PUBLISHED_AT } from "..";
import { obj, pure } from "../../_framework/util";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export interface WithdrawArgs {
  staker: TransactionObjectInput;
  withdrawAmount: bigint | TransactionArgument;
  systemState: TransactionObjectInput;
}

export function withdraw(tx: Transaction, typeArg: string, args: WithdrawArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::withdraw`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.staker),
      pure(tx, args.withdrawAmount, `u64`),
      obj(tx, args.systemState),
    ],
  });
}

export function suiBalance(
  tx: Transaction,
  typeArg: string,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::sui_balance`,
    typeArguments: [typeArg],
    arguments: [obj(tx, staker)],
  });
}

export interface DepositArgs {
  staker: TransactionObjectInput;
  sui: TransactionObjectInput;
}

export function deposit(tx: Transaction, typeArg: string, args: DepositArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::deposit`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.staker), obj(tx, args.sui)],
  });
}

export function totalSuiSupply(
  tx: Transaction,
  typeArg: string,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::total_sui_supply`,
    typeArguments: [typeArg],
    arguments: [obj(tx, staker)],
  });
}

export function liquidStakingInfo(
  tx: Transaction,
  typeArg: string,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::liquid_staking_info`,
    typeArguments: [typeArg],
    arguments: [obj(tx, staker)],
  });
}

export interface RebalanceArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function rebalance(
  tx: Transaction,
  typeArg: string,
  args: RebalanceArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::rebalance`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.staker), obj(tx, args.systemState)],
  });
}

export interface ClaimFeesArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function claimFees(
  tx: Transaction,
  typeArg: string,
  args: ClaimFeesArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::claim_fees`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.staker), obj(tx, args.systemState)],
  });
}

export function createStaker(
  tx: Transaction,
  typeArg: string,
  treasuryCap: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::create_staker`,
    typeArguments: [typeArg],
    arguments: [obj(tx, treasuryCap)],
  });
}

export function liabilities(
  tx: Transaction,
  typeArg: string,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::liabilities`,
    typeArguments: [typeArg],
    arguments: [obj(tx, staker)],
  });
}

export function lstBalance(
  tx: Transaction,
  typeArg: string,
  staker: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::lst_balance`,
    typeArguments: [typeArg],
    arguments: [obj(tx, staker)],
  });
}

export interface UnstakeNSuiArgs {
  staker: TransactionObjectInput;
  systemState: TransactionObjectInput;
  suiAmountOut: bigint | TransactionArgument;
}

export function unstakeNSui(
  tx: Transaction,
  typeArg: string,
  args: UnstakeNSuiArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::staker::unstake_n_sui`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.staker),
      obj(tx, args.systemState),
      pure(tx, args.suiAmountOut, `u64`),
    ],
  });
}
