import { PUBLISHED_AT } from "..";
import { GenericArg, generic, obj, pure } from "../../_framework/util";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export interface SetArgs {
  builder: TransactionObjectInput;
  field: GenericArg;
  value: GenericArg;
}

export function set(
  tx: Transaction,
  typeArgs: [string, string],
  args: SetArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set`,
    typeArguments: typeArgs,
    arguments: [
      obj(tx, args.builder),
      generic(tx, `${typeArgs[0]}`, args.field),
      generic(tx, `${typeArgs[1]}`, args.value),
    ],
  });
}

export function destroy(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::destroy`,
    arguments: [obj(tx, config)],
  });
}

export function from(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::from`,
    arguments: [obj(tx, config)],
  });
}

export interface SetSpreadFeeBpsArgs {
  builder: TransactionObjectInput;
  spreadFeeBps: bigint | TransactionArgument;
}

export function setSpreadFeeBps(tx: Transaction, args: SetSpreadFeeBpsArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_spread_fee_bps`,
    arguments: [obj(tx, args.builder), pure(tx, args.spreadFeeBps, `u64`)],
  });
}

export function spreadFee(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::spread_fee`,
    arguments: [obj(tx, config)],
  });
}

export function borrowFee(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::borrow_fee`,
    arguments: [obj(tx, config)],
  });
}

export function borrowLimit(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::borrow_limit`,
    arguments: [obj(tx, config)],
  });
}

export function borrowLimitUsd(
  tx: Transaction,
  config: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::borrow_limit_usd`,
    arguments: [obj(tx, config)],
  });
}

export function borrowWeight(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::borrow_weight`,
    arguments: [obj(tx, config)],
  });
}

export function build(tx: Transaction, builder: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::build`,
    arguments: [obj(tx, builder)],
  });
}

export interface CalculateAprArgs {
  config: TransactionObjectInput;
  curUtil: TransactionObjectInput;
}

export function calculateApr(tx: Transaction, args: CalculateAprArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::calculate_apr`,
    arguments: [obj(tx, args.config), obj(tx, args.curUtil)],
  });
}

export interface CalculateSupplyAprArgs {
  config: TransactionObjectInput;
  curUtil: TransactionObjectInput;
  borrowApr: TransactionObjectInput;
}

export function calculateSupplyApr(
  tx: Transaction,
  args: CalculateSupplyAprArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::calculate_supply_apr`,
    arguments: [
      obj(tx, args.config),
      obj(tx, args.curUtil),
      obj(tx, args.borrowApr),
    ],
  });
}

export function closeLtv(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::close_ltv`,
    arguments: [obj(tx, config)],
  });
}

export interface CreateReserveConfigArgs {
  openLtvPct: number | TransactionArgument;
  closeLtvPct: number | TransactionArgument;
  maxCloseLtvPct: number | TransactionArgument;
  borrowWeightBps: bigint | TransactionArgument;
  depositLimit: bigint | TransactionArgument;
  borrowLimit: bigint | TransactionArgument;
  liquidationBonusBps: bigint | TransactionArgument;
  maxLiquidationBonusBps: bigint | TransactionArgument;
  depositLimitUsd: bigint | TransactionArgument;
  borrowLimitUsd: bigint | TransactionArgument;
  borrowFeeBps: bigint | TransactionArgument;
  spreadFeeBps: bigint | TransactionArgument;
  protocolLiquidationFeeBps: bigint | TransactionArgument;
  interestRateUtils: Array<number | TransactionArgument> | TransactionArgument;
  interestRateAprs: Array<bigint | TransactionArgument> | TransactionArgument;
  isolated: boolean | TransactionArgument;
  openAttributedBorrowLimitUsd: bigint | TransactionArgument;
  closeAttributedBorrowLimitUsd: bigint | TransactionArgument;
}

export function createReserveConfig(
  tx: Transaction,
  args: CreateReserveConfigArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::create_reserve_config`,
    arguments: [
      pure(tx, args.openLtvPct, `u8`),
      pure(tx, args.closeLtvPct, `u8`),
      pure(tx, args.maxCloseLtvPct, `u8`),
      pure(tx, args.borrowWeightBps, `u64`),
      pure(tx, args.depositLimit, `u64`),
      pure(tx, args.borrowLimit, `u64`),
      pure(tx, args.liquidationBonusBps, `u64`),
      pure(tx, args.maxLiquidationBonusBps, `u64`),
      pure(tx, args.depositLimitUsd, `u64`),
      pure(tx, args.borrowLimitUsd, `u64`),
      pure(tx, args.borrowFeeBps, `u64`),
      pure(tx, args.spreadFeeBps, `u64`),
      pure(tx, args.protocolLiquidationFeeBps, `u64`),
      pure(tx, args.interestRateUtils, `vector<u8>`),
      pure(tx, args.interestRateAprs, `vector<u64>`),
      pure(tx, args.isolated, `bool`),
      pure(tx, args.openAttributedBorrowLimitUsd, `u64`),
      pure(tx, args.closeAttributedBorrowLimitUsd, `u64`),
    ],
  });
}

export function depositLimit(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::deposit_limit`,
    arguments: [obj(tx, config)],
  });
}

export function depositLimitUsd(
  tx: Transaction,
  config: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::deposit_limit_usd`,
    arguments: [obj(tx, config)],
  });
}

export function isolated(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::isolated`,
    arguments: [obj(tx, config)],
  });
}

export function liquidationBonus(
  tx: Transaction,
  config: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::liquidation_bonus`,
    arguments: [obj(tx, config)],
  });
}

export function openLtv(tx: Transaction, config: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::open_ltv`,
    arguments: [obj(tx, config)],
  });
}

export function protocolLiquidationFee(
  tx: Transaction,
  config: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::protocol_liquidation_fee`,
    arguments: [obj(tx, config)],
  });
}

export interface SetBorrowFeeBpsArgs {
  builder: TransactionObjectInput;
  borrowFeeBps: bigint | TransactionArgument;
}

export function setBorrowFeeBps(tx: Transaction, args: SetBorrowFeeBpsArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_borrow_fee_bps`,
    arguments: [obj(tx, args.builder), pure(tx, args.borrowFeeBps, `u64`)],
  });
}

export interface SetBorrowLimitArgs {
  builder: TransactionObjectInput;
  borrowLimit: bigint | TransactionArgument;
}

export function setBorrowLimit(tx: Transaction, args: SetBorrowLimitArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_borrow_limit`,
    arguments: [obj(tx, args.builder), pure(tx, args.borrowLimit, `u64`)],
  });
}

export interface SetBorrowLimitUsdArgs {
  builder: TransactionObjectInput;
  borrowLimitUsd: bigint | TransactionArgument;
}

export function setBorrowLimitUsd(
  tx: Transaction,
  args: SetBorrowLimitUsdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_borrow_limit_usd`,
    arguments: [obj(tx, args.builder), pure(tx, args.borrowLimitUsd, `u64`)],
  });
}

export interface SetBorrowWeightBpsArgs {
  builder: TransactionObjectInput;
  borrowWeightBps: bigint | TransactionArgument;
}

export function setBorrowWeightBps(
  tx: Transaction,
  args: SetBorrowWeightBpsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_borrow_weight_bps`,
    arguments: [obj(tx, args.builder), pure(tx, args.borrowWeightBps, `u64`)],
  });
}

export interface SetCloseAttributedBorrowLimitUsdArgs {
  builder: TransactionObjectInput;
  closeAttributedBorrowLimitUsd: bigint | TransactionArgument;
}

export function setCloseAttributedBorrowLimitUsd(
  tx: Transaction,
  args: SetCloseAttributedBorrowLimitUsdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_close_attributed_borrow_limit_usd`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.closeAttributedBorrowLimitUsd, `u64`),
    ],
  });
}

export interface SetCloseLtvPctArgs {
  builder: TransactionObjectInput;
  closeLtvPct: number | TransactionArgument;
}

export function setCloseLtvPct(tx: Transaction, args: SetCloseLtvPctArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_close_ltv_pct`,
    arguments: [obj(tx, args.builder), pure(tx, args.closeLtvPct, `u8`)],
  });
}

export interface SetDepositLimitArgs {
  builder: TransactionObjectInput;
  depositLimit: bigint | TransactionArgument;
}

export function setDepositLimit(tx: Transaction, args: SetDepositLimitArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_deposit_limit`,
    arguments: [obj(tx, args.builder), pure(tx, args.depositLimit, `u64`)],
  });
}

export interface SetDepositLimitUsdArgs {
  builder: TransactionObjectInput;
  depositLimitUsd: bigint | TransactionArgument;
}

export function setDepositLimitUsd(
  tx: Transaction,
  args: SetDepositLimitUsdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_deposit_limit_usd`,
    arguments: [obj(tx, args.builder), pure(tx, args.depositLimitUsd, `u64`)],
  });
}

export interface SetInterestRateAprsArgs {
  builder: TransactionObjectInput;
  interestRateAprs: Array<bigint | TransactionArgument> | TransactionArgument;
}

export function setInterestRateAprs(
  tx: Transaction,
  args: SetInterestRateAprsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_interest_rate_aprs`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.interestRateAprs, `vector<u64>`),
    ],
  });
}

export interface SetInterestRateUtilsArgs {
  builder: TransactionObjectInput;
  interestRateUtils: Array<number | TransactionArgument> | TransactionArgument;
}

export function setInterestRateUtils(
  tx: Transaction,
  args: SetInterestRateUtilsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_interest_rate_utils`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.interestRateUtils, `vector<u8>`),
    ],
  });
}

export interface SetIsolatedArgs {
  builder: TransactionObjectInput;
  isolated: boolean | TransactionArgument;
}

export function setIsolated(tx: Transaction, args: SetIsolatedArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_isolated`,
    arguments: [obj(tx, args.builder), pure(tx, args.isolated, `bool`)],
  });
}

export interface SetLiquidationBonusBpsArgs {
  builder: TransactionObjectInput;
  liquidationBonusBps: bigint | TransactionArgument;
}

export function setLiquidationBonusBps(
  tx: Transaction,
  args: SetLiquidationBonusBpsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_liquidation_bonus_bps`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.liquidationBonusBps, `u64`),
    ],
  });
}

export interface SetMaxCloseLtvPctArgs {
  builder: TransactionObjectInput;
  maxCloseLtvPct: number | TransactionArgument;
}

export function setMaxCloseLtvPct(
  tx: Transaction,
  args: SetMaxCloseLtvPctArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_max_close_ltv_pct`,
    arguments: [obj(tx, args.builder), pure(tx, args.maxCloseLtvPct, `u8`)],
  });
}

export interface SetMaxLiquidationBonusBpsArgs {
  builder: TransactionObjectInput;
  maxLiquidationBonusBps: bigint | TransactionArgument;
}

export function setMaxLiquidationBonusBps(
  tx: Transaction,
  args: SetMaxLiquidationBonusBpsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_max_liquidation_bonus_bps`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.maxLiquidationBonusBps, `u64`),
    ],
  });
}

export interface SetOpenAttributedBorrowLimitUsdArgs {
  builder: TransactionObjectInput;
  openAttributedBorrowLimitUsd: bigint | TransactionArgument;
}

export function setOpenAttributedBorrowLimitUsd(
  tx: Transaction,
  args: SetOpenAttributedBorrowLimitUsdArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_open_attributed_borrow_limit_usd`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.openAttributedBorrowLimitUsd, `u64`),
    ],
  });
}

export interface SetOpenLtvPctArgs {
  builder: TransactionObjectInput;
  openLtvPct: number | TransactionArgument;
}

export function setOpenLtvPct(tx: Transaction, args: SetOpenLtvPctArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_open_ltv_pct`,
    arguments: [obj(tx, args.builder), pure(tx, args.openLtvPct, `u8`)],
  });
}

export interface SetProtocolLiquidationFeeBpsArgs {
  builder: TransactionObjectInput;
  protocolLiquidationFeeBps: bigint | TransactionArgument;
}

export function setProtocolLiquidationFeeBps(
  tx: Transaction,
  args: SetProtocolLiquidationFeeBpsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::set_protocol_liquidation_fee_bps`,
    arguments: [
      obj(tx, args.builder),
      pure(tx, args.protocolLiquidationFeeBps, `u64`),
    ],
  });
}

export function validateReserveConfig(
  tx: Transaction,
  config: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::validate_reserve_config`,
    arguments: [obj(tx, config)],
  });
}

export interface ValidateUtilsAndAprsArgs {
  utils: Array<number | TransactionArgument> | TransactionArgument;
  aprs: Array<bigint | TransactionArgument> | TransactionArgument;
}

export function validateUtilsAndAprs(
  tx: Transaction,
  args: ValidateUtilsAndAprsArgs,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::reserve_config::validate_utils_and_aprs`,
    arguments: [
      pure(tx, args.utils, `vector<u8>`),
      pure(tx, args.aprs, `vector<u64>`),
    ],
  });
}
