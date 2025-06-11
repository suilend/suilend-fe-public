import {
  BluefinXTx,
  buildTx as build7kTransaction,
} from "@7kprotocol/sdk-ts/cjs";
import { AggregatorClient as CetusSdk } from "@cetusprotocol/aggregator-sdk";
import {
  AggregatorQuoter as FlowXAggregatorQuoter,
  Coin as FlowXCoin,
  Commission as FlowXCommission,
  CommissionType as FlowXCommissionType,
  TradeBuilder as FlowXTradeBuilder,
} from "@flowx-finance/sdk";
import { SuiClient } from "@mysten/sui/client";
import {
  Transaction,
  TransactionObjectArgument,
  coinWithBalance,
} from "@mysten/sui/transactions";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";

import { isSui } from "@suilend/sui-fe";

import { getOkxDexSwapTransaction } from "./okxDex";
import { QuoteProvider, StandardizedQuote } from "./quote";

export const getSwapTransaction = async (
  suiClient: SuiClient,
  address: string,
  quote: StandardizedQuote,
  slippagePercent: number,
  sdkMap: {
    [QuoteProvider.AFTERMATH]: AftermathSdk;
    [QuoteProvider.CETUS]: CetusSdk;
    [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
  },
  partnerIdMap: {
    [QuoteProvider.CETUS]: string;
    [QuoteProvider._7K]: string;
    [QuoteProvider.FLOWX]: string;
  },
  transaction: Transaction,
  coinIn: TransactionObjectArgument | undefined,
) => {
  if (!address) throw new Error("Wallet not connected");
  if (!quote) throw new Error("Quote not found");

  if (quote.provider === QuoteProvider.AFTERMATH) {
    console.log(
      "[getSwapTransaction] fetching transaction for Aftermath quote",
    );

    const { tx: transaction2, coinOutId: coinOut } = await sdkMap[
      QuoteProvider.AFTERMATH
    ]
      .Router()
      .addTransactionForCompleteTradeRoute({
        tx: transaction,
        walletAddress: address,
        completeRoute: quote.quote,
        slippage: slippagePercent / 100,
        coinInId: coinIn,
      });

    return { transaction: transaction2, coinOut };
  } else if (quote.provider === QuoteProvider.CETUS) {
    console.log("[getSwapTransaction] fetching transaction for Cetus quote");

    if (!coinIn)
      coinIn = coinWithBalance({
        balance: BigInt(quote.quote.amountIn.toString()),
        type: quote.in.coinType,
        useGasCoin: isSui(quote.in.coinType),
      })(transaction);

    const coinOut = await sdkMap[QuoteProvider.CETUS].routerSwap({
      routers: quote.quote,
      inputCoin: coinIn,
      slippage: slippagePercent / 100,
      txb: transaction,
      partner: partnerIdMap[QuoteProvider.CETUS],
    });

    return { transaction, coinOut };
  } else if (quote.provider === QuoteProvider._7K) {
    const { tx: transaction2, coinOut } = await build7kTransaction({
      quoteResponse: quote.quote,
      accountAddress: address,
      slippage: slippagePercent / 100,
      commission: {
        partner: partnerIdMap[QuoteProvider._7K],
        commissionBps: 0,
      },
      extendTx: {
        tx: transaction,
        coinIn,
      },
    });

    if (transaction2 instanceof BluefinXTx) {
      // BluefinXTx
      throw new Error("BluefinXTx not supported");
    } else {
      return { transaction: transaction2, coinOut };
    }
  } else if (quote.provider === QuoteProvider.FLOWX) {
    console.log("[getSwapTransaction] fetching transaction for FlowX quote");

    if (!coinIn)
      coinIn = coinWithBalance({
        balance: BigInt(quote.quote.amountIn.toString()),
        type: quote.in.coinType,
        useGasCoin: isSui(quote.in.coinType),
      })(transaction);

    const trade = new FlowXTradeBuilder("mainnet", quote.quote.routes)
      .slippage((slippagePercent / 100) * 1e6)
      .commission(
        new FlowXCommission(
          partnerIdMap[QuoteProvider.FLOWX],
          new FlowXCoin(quote.out.coinType),
          FlowXCommissionType.PERCENTAGE,
          0,
          true,
        ),
      )
      .build();

    const coinOut = await trade.swap({
      coinIn: coinIn,
      client: suiClient,
      tx: transaction,
    });

    return { transaction, coinOut: coinOut as TransactionObjectArgument };
  } else if (quote.provider === QuoteProvider.OKX_DEX) {
    console.log("[getSwapTransaction] fetching transaction for OKX DEX quote");

    const transaction2 = await getOkxDexSwapTransaction(
      quote.quote.fromTokenAmount,
      quote.in.coinType,
      quote.out.coinType,
      slippagePercent,
      address,
    ); // Does not use `transaction` or `coinIn`

    return { transaction: transaction2, coinOut: undefined };
  } else throw new Error("Unknown quote type");
};
