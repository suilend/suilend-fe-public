import fs from "fs";

import { SuiClient, SuiEvent } from "@mysten/sui/client";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { NORMALIZED_SUI_COINTYPE } from "@suilend/frontend-sui";

const minTimestampMs = 1732528800000; // 25 Nov 10AM UTC
const maxTimestampMs = 1732881600000; // 29 Nov 12PM UTC

const getEventsOfType = async (suiClient: SuiClient, MoveEventType: string) => {
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
    );

    allEvents.push(...eventsInRange);
    cursor = events.nextCursor;
    hasNextPage = events.hasNextPage;

    const lastEvent = events.data[events.data.length - 1];
    if (lastEvent.timestampMs && +lastEvent.timestampMs < minTimestampMs) break;
  }

  return allEvents;
};

const getBorrowAddresses = async (suiClient: SuiClient) => {
  const borrowEventsFilename = "borrow-events.json";
  if (!fs.existsSync(borrowEventsFilename)) {
    const events = await getEventsOfType(
      suiClient,
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::BorrowEvent",
    );
    fs.writeFileSync(borrowEventsFilename, JSON.stringify(events));
  }

  const borrowEvents = JSON.parse(
    fs.readFileSync(borrowEventsFilename, "utf-8"),
  ) as SuiEvent[];
  console.log("borrowEvents.length", borrowEvents.length);

  // Filter events
  const suiBorrowEvents = borrowEvents.filter(
    (event) =>
      normalizeStructTag((event.parsedJson as any).coin_type.name) ===
      NORMALIZED_SUI_COINTYPE,
  );
  console.log("suiBorrowEvents.length", suiBorrowEvents.length);

  const distinctSenders = suiBorrowEvents.reduce(
    (acc, event) =>
      !acc.includes(event.sender) ? [...acc, event.sender] : acc,
    [] as string[],
  );
  console.log("distinctSenders.length", distinctSenders.length);

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
  console.log("senderSuiBorrowedAmountMap", senderSuiBorrowedAmountMap);

  const sendersWith5PlusSuiBorrowed = Object.entries(senderSuiBorrowedAmountMap)
    .filter(([address, amount]) => amount >= 5)
    .map(([address]) => address);
  console.log("sendersWith5PlusSuiBorrowed", sendersWith5PlusSuiBorrowed);

  fs.writeFileSync(
    "senders-with-5-plus-sui-borrowed.json",
    JSON.stringify(sendersWith5PlusSuiBorrowed),
  );
};

const getStakeAndDepositSsuiAddresses = async (suiClient: SuiClient) => {
  const mintEventsFilename = "mint-events.json";
  if (!fs.existsSync(mintEventsFilename)) {
    const events = await getEventsOfType(
      suiClient,
      "0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::MintEvent>",
    );
    fs.writeFileSync(mintEventsFilename, JSON.stringify(events));
  }

  const depositEventsFilename = "deposit-events.json";
  if (!fs.existsSync(depositEventsFilename)) {
    const events = await getEventsOfType(
      suiClient,
      "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::DepositEvent",
    );
    fs.writeFileSync(depositEventsFilename, JSON.stringify(events));
  }

  const mintEvents = JSON.parse(
    fs.readFileSync(mintEventsFilename, "utf-8"),
  ) as SuiEvent[];
  const depositEvents = JSON.parse(
    fs.readFileSync(depositEventsFilename, "utf-8"),
  ) as SuiEvent[];
  console.log("mintEvents.length", mintEvents.length);
  console.log("depositEvents.length", depositEvents.length);
};

async function main() {
  const suiClient = new SuiClient({
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  });

  // await getBorrowAddresses(suiClient);
  await getStakeAndDepositSsuiAddresses(suiClient);
}
main();
