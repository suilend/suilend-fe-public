import fs from "fs";

import { SuiClient } from "@mysten/sui/client";
import pLimit from "p-limit";

const addresses: string[] = [];
const coinType = "";

async function main() {
  const suiClient = new SuiClient({
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  });

  try {
    const limit = pLimit(10);
    const result: [string, number][] = await Promise.all(
      addresses.map((address, i) =>
        limit(async () => {
          console.log(i, address);

          const balance = await suiClient.getBalance({
            owner: address,
            coinType,
          });

          return [address, +balance.totalBalance / 10 ** 6] as [string, number];
        }),
      ),
    );

    console.log(JSON.stringify(result));
    fs.writeFileSync(`${coinType}-balances.json`, JSON.stringify(result));
  } catch (err) {
    console.log(err);
  }
}
main();
