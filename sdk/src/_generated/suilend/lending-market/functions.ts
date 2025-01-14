import { PUBLISHED_AT } from "..";
import { ID } from "../../_dependencies/source/0x2/object/structs";
import { obj, option, pure } from "../../_framework/util";
import { RateLimiterExemption } from "./structs";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export interface BorrowArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationOwnerCap: TransactionObjectInput;
  clock: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function borrow(
  tx: Transaction,
  typeArgs: [string, string],
  args: BorrowArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::borrow`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.obligationOwnerCap),
      obj(tx, args.clock),
      pure(tx, args.amount, `u64`),
    ],
  });
}

export interface MigrateArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
}

export function migrate(tx: Transaction, typeArg: string, args: MigrateArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::migrate`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
    ],
  });
}

export function init(tx: Transaction, otw: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::init`,
    arguments: [obj(tx, otw)],
  });
}

export interface ClaimFeesArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
}

export function claimFees(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimFeesArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::claim_fees`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
    ],
  });
}

export interface AddPoolRewardArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
  rewards: TransactionObjectInput;
  startTimeMs: bigint | TransactionArgument;
  endTimeMs: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

export function addPoolReward(
  tx: Transaction,
  typeArgs: [string, string],
  args: AddPoolRewardArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::add_pool_reward`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
      obj(tx, args.rewards),
      pure(tx, args.startTimeMs, `u64`),
      pure(tx, args.endTimeMs, `u64`),
      obj(tx, args.clock),
    ],
  });
}

export interface CancelPoolRewardArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
  rewardIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

export function cancelPoolReward(
  tx: Transaction,
  typeArgs: [string, string],
  args: CancelPoolRewardArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::cancel_pool_reward`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
      pure(tx, args.rewardIndex, `u64`),
      obj(tx, args.clock),
    ],
  });
}

export interface ClaimRewardsArgs {
  lendingMarket: TransactionObjectInput;
  cap: TransactionObjectInput;
  clock: TransactionObjectInput;
  reserveId: bigint | TransactionArgument;
  rewardIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
}

export function claimRewards(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimRewardsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::claim_rewards`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      obj(tx, args.cap),
      obj(tx, args.clock),
      pure(tx, args.reserveId, `u64`),
      pure(tx, args.rewardIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
    ],
  });
}

export interface ClosePoolRewardArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
  rewardIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
}

export function closePoolReward(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClosePoolRewardArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::close_pool_reward`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
      pure(tx, args.rewardIndex, `u64`),
      obj(tx, args.clock),
    ],
  });
}

export function reserve(
  tx: Transaction,
  typeArgs: [string, string],
  lendingMarket: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::reserve`,
    typeArguments: typeArgs,
    arguments: [obj(tx, lendingMarket)],
  });
}

export interface DepositLiquidityAndMintCtokensArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  deposit: TransactionObjectInput;
}

export function depositLiquidityAndMintCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: DepositLiquidityAndMintCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::deposit_liquidity_and_mint_ctokens`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.clock),
      obj(tx, args.deposit),
    ],
  });
}

export interface FulfillLiquidityRequestArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  liquidityRequest: TransactionObjectInput;
}

export function fulfillLiquidityRequest(
  tx: Transaction,
  typeArgs: [string, string],
  args: FulfillLiquidityRequestArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::fulfill_liquidity_request`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.liquidityRequest),
    ],
  });
}

export interface InitStakerArgs {
  lendingMarket: TransactionObjectInput;
  lendingMarketOwnerCap: TransactionObjectInput;
  suiReserveArrayIndex: bigint | TransactionArgument;
  treasuryCap: TransactionObjectInput;
}

export function initStaker(
  tx: Transaction,
  typeArgs: [string, string],
  args: InitStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::init_staker`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      obj(tx, args.lendingMarketOwnerCap),
      pure(tx, args.suiReserveArrayIndex, `u64`),
      obj(tx, args.treasuryCap),
    ],
  });
}

export interface MaxBorrowAmountArgs {
  rateLimiter: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function maxBorrowAmount(
  tx: Transaction,
  typeArg: string,
  args: MaxBorrowAmountArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::max_borrow_amount`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.rateLimiter),
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
    ],
  });
}

export interface RebalanceStakerArgs {
  lendingMarket: TransactionObjectInput;
  suiReserveArrayIndex: bigint | TransactionArgument;
  systemState: TransactionObjectInput;
}

export function rebalanceStaker(
  tx: Transaction,
  typeArg: string,
  args: RebalanceStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::rebalance_staker`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.suiReserveArrayIndex, `u64`),
      obj(tx, args.systemState),
    ],
  });
}

export interface UnstakeSuiFromStakerArgs {
  lendingMarket: TransactionObjectInput;
  suiReserveArrayIndex: bigint | TransactionArgument;
  liquidityRequest: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function unstakeSuiFromStaker(
  tx: Transaction,
  typeArg: string,
  args: UnstakeSuiFromStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::unstake_sui_from_staker`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.suiReserveArrayIndex, `u64`),
      obj(tx, args.liquidityRequest),
      obj(tx, args.systemState),
    ],
  });
}

export interface UpdateReserveConfigArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  config: TransactionObjectInput;
}

export function updateReserveConfig(
  tx: Transaction,
  typeArgs: [string, string],
  args: UpdateReserveConfigArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::update_reserve_config`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.config),
    ],
  });
}

export interface WithdrawCtokensArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationOwnerCap: TransactionObjectInput;
  clock: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function withdrawCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: WithdrawCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::withdraw_ctokens`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.obligationOwnerCap),
      obj(tx, args.clock),
      pure(tx, args.amount, `u64`),
    ],
  });
}

export interface ObligationArgs {
  lendingMarket: TransactionObjectInput;
  obligationId: string | TransactionArgument;
}

export function obligation(
  tx: Transaction,
  typeArg: string,
  args: ObligationArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::obligation`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.obligationId, `${ID.$typeName}`),
    ],
  });
}

export function createObligation(
  tx: Transaction,
  typeArg: string,
  lendingMarket: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::create_obligation`,
    typeArguments: [typeArg],
    arguments: [obj(tx, lendingMarket)],
  });
}

export function reserveArrayIndex(
  tx: Transaction,
  typeArgs: [string, string],
  lendingMarket: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::reserve_array_index`,
    typeArguments: typeArgs,
    arguments: [obj(tx, lendingMarket)],
  });
}

export interface ForgiveArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationId: string | TransactionArgument;
  clock: TransactionObjectInput;
  maxForgiveAmount: bigint | TransactionArgument;
}

export function forgive(
  tx: Transaction,
  typeArgs: [string, string],
  args: ForgiveArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::forgive`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      obj(tx, args.clock),
      pure(tx, args.maxForgiveAmount, `u64`),
    ],
  });
}

export interface LiquidateArgs {
  lendingMarket: TransactionObjectInput;
  obligationId: string | TransactionArgument;
  repayReserveArrayIndex: bigint | TransactionArgument;
  withdrawReserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  repayCoins: TransactionObjectInput;
}

export function liquidate(
  tx: Transaction,
  typeArgs: [string, string, string],
  args: LiquidateArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::liquidate`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      pure(tx, args.repayReserveArrayIndex, `u64`),
      pure(tx, args.withdrawReserveArrayIndex, `u64`),
      obj(tx, args.clock),
      obj(tx, args.repayCoins),
    ],
  });
}

export interface MaxWithdrawAmountArgs {
  rateLimiter: TransactionObjectInput;
  obligation: TransactionObjectInput;
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function maxWithdrawAmount(
  tx: Transaction,
  typeArg: string,
  args: MaxWithdrawAmountArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::max_withdraw_amount`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.rateLimiter),
      obj(tx, args.obligation),
      obj(tx, args.reserve),
      obj(tx, args.clock),
    ],
  });
}

export interface RepayArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationId: string | TransactionArgument;
  clock: TransactionObjectInput;
  maxRepayCoins: TransactionObjectInput;
}

export function repay(
  tx: Transaction,
  typeArgs: [string, string],
  args: RepayArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::repay`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      obj(tx, args.clock),
      obj(tx, args.maxRepayCoins),
    ],
  });
}

export function obligationId(
  tx: Transaction,
  typeArg: string,
  cap: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::obligation_id`,
    typeArguments: [typeArg],
    arguments: [obj(tx, cap)],
  });
}

export interface AddReserveArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  priceInfo: TransactionObjectInput;
  config: TransactionObjectInput;
  coinMetadata: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function addReserve(
  tx: Transaction,
  typeArgs: [string, string],
  args: AddReserveArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::add_reserve`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      obj(tx, args.priceInfo),
      obj(tx, args.config),
      obj(tx, args.coinMetadata),
      obj(tx, args.clock),
    ],
  });
}

export interface BorrowRequestArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationOwnerCap: TransactionObjectInput;
  clock: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function borrowRequest(
  tx: Transaction,
  typeArgs: [string, string],
  args: BorrowRequestArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::borrow_request`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.obligationOwnerCap),
      obj(tx, args.clock),
      pure(tx, args.amount, `u64`),
    ],
  });
}

export interface ChangeReservePriceFeedArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  priceInfoObj: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function changeReservePriceFeed(
  tx: Transaction,
  typeArgs: [string, string],
  args: ChangeReservePriceFeedArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::change_reserve_price_feed`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.priceInfoObj),
      obj(tx, args.clock),
    ],
  });
}

export interface ClaimRewardsAndDepositArgs {
  lendingMarket: TransactionObjectInput;
  obligationId: string | TransactionArgument;
  clock: TransactionObjectInput;
  rewardReserveId: bigint | TransactionArgument;
  rewardIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
  depositReserveId: bigint | TransactionArgument;
}

export function claimRewardsAndDeposit(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimRewardsAndDepositArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::claim_rewards_and_deposit`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      obj(tx, args.clock),
      pure(tx, args.rewardReserveId, `u64`),
      pure(tx, args.rewardIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
      pure(tx, args.depositReserveId, `u64`),
    ],
  });
}

export interface ClaimRewardsByObligationIdArgs {
  lendingMarket: TransactionObjectInput;
  obligationId: string | TransactionArgument;
  clock: TransactionObjectInput;
  reserveId: bigint | TransactionArgument;
  rewardIndex: bigint | TransactionArgument;
  isDepositReward: boolean | TransactionArgument;
  failIfRewardPeriodNotOver: boolean | TransactionArgument;
}

export function claimRewardsByObligationId(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimRewardsByObligationIdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::claim_rewards_by_obligation_id`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      obj(tx, args.clock),
      pure(tx, args.reserveId, `u64`),
      pure(tx, args.rewardIndex, `u64`),
      pure(tx, args.isDepositReward, `bool`),
      pure(tx, args.failIfRewardPeriodNotOver, `bool`),
    ],
  });
}

export function createLendingMarket(tx: Transaction, typeArg: string) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::create_lending_market`,
    typeArguments: [typeArg],
    arguments: [],
  });
}

export interface DepositCtokensIntoObligationArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationOwnerCap: TransactionObjectInput;
  clock: TransactionObjectInput;
  deposit: TransactionObjectInput;
}

export function depositCtokensIntoObligation(
  tx: Transaction,
  typeArgs: [string, string],
  args: DepositCtokensIntoObligationArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::deposit_ctokens_into_obligation`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.obligationOwnerCap),
      obj(tx, args.clock),
      obj(tx, args.deposit),
    ],
  });
}

export interface DepositCtokensIntoObligationByIdArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  obligationId: string | TransactionArgument;
  clock: TransactionObjectInput;
  deposit: TransactionObjectInput;
}

export function depositCtokensIntoObligationById(
  tx: Transaction,
  typeArgs: [string, string],
  args: DepositCtokensIntoObligationByIdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::deposit_ctokens_into_obligation_by_id`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      pure(tx, args.obligationId, `${ID.$typeName}`),
      obj(tx, args.clock),
      obj(tx, args.deposit),
    ],
  });
}

export function feeReceiver(
  tx: Transaction,
  typeArg: string,
  lendingMarket: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::fee_receiver`,
    typeArguments: [typeArg],
    arguments: [obj(tx, lendingMarket)],
  });
}

export interface NewObligationOwnerCapArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  obligationId: string | TransactionArgument;
}

export function newObligationOwnerCap(
  tx: Transaction,
  typeArg: string,
  args: NewObligationOwnerCapArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::new_obligation_owner_cap`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.obligationId, `${ID.$typeName}`),
    ],
  });
}

export function rateLimiterExemptionAmount(
  tx: Transaction,
  typeArgs: [string, string],
  exemption: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::rate_limiter_exemption_amount`,
    typeArguments: typeArgs,
    arguments: [obj(tx, exemption)],
  });
}

export interface RedeemCtokensAndWithdrawLiquidityArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  ctokens: TransactionObjectInput;
  rateLimiterExemption: TransactionObjectInput | TransactionArgument | null;
}

export function redeemCtokensAndWithdrawLiquidity(
  tx: Transaction,
  typeArgs: [string, string],
  args: RedeemCtokensAndWithdrawLiquidityArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::redeem_ctokens_and_withdraw_liquidity`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.clock),
      obj(tx, args.ctokens),
      option(
        tx,
        `${RateLimiterExemption.$typeName}<${typeArgs[0]}, ${typeArgs[1]}>`,
        args.rateLimiterExemption,
      ),
    ],
  });
}

export interface RedeemCtokensAndWithdrawLiquidityRequestArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  ctokens: TransactionObjectInput;
  rateLimiterExemption: TransactionObjectInput | TransactionArgument | null;
}

export function redeemCtokensAndWithdrawLiquidityRequest(
  tx: Transaction,
  typeArgs: [string, string],
  args: RedeemCtokensAndWithdrawLiquidityRequestArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::redeem_ctokens_and_withdraw_liquidity_request`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.clock),
      obj(tx, args.ctokens),
      option(
        tx,
        `${RateLimiterExemption.$typeName}<${typeArgs[0]}, ${typeArgs[1]}>`,
        args.rateLimiterExemption,
      ),
    ],
  });
}

export interface RefreshReservePriceArgs {
  lendingMarket: TransactionObjectInput;
  reserveArrayIndex: bigint | TransactionArgument;
  clock: TransactionObjectInput;
  priceInfo: TransactionObjectInput;
}

export function refreshReservePrice(
  tx: Transaction,
  typeArg: string,
  args: RefreshReservePriceArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::refresh_reserve_price`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarket),
      pure(tx, args.reserveArrayIndex, `u64`),
      obj(tx, args.clock),
      obj(tx, args.priceInfo),
    ],
  });
}

export interface SetFeeReceiversArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  receivers: Array<string | TransactionArgument> | TransactionArgument;
  weights: Array<bigint | TransactionArgument> | TransactionArgument;
}

export function setFeeReceivers(
  tx: Transaction,
  typeArg: string,
  args: SetFeeReceiversArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::set_fee_receivers`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      pure(tx, args.receivers, `vector<address>`),
      pure(tx, args.weights, `vector<u64>`),
    ],
  });
}

export interface UpdateRateLimiterConfigArgs {
  lendingMarketOwnerCap: TransactionObjectInput;
  lendingMarket: TransactionObjectInput;
  clock: TransactionObjectInput;
  config: TransactionObjectInput;
}

export function updateRateLimiterConfig(
  tx: Transaction,
  typeArg: string,
  args: UpdateRateLimiterConfigArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::lending_market::update_rate_limiter_config`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.lendingMarketOwnerCap),
      obj(tx, args.lendingMarket),
      obj(tx, args.clock),
      obj(tx, args.config),
    ],
  });
}
