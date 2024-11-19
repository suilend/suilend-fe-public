import { PUBLISHED_AT } from "..";
import { obj, pure } from "../../_framework/util";
import {
  Transaction,
  TransactionArgument,
  TransactionObjectInput,
} from "@mysten/sui/transactions";

export interface AddArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function add(tx: Transaction, args: AddArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::add`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface DivArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function div(tx: Transaction, args: DivArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::div`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface GeArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function ge(tx: Transaction, args: GeArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::ge`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface GtArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function gt(tx: Transaction, args: GtArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::gt`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface LeArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function le(tx: Transaction, args: LeArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::le`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface LtArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function lt(tx: Transaction, args: LtArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::lt`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface MulArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function mul(tx: Transaction, args: MulArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::mul`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface SubArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function sub(tx: Transaction, args: SubArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::sub`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface MaxArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function max(tx: Transaction, args: MaxArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::max`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface MinArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function min(tx: Transaction, args: MinArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::min`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export interface PowArgs {
  b: TransactionObjectInput;
  e: bigint | TransactionArgument;
}

export function pow(tx: Transaction, args: PowArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::pow`,
    arguments: [obj(tx, args.b), pure(tx, args.e, `u64`)],
  });
}

export function from(tx: Transaction, v: bigint | TransactionArgument) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::from`,
    arguments: [pure(tx, v, `u64`)],
  });
}

export function ceil(tx: Transaction, a: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::ceil`,
    arguments: [obj(tx, a)],
  });
}

export interface EqArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function eq(tx: Transaction, args: EqArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::eq`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export function floor(tx: Transaction, a: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::floor`,
    arguments: [obj(tx, a)],
  });
}

export function fromBps(tx: Transaction, v: bigint | TransactionArgument) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::from_bps`,
    arguments: [pure(tx, v, `u64`)],
  });
}

export function fromPercent(tx: Transaction, v: number | TransactionArgument) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::from_percent`,
    arguments: [pure(tx, v, `u8`)],
  });
}

export function fromPercentU64(
  tx: Transaction,
  v: bigint | TransactionArgument,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::from_percent_u64`,
    arguments: [pure(tx, v, `u64`)],
  });
}

export function fromScaledVal(
  tx: Transaction,
  v: bigint | TransactionArgument,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::from_scaled_val`,
    arguments: [pure(tx, v, `u256`)],
  });
}

export function saturatingFloor(tx: Transaction, a: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::saturating_floor`,
    arguments: [obj(tx, a)],
  });
}

export interface SaturatingSubArgs {
  a: TransactionObjectInput;
  b: TransactionObjectInput;
}

export function saturatingSub(tx: Transaction, args: SaturatingSubArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::saturating_sub`,
    arguments: [obj(tx, args.a), obj(tx, args.b)],
  });
}

export function toScaledVal(tx: Transaction, v: TransactionObjectInput) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::decimal::to_scaled_val`,
    arguments: [obj(tx, v)],
  });
}
