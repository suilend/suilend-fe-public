import {
  SuiClient,
  SuiTransactionBlockResponse,
  TransactionFilter,
} from "@mysten/sui/client";

export const getOwnedObjectsOfType = async (
  suiClient: SuiClient,
  address: string,
  type: string,
) => {
  const allObjs = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const objs = await suiClient.getOwnedObjects({
      owner: address,
      cursor,
      filter: {
        StructType: type,
      },
      options: { showContent: true },
    });

    allObjs.push(...objs.data);
    cursor = objs.nextCursor;
    hasNextPage = objs.hasNextPage;
  }

  return allObjs;
};

export const getAllCoins = async (
  suiClient: SuiClient,
  address: string,
  coinType: string,
) => {
  const allCoins = [];
  let cursor = undefined;
  let hasNextPage = true;
  while (hasNextPage) {
    const coins = await suiClient.getCoins({
      owner: address,
      coinType,
      cursor,
    });

    allCoins.push(...coins.data);
    cursor = coins.nextCursor ?? undefined;
    hasNextPage = coins.hasNextPage;
  }

  return allCoins;
};

export const queryTransactionBlocksAfter = async (
  suiClient: SuiClient,
  filter: TransactionFilter,
  minTimestampMs: number,
) => {
  const allTransactionBlocks: SuiTransactionBlockResponse[] = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const transactionBlocks = await suiClient.queryTransactionBlocks({
      cursor,
      order: "descending",
      filter,
      options: {
        showBalanceChanges: true,
        showEvents: true,
      },
    });

    const transactionBlocksInRange = transactionBlocks.data.filter(
      (transactionBlock) =>
        transactionBlock.timestampMs &&
        +transactionBlock.timestampMs >= minTimestampMs,
    );

    allTransactionBlocks.push(...transactionBlocksInRange);
    cursor = transactionBlocks.nextCursor;
    hasNextPage = transactionBlocks.hasNextPage;

    const lastTransactionBlock = transactionBlocks.data.at(-1);
    if (
      lastTransactionBlock &&
      lastTransactionBlock.timestampMs &&
      +lastTransactionBlock.timestampMs < minTimestampMs
    )
      break;
  }

  return allTransactionBlocks;
};
