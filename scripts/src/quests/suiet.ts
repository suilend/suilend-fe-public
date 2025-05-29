import fs from "fs";

import { SuiClient } from "@mysten/sui/client";

import { NORMALIZED_sSUI_COINTYPE } from "@suilend/sui-fe";

import {
  getBorrowAddresses,
  getStakeSuiForLstAndDepositAddresses,
} from "./utils";

const minTimestampMs = 1732528800000; // 25 Nov 10AM UTC
const maxTimestampMs = 1732881600000; // 29 Nov 12PM UTC

async function main() {
  if (!fs.existsSync("csv")) fs.mkdirSync("csv");

  const id = "suiet";
  const suiClient = new SuiClient({
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  });

  const sendersWith10PlusSuiStakedForSsuiAndDeposited =
    await getStakeSuiForLstAndDepositAddresses(
      id,
      suiClient,
      10,
      NORMALIZED_sSUI_COINTYPE,
      minTimestampMs,
      maxTimestampMs,
    );
  fs.writeFileSync(
    `csv/${id}-senders-with-10-plus-sui-staked-for-ssui-and-deposited.csv`,
    `address\n${sendersWith10PlusSuiStakedForSsuiAndDeposited.join("\n")}`,
  );

  const sendersWith5PlusSuiBorrowed = await getBorrowAddresses(
    id,
    suiClient,
    5,
    minTimestampMs,
    maxTimestampMs,
  );
  fs.writeFileSync(
    `csv/${id}-senders-with-5-plus-sui-borrowed.csv`,
    `address\n${sendersWith5PlusSuiBorrowed.join("\n")}`,
  );

  const eligibleSenders = [];
  for (const sender of Array.from(
    new Set([
      ...sendersWith10PlusSuiStakedForSsuiAndDeposited,
      ...sendersWith5PlusSuiBorrowed,
    ]),
  )) {
    if (
      sendersWith10PlusSuiStakedForSsuiAndDeposited.includes(sender) &&
      sendersWith5PlusSuiBorrowed.includes(sender)
    )
      eligibleSenders.push(sender);
  }
  console.log(
    "sendersWith10PlusSuiStakedForSsuiAndDeposited.length",
    sendersWith10PlusSuiStakedForSsuiAndDeposited.length,
    "sendersWith5PlusSuiBorrowed.length",
    sendersWith5PlusSuiBorrowed.length,
    "eligibleSenders.length",
    eligibleSenders.length,
  );

  fs.writeFileSync(
    `csv/${id}-eligible-addresses.csv`,
    `address\n${eligibleSenders.join("\n")}`,
  );
}
main();
