import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";

import { phantom } from "@suilend/sdk/_generated/_framework/reified";
import { LendingMarket } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import { Obligation } from "@suilend/sdk/_generated/suilend/obligation/structs";
import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import {
  LENDING_MARKET_ID,
  LENDING_MARKET_TYPE,
  SuilendClient,
} from "@suilend/sdk/client";
import { Side } from "@suilend/sdk/types";
import { fetchAllObligationsForMarket } from "@suilend/sdk/utils/obligation";
import * as simulate from "@suilend/sdk/utils/simulate";

const REWARD_TYPE = "0x2::sui::SUI";
const DEPOSIT_RESERVE_INDEX = 0;
const IS_DEPOSIT_REWARD = true;

const BATCH_SIZE = 50;

const keypair = Ed25519Keypair.fromSecretKey(
  fromBase64(process.env.SUI_SECRET_KEY!),
);

async function crankRewards(
  client: SuiClient,
  obligations: Obligation<string>[],
  rewardReserveIndex: number,
  rewardIndex: number,
) {
  const suilendClient = await SuilendClient.initialize(
    LENDING_MARKET_ID,
    LENDING_MARKET_TYPE,
    client,
  );
  const connection = new SuiPriceServiceConnection(
    "https://hermes.pyth.network",
  );

  const lendingMarket = await LendingMarket.fetch(
    client,
    phantom(LENDING_MARKET_TYPE),
    LENDING_MARKET_ID,
  );

  const now = Math.floor(Date.now() / 1000);
  let refreshedReserves = lendingMarket.reserves as Reserve<string>[];
  refreshedReserves = await simulate.refreshReservePrice(
    lendingMarket.reserves.map((r) => simulate.compoundReserveInterest(r, now)),
    connection,
  );

  const poolManager = IS_DEPOSIT_REWARD
    ? refreshedReserves[rewardReserveIndex].depositsPoolRewardManager
    : refreshedReserves[rewardReserveIndex].borrowsPoolRewardManager;

  if (!poolManager) {
    throw new Error("Pool manager not found");
  }

  const poolReward = poolManager?.poolRewards[rewardIndex];
  const endTimeMs = poolReward?.endTimeMs;

  // console.log("Pool reward: ", poolReward);
  if (!endTimeMs || Date.now() < endTimeMs) {
    console.log("Pool reward not ready");
    return;
  }

  const refreshedObligations = obligations
    .map((o) => {
      return simulate.refreshObligation(o, refreshedReserves);
    })
    .filter((obligation) => {
      const userRewardManager = obligation.userRewardManagers.find(
        (u) => u.poolRewardManagerId == poolManager?.id,
      );

      if (!userRewardManager) {
        return false;
      }

      const userReward = userRewardManager.rewards[rewardIndex];
      return userReward != null;
    });

  console.log("Crankable obligations length: ", refreshedObligations.length);

  // console.log(poolManager.id);
  console.log(poolManager);

  let i = 0;
  while (i < refreshedObligations.length) {
    const transaction = new Transaction();
    for (let j = 0; j < BATCH_SIZE && i < refreshedObligations.length; j++) {
      const obligation = refreshedObligations[i];

      suilendClient.claimRewardAndDeposit(
        obligation.id,
        BigInt(rewardReserveIndex),
        BigInt(rewardIndex),
        REWARD_TYPE,
        IS_DEPOSIT_REWARD ? Side.DEPOSIT : Side.BORROW,
        BigInt(DEPOSIT_RESERVE_INDEX),
        transaction,
      );

      i++;
    }

    const res = await client.signAndExecuteTransaction({
      transaction,
      signer: keypair,
    });
    console.log(res);

    // sleep for 50ms
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function main() {
  const client = new SuiClient({
    url: `https://solendf-suishar-0c55.mainnet.sui.rpcpool.com/${
      process.env.NEXT_PUBLIC_SUI_TRITON_ONE_DEV_API_KEY ?? ""
    }`,
  });

  const obligations = await fetchAllObligationsForMarket(
    client,
    LENDING_MARKET_ID,
  );
  console.log("Fetched obligations");

  for (let rewardIndex = 0; rewardIndex < 5; rewardIndex++) {
    for (
      let rewardReserveIndex = 0;
      rewardReserveIndex < 3;
      rewardReserveIndex++
    ) {
      try {
        console.log(
          `Cranking rewards for reserve ${rewardReserveIndex} and reward ${rewardIndex}`,
        );
        await crankRewards(
          client,
          obligations,
          rewardReserveIndex,
          rewardIndex,
        );
      } catch (e) {
        console.error(e);
      }
    }
  }
}

main();
