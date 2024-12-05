import type { NextApiRequest, NextApiResponse } from "next";

import { SUI_COINTYPE, isSui } from "@suilend/frontend-sui";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { coinType, interval, startS, endS } = req.query;
  console.log("api/birdeye-history_price - query:", req.query);

  try {
    const url = `https://public-api.birdeye.so/defi/history_price?${new URLSearchParams(
      {
        address: isSui(coinType as string)
          ? SUI_COINTYPE
          : (coinType as string),
        address_type: "token",
        type: interval as string,
        time_from: startS as string,
        time_to: endS as string,
      },
    )}`;
    const json = await (
      await fetch(url, {
        headers: {
          "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
          "x-chain": "sui",
        },
      })
    ).json();
    console.log("api/birdeye-history_price - response:", json);

    if (json.data?.items) {
      const response = json.data.items.map((item: any) => ({
        timestampS: item.unixTime,
        priceUsd: item.priceUsd,
      }));

      res.status(200).json(response);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
