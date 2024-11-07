import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { program } from "commander";
import dotenv from "dotenv";
import { StatsD } from "hot-shots";

import { LENDING_MARKET_ID, LENDING_MARKET_TYPE } from "@suilend/sdk";

import { LiquidationDispatcher, LiquidationWorker } from "./liquidator";
import {
  CetusSwapper,
  MAINNET_CETUS_SDK_CONFIG,
  MAINNET_POOL_INFO_URL,
} from "./swappers/cetus";

dotenv.config();

program.version("0.0.1");
program.command("run-dispatcher").action(async () => {
  await runDispatcher();
});

program.command("run-worker").action(async () => {
  await runWorker();
});

async function runDispatcher() {
  if (!process.env.REDIS_HOST) {
    throw "REDIS_HOST environment variable not found";
  }
  const dispatcher = new LiquidationDispatcher({
    lendingMarketType: LENDING_MARKET_TYPE,
    marketAddress: LENDING_MARKET_ID,
    pollObligationIntervalSeconds: 15,
    redisPort: 6379,
    redisUrl: process.env.REDIS_HOST,
    refetchObligationsIntervalSeconds: 60 * 30,
    rpcURL: "https://fullnode.mainnet.sui.io/",
    statsd: new StatsD({ mock: true }),
  });
  await dispatcher.run();
}

async function runWorker() {
  if (!process.env.SECRET_KEY) {
    throw "SECRET_KEY environment variable not found";
  }
  if (!process.env.REDIS_HOST) {
    throw "REDIS_HOST environment variable not found";
  }
  const keypair = Ed25519Keypair.fromSecretKey(process.env.SECRET_KEY);
  const sdkConfig = MAINNET_CETUS_SDK_CONFIG;
  sdkConfig.simulationAccount.address = keypair.toSuiAddress();
  const swapper = new CetusSwapper({
    keypair: keypair as any,
    poolInfoURL: MAINNET_POOL_INFO_URL,
    sdkOptions: sdkConfig,
    rpcURL: "",
  });
  const worker = new LiquidationWorker({
    keypair: keypair,
    lendingMarketType: LENDING_MARKET_TYPE,
    liquidationAttemptDurationSeconds: 30,
    marketAddress: LENDING_MARKET_ID,
    redisPort: 6379,
    redisUrl: process.env.REDIS_HOST,
    rpcURL: "https://fullnode.mainnet.sui.io/",
    statsd: new StatsD({ mock: true }),
    suiHoldingsTarget: 5,
    swapper: swapper,
  });
  await worker.run();
}

program.parse();
