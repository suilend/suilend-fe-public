import { extractStructTagFromType } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { fromBase64 } from "@mysten/bcs";
import {
  SuiClient,
  SuiObjectResponse,
  SuiTransactionBlockResponse,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64, normalizeStructTag } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BN from "bn.js";

import { LENDING_MARKET_ID, LENDING_MARKET_TYPE } from "@suilend/sdk";
import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { Obligation } from "@suilend/sdk/_generated/suilend/obligation/structs";
import * as simulate from "@suilend/sdk/utils/simulate";

import { COIN_TYPES } from "./constants";

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseLendingMarket(lendingMarketData: SuiObjectResponse) {
  if (lendingMarketData.data?.bcs?.dataType !== "moveObject") {
    throw new Error("Error: invalid data type");
  }
  if (lendingMarketData.data?.bcs?.type == null) {
    throw new Error("Error: lending market type not found");
  }

  const outerType = lendingMarketData.data?.bcs?.type;
  const lendingMarketType = outerType.substring(
    outerType.indexOf("<") + 1,
    outerType.indexOf(">"),
  );
  return LendingMarket.fromBcs(
    phantom(lendingMarketType),
    fromB64(lendingMarketData.data.bcs.bcsBytes),
  );
}

export async function mergeAllCoins(
  client: SuiClient,
  keypair: Ed25519Keypair,
  options?: {
    waitForCommitment?: boolean;
  },
): Promise<SuiTransactionBlockResponse | null> {
  const holdings = await getWalletHoldings(client, keypair);
  const coinTypeToHoldings: {
    [key: string]: {
      coinType: string;
      coinObjectId: string;
      balance: BN;
      decimals: number;
      name: string;
      symbol: string;
    }[];
  } = {};
  for (const holding of holdings) {
    if (!coinTypeToHoldings[holding.coinType]) {
      coinTypeToHoldings[holding.coinType] = [];
    }
    coinTypeToHoldings[holding.coinType].push(holding);
  }
  const txb = new Transaction();
  let shouldMerge = false;
  for (const coinType of Object.keys(coinTypeToHoldings)) {
    const holdings = coinTypeToHoldings[coinType];
    if (holdings.length === 1) {
      continue;
    }
    if (coinType === COIN_TYPES.SUI) {
      continue;
    }
    shouldMerge = true;
    txb.mergeCoins(
      holdings[0].coinObjectId,
      holdings.slice(1).map((x) => x.coinObjectId),
    );
  }
  if (shouldMerge) {
    const txBlock = await client.signAndExecuteTransaction({
      transaction: txb,
      signer: keypair,
    });
    if (options?.waitForCommitment) {
      const result = await client.waitForTransaction({
        digest: txBlock.digest,
        timeout: 30,
      });
      if (!result?.digest) {
        throw new Error("Unable to confirm merging coins was successful");
      }
    }
    return txBlock;
  }
  return null;
}

export async function getWalletHoldings(
  client: SuiClient,
  keypair: Ed25519Keypair,
  includeZeroBalance?: boolean,
): Promise<
  {
    coinType: string;
    coinObjectId: string;
    balance: BN;
    decimals: number;
    name: string;
    symbol: string;
  }[]
> {
  let cursor: string | null | undefined = null;
  const allCoins: any[] = [];
  while (true) {
    const allCoinsPage = await client.getAllCoins({
      owner: keypair.toSuiAddress(),
      cursor: cursor,
      limit: 100,
    });
    for (const coin of allCoinsPage.data) {
      const coinMetadata = await client.getCoinMetadata({
        coinType: coin.coinType,
      });
      if (new BN(coin.balance).gt(new BN(0)) || includeZeroBalance) {
        allCoins.push({
          coinType: coin.coinType,
          coinAddress: extractStructTagFromType(coin.coinType),
          coinObjectId: coin.coinObjectId,
          balance: new BN(coin.balance),
          decimals: coinMetadata?.decimals,
          name: coinMetadata?.name,
          symbol: coinMetadata?.symbol,
        });
      }
    }
    cursor = allCoinsPage.nextCursor;
    if (!allCoinsPage.hasNextPage) {
      return allCoins;
    }
  }
}

export async function getLendingMarket(
  client: SuiClient,
  lendingMarketId: string,
) {
  const rawLendingMarket = await client.getObject({
    id: lendingMarketId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showBcs: true,
    },
  });
  return parseLendingMarket(rawLendingMarket);
}

export function isSui(coinType: string): boolean {
  return normalizeStructTag(coinType) == normalizeStructTag(COIN_TYPES.SUI);
}

export async function fetchRefreshedObligation(
  obligationId: string,
  client: SuiClient,
  pythConnection: SuiPriceServiceConnection,
) {
  const rawObligation = await client.getObject({
    id: obligationId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showBcs: true,
    },
  });
  const obligation = Obligation.fromBcs(
    phantom(LENDING_MARKET_TYPE),
    fromBase64((rawObligation.data?.bcs as any).bcsBytes),
  );
  const refreshedReserves = await getRefreshedReserves(client, pythConnection);
  return simulate.refreshObligation(obligation, refreshedReserves);
}

export async function getRefreshedReserves(
  client: SuiClient,
  pythConnection: SuiPriceServiceConnection,
) {
  const now = getNow();
  const rawLendingMarket = await client.getObject({
    id: LENDING_MARKET_ID,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showBcs: true,
    },
  });
  const lendingMarket = parseLendingMarket(rawLendingMarket);
  const refreshedReserves = await simulate.refreshReservePrice(
    lendingMarket.reserves.map((r) => simulate.compoundReserveInterest(r, now)),
    pythConnection,
  );
  return refreshedReserves;
}

export const shuffle = <T>(array: T[]): T[] => {
  return array.sort(() => Math.random() - 0.5);
};

export function getNow() {
  return Math.round(Date.now() / 1000);
}
