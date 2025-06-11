import {
  QuoteResponse as _7kQuote,
  getQuote as get7kQuote,
} from "@7kprotocol/sdk-ts/cjs";
import {
  RouterData as CetusQuote,
  AggregatorClient as CetusSdk,
} from "@cetusprotocol/aggregator-sdk";
import {
  AggregatorQuoter as FlowXAggregatorQuoter,
  GetRoutesResult as FlowXGetRoutesResult,
} from "@flowx-finance/sdk";
import { normalizeStructTag } from "@mysten/sui/utils";
import {
  RouterCompleteTradeRoute as AftermathQuote,
  Aftermath as AftermathSdk,
} from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { v4 as uuidv4 } from "uuid";

import { Token } from "@suilend/sui-fe";

import { WAD } from "../lib";

import { OkxDexQuote, cartesianProduct, getOkxDexQuote } from "./okxDex";

export const getPoolProviders = (standardizedQuote: StandardizedQuote) => {
  return Array.from(
    new Set(
      standardizedQuote.routes.reduce(
        (acc, route) => [
          ...acc,
          ...route.path.reduce(
            (acc2, p) => [...acc2, p.provider],
            [] as string[],
          ),
        ],
        [] as string[],
      ),
    ),
  );
};

export enum QuoteProvider {
  AFTERMATH = "aftermath",
  CETUS = "cetus",
  _7K = "7k",
  FLOWX = "flowx",
  OKX_DEX = "okxDex",
}
export const QUOTE_PROVIDER_NAME_MAP = {
  [QuoteProvider.AFTERMATH]: "Aftermath",
  [QuoteProvider.CETUS]: "Cetus",
  [QuoteProvider._7K]: "7K",
  [QuoteProvider.FLOWX]: "FlowX",
  [QuoteProvider.OKX_DEX]: "OKX DEX",
};

export type StandardizedRoutePath = {
  id: string;
  poolId?: string;
  routeIndex: number;
  provider: string;
  in: {
    coinType: string;
    amount: BigNumber;
  };
  out: {
    coinType: string;
    amount: BigNumber;
  };
};
export type StandardizedPathWithToken = StandardizedRoutePath & {
  in: StandardizedRoutePath["in"] & {
    token: Token;
  };
  out: StandardizedRoutePath["out"] & {
    token: Token;
  };
};

export type StandardizedQuote = {
  id: string;
  in: {
    coinType: string;
    amount: BigNumber;
  };
  out: {
    coinType: string;
    amount: BigNumber;
  };
  routes: {
    percent: BigNumber;
    path: StandardizedRoutePath[];
  }[];
} & (
  | { provider: QuoteProvider.AFTERMATH; quote: AftermathQuote }
  | { provider: QuoteProvider.CETUS; quote: CetusQuote }
  | { provider: QuoteProvider._7K; quote: _7kQuote }
  | { provider: QuoteProvider.FLOWX; quote: FlowXGetRoutesResult<any, any> }
  | { provider: QuoteProvider.OKX_DEX; quote: OkxDexQuote }
);

export const fetchAggQuotes = async (
  sdkMap: {
    [QuoteProvider.AFTERMATH]: AftermathSdk;
    [QuoteProvider.CETUS]: CetusSdk;
    [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
  },
  activeProviders: QuoteProvider[],
  setQuotesForTimestamp: (
    timestamp: number,
    quotes: StandardizedQuote[],
  ) => void,
  _tokenIn: Token,
  _tokenOut: Token,
  _value: string,
  _timestamp = new Date().getTime(),
) => {
  const quotesForTimestamp: StandardizedQuote[] = [];
  setQuotesForTimestamp(_timestamp, quotesForTimestamp);

  const amountIn = new BigNumber(_value)
    .times(10 ** _tokenIn.decimals)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString();

  // Fetch quotes in parallel
  // Aftermath
  if (activeProviders.includes(QuoteProvider.AFTERMATH)) {
    (async () => {
      console.log("[fetchAggQuotes] fetching Aftermath quote");

      try {
        const quote = await sdkMap[QuoteProvider.AFTERMATH]
          .Router()
          .getCompleteTradeRouteGivenAmountIn({
            coinInType: _tokenIn.coinType,
            coinOutType: _tokenOut.coinType,
            coinInAmount: BigInt(amountIn),
          });

        const standardizedQuote: StandardizedQuote = {
          id: uuidv4(),
          provider: QuoteProvider.AFTERMATH,
          in: {
            coinType: _tokenIn.coinType,
            amount: new BigNumber(quote.coinIn.amount.toString()).div(
              10 ** _tokenIn.decimals,
            ),
          },
          out: {
            coinType: _tokenOut.coinType,
            amount: new BigNumber(quote.coinOut.amount.toString()).div(
              10 ** _tokenOut.decimals,
            ),
          },
          routes: quote.routes.map((route, routeIndex) => ({
            percent: new BigNumber(route.portion.toString())
              .div(WAD)
              .times(100),
            path: route.paths.map((path) => ({
              id: uuidv4(),
              poolId: path.poolId,
              routeIndex,
              provider: path.protocolName,
              in: {
                coinType: normalizeStructTag(path.coinIn.type),
                amount: new BigNumber(path.coinIn.amount.toString()).div(
                  10 ** _tokenIn.decimals,
                ),
              },
              out: {
                coinType: normalizeStructTag(path.coinOut.type),
                amount: new BigNumber(path.coinOut.amount.toString()).div(
                  10 ** _tokenOut.decimals,
                ),
              },
            })),
          })),
          quote,
        };

        quotesForTimestamp.push(standardizedQuote);
        setQuotesForTimestamp(_timestamp, quotesForTimestamp);

        console.log(
          "[fetchAggQuotes] set Aftermath quote",
          +standardizedQuote.out.amount,
          "pool providers:",
          getPoolProviders(standardizedQuote),
          "quote:",
          quote,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }

  // Cetus
  if (activeProviders.includes(QuoteProvider.CETUS)) {
    (async () => {
      console.log("[fetchAggQuotes] fetching Cetus quote");

      try {
        const quote = await sdkMap[QuoteProvider.CETUS].findRouters({
          from: _tokenIn.coinType,
          target: _tokenOut.coinType,
          amount: new BN(amountIn),
          byAmountIn: true,
        });
        if (!quote) return;

        const standardizedQuote: StandardizedQuote = {
          id: uuidv4(),
          provider: QuoteProvider.CETUS,
          in: {
            coinType: _tokenIn.coinType,
            amount: new BigNumber(quote.amountIn.toString()).div(
              10 ** _tokenIn.decimals,
            ),
          },
          out: {
            coinType: _tokenOut.coinType,
            amount: new BigNumber(quote.amountOut.toString()).div(
              10 ** _tokenOut.decimals,
            ),
          },
          routes: quote.routes.map((route, routeIndex) => ({
            percent: new BigNumber(route.amountIn.toString())
              .div(quote.amountIn.toString())
              .times(100),
            path: route.path.map((path) => ({
              id: uuidv4(),
              poolId: path.id,
              routeIndex,
              provider: path.provider,
              in: {
                coinType: normalizeStructTag(path.from),
                amount: new BigNumber(path.amountIn.toString()).div(
                  10 ** _tokenIn.decimals,
                ),
              },
              out: {
                coinType: normalizeStructTag(path.target),
                amount: new BigNumber(path.amountOut.toString()).div(
                  10 ** _tokenOut.decimals,
                ),
              },
            })),
          })),
          quote,
        };

        quotesForTimestamp.push(standardizedQuote);
        setQuotesForTimestamp(_timestamp, quotesForTimestamp);

        console.log(
          "[fetchAggQuotes] set Cetus quote",
          +standardizedQuote.out.amount,
          "pool providers:",
          getPoolProviders(standardizedQuote),
          "quote:",
          quote,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }

  // 7K
  if (activeProviders.includes(QuoteProvider._7K)) {
    (async () => {
      console.log("[fetchAggQuotes] fetching 7K quote");

      try {
        const quote = await get7kQuote({
          tokenIn: _tokenIn.coinType,
          tokenOut: _tokenOut.coinType,
          amountIn,
        });

        const standardizedQuote: StandardizedQuote = {
          id: uuidv4(),
          provider: QuoteProvider._7K,
          in: {
            coinType: _tokenIn.coinType,
            amount: new BigNumber(quote.swapAmount),
          },
          out: {
            coinType: _tokenOut.coinType,
            amount: new BigNumber(quote.returnAmount),
          },
          routes: (quote.routes ?? []).map(
            (route: any, routeIndex: number) => ({
              percent: new BigNumber(route.tokenInAmount)
                .div(quote.swapAmount)
                .times(100),
              path: route.hops.map((hop: any) => ({
                id: uuidv4(),
                poolId: hop.poolId,
                routeIndex,
                provider: hop.pool.type,
                in: {
                  coinType: normalizeStructTag(hop.tokenIn),
                  amount: new BigNumber(hop.tokenInAmount),
                },
                out: {
                  coinType: normalizeStructTag(hop.tokenOut),
                  amount: new BigNumber(hop.tokenOutAmount),
                },
              })),
            }),
          ),
          quote,
        };

        quotesForTimestamp.push(standardizedQuote);
        setQuotesForTimestamp(_timestamp, quotesForTimestamp);

        console.log(
          "[fetchAggQuotes] set 7K quote",
          +standardizedQuote.out.amount,
          "pool providers:",
          getPoolProviders(standardizedQuote),
          "quote:",
          quote,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }

  // FlowX
  if (activeProviders.includes(QuoteProvider.FLOWX)) {
    (async () => {
      console.log("[fetchAggQuotes] fetching FlowX quote");

      try {
        const quote = await sdkMap[QuoteProvider.FLOWX].getRoutes({
          tokenIn: _tokenIn.coinType,
          tokenOut: _tokenOut.coinType,
          amountIn: amountIn,
        });

        const standardizedQuote: StandardizedQuote = {
          id: uuidv4(),
          provider: QuoteProvider.FLOWX,
          in: {
            coinType: _tokenIn.coinType,
            amount: new BigNumber(quote.amountIn.toString()).div(
              10 ** _tokenIn.decimals,
            ),
          },
          out: {
            coinType: _tokenOut.coinType,
            amount: new BigNumber(quote.amountOut.toString()).div(
              10 ** _tokenOut.decimals,
            ),
          },
          routes: (quote.routes ?? []).map((route, routeIndex) => ({
            percent: new BigNumber(route.amountIn.toString())
              .div(quote.amountIn.toString())
              .times(100),
            path: route.paths.map((hop) => ({
              id: uuidv4(),
              poolId: hop.pool.id,
              routeIndex,
              provider: hop.protocol(),
              in: {
                coinType: normalizeStructTag(hop.input.coinType),
                amount: new BigNumber(hop.amountIn.toString()).div(
                  10 ** _tokenIn.decimals,
                ),
              },
              out: {
                coinType: normalizeStructTag(hop.output.coinType),
                amount: new BigNumber(hop.amountOut.toString()).div(
                  10 ** _tokenOut.decimals,
                ),
              },
            })),
          })),
          quote,
        };

        quotesForTimestamp.push(standardizedQuote);
        setQuotesForTimestamp(_timestamp, quotesForTimestamp);

        console.log(
          "[fetchAggQuotes] set FlowX quote",
          +standardizedQuote.out.amount,
          "pool providers:",
          getPoolProviders(standardizedQuote),
          "quote:",
          quote,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }

  // OKX DEX
  if (activeProviders.includes(QuoteProvider.OKX_DEX)) {
    (async () => {
      console.log("[fetchAggQuotes] fetching OKX DEX quote");

      try {
        const quote = await getOkxDexQuote(
          amountIn,
          _tokenIn.coinType,
          _tokenOut.coinType,
        );

        const flattenedDexRouterList: OkxDexQuote["dexRouterList"] = [];
        for (const dexRouter of quote.dexRouterList) {
          const indexes: number[][] = [];
          for (const subRouter of dexRouter.subRouterList) {
            indexes.push(
              Array.from({ length: subRouter.dexProtocol.length }, (_, j) => j),
            );
          }

          const combinations = cartesianProduct(indexes);
          for (const combination of combinations) {
            const flattenedRouter: OkxDexQuote["dexRouterList"][number] = {
              ...dexRouter,
              routerPercent: "",
              subRouterList: dexRouter.subRouterList.map(
                (subRouter, index) => ({
                  ...subRouter,
                  dexProtocol: [subRouter.dexProtocol[combination[index]]],
                }),
              ),
            };

            let routerPercent = new BigNumber(dexRouter.routerPercent);
            for (const subRouter of flattenedRouter.subRouterList) {
              const dexProtocol = subRouter.dexProtocol[0];

              routerPercent = routerPercent.times(
                new BigNumber(dexProtocol.percent).div(100),
              );
            }
            flattenedRouter.routerPercent = routerPercent.toString();

            flattenedDexRouterList.push(flattenedRouter);
          }
        }

        const standardizedQuote: StandardizedQuote = {
          id: uuidv4(),
          provider: QuoteProvider.OKX_DEX,
          in: {
            coinType: _tokenIn.coinType,
            amount: new BigNumber(quote.fromTokenAmount).div(
              10 ** _tokenIn.decimals,
            ),
          },
          out: {
            coinType: _tokenOut.coinType,
            amount: new BigNumber(quote.toTokenAmount).div(
              10 ** _tokenOut.decimals,
            ),
          },
          routes: flattenedDexRouterList.map((dexRouter, routeIndex) => {
            return {
              percent: new BigNumber(dexRouter.routerPercent),
              path: dexRouter.subRouterList.map((subRouter) => ({
                id: uuidv4(),
                poolId: undefined, // Missing data
                routeIndex,
                provider: subRouter.dexProtocol[0].dexName,
                in: {
                  coinType: normalizeStructTag(
                    subRouter.fromToken.tokenContractAddress,
                  ),
                  amount: new BigNumber(0).div(10 ** _tokenIn.decimals), // Missing data
                },
                out: {
                  coinType: normalizeStructTag(
                    subRouter.toToken.tokenContractAddress,
                  ),
                  amount: new BigNumber(0).div(10 ** _tokenIn.decimals), // Missing data
                },
              })),
            };
          }),
          quote,
        };

        quotesForTimestamp.push(standardizedQuote);
        setQuotesForTimestamp(_timestamp, quotesForTimestamp);

        console.log(
          "Swap - set OKX DEX quote",
          +standardizedQuote.out.amount,
          "pool providers:",
          getPoolProviders(standardizedQuote),
          "quote:",
          quote,
        );
      } catch (err) {
        console.error(err);
      }
    })();
  }
};
