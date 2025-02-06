import { PUBLISHED_AT } from "..";
import { ID } from "../../_dependencies/source/0x2/object/structs";
import { obj, option, pure, vector } from "../../_framework/util";
import { Reserve } from "../reserve/structs";
import { ExistStaleOracles } from "./structs";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export interface BorrowArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function borrow(tx: Transaction, typeArg: string, args: BorrowArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      pure(tx, args.amount, `u64`),
    ],
  });
}

export interface WithdrawArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
  staleOracles: TransactionObjectInput | TransactionArgument | null;
}

export function withdraw(tx: Transaction, typeArg: string, args: WithdrawArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::withdraw`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      pure(tx, args.ctokenAmount, `u64`),
      option(tx, `${ExistStaleOracles.$typeName}`, args.staleOracles),
    ],
  });
}

export interface DepositArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
}

export function deposit(tx: Transaction, typeArg: string, args: DepositArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      pure(tx, args.ctokenAmount, `u64`),
    ],
  });
}

export interface RefreshArgs {
  obligation: TransactionObjectInput;
  reserves: Array<TransactionObjectInput> | TransactionArgument;
  clock: TransactionObjectInput;
}

export function refresh(tx: Transaction, typeArg: string, args: RefreshArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::refresh`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      vector(tx, `${Reserve.$typeName}<${typeArg}>`, args.reserves),
      obj(tx, args.clock),
    ],
  });
}

export interface ClaimRewardsArgs {
  obligation: TransactionObjectInput;
  poolRewardManager: TransactionObjectInput;
  clock: TransactionObjectInput;
  rewardIndex: bigint | TransactionArgument;
}

export function claimRewards(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimRewardsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::claim_rewards`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.poolRewardManager),
      obj(tx, args.clock),
      pure(tx, args.rewardIndex, `u64`),
    ],
  });
}

export function borrowedAmount(
  tx: Transaction,
  typeArgs: [string, string],
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrowed_amount`,
    typeArguments: typeArgs,
    arguments: [obj(tx, obligation)],
  });
}

export interface MaxBorrowAmountArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function maxBorrowAmount(
  tx: Transaction,
  typeArg: string,
  args: MaxBorrowAmountArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::max_borrow_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export function allowedBorrowValueUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::allowed_borrow_value_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function assertNoStaleOracles(
  tx: Transaction,
  existStaleOracles: TransactionObjectInput | TransactionArgument | null,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::assert_no_stale_oracles`,
    arguments: [
      option(tx, `${ExistStaleOracles.$typeName}`, existStaleOracles),
    ],
  });
}

export function borrowBorrowedAmount(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_borrowed_amount`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowCoinType(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_coin_type`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowCumulativeBorrowRate(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_cumulative_borrow_rate`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowMarketValue(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_market_value`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowReserveArrayIndex(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_reserve_array_index`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowUserRewardManagerIndex(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrow_user_reward_manager_index`,
    arguments: [obj(tx, borrow)],
  });
}

export function borrowingIsolatedAsset(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrowing_isolated_asset`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function borrows(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::borrows`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export interface CompoundDebtArgs {
  borrow: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function compoundDebt(
  tx: Transaction,
  typeArg: string,
  args: CompoundDebtArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::compound_debt`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.borrow), obj(tx, args.reserve)],
  });
}

export function createObligation(
  tx: Transaction,
  typeArg: string,
  lendingMarketId: string | TransactionArgument,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::create_obligation`,
    typeArguments: [typeArg],
    arguments: [pure(tx, lendingMarketId, `${ID.$typeName}`)],
  });
}

export function depositCoinType(
  tx: Transaction,
  deposit: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit_coin_type`,
    arguments: [obj(tx, deposit)],
  });
}

export function depositDepositedCtokenAmount(
  tx: Transaction,
  deposit: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit_deposited_ctoken_amount`,
    arguments: [obj(tx, deposit)],
  });
}

export function depositMarketValue(
  tx: Transaction,
  deposit: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit_market_value`,
    arguments: [obj(tx, deposit)],
  });
}

export function depositReserveArrayIndex(
  tx: Transaction,
  deposit: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit_reserve_array_index`,
    arguments: [obj(tx, deposit)],
  });
}

export function depositUserRewardManagerIndex(
  tx: Transaction,
  deposit: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposit_user_reward_manager_index`,
    arguments: [obj(tx, deposit)],
  });
}

export function depositedCtokenAmount(
  tx: Transaction,
  typeArgs: [string, string],
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposited_ctoken_amount`,
    typeArguments: typeArgs,
    arguments: [obj(tx, obligation)],
  });
}

export function depositedValueUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposited_value_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function deposits(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::deposits`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export interface FindBorrowArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function findBorrow(
  tx: Transaction,
  typeArg: string,
  args: FindBorrowArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_borrow`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export interface FindBorrowIndexArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function findBorrowIndex(
  tx: Transaction,
  typeArg: string,
  args: FindBorrowIndexArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_borrow_index`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export interface FindDepositArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function findDeposit(
  tx: Transaction,
  typeArg: string,
  args: FindDepositArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_deposit`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export interface FindDepositIndexArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function findDepositIndex(
  tx: Transaction,
  typeArg: string,
  args: FindDepositIndexArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_deposit_index`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export interface FindDepositIndexByReserveArrayIndexArgs {
  obligation: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
}

export function findDepositIndexByReserveArrayIndex(
  tx: Transaction,
  typeArg: string,
  args: FindDepositIndexByReserveArrayIndexArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_deposit_index_by_reserve_array_index`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      pure(tx, args.reserveArrayIndex, `u64`),
    ],
  });
}

export interface FindOrAddBorrowArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function findOrAddBorrow(
  tx: Transaction,
  typeArg: string,
  args: FindOrAddBorrowArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_or_add_borrow`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
    ],
  });
}

export interface FindOrAddDepositArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function findOrAddDeposit(
  tx: Transaction,
  typeArg: string,
  args: FindOrAddDepositArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_or_add_deposit`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
    ],
  });
}

export interface FindOrAddUserRewardManagerArgs {
  obligation: TransactionObjectInput;
  poolRewardManager: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function findOrAddUserRewardManager(
  tx: Transaction,
  typeArg: string,
  args: FindOrAddUserRewardManagerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_or_add_user_reward_manager`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.poolRewardManager),
      obj(tx, args.clock),
    ],
  });
}

export interface FindUserRewardManagerIndexArgs {
  obligation: TransactionObjectInput;
  poolRewardManager: TransactionObjectInput;
}

export function findUserRewardManagerIndex(
  tx: Transaction,
  typeArg: string,
  args: FindUserRewardManagerIndexArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::find_user_reward_manager_index`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.poolRewardManager)],
  });
}

export interface ForgiveArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  maxForgiveAmount: TransactionObjectInput;
}

export function forgive(tx: Transaction, typeArg: string, args: ForgiveArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::forgive`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      obj(tx, args.maxForgiveAmount),
    ],
  });
}

export function isForgivable(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::is_forgivable`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function isHealthy(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::is_healthy`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function isLiquidatable(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::is_liquidatable`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function isLooped(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::is_looped`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function liabilityShares(
  tx: Transaction,
  borrow: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::liability_shares`,
    arguments: [obj(tx, borrow)],
  });
}

export interface LiquidateArgs {
  obligation: TransactionObjectInput;
  reserves: Array<TransactionObjectInput> | TransactionArgument;
  repayReserveArrayIndex: bigint | TransactionArgument;
  withdrawReserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  repayAmount: bigint | TransactionArgument;
}

export function liquidate(
  tx: Transaction,
  typeArg: string,
  args: LiquidateArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::liquidate`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      vector(tx, `${Reserve.$typeName}<${typeArg}>`, args.reserves),
      pure(tx, args.repayReserveArrayIndex, `u64`),
      pure(tx, args.withdrawReserveArrayIndex, `u64`),
      obj(tx, args.clock),
      pure(tx, args.repayAmount, `u64`),
    ],
  });
}

export function logObligationData(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::log_obligation_data`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export interface MaxWithdrawAmountArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
}

export function maxWithdrawAmount(
  tx: Transaction,
  typeArg: string,
  args: MaxWithdrawAmountArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::max_withdraw_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.obligation), obj(tx, args.reserve)],
  });
}

export interface RepayArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  maxRepayAmount: TransactionObjectInput;
}

export function repay(tx: Transaction, typeArg: string, args: RepayArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::repay`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      obj(tx, args.maxRepayAmount),
    ],
  });
}

export function unhealthyBorrowValueUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::unhealthy_borrow_value_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function unweightedBorrowedValueUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::unweighted_borrowed_value_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function userRewardManagers(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::user_reward_managers`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function weightedBorrowedValueUpperBoundUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::weighted_borrowed_value_upper_bound_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export function weightedBorrowedValueUsd(
  tx: Transaction,
  typeArg: string,
  obligation: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::weighted_borrowed_value_usd`,
    typeArguments: [typeArg],
    arguments: [obj(tx, obligation)],
  });
}

export interface WithdrawUncheckedArgs {
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
}

export function withdrawUnchecked(
  tx: Transaction,
  typeArg: string,
  args: WithdrawUncheckedArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::withdraw_unchecked`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
      pure(tx, args.ctokenAmount, `u64`),
    ],
  });
}

export interface ZeroOutRewardsArgs {
  obligation: TransactionObjectInput;
  reserves: Array<TransactionObjectInput> | TransactionArgument;
  clock: TransactionObjectInput;
}

export function zeroOutRewards(
  tx: Transaction,
  typeArg: string,
  args: ZeroOutRewardsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::zero_out_rewards`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      vector(tx, `${Reserve.$typeName}<${typeArg}>`, args.reserves),
      obj(tx, args.clock),
    ],
  });
}

export interface ZeroOutRewardsIfLoopedArgs {
  obligation: TransactionObjectInput;
  reserves: Array<TransactionObjectInput> | TransactionArgument;
  clock: TransactionObjectInput;
}

export function zeroOutRewardsIfLooped(
  tx: Transaction,
  typeArg: string,
  args: ZeroOutRewardsIfLoopedArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::obligation::zero_out_rewards_if_looped`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.obligation),
      vector(tx, `${Reserve.$typeName}<${typeArg}>`, args.reserves),
      obj(tx, args.clock),
    ],
  });
}
