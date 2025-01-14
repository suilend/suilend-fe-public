import { PUBLISHED_AT } from "..";
import { GenericArg, generic, obj } from "../../_framework/util";
import { Transaction, TransactionObjectInput } from "@mysten/sui/transactions";

export function new_(tx: Transaction, typeArg: string, element: GenericArg) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::cell::new`,
    typeArguments: [typeArg],
    arguments: [generic(tx, `${typeArg}`, element)],
  });
}

export interface SetArgs {
  cell: TransactionObjectInput;
  element: GenericArg;
}

export function set(tx: Transaction, typeArg: string, args: SetArgs) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::cell::set`,
    typeArguments: [typeArg],
    arguments: [obj(tx, args.cell), generic(tx, `${typeArg}`, args.element)],
  });
}

export function get(
  tx: Transaction,
  typeArg: string,
  cell: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::cell::get`,
    typeArguments: [typeArg],
    arguments: [obj(tx, cell)],
  });
}

export function destroy(
  tx: Transaction,
  typeArg: string,
  cell: TransactionObjectInput,
) {
  return tx.moveCall({
    target: `${PUBLISHED_AT}::cell::destroy`,
    typeArguments: [typeArg],
    arguments: [obj(tx, cell)],
  });
}
