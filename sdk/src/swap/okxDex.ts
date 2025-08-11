import { Transaction } from "@mysten/sui/transactions";
import cryptoJS from "crypto-js";

export const cartesianProduct = (arrays: number[][]): number[][] => {
  return arrays.reduce<number[][]>(
    (a, b) =>
      a.map((x) => b.map((y) => [...x, y])).reduce((a, b) => [...a, ...b], []),
    [[]],
  );
};

export type OkxDexQuote = {
  fromTokenAmount: string;
  toTokenAmount: string;
  dexRouterList: {
    router: string;
    routerPercent: string;
    subRouterList: {
      dexProtocol: {
        percent: string;
        dexName: string;
      }[];
      fromToken: {
        tokenContractAddress: string;
      };
      toToken: {
        tokenContractAddress: string;
      };
    }[];
  }[];
};
export type OkxDexSwap = {
  tx: {
    signatureData: string[];
    from: string;
    gas: string;
    gasPrice: string;
    maxPriorityFeePerGas: string;
    to: string;
    value: string;
    maxSpendAmount: string;
    minReceiveAmount: string;
    data: string;
    slippage: string;
  };
};

export const getOkxDexQuote = async (
  amountIn: string,
  tokenInCoinType: string,
  tokenOutCoinType: string,
): Promise<OkxDexQuote> => {
  const url = "/api/okx-dex/quote";
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      amountIn,
      tokenInCoinType,
      tokenOutCoinType,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok)
    throw new Error(
      `Failed to get OKX DEX quote: ${(await res.json())?.error}`,
    );

  const json: OkxDexQuote = await res.json();
  return json;
};

export const getOkxDexSwapTransaction = async (
  amountIn: string,
  tokenInCoinType: string,
  tokenOutCoinType: string,
  slippagePercent: number,
  address: string,
): Promise<Transaction> => {
  const url = "/api/okx-dex/swap";
  const res = await fetch(url, {
    method: "POST",
    body: JSON.stringify({
      amountIn,
      tokenInCoinType,
      tokenOutCoinType,
      slippagePercent,
      address,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok)
    throw new Error(
      `Failed to get OKX DEX swap transaction: ${(await res.json())?.error}`,
    );

  const json: OkxDexSwap = await res.json();
  return Transaction.from(json.tx.data);
};

// Used on server-side only
export const getHeaders = (
  timestamp: string,
  method: string,
  requestPath: string,
  queryString: string,
) => {
  const stringToSign = `${timestamp}${method}${requestPath}${queryString}`;

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": process.env.OKX_API_KEY!,
    "OK-ACCESS-SIGN": cryptoJS.enc.Base64.stringify(
      cryptoJS.HmacSHA256(stringToSign, process.env.OKX_SECRET_KEY!),
    ),
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_API_PASSPHRASE!,
    "OK-ACCESS-PROJECT": process.env.OKX_PROJECT_ID!,
  };
};
