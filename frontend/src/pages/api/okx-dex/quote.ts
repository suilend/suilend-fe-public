import type { NextApiRequest, NextApiResponse } from "next";

import { SUI_COINTYPE, isSui } from "@suilend/sui-fe";

import { OkxDexQuote, getHeaders } from "@/lib/okxDex";

const getQuote = async (
  amountIn: string,
  tokenInCoinType: string,
  tokenOutCoinType: string,
): Promise<OkxDexQuote> => {
  const timestamp = new Date().toISOString();
  const requestPath = "/api/v5/dex/aggregator/quote";
  const params = {
    chainIndex: "784",
    chainId: "SUI",
    amount: amountIn,
    swapMode: "exactIn",
    fromTokenAddress: isSui(tokenInCoinType) ? SUI_COINTYPE : tokenInCoinType,
    toTokenAddress: isSui(tokenOutCoinType) ? SUI_COINTYPE : tokenOutCoinType,
  };
  const queryString = "?" + new URLSearchParams(params).toString();
  const headers = getHeaders(timestamp, "GET", requestPath, queryString);

  const res = await fetch(`https://web3.okx.com${requestPath}${queryString}`, {
    method: "GET",
    headers,
  });
  if (!res.ok) throw new Error(await res.text());

  const json = await res.json();
  if (json.code !== "0" || !json.data?.[0]) throw new Error(json.msg);

  const data: OkxDexQuote = json.data[0];
  return data;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { amountIn, tokenInCoinType, tokenOutCoinType } = req.body;
    if (!amountIn || !tokenInCoinType || !tokenOutCoinType)
      return res.status(400).json({ error: "Missing required parameters" });

    const data = await getQuote(amountIn, tokenInCoinType, tokenOutCoinType);
    return res.status(200).json(data);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err.message || "Internal server error" });
  }
}
