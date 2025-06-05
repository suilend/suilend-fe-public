import { Transaction } from "@mysten/sui/transactions";
import cryptoJS from "crypto-js";

import { SUI_COINTYPE, isSui } from "@suilend/sui-fe";

import { SwapToken } from "@/lib/types";

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

export const getHeaders = (
  timestamp: string,
  method: string,
  requestPath: string,
  queryString: string,
) => {
  const stringToSign = `${timestamp}${method}${requestPath}${queryString}`;

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": process.env.NEXT_PUBLIC_OKX_API_KEY!,
    "OK-ACCESS-SIGN": cryptoJS.enc.Base64.stringify(
      cryptoJS.HmacSHA256(
        stringToSign,
        process.env.NEXT_PUBLIC_OKX_SECRET_KEY!,
      ),
    ),
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": process.env.NEXT_PUBLIC_OKX_API_PASSPHRASE!,
    "OK-ACCESS-PROJECT": process.env.NEXT_PUBLIC_OKX_PROJECT_ID!,
  };
};

export const getQuote = async (
  amountIn: string,
  tokenIn: SwapToken,
  tokenOut: SwapToken,
): Promise<OkxDexQuote> => {
  const timestamp = new Date().toISOString();
  const requestPath = "/api/v5/dex/aggregator/quote";
  const params = {
    chainIndex: "784",
    chainId: "SUI",
    amount: amountIn,
    swapMode: "exactIn",
    fromTokenAddress: isSui(tokenIn.coinType) ? SUI_COINTYPE : tokenIn.coinType,
    toTokenAddress: isSui(tokenOut.coinType) ? SUI_COINTYPE : tokenOut.coinType,
  };
  const queryString = "?" + new URLSearchParams(params).toString();
  const headers = getHeaders(timestamp, "GET", requestPath, queryString);

  const res = await fetch(`https://web3.okx.com${requestPath}${queryString}`, {
    method: "GET",
    headers,
  });
  if (!res.ok)
    throw new Error(`Failed to get OKX DEX quote: ${await res.text()}`);

  const json = await res.json();
  if (json.code !== "0" || !json.data?.[0])
    throw new Error(`Failed to get OKX DEX quote: ${json.msg}`);

  const data: OkxDexQuote = json.data[0];
  return data;
};

export const getSwapTransaction = async (
  amountIn: string,
  tokenInCoinType: string,
  tokenOutCoinType: string,
  slippagePercent: string,
  address: string,
): Promise<Transaction> => {
  const timestamp = new Date().toISOString();
  const requestPath = "/api/v5/dex/aggregator/swap";
  const params = {
    chainIndex: "784",
    chainId: "SUI",
    amount: amountIn,
    swapMode: "exactIn",
    fromTokenAddress: isSui(tokenInCoinType) ? SUI_COINTYPE : tokenInCoinType,
    toTokenAddress: isSui(tokenOutCoinType) ? SUI_COINTYPE : tokenOutCoinType,
    slippage: `${+slippagePercent / 100}`,
    userWalletAddress: address,
  };
  const queryString = "?" + new URLSearchParams(params).toString();
  const headers = getHeaders(timestamp, "GET", requestPath, queryString);

  const res = await fetch(`https://web3.okx.com${requestPath}${queryString}`, {
    method: "GET",
    headers,
  });
  if (!res.ok)
    throw new Error(
      `Failed to get OKX DEX swap transaction: ${await res.text()}`,
    );

  const json = await res.json();
  if (json.code !== "0" || !json.data)
    throw new Error(`Failed to get OKX DEX swap transaction: ${json.msg}`);

  const data: OkxDexSwap = json.data[0];
  const transaction = Transaction.from(data.tx.data);
  return transaction;
};
