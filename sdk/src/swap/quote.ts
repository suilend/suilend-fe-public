import {
  QuoteResponse as _7kQuote,
  getQuote as get7kQuoteOriginal,
} from "@7kprotocol/sdk-ts/cjs";
import {
  Path as CetusPath,
  RouterDataV3 as CetusQuote,
  AggregatorClient as CetusSdk,
} from "@cetusprotocol/aggregator-sdk";
import {
  AggregatorQuoter as FlowXAggregatorQuoter,
  GetRoutesResult as FlowXGetRoutesResult,
} from "@flowx-finance/sdk";
import { normalizeStructTag } from "@mysten/sui/utils";
import * as Sentry from "@sentry/nextjs";
import {
  RouterCompleteTradeRoute as AftermathQuote,
  Aftermath as AftermathSdk,
} from "aftermath-ts-sdk";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { v4 as uuidv4 } from "uuid";

import { Token } from "@suilend/sui-fe";

import { WAD } from "../lib";

export enum QuoteProvider {
  AFTERMATH = "aftermath",
  CETUS = "cetus",
  _7K = "7k",
  FLOWX = "flowx",
}
export const QUOTE_PROVIDER_NAME_MAP = {
  [QuoteProvider.AFTERMATH]: "Aftermath",
  [QuoteProvider.CETUS]: "Cetus",
  [QuoteProvider._7K]: "7K",
  [QuoteProvider.FLOWX]: "FlowX",
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
);

const getPoolProviders = (standardizedQuote: StandardizedQuote) => {
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

const getAggQuoteWrapper = async (
  provider: QuoteProvider,
  getAggQuote: () => Promise<StandardizedQuote | null>,
  timeoutMs: number,
): Promise<StandardizedQuote | null> => {
  console.log(`[getAggQuoteWrapper] getting ${provider} quote`);

  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const standardizedQuote = await Promise.race<StandardizedQuote | null>([
      getAggQuote(),
      timeoutPromise,
    ]);
    if (!standardizedQuote)
      throw new Error(`No ${provider} quote returned within ${timeoutMs}ms`);

    console.log(
      `[getAggQuoteWrapper] got ${provider} quote`,
      +standardizedQuote.out.amount,
      "pool providers:",
      standardizedQuote,
      "quote:",
      standardizedQuote.quote,
    );

    return standardizedQuote;
  } catch (err) {
    Sentry.captureException(err, { provider } as any);
    console.error(err);

    return null;
  }
};

const getAftermathQuote = async (
  sdk: AftermathSdk,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const quote = await sdk.Router().getCompleteTradeRouteGivenAmountIn({
    coinInType: tokenIn.coinType,
    coinOutType: tokenOut.coinType,
    coinInAmount: BigInt(amountIn),
  });

  const standardizedQuote: StandardizedQuote = {
    id: uuidv4(),
    provider: QuoteProvider.AFTERMATH,
    in: {
      coinType: tokenIn.coinType,
      amount: new BigNumber(quote.coinIn.amount.toString()).div(
        10 ** tokenIn.decimals,
      ),
    },
    out: {
      coinType: tokenOut.coinType,
      amount: new BigNumber(quote.coinOut.amount.toString()).div(
        10 ** tokenOut.decimals,
      ),
    },
    routes: quote.routes.map((route, routeIndex) => ({
      percent: new BigNumber(route.portion.toString()).div(WAD).times(100),
      path: route.paths.map((path) => ({
        id: uuidv4(),
        poolId: path.poolId,
        routeIndex,
        provider: path.protocolName,
        in: {
          coinType: normalizeStructTag(path.coinIn.type),
          amount: new BigNumber(path.coinIn.amount.toString()),
        },
        out: {
          coinType: normalizeStructTag(path.coinOut.type),
          amount: new BigNumber(path.coinOut.amount.toString()),
        },
      })),
    })),
    quote,
  };

  return standardizedQuote;
};
const getCetusQuote = async (
  sdk: CetusSdk,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const quote = await sdk.findRouters({
    from: tokenIn.coinType,
    target: tokenOut.coinType,
    amount: new BN(amountIn),
    byAmountIn: true,
  });
  if (!quote) return null;

  const routes: {
    amountIn: BigNumber;
    paths: CetusPath[];
  }[] = [];

  // First pass: build initial routes
  for (const path of quote.paths) {
    let addedToExistingRoute = false;

    // Try to add to an existing route
    for (const route of routes) {
      if (
        route.paths.length > 0 &&
        path.amountIn === route.paths[route.paths.length - 1].amountOut &&
        normalizeStructTag(path.from) ===
          normalizeStructTag(route.paths[route.paths.length - 1].target)
      ) {
        route.paths.push(path);
        addedToExistingRoute = true;
        break;
      }
    }

    // If couldn't add to existing route, only start a new route if it's from the quote's from field
    if (
      !addedToExistingRoute &&
      normalizeStructTag(path.from) === normalizeStructTag(tokenIn.coinType)
    ) {
      routes.push({
        amountIn: new BigNumber(path.amountIn),
        paths: [path],
      });
    }
  }

  const remainingPaths = quote.paths.filter(
    (path) =>
      !routes.some((route) => route.paths.some((p) => p.id === path.id)),
  );
  // TODO

  const standardizedQuote: StandardizedQuote = {
    id: uuidv4(),
    provider: QuoteProvider.CETUS,
    in: {
      coinType: tokenIn.coinType,
      amount: new BigNumber(quote.amountIn.toString()).div(
        10 ** tokenIn.decimals,
      ),
    },
    out: {
      coinType: tokenOut.coinType,
      amount: new BigNumber(quote.amountOut.toString()).div(
        10 ** tokenOut.decimals,
      ),
    },
    routes: routes.map((route, routeIndex) => ({
      percent: new BigNumber(route.amountIn.toString())
        .div(quote.amountIn.toString())
        .times(100),
      path: route.paths.map((path) => ({
        id: uuidv4(),
        poolId: path.id,
        routeIndex,
        provider: path.provider,
        in: {
          coinType: normalizeStructTag(path.from),
          amount: new BigNumber(path.amountIn.toString()),
        },
        out: {
          coinType: normalizeStructTag(path.target),
          amount: new BigNumber(path.amountOut.toString()),
        },
      })),
    })),
    quote,
  };

  return standardizedQuote;
};
const get7kQuote = async (
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const quote = await get7kQuoteOriginal({
    tokenIn: tokenIn.coinType,
    tokenOut: tokenOut.coinType,
    amountIn,
  });

  const standardizedQuote: StandardizedQuote = {
    id: uuidv4(),
    provider: QuoteProvider._7K,
    in: {
      coinType: tokenIn.coinType,
      amount: new BigNumber(quote.swapAmountWithDecimal).div(
        10 ** tokenIn.decimals,
      ),
    },
    out: {
      coinType: tokenOut.coinType,
      amount: new BigNumber(quote.returnAmountWithDecimal).div(
        10 ** tokenOut.decimals,
      ),
    },
    routes: (quote.routes ?? []).map((route: any, routeIndex: number) => ({
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
          amount: new BigNumber(hop.tokenInAmount).times(
            10 **
              hop.pool.allTokens.find(
                (t: any) =>
                  normalizeStructTag(t.address) ===
                  normalizeStructTag(hop.tokenIn),
              )!.decimal,
          ),
        },
        out: {
          coinType: normalizeStructTag(hop.tokenOut),
          amount: new BigNumber(hop.tokenOutAmount).times(
            10 **
              hop.pool.allTokens.find(
                (t: any) =>
                  normalizeStructTag(t.address) ===
                  normalizeStructTag(hop.tokenOut),
              )!.decimal,
          ),
        },
      })),
    })),
    quote,
  };

  return standardizedQuote;
};
const getFlowXQuote = async (
  sdk: FlowXAggregatorQuoter,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const quote = await sdk.getRoutes({
    tokenIn: tokenIn.coinType,
    tokenOut: tokenOut.coinType,
    amountIn: amountIn,
  });

  const standardizedQuote: StandardizedQuote = {
    id: uuidv4(),
    provider: QuoteProvider.FLOWX,
    in: {
      coinType: tokenIn.coinType,
      amount: new BigNumber(quote.amountIn.toString()).div(
        10 ** tokenIn.decimals,
      ),
    },
    out: {
      coinType: tokenOut.coinType,
      amount: new BigNumber(quote.amountOut.toString()).div(
        10 ** tokenOut.decimals,
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
          amount: new BigNumber(hop.amountIn.toString()),
        },
        out: {
          coinType: normalizeStructTag(hop.output.coinType),
          amount: new BigNumber(hop.amountOut.toString()),
        },
      })),
    })),
    quote,
  };

  return standardizedQuote;
};

export const getAggQuotes = async (
  sdkMap: {
    [QuoteProvider.AFTERMATH]: AftermathSdk;
    [QuoteProvider.CETUS]: CetusSdk;
    [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
  },
  activeProviders: QuoteProvider[],
  onGetAggQuote: (quote: StandardizedQuote | null) => void,
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const timeoutMs = 15000;

  // Get quotes in parallel
  // Aftermath
  if (activeProviders.includes(QuoteProvider.AFTERMATH)) {
    (async () => {
      const standardizedQuote = await getAggQuoteWrapper(
        QuoteProvider.AFTERMATH,
        () =>
          getAftermathQuote(
            sdkMap[QuoteProvider.AFTERMATH],
            tokenIn,
            tokenOut,
            amountIn,
          ),
        timeoutMs,
      );

      onGetAggQuote(standardizedQuote);
    })();
  }

  // Cetus
  if (activeProviders.includes(QuoteProvider.CETUS)) {
    (async () => {
      const standardizedQuote = await getAggQuoteWrapper(
        QuoteProvider.CETUS,
        () =>
          getCetusQuote(
            sdkMap[QuoteProvider.CETUS],
            tokenIn,
            tokenOut,
            amountIn,
          ),
        timeoutMs,
      );

      onGetAggQuote(standardizedQuote);
    })();
  }

  // 7K
  if (activeProviders.includes(QuoteProvider._7K)) {
    (async () => {
      const standardizedQuote = await getAggQuoteWrapper(
        QuoteProvider._7K,
        () => get7kQuote(tokenIn, tokenOut, amountIn),
        timeoutMs,
      );

      onGetAggQuote(standardizedQuote);
    })();
  }

  // FlowX
  if (activeProviders.includes(QuoteProvider.FLOWX)) {
    (async () => {
      const standardizedQuote = await getAggQuoteWrapper(
        QuoteProvider.FLOWX,
        () =>
          getFlowXQuote(
            sdkMap[QuoteProvider.FLOWX],
            tokenIn,
            tokenOut,
            amountIn,
          ),
        timeoutMs,
      );

      onGetAggQuote(standardizedQuote);
    })();
  }
};
export const getAggSortedQuotesAll = async (
  sdkMap: {
    [QuoteProvider.AFTERMATH]: AftermathSdk;
    [QuoteProvider.CETUS]: CetusSdk;
    [QuoteProvider.FLOWX]: FlowXAggregatorQuoter;
  },
  activeProviders: QuoteProvider[],
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
) => {
  const timeoutMs = 1500;

  // Get quotes in parallel
  const quotes = await Promise.all(
    [
      activeProviders.includes(QuoteProvider.AFTERMATH)
        ? getAggQuoteWrapper(
            QuoteProvider.AFTERMATH,
            () =>
              getAftermathQuote(
                sdkMap[QuoteProvider.AFTERMATH],
                tokenIn,
                tokenOut,
                amountIn,
              ),
            timeoutMs,
          )
        : null,
      activeProviders.includes(QuoteProvider.CETUS)
        ? getAggQuoteWrapper(
            QuoteProvider.CETUS,
            () =>
              getCetusQuote(
                sdkMap[QuoteProvider.CETUS],
                tokenIn,
                tokenOut,
                amountIn,
              ),
            timeoutMs,
          )
        : null,
      activeProviders.includes(QuoteProvider._7K)
        ? getAggQuoteWrapper(
            QuoteProvider._7K,
            () => get7kQuote(tokenIn, tokenOut, amountIn),
            timeoutMs,
          )
        : null,
      activeProviders.includes(QuoteProvider.FLOWX)
        ? getAggQuoteWrapper(
            QuoteProvider.FLOWX,
            () =>
              getFlowXQuote(
                sdkMap[QuoteProvider.FLOWX],
                tokenIn,
                tokenOut,
                amountIn,
              ),
            timeoutMs,
          )
        : null,
    ].filter(Boolean),
  );
  const sortedQuotes = (quotes.filter(Boolean) as StandardizedQuote[])
    .slice()
    .sort((a, b) => +b.out.amount.minus(a.out.amount));

  return sortedQuotes;
};
