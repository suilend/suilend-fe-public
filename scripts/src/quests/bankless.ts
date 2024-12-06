import fs from "fs";

import { SuiClient } from "@mysten/sui/client";

import { NORMALIZED_sSUI_COINTYPE } from "@suilend/frontend-sui";

import { getBorrowAddresses, getMintAndDepositLstAddresses } from "./utils";

const minTimestampMs = 1731898800000; // 18 Nov 11AM GMT+8
const maxTimestampMs = 1733436000000; // 5 Dec 5PM EST

async function main() {
  if (!fs.existsSync("csv")) fs.mkdirSync("csv");

  const id = "bankless";
  const suiClient = new SuiClient({
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  });

  const sendersWith10PlusSsuiMintedAndDeposited =
    await getMintAndDepositLstAddresses(
      id,
      suiClient,
      NORMALIZED_sSUI_COINTYPE,
      10,
      minTimestampMs,
      maxTimestampMs,
    );
  fs.writeFileSync(
    `csv/${id}-senders-with-10-plus-ssui-minted-and-deposited.csv`,
    `address\n${sendersWith10PlusSsuiMintedAndDeposited.join("\n")}`,
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
      ...sendersWith10PlusSsuiMintedAndDeposited,
      ...sendersWith5PlusSuiBorrowed,
    ]),
  )) {
    if (
      sendersWith10PlusSsuiMintedAndDeposited.includes(sender) &&
      sendersWith5PlusSuiBorrowed.includes(sender)
    )
      eligibleSenders.push(sender);
  }
  console.log(
    "sendersWith10PlusSsuiMintedAndDeposited.length",
    sendersWith10PlusSsuiMintedAndDeposited.length,
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
