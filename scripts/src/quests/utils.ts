import fs from "fs";

import { SuiClient, SuiEvent } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { NORMALIZED_SUI_COINTYPE } from "@suilend/frontend-sui";

const getEventsOfType = async (
  suiClient: SuiClient,
  MoveEventType: string,
  minTimestampMs: number,
  maxTimestampMs: number,
) => {
  const allEvents: SuiEvent[] = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const events = await suiClient.queryEvents({
      query: {
        MoveEventType,
      },
      cursor,
      order: "descending",
    });

    const eventsInRange = events.data.filter(
      (event) =>
        event.timestampMs &&
        +event.timestampMs >= minTimestampMs &&
        +event.timestampMs < maxTimestampMs,
    );
    console.log(
      "allEvents.length",
      allEvents.length,
      "eventsInRange.length",
      eventsInRange.length,
      "lastEvent.timestampMs",
      events.data.at(-1)?.timestampMs,
    );

    allEvents.push(...eventsInRange);
    cursor = events.nextCursor;
    hasNextPage = events.hasNextPage;

    const lastEvent = events.data.at(-1);
    if (
      lastEvent &&
      lastEvent.timestampMs &&
      +lastEvent.timestampMs < minTimestampMs
    )
      break;
  }

  return allEvents;
};

export const getBorrowAddresses = async (
  id: string,
  suiClient: SuiClient,
  minAmount: number,
  minTimestampMs: number,
  maxTimestampMs: number,
) => {
  if (!fs.existsSync("json")) fs.mkdirSync("json");

  const borrowEventsJsonPath = `json/${id}-borrow-events.json`;
  if (!fs.existsSync(borrowEventsJsonPath)) {
    const events = await getEventsOfType(
      suiClient,
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::BorrowEvent",
      minTimestampMs,
      maxTimestampMs,
    );
    fs.writeFileSync(borrowEventsJsonPath, JSON.stringify(events));
  }

  const borrowEvents = JSON.parse(
    fs.readFileSync(borrowEventsJsonPath, "utf-8"),
  ) as SuiEvent[];
  console.log("getBorrowAddresses - borrowEvents.length:", borrowEvents.length);

  // Filter events
  const suiBorrowEvents = borrowEvents.filter(
    (event) =>
      normalizeStructTag((event.parsedJson as any).coin_type.name) ===
      NORMALIZED_SUI_COINTYPE,
  );
  console.log(
    "getBorrowAddresses - suiBorrowEvents.length:",
    suiBorrowEvents.length,
  );

  const distinctSenders = suiBorrowEvents.reduce(
    (acc, event) =>
      !acc.includes(event.sender) ? [...acc, event.sender] : acc,
    [] as string[],
  );
  console.log(
    "getBorrowAddresses - distinctSenders.length:",
    distinctSenders.length,
  );

  const senderSuiBorrowedAmountMap = distinctSenders.reduce(
    (acc, sender) => ({
      ...acc,
      [sender]: +suiBorrowEvents
        .filter((event) => event.sender === sender)
        .reduce(
          (acc, event) =>
            acc.plus(
              new BigNumber(
                new BigNumber((event.parsedJson as any).liquidity_amount).minus(
                  (event.parsedJson as any).origination_fee_amount,
                ),
              ).div(10 ** 9),
            ),
          new BigNumber(0),
        ),
    }),
    {} as Record<string, number>,
  );
  console.log(
    "getBorrowAddresses - senderSuiBorrowedAmountMap:",
    senderSuiBorrowedAmountMap,
  );

  const sendersWithMinAmountPlusSuiBorrowed = Object.entries(
    senderSuiBorrowedAmountMap,
  )
    .filter(([address, amount]) => amount >= minAmount)
    .map(([address]) => address);
  console.log(
    "getBorrowAddresses - minAmount:",
    minAmount,
    "sendersWithMinAmountPlusSuiBorrowed:",
    sendersWithMinAmountPlusSuiBorrowed,
  );

  return sendersWithMinAmountPlusSuiBorrowed;
};

export const getStakeSuiForLstAndDepositAddresses = async (
  id: string,
  suiClient: SuiClient,
  suiMinAmount: number,
  lstCoinType: string,
  minTimestampMs: number,
  maxTimestampMs: number,
) => {
  if (!fs.existsSync("json")) fs.mkdirSync("json");

  const mintEventsJsonPath = `json/${id}-mint-events.json`;
  if (!fs.existsSync(mintEventsJsonPath)) {
    const events = await getEventsOfType(
      suiClient,
      "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::MintEvent>",
      minTimestampMs,
      maxTimestampMs,
    );
    fs.writeFileSync(mintEventsJsonPath, JSON.stringify(events));
  }

  const depositEventsJsonPath = `json/${id}-deposit-events.json`;
  if (!fs.existsSync(depositEventsJsonPath)) {
    const events = await getEventsOfType(
      suiClient,
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::DepositEvent",
      minTimestampMs,
      maxTimestampMs,
    );
    fs.writeFileSync(depositEventsJsonPath, JSON.stringify(events));
  }

  const mintEvents = JSON.parse(
    fs.readFileSync(mintEventsJsonPath, "utf-8"),
  ) as SuiEvent[];
  const depositEvents = JSON.parse(
    fs.readFileSync(depositEventsJsonPath, "utf-8"),
  ) as SuiEvent[];
  console.log(
    "getStakeSuiForLstAndDepositAddresses - mintEvents.length:",
    mintEvents.length,
  );
  console.log(
    "getStakeSuiForLstAndDepositAddresses - depositEvents.length:",
    depositEvents.length,
  );

  // Filter events
  const lstMintEvents = mintEvents.filter(
    (event) =>
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
      lstCoinType,
  );
  console.log(
    "getStakeSuiForLstAndDepositAddresses - lstMintEvents.length:",
    lstMintEvents.length,
  );

  const depositEventTxDigests = depositEvents.map((event) => event.id.txDigest);
  const lstMintEventsWithCorrespondingDepositEvents = lstMintEvents.filter(
    (mintEvent) => depositEventTxDigests.includes(mintEvent.id.txDigest),
  );
  console.log(
    "getStakeSuiForLstAndDepositAddresses - lstMintEventsWithCorrespondingDepositEvents.length:",
    lstMintEventsWithCorrespondingDepositEvents.length,
  );

  const distinctSenders = lstMintEventsWithCorrespondingDepositEvents.reduce(
    (acc, event) =>
      !acc.includes(event.sender) ? [...acc, event.sender] : acc,
    [] as string[],
  );
  console.log(
    "getStakeSuiForLstAndDepositAddresses - distinctSenders.length:",
    distinctSenders.length,
  );

  const senderSuiStakedForLstAndDepositedMap = distinctSenders.reduce(
    (acc, sender) => ({
      ...acc,
      [sender]: +lstMintEventsWithCorrespondingDepositEvents
        .filter((event) => event.sender === sender)
        .reduce(
          (acc, event) =>
            acc.plus(
              new BigNumber((event.parsedJson as any).event.sui_amount_in).div(
                10 ** 9,
              ),
            ),
          new BigNumber(0),
        ),
    }),
    {} as Record<string, number>,
  );
  console.log(
    "getStakeSuiForLstAndDepositAddresses - senderSuiStakedForLstAndDepositedMap:",
    senderSuiStakedForLstAndDepositedMap,
  );

  const sendersWithMinAmountPlusSuiStakedForLstAndDeposited = Object.entries(
    senderSuiStakedForLstAndDepositedMap,
  )
    .filter(([address, amount]) => amount >= suiMinAmount)
    .map(([address]) => address);
  console.log(
    "getStakeSuiForLstAndDepositAddresses - suiMinAmount:",
    suiMinAmount,
    "lstCoinType:",
    lstCoinType,
    "sendersWithMinAmountPlusSuiStakedForLstAndDeposited:",
    sendersWithMinAmountPlusSuiStakedForLstAndDeposited,
  );

  return sendersWithMinAmountPlusSuiStakedForLstAndDeposited;
};

export const getMintAndDepositLstAddresses = async (
  id: string,
  suiClient: SuiClient,
  lstCoinType: string,
  lstMinAmount: number,
  minTimestampMs: number,
  maxTimestampMs: number,
) => {
  if (!fs.existsSync("json")) fs.mkdirSync("json");

  const mintEventsJsonPath = `json/${id}-mint-events.json`;
  if (!fs.existsSync(mintEventsJsonPath)) {
    const events = await getEventsOfType(
      suiClient,
      "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::MintEvent>",
      minTimestampMs,
      maxTimestampMs,
    );
    fs.writeFileSync(mintEventsJsonPath, JSON.stringify(events));
  }

  const depositEventsJsonPath = `json/${id}-deposit-events.json`;
  if (!fs.existsSync(depositEventsJsonPath)) {
    const events = await getEventsOfType(
      suiClient,
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::DepositEvent",
      minTimestampMs,
      maxTimestampMs,
    );
    fs.writeFileSync(depositEventsJsonPath, JSON.stringify(events));
  }

  const mintEvents = JSON.parse(
    fs.readFileSync(mintEventsJsonPath, "utf-8"),
  ) as SuiEvent[];
  const depositEvents = JSON.parse(
    fs.readFileSync(depositEventsJsonPath, "utf-8"),
  ) as SuiEvent[];
  console.log(
    "getMintAndDepositLstAddresses - mintEvents.length:",
    mintEvents.length,
  );
  console.log(
    "getMintAndDepositLstAddresses - depositEvents.length:",
    depositEvents.length,
  );

  // Filter events
  const lstMintEvents = mintEvents.filter(
    (event) =>
      normalizeStructTag((event.parsedJson as any).event.typename.name) ===
      lstCoinType,
  );
  console.log(
    "getMintAndDepositLstAddresses - lstMintEvents.length:",
    lstMintEvents.length,
  );

  const depositEventTxDigests = depositEvents.map((event) => event.id.txDigest);
  const lstMintEventsWithCorrespondingDepositEvents = lstMintEvents.filter(
    (mintEvent) => depositEventTxDigests.includes(mintEvent.id.txDigest),
  );
  console.log(
    "getMintAndDepositLstAddresses - lstMintEventsWithCorrespondingDepositEvents.length:",
    lstMintEventsWithCorrespondingDepositEvents.length,
  );

  const distinctSenders = lstMintEventsWithCorrespondingDepositEvents.reduce(
    (acc, event) =>
      !acc.includes(event.sender) ? [...acc, event.sender] : acc,
    [] as string[],
  );
  console.log(
    "getMintAndDepositLstAddresses - distinctSenders.length:",
    distinctSenders.length,
  );

  const senderLstMintedAndDepositedMap = distinctSenders.reduce(
    (acc, sender) => ({
      ...acc,
      [sender]: +lstMintEventsWithCorrespondingDepositEvents
        .filter((event) => event.sender === sender)
        .reduce(
          (acc, event) =>
            acc.plus(
              new BigNumber((event.parsedJson as any).event.lst_amount_out).div(
                10 ** 9,
              ),
            ),
          new BigNumber(0),
        ),
    }),
    {} as Record<string, number>,
  );
  console.log(
    "getMintAndDepositLstAddresses - senderLstMintedAndDepositedMap:",
    senderLstMintedAndDepositedMap,
  );

  const sendersWithMinAmountPlusLstMintedAndDeposited = Object.entries(
    senderLstMintedAndDepositedMap,
  )
    .filter(([address, amount]) => amount >= lstMinAmount)
    .map(([address]) => address);
  console.log(
    "getMintAndDepositLstAddresses - lstCoinType:",
    lstCoinType,
    "lstMinAmount:",
    lstMinAmount,
    "sendersWithMinAmountPlusLstMintedAndDeposited:",
    sendersWithMinAmountPlusLstMintedAndDeposited,
  );

  return sendersWithMinAmountPlusLstMintedAndDeposited;
};
