import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";

import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import { Side } from "@suilend/sdk/types";

const keypair = Ed25519Keypair.fromSecretKey(
  fromBase64(process.env.SUI_SECRET_KEY!),
);

async function createLendingMarket() {
  const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

  const transaction = new Transaction();
  const ownerCap = await SuilendClient.createNewLendingMarket(
    "0xddb6304a726ff1da7d8b5240c35a5f4d1c43f289258d440ba42044a4ed6c7dc6",
    "0x2::sui::SUI",
    transaction,
  );
  transaction.transferObjects([ownerCap], keypair.toSuiAddress());
  console.log(
    await client.signAndExecuteTransaction({
      transaction,
      signer: keypair,
    }),
  );
}

async function claimRewards() {
  const client = new SuiClient({ url: "https://fullnode.mainnet.sui.io:443" });

  const transaction = new Transaction();
  const suilendClient = await SuilendClient.initialize(
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    client,
  );

  const [coin] = suilendClient.claimReward(
    "0x389c366935d4b98cf3cebd21236565bf3e41b10eddcab2e0ebcb3e1b32cba5ea",
    BigInt(0),
    BigInt(1),
    "0x34fe4f3c9e450fed4d0a3c587ed842eec5313c30c3cc3c0841247c49425e246b::suilend_point::SUILEND_POINT",
    Side.DEPOSIT,
    transaction,
  );
  transaction.transferObjects([coin], keypair.toSuiAddress());

  console.log(
    await client.signAndExecuteTransaction({
      transaction,
      signer: keypair,
    }),
  );
}

// createLendingMarket();
claimRewards();
