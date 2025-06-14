import {
  SuiClient,
  SuiTransactionBlockResponse,
  TransactionFilter,
} from "@mysten/sui/client";

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
