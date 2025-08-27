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
} from "@mysten/sui/transactions";
import * as Sentry from "@sentry/nextjs";
import { Aftermath as AftermathSdk } from "aftermath-ts-sdk";

import { getAllCoins, isSui, mergeAllCoins } from "@suilend/sui-fe";

import { QuoteProvider, StandardizedQuote } from "./quote";

const getSwapTransactionWrapper = async (
  provider: QuoteProvider,
  getSwapTransaction: () => Promise<{
    transaction: Transaction;
    coinOut?: TransactionObjectArgument;
  }>,
): Promise<{
  transaction: Transaction;
  coinOut?: TransactionObjectArgument;
}> => {
  console.log(
    `[getSwapTransactionWrapper] fetching transaction for ${provider} quote`,
  );

  try {
    const res = await getSwapTransaction();

    console.log(
      `[getSwapTransactionWrapper] fetched transaction for ${provider} quote`,
    );

    return res;
  } catch (err) {
    Sentry.captureException(err, { provider } as any);
    console.error(err);

    throw err;
  }
};

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
  if (quote.provider === QuoteProvider.AFTERMATH) {
    return getSwapTransactionWrapper(QuoteProvider.AFTERMATH, async () => {
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
    });
  } else if (quote.provider === QuoteProvider.CETUS) {
    return getSwapTransactionWrapper(QuoteProvider.CETUS, async () => {
      if (!coinIn) {
        const allCoinsIn = await getAllCoins(
          suiClient,
          address,
          quote.in.coinType,
        );
        const mergeCoinIn = mergeAllCoins(
          quote.in.coinType,
          transaction,
          allCoinsIn,
        );

        [coinIn] = transaction.splitCoins(
          isSui(quote.in.coinType)
            ? transaction.gas
            : transaction.object(mergeCoinIn.coinObjectId),
          [BigInt(quote.quote.amountIn.toString())],
        );
      }

      const coinOut = await sdkMap[QuoteProvider.CETUS].routerSwap({
        routers: quote.quote,
        inputCoin: coinIn,
        slippage: slippagePercent / 100,
        txb: transaction,
        partner: partnerIdMap[QuoteProvider.CETUS],
      });

      return { transaction, coinOut };
    });
  } else if (quote.provider === QuoteProvider._7K) {
    return getSwapTransactionWrapper(QuoteProvider._7K, async () => {
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
    });
  } else if (quote.provider === QuoteProvider.FLOWX) {
    return getSwapTransactionWrapper(QuoteProvider.FLOWX, async () => {
      if (!coinIn) {
        const allCoinsIn = await getAllCoins(
          suiClient,
          address,
          quote.in.coinType,
        );
        const mergeCoinIn = mergeAllCoins(
          quote.in.coinType,
          transaction,
          allCoinsIn,
        );

        [coinIn] = transaction.splitCoins(
          isSui(quote.in.coinType)
            ? transaction.gas
            : transaction.object(mergeCoinIn.coinObjectId),
          [BigInt(quote.quote.amountIn.toString())],
        );
      }

      const trade = new FlowXTradeBuilder("mainnet", quote.quote.routes)
        .slippage((slippagePercent / 100) * 1e6)
        .commission(
          new FlowXCommission(
            partnerIdMap[QuoteProvider.FLOWX],
            new FlowXCoin(quote.out.coinType),
            FlowXCommissionType.PERCENTAGE,
            0,
            false,
          ),
        )
        .build();

      const coinOut = await trade.swap({
        coinIn: coinIn,
        client: suiClient,
        tx: transaction,
      });

      return { transaction, coinOut: coinOut as TransactionObjectArgument };
    });
  } else throw new Error("Unknown quote type");
};
