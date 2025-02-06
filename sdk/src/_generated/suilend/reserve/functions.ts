import { PUBLISHED_AT } from "..";
import { ID } from "../../_dependencies/source/0x2/object/structs";
import { obj, pure } from "../../_framework/util";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export function config(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::config`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function totalSupply(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::total_supply`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function price(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::price`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function priceIdentifier(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::price_identifier`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function staker(
  tx: Transaction,
  typeArgs: [string, string],
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::staker`,
    typeArguments: typeArgs,
    arguments: [obj(tx, reserve)],
  });
}

export interface ClaimFeesArgs {
  reserve: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function claimFees(
  tx: Transaction,
  typeArgs: [string, string],
  args: ClaimFeesArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::claim_fees`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.systemState)],
  });
}

export function coinType(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::coin_type`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function arrayIndex(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::array_index`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface AssertPriceIsFreshArgs {
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function assertPriceIsFresh(
  tx: Transaction,
  typeArg: string,
  args: AssertPriceIsFreshArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::assert_price_is_fresh`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.clock)],
  });
}

export function availableAmount(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::available_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function balances(
  tx: Transaction,
  typeArgs: [string, string],
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::balances`,
    typeArguments: typeArgs,
    arguments: [obj(tx, reserve)],
  });
}

export function balancesAvailableAmount(
  tx: Transaction,
  typeArgs: [string, string],
  balances: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::balances_available_amount`,
    typeArguments: typeArgs,
    arguments: [obj(tx, balances)],
  });
}

export function balancesCtokenFees(
  tx: Transaction,
  typeArgs: [string, string],
  balances: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::balances_ctoken_fees`,
    typeArguments: typeArgs,
    arguments: [obj(tx, balances)],
  });
}

export function balancesCtokenSupply(
  tx: Transaction,
  typeArgs: [string, string],
  balances: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::balances_ctoken_supply`,
    typeArguments: typeArgs,
    arguments: [obj(tx, balances)],
  });
}

export function balancesFees(
  tx: Transaction,
  typeArgs: [string, string],
  balances: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::balances_fees`,
    typeArguments: typeArgs,
    arguments: [obj(tx, balances)],
  });
}

export interface BorrowLiquidityArgs {
  reserve: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function borrowLiquidity(
  tx: Transaction,
  typeArgs: [string, string],
  args: BorrowLiquidityArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::borrow_liquidity`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), pure(tx, args.amount, `u64`)],
  });
}

export function borrowedAmount(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::borrowed_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function borrowsPoolRewardManager(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::borrows_pool_reward_manager`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function borrowsPoolRewardManagerMut(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::borrows_pool_reward_manager_mut`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface CalculateBorrowFeeArgs {
  reserve: TransactionObjectInput;
  borrowAmount: bigint | TransactionArgument;
}

export function calculateBorrowFee(
  tx: Transaction,
  typeArg: string,
  args: CalculateBorrowFeeArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::calculate_borrow_fee`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), pure(tx, args.borrowAmount, `u64`)],
  });
}

export function calculateUtilizationRate(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::calculate_utilization_rate`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface ChangePriceFeedArgs {
  reserve: TransactionObjectInput;
  priceInfoObj: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function changePriceFeed(
  tx: Transaction,
  typeArg: string,
  args: ChangePriceFeedArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::change_price_feed`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.reserve),
      obj(tx, args.priceInfoObj),
      obj(tx, args.clock),
    ],
  });
}

export interface CompoundInterestArgs {
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function compoundInterest(
  tx: Transaction,
  typeArg: string,
  args: CompoundInterestArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::compound_interest`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.clock)],
  });
}

export interface CreateReserveArgs {
  lendingMarketId: string | TransactionArgument;
  config: TransactionObjectInput;
  arrayIndex: bigint | TransactionArgument;
  mintDecimals: number | TransactionArgument;
  priceInfoObj: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function createReserve(
  tx: Transaction,
  typeArgs: [string, string],
  args: CreateReserveArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::create_reserve`,
    typeArguments: typeArgs,
    arguments: [
      pure(tx, args.lendingMarketId, `${ID.$typeName}`),
      obj(tx, args.config),
      pure(tx, args.arrayIndex, `u64`),
      pure(tx, args.mintDecimals, `u8`),
      obj(tx, args.priceInfoObj),
      obj(tx, args.clock),
    ],
  });
}

export interface CtokenMarketValueArgs {
  reserve: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
}

export function ctokenMarketValue(
  tx: Transaction,
  typeArg: string,
  args: CtokenMarketValueArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::ctoken_market_value`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), pure(tx, args.ctokenAmount, `u64`)],
  });
}

export interface CtokenMarketValueLowerBoundArgs {
  reserve: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
}

export function ctokenMarketValueLowerBound(
  tx: Transaction,
  typeArg: string,
  args: CtokenMarketValueLowerBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::ctoken_market_value_lower_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), pure(tx, args.ctokenAmount, `u64`)],
  });
}

export interface CtokenMarketValueUpperBoundArgs {
  reserve: TransactionObjectInput;
  ctokenAmount: bigint | TransactionArgument;
}

export function ctokenMarketValueUpperBound(
  tx: Transaction,
  typeArg: string,
  args: CtokenMarketValueUpperBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::ctoken_market_value_upper_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), pure(tx, args.ctokenAmount, `u64`)],
  });
}

export function ctokenRatio(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::ctoken_ratio`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function ctokenSupply(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::ctoken_supply`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function cumulativeBorrowRate(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::cumulative_borrow_rate`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface DeductLiquidationFeeArgs {
  reserve: TransactionObjectInput;
  ctokens: TransactionObjectInput;
}

export function deductLiquidationFee(
  tx: Transaction,
  typeArgs: [string, string],
  args: DeductLiquidationFeeArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::deduct_liquidation_fee`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.ctokens)],
  });
}

export interface DepositCtokensArgs {
  reserve: TransactionObjectInput;
  ctokens: TransactionObjectInput;
}

export function depositCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: DepositCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::deposit_ctokens`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.ctokens)],
  });
}

export interface DepositLiquidityAndMintCtokensArgs {
  reserve: TransactionObjectInput;
  liquidity: TransactionObjectInput;
}

export function depositLiquidityAndMintCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: DepositLiquidityAndMintCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::deposit_liquidity_and_mint_ctokens`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.liquidity)],
  });
}

export function depositsPoolRewardManager(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::deposits_pool_reward_manager`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function depositsPoolRewardManagerMut(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::deposits_pool_reward_manager_mut`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface ForgiveDebtArgs {
  reserve: TransactionObjectInput;
  forgiveAmount: TransactionObjectInput;
}

export function forgiveDebt(
  tx: Transaction,
  typeArg: string,
  args: ForgiveDebtArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::forgive_debt`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.forgiveAmount)],
  });
}

export interface FulfillLiquidityRequestArgs {
  reserve: TransactionObjectInput;
  request: TransactionObjectInput;
}

export function fulfillLiquidityRequest(
  tx: Transaction,
  typeArgs: [string, string],
  args: FulfillLiquidityRequestArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::fulfill_liquidity_request`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.request)],
  });
}

export interface InitStakerArgs {
  reserve: TransactionObjectInput;
  treasuryCap: TransactionObjectInput;
}

export function initStaker(
  tx: Transaction,
  typeArgs: [string, string],
  args: InitStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::init_staker`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.treasuryCap)],
  });
}

export function interestLastUpdateTimestampS(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::interest_last_update_timestamp_s`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface IsPriceFreshArgs {
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
}

export function isPriceFresh(
  tx: Transaction,
  typeArg: string,
  args: IsPriceFreshArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::is_price_fresh`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.clock)],
  });
}

export interface JoinFeesArgs {
  reserve: TransactionObjectInput;
  fees: TransactionObjectInput;
}

export function joinFees(
  tx: Transaction,
  typeArgs: [string, string],
  args: JoinFeesArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::join_fees`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.fees)],
  });
}

export function liquidityRequestAmount(
  tx: Transaction,
  typeArgs: [string, string],
  request: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::liquidity_request_amount`,
    typeArguments: typeArgs,
    arguments: [obj(tx, request)],
  });
}

export function liquidityRequestFee(
  tx: Transaction,
  typeArgs: [string, string],
  request: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::liquidity_request_fee`,
    typeArguments: typeArgs,
    arguments: [obj(tx, request)],
  });
}

export function logReserveData(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::log_reserve_data`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface MarketValueArgs {
  reserve: TransactionObjectInput;
  liquidityAmount: TransactionObjectInput;
}

export function marketValue(
  tx: Transaction,
  typeArg: string,
  args: MarketValueArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::market_value`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.liquidityAmount)],
  });
}

export interface MarketValueLowerBoundArgs {
  reserve: TransactionObjectInput;
  liquidityAmount: TransactionObjectInput;
}

export function marketValueLowerBound(
  tx: Transaction,
  typeArg: string,
  args: MarketValueLowerBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::market_value_lower_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.liquidityAmount)],
  });
}

export interface MarketValueUpperBoundArgs {
  reserve: TransactionObjectInput;
  liquidityAmount: TransactionObjectInput;
}

export function marketValueUpperBound(
  tx: Transaction,
  typeArg: string,
  args: MarketValueUpperBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::market_value_upper_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.liquidityAmount)],
  });
}

export function maxBorrowAmount(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::max_borrow_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function maxRedeemAmount(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::max_redeem_amount`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function priceLowerBound(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::price_lower_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export function priceUpperBound(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::price_upper_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface RebalanceStakerArgs {
  reserve: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function rebalanceStaker(
  tx: Transaction,
  typeArg: string,
  args: RebalanceStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::rebalance_staker`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.systemState)],
  });
}

export interface RedeemCtokensArgs {
  reserve: TransactionObjectInput;
  ctokens: TransactionObjectInput;
}

export function redeemCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: RedeemCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::redeem_ctokens`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), obj(tx, args.ctokens)],
  });
}

export interface RepayLiquidityArgs {
  reserve: TransactionObjectInput;
  liquidity: TransactionObjectInput;
  settleAmount: TransactionObjectInput;
}

export function repayLiquidity(
  tx: Transaction,
  typeArgs: [string, string],
  args: RepayLiquidityArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::repay_liquidity`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.reserve),
      obj(tx, args.liquidity),
      obj(tx, args.settleAmount),
    ],
  });
}

export function unclaimedSpreadFees(
  tx: Transaction,
  typeArg: string,
  reserve: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::unclaimed_spread_fees`,
    typeArguments: [typeArg],
    arguments: [obj(tx, reserve)],
  });
}

export interface UnstakeSuiFromStakerArgs {
  reserve: TransactionObjectInput;
  liquidityRequest: TransactionObjectInput;
  systemState: TransactionObjectInput;
}

export function unstakeSuiFromStaker(
  tx: Transaction,
  typeArgs: [string, string],
  args: UnstakeSuiFromStakerArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::unstake_sui_from_staker`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.reserve),
      obj(tx, args.liquidityRequest),
      obj(tx, args.systemState),
    ],
  });
}

export interface UpdatePriceArgs {
  reserve: TransactionObjectInput;
  clock: TransactionObjectInput;
  priceInfoObj: TransactionObjectInput;
}

export function updatePrice(
  tx: Transaction,
  typeArg: string,
  args: UpdatePriceArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::update_price`,
    typeArguments: [typeArg],
    arguments: [
      obj(tx, args.reserve),
      obj(tx, args.clock),
      obj(tx, args.priceInfoObj),
    ],
  });
}

export interface UpdateReserveConfigArgs {
  reserve: TransactionObjectInput;
  config: TransactionObjectInput;
}

export function updateReserveConfig(
  tx: Transaction,
  typeArg: string,
  args: UpdateReserveConfigArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::update_reserve_config`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.config)],
  });
}

export interface UsdToTokenAmountLowerBoundArgs {
  reserve: TransactionObjectInput;
  usdAmount: TransactionObjectInput;
}

export function usdToTokenAmountLowerBound(
  tx: Transaction,
  typeArg: string,
  args: UsdToTokenAmountLowerBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::usd_to_token_amount_lower_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.usdAmount)],
  });
}

export interface UsdToTokenAmountUpperBoundArgs {
  reserve: TransactionObjectInput;
  usdAmount: TransactionObjectInput;
}

export function usdToTokenAmountUpperBound(
  tx: Transaction,
  typeArg: string,
  args: UsdToTokenAmountUpperBoundArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::usd_to_token_amount_upper_bound`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.reserve), obj(tx, args.usdAmount)],
  });
}

export interface WithdrawCtokensArgs {
  reserve: TransactionObjectInput;
  amount: bigint | TransactionArgument;
}

export function withdrawCtokens(
  tx: Transaction,
  typeArgs: [string, string],
  args: WithdrawCtokensArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve::withdraw_ctokens`,
    typeArguments: typeArgs,
    arguments: [obj(tx, args.reserve), pure(tx, args.amount, `u64`)],
  });
}
