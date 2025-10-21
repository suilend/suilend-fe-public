import {
  DynamicFieldInfo,
  SuiClient,
  SuiEvent,
  SuiTransactionBlockResponse,
} from "@mysten/sui/client";
import { fromBase64 } from "@mysten/sui/utils";
import pLimit from "p-limit";

import { phantom } from "../_generated/_framework/reified";
import { PACKAGE_ID } from "../_generated/suilend";
import { Obligation } from "../_generated/suilend/obligation/structs";
import { ParsedObligation } from "../parsers";

import * as parsed from "./events";

export async function fetchAllObligationsForMarketWithHandler(
  client: SuiClient,
  lendingMarketId: string,
  lendingMarketType: string,
  chunkHandler: (obligations: Obligation<string>[]) => Promise<void>,
) {
  const limit = pLimit(30);
  const rawLendingMarket = await client.getObject({
    id: lendingMarketId,
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showBcs: true,
    },
  });
  const obligationField = (rawLendingMarket.data?.content as any).fields
    .obligations;
  const obligationOwnerID = obligationField.fields.id.id;
  let hasNextPage = true;
  let cursor: string | undefined | null = null;

  const promises = [];
  while (hasNextPage) {
    const response = await client.getDynamicFields({
      parentId: obligationOwnerID,
      cursor: cursor,
    });
    hasNextPage = response.hasNextPage;
    cursor = response.nextCursor;

    promises.push(
      limit(async () => {
        const obligationObjects = await chunkedMultiGet(
          client,
          response.data.map((x) => x.objectId),
        );
        const obligations: Obligation<string>[] = [];
        for (const rawObligation of obligationObjects) {
          obligations.push(
            Obligation.fromBcs(
              phantom(lendingMarketType),
              fromBase64((rawObligation.data?.bcs as any).bcsBytes),
            ),
          );
        }
        await chunkHandler(obligations);
      }),
    );
  }
  await Promise.all(promises);
}

export async function fetchAllObligationsForMarket(
  client: SuiClient,
  lendingMarketId: string,
  lendingMarketType: string,
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
  const obligationField = (rawLendingMarket.data?.content as any).fields
    .obligations;
  const obligationOwnerID = obligationField.fields.id.id;
  let hasNextPage = true;
  let cursor: string | undefined | null = null;
  let fields: DynamicFieldInfo[] = [];
  while (hasNextPage) {
    const response = await client.getDynamicFields({
      parentId: obligationOwnerID,
      cursor: cursor,
    });
    fields = fields.concat(response.data);
    hasNextPage = response.hasNextPage;
    cursor = response.nextCursor;
  }
  const obligationObjects = await chunkedMultiGet(
    client,
    fields.map((x) => x.objectId),
  );
  const obligations: Obligation<string>[] = [];
  for (const rawObligation of obligationObjects) {
    obligations.push(
      Obligation.fromBcs(
        phantom(lendingMarketType),
        fromBase64((rawObligation.data?.bcs as any).bcsBytes),
      ),
    );
  }
  return obligations;
}

async function chunkedMultiGet(client: SuiClient, objectIds: string[]) {
  const limit = pLimit(30);
  const results = [];
  const chunks = splitIntoChunks(objectIds, 50);
  const promises = [];
  for (const chunk of chunks) {
    promises.push(
      limit(() =>
        client.multiGetObjects({
          ids: chunk,
          options: {
            showType: true,
            showContent: true,
            showOwner: true,
            showBcs: true,
          },
        }),
      ),
    );
  }
  for (const chunk of await Promise.all(promises)) {
    for (const result of chunk) {
      results.push(result);
    }
  }
  return results;
}

function splitIntoChunks(arr: string[], chunkSize: number): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    result.push(chunk);
  }
  return result;
}

export type FormattedObligationHistory =
  | NonLiquidationHistoryEvent
  | LiquidationHistoryEvent;

export type NonLiquidationHistoryEvent = {
  reserveId: string;
  quantity: number;
  action: string;
  timestampMs: number;
  digest: string;
};
export type LiquidationHistoryEvent = {
  repayReserveId: string;
  repayQuantity: number;
  withdrawReserveId: string;
  withdrawQuantity: number;
  action: "Liquidation";
  timestampMs: number;
  digest: string;
};

export async function getObligationHistoryPage(
  client: SuiClient,
  obligationId: string,
  maxQuantity: number,
  cursor: string | null,
) {
  if (maxQuantity > 50 || maxQuantity < 1) {
    throw Error("maxQuantity must be between 1 and 50");
  }

  const payload = await client.queryTransactionBlocks({
    cursor: cursor,
    limit: maxQuantity,
    order: "descending",
    filter: {
      ChangedObject: obligationId,
    },
    options: {
      showEffects: true,
      showEvents: true,
    },
  });
  let formattedEvents: FormattedObligationHistory[] = [];
  for (const data of payload.data) {
    const events = data.events?.filter((e) => e.packageId === PACKAGE_ID) || [];
    formattedEvents = formattedEvents.concat(
      formatEventsToHistory(obligationId, data, events),
    );
  }
  if (payload.hasNextPage) {
    return {
      cursor: payload.nextCursor,
      history: formattedEvents,
    };
  }
  return {
    cursor: null,
    history: formattedEvents,
  };
}

function formatEventsToHistory(
  obligationId: string,
  data: SuiTransactionBlockResponse,
  events: SuiEvent[],
) {
  const formattedEvents: FormattedObligationHistory[] = [];
  for (const [, event] of events.entries()) {
    const eventComponents = event.type.split("::");
    const eventType = eventComponents[eventComponents.length - 1];
    if (eventType === "DepositEvent") {
      const deposit = new parsed.DepositEvent(event);
      if (deposit.params().obligation_id !== obligationId) {
        continue;
      }
      // Find the corresponding mint event
      const matchingEvent = events.find((e) => {
        return (
          e.type.includes("MintEvent") &&
          new parsed.MintEvent(e).params().ctoken_amount ===
            deposit.params().ctoken_amount
        );
      });
      if (!matchingEvent) {
        // TODO: Handle case with solo Mint or solo Deposit
        continue;
      }
      const mint = new parsed.MintEvent(matchingEvent);
      formattedEvents.push({
        reserveId: deposit.params().reserve_id,
        quantity: parseInt(mint.params().liquidity_amount),
        action: "Deposit",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    } else if (eventType === "WithdrawEvent") {
      const withdraw = new parsed.WithdrawEvent(event);
      if (withdraw.params().obligation_id !== obligationId) {
        continue;
      }
      // Find the corresponding mint event
      const matchingEvent = events.find((e) => {
        return (
          e.type.includes("RedeemEvent") &&
          new parsed.RedeemEvent(e).params().ctoken_amount ===
            withdraw.params().ctoken_amount
        );
      });
      if (!matchingEvent) {
        continue;
      }
      const redeem = new parsed.RedeemEvent(matchingEvent);
      formattedEvents.push({
        reserveId: redeem.params().reserve_id,
        quantity: parseInt(redeem.params().liquidity_amount),
        action: "Withdraw",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    } else if (eventType === "BorrowEvent") {
      const borrow = new parsed.BorrowEvent(event);
      if (borrow.params().obligation_id !== obligationId) {
        continue;
      }
      formattedEvents.push({
        reserveId: borrow.params().reserve_id,
        quantity: parseInt(borrow.params().liquidity_amount),
        action: "Borrow",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    } else if (eventType === "RepayEvent") {
      const repay = new parsed.RepayEvent(event);
      if (repay.params().obligation_id !== obligationId) {
        continue;
      }
      formattedEvents.push({
        reserveId: repay.params().reserve_id,
        quantity: parseInt(repay.params().liquidity_amount),
        action: "Repay",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    } else if (eventType === "LiquidateEvent") {
      const liquidate = new parsed.LiquidateEvent(event);
      if (liquidate.params().obligation_id !== obligationId) {
        continue;
      }
      formattedEvents.push({
        repayReserveId: liquidate.params().repay_reserve_id,
        repayQuantity: parseInt(liquidate.params().repay_amount),
        withdrawReserveId: liquidate.params().withdraw_reserve_id,
        withdrawQuantity: parseInt(liquidate.params().withdraw_amount),
        action: "Liquidation",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    } else if (eventType === "ClaimRewardEvent") {
      const claimReward = new parsed.ClaimRewardEvent(event);
      if (claimReward.params().obligation_id !== obligationId) {
        continue;
      }
      formattedEvents.push({
        reserveId: claimReward.params().reserve_id,
        quantity: parseInt(claimReward.params().liquidity_amount),
        action: "Claim Reward",
        timestampMs: parseInt(data.timestampMs as string, 10),
        digest: data.digest,
      });
    }
  }
  return formattedEvents;
}

export const getWeightedBorrowsUsd = (obligation: ParsedObligation) => {
  return obligation.maxPriceWeightedBorrowsUsd.gt(
    obligation.minPriceBorrowLimitUsd,
  )
    ? BigNumber.max(
        obligation.weightedBorrowsUsd,
        obligation.minPriceBorrowLimitUsd,
      )
    : obligation.maxPriceWeightedBorrowsUsd;
};
