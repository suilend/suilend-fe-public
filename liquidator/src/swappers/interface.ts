import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

export type SwapArgs = {
  fromCoinType: string;
  toCoinType: string;
  toAmount?: number;
  fromAmount?: number;
  maxSlippage: number;
  txb: Transaction;
};

export interface Swapper {
  init(): Promise<void>;
  swap(args: SwapArgs): Promise<{
    fromCoin: TransactionObjectArgument;
    toCoin: TransactionObjectArgument;
    txb: Transaction;
  } | null>;
}
