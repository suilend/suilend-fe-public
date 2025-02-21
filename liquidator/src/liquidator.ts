import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { SuiPriceServiceConnection } from "@pythnetwork/pyth-sui-js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { StatsD } from "hot-shots";
import { Logger } from "tslog";

import { SuilendClient } from "@suilend/sdk";
import {
  Borrow,
  Obligation,
} from "@suilend/sdk/_generated/suilend/obligation/structs";
import { Reserve } from "@suilend/sdk/_generated/suilend/reserve/structs";
import { getRedeemEvent } from "@suilend/sdk/utils/events";
import { fetchAllObligationsForMarket } from "@suilend/sdk/utils/obligation";
import * as simulate from "@suilend/sdk/utils/simulate";

import { Swapper } from "./swappers/interface";
import { COIN_TYPES } from "./utils/constants";
import { RedisClient } from "./utils/redis";
import {
  fetchRefreshedObligation,
  getLendingMarket,
  getNow,
  getRefreshedReserves,
  getWalletHoldings,
  mergeAllCoins,
  shuffle,
  sleep,
} from "./utils/utils";

const logger = new Logger({ name: "Suilend Liquidator" });
const LIQUIDATION_CLOSE_FACTOR = 0.2;

export type LiquidationDispatcherConfig = {
  lendingMarketId: string;
  lendingMarketType: string;
  pollObligationIntervalSeconds: number;
  redisPort: number;
  redisUrl: string;
  refetchObligationsIntervalSeconds: number;
  rpcURL: string;
  statsd: StatsD;
};

export type LiquidationWorkerConfig = {
  keypair: Ed25519Keypair;
  lendingMarketId: string;
  lendingMarketType: string;
  liquidationAttemptDurationSeconds: number;
  redisPort: number;
  redisUrl: string;
  rpcURL: string;
  statsd: StatsD;
  suiHoldingsTarget: number;
  swapper: Swapper;
};

export class LiquidationDispatcher {
  config: LiquidationDispatcherConfig;
  lastObligationRefresh: number | null; // seconds
  obligations: Obligation<string>[];
  pythConnection: SuiPriceServiceConnection;
  redis: RedisClient;
  statsd: StatsD;
  suiClient: SuiClient;

  constructor(config: LiquidationDispatcherConfig) {
    this.config = config;
    this.redis = new RedisClient(this.config.redisUrl, this.config.redisPort);
    this.obligations = [];
    this.suiClient = new SuiClient({ url: this.config.rpcURL });
    this.lastObligationRefresh = null;
    this.pythConnection = new SuiPriceServiceConnection(
      "https://hermes.pyth.network",
    );
    this.statsd = this.config.statsd;
  }

  async run() {
    while (true) {
      try {
        await this.updatePositions();
      } catch (e: any) {
        logger.error(e);
      } finally {
        await sleep(this.config.pollObligationIntervalSeconds * 1000);
      }
    }
  }

  async updatePositions() {
    this.statsd.increment("heartbeat", { task: "update_positions" });
    const now = getNow();
    if (
      !this.lastObligationRefresh ||
      now - this.lastObligationRefresh! >
        this.config.refetchObligationsIntervalSeconds
    ) {
      await this.refreshObligationCache();
    }
    const refreshedReserves = await getRefreshedReserves(
      this.suiClient,
      this.pythConnection,
    );
    const obligationsToLiquidate = [];
    for (const obligation of this.obligations) {
      const refreshedObligation = simulate.refreshObligation(
        obligation,
        refreshedReserves,
      );
      if (shouldAttemptLiquidations(refreshedObligation)) {
        if (this.statsd) this.statsd.increment("enqueue_liquidation", 1);
        logger.info(`Enqueueing ${obligation.id} for liquidation`);
        obligationsToLiquidate.push(obligation.id);
      }
    }
    logger.info("Enqueuing", obligationsToLiquidate.length, "obligations");
    await this.redis.setObligationIds(obligationsToLiquidate);
  }

  async refreshObligationCache() {
    const start = getNow();
    this.obligations = (
      await fetchAllObligationsForMarket(
        this.suiClient,
        this.config.lendingMarketId,
        this.config.lendingMarketType,
      )
    ).filter((obligation) => {
      return obligation.borrows.length > 0;
    });
    shuffle(this.obligations);
    this.statsd.gauge("fetch_obligations_duration", getNow() - start);
    this.statsd.gauge("obligation_count", this.obligations.length);
    logger.info(`Fetched ${this.obligations.length} obligations`);
    this.lastObligationRefresh = getNow();
  }
}

export class LiquidationWorker {
  config: LiquidationWorkerConfig;
  redis: RedisClient;
  statsd: StatsD;
  swapper: Swapper;
  suiClient: SuiClient;
  pythConnection: SuiPriceServiceConnection;
  suilend?: SuilendClient;

  constructor(config: LiquidationWorkerConfig) {
    this.config = config;
    this.redis = new RedisClient(this.config.redisUrl, this.config.redisPort);
    this.statsd = this.config.statsd;
    this.suiClient = new SuiClient({ url: this.config.rpcURL });
    this.swapper = config.swapper;
    this.pythConnection = new SuiPriceServiceConnection(
      "https://hermes.pyth.network",
    );
  }

  async run() {
    this.suilend = await SuilendClient.initialize(
      this.config.lendingMarketId,
      this.config.lendingMarketType,
      this.suiClient,
    );
    while (true) {
      const obligations = await this.redis.getObligationIds();
      shuffle(obligations);
      this.statsd.increment("heartbeat", { task: "liquidation_worker" });
      if (obligations.length === 0) {
        logger.info("No obligations to liquidate. Sleeping");
        await this.rebalanceWallet();
        await sleep(30 * 1000);
        continue;
      }
      for (const obligationId of obligations) {
        this.statsd.increment("heartbeat", { task: "liquidation_worker" });
        try {
          const refreshedObligation = await fetchRefreshedObligation(
            obligationId,
            this.suiClient,
            this.pythConnection,
          );
          if (shouldAttemptLiquidations(refreshedObligation)) {
            logger.info("Attempting to liquidate", obligationId);
            await this.tryLiquidatePosition(refreshedObligation);
          } else {
            logger.info("Ignoring liquidation task", obligationId);
          }
        } catch (e: any) {
          logger.error("Failed to liqudiate obligation. Moving on...");
          logger.error(e);
        }
      }
    }
  }

  async tryLiquidatePosition(obligation: Obligation<string>) {
    logger.info(`Beginning liquidation of ${obligation.id}`);
    let liquidationDigest;
    const startTime = getNow();
    const withdrawCoinType = this.selectWithdrawAsset(obligation);
    let attemptCount = 0;
    while (true) {
      attemptCount += 1;
      try {
        const lendingMarket = await this.getLendingMarket();
        const { repayCoinType, repayAmount } = this.selectRepayAssetAndAmount(
          obligation,
          lendingMarket.reserves,
        );

        let txb = new Transaction();
        let repayCoin;
        if (repayCoinType === COIN_TYPES.USDC) {
          // TODO: Would better to merge here.
          logger.info("Repay is USDC. No need to swap.");
          const holding = (
            await getWalletHoldings(this.suiClient, this.config.keypair)
          ).find((h) => h.coinType === COIN_TYPES.USDC);
          repayCoin = holding?.coinObjectId;
        } else {
          logger.info(`Buying ${repayAmount} ${repayCoinType} for liquidation`);
          const swapResult = await this.swapper.swap({
            fromCoinType: COIN_TYPES.USDC,
            toCoinType: repayCoinType,
            toAmount: repayAmount,
            maxSlippage: 0.05,
            txb: txb,
          });
          txb = swapResult!.txb;
          txb.transferObjects(
            [swapResult!.fromCoin],
            this.config.keypair.toSuiAddress(),
          );
          repayCoin = swapResult?.toCoin;
        }
        if (!repayCoin) {
          if (this.statsd)
            this.statsd.increment("liquidate_error", {
              type: "no_repay_found",
            });
          logger.error("No repay coin found");
          return;
        }
        const [withdrawAsset] = await this.suilend!.liquidateAndRedeem(
          txb,
          obligation,
          repayCoinType,
          withdrawCoinType,
          repayCoin,
        );
        txb.transferObjects(
          [withdrawAsset, repayCoin],
          this.config.keypair.toSuiAddress(),
        );
        const liquidateResult = await this.suiClient.signAndExecuteTransaction({
          transaction: txb,
          signer: this.config.keypair,
        });
        await this.suiClient.waitForTransaction({
          digest: liquidateResult.digest,
          timeout: 30,
          pollInterval: 1,
        });
        liquidationDigest = liquidateResult.digest;
        logger.info("Liquidated", obligation.id, liquidateResult.digest);
        if (this.statsd)
          this.statsd.increment("liquidate_success", 1, {
            repayAsset: repayCoinType,
            withdrawAsset: withdrawCoinType,
          });
        break;
      } catch (e: any) {
        logger.error(`Error liquidating ${obligation.id} ${e}`);
        if (this.statsd)
          this.statsd.increment("liquidate_error", 1, {
            type: "error_liquidating",
          });
        if (
          getNow() - startTime >
          this.config.liquidationAttemptDurationSeconds
        ) {
          logger.info(`Unable to liquidate ${obligation.id}. Giving up.`);
          if (this.statsd) this.statsd.increment("liquidate_giveup", 1);
          break;
        }
      }
    }
    if (liquidationDigest) {
      logger.info("Dumping withdrawn assets.");
      const redeemEvent = await getRedeemEvent(
        this.suiClient,
        liquidationDigest,
      );
      if (!redeemEvent) {
        logger.error(
          `Could not find redeem event in liquidation ${liquidationDigest}`,
        );
        if (this.statsd)
          this.statsd.increment("liquidate_error", 1, { type: "no_redeem" });
        return;
      }
      await this.swapAndConfirm({
        fromCoinType: withdrawCoinType,
        toCoinType: COIN_TYPES.USDC,
        fromAmount: parseInt(redeemEvent.params().liquidity_amount),
      });
      logger.info(`Successfully dumped withdrawn assets`);
    }
  }

  async rebalanceWallet() {
    try {
      const SUI_HOLDINGS_TARGET = this.config.suiHoldingsTarget * 1000000000;
      await mergeAllCoins(this.suiClient, this.config.keypair, {
        waitForCommitment: true,
      });
      const holdings = await getWalletHoldings(
        this.suiClient,
        this.config.keypair,
      );
      for (const holding of holdings) {
        if (this.statsd && holding.symbol)
          this.statsd.gauge(
            "wallet_balance",
            holding.balance.div(new BN(10 ** holding.decimals)).toNumber(),
            {
              symbol: holding.symbol,
            },
          );
        if (
          holding.coinType === COIN_TYPES.SUI ||
          holding.coinType === COIN_TYPES.USDC
        ) {
          continue;
        }
        // TODO: Only balance the assets that are listed in the market
        // If we have a ctoken, then we should probably try to redeem it.
        if (holding.coinType.includes("CToken")) {
          continue;
        }
        try {
          logger.info(`Swapping ${holding.coinType} for USDC`);
          await this.swapAndConfirm({
            fromCoinType: holding.coinType,
            toCoinType: COIN_TYPES.USDC,
            fromAmount: holding.balance.toNumber(),
          });
        } catch (e: any) {
          logger.error(`Failed to dump ${holding.coinType}. Moving on...`);
        }
      }
      const updatedHoldings = await getWalletHoldings(
        this.suiClient,
        this.config.keypair,
      );
      const suiHoldings = updatedHoldings.find(
        (x) => x.coinType === COIN_TYPES.SUI,
      );
      if (suiHoldings!.balance.toNumber() > SUI_HOLDINGS_TARGET * 1.1) {
        logger.info(`Holding too much SUI. Selling to rebalance.`);
        await this.swapAndConfirm({
          fromCoinType: COIN_TYPES.SUI,
          toCoinType: COIN_TYPES.USDC,
          fromAmount: suiHoldings?.balance
            .sub(new BN(SUI_HOLDINGS_TARGET))
            .toNumber(),
        });
      } else if (suiHoldings!.balance.toNumber() < SUI_HOLDINGS_TARGET * 0.9) {
        // TODO: Handle the case where we don't have enough USDC for this
        logger.info(`Holding not enough SUI. Buying to rebalance.`);
        await this.swapAndConfirm({
          fromCoinType: COIN_TYPES.USDC,
          toCoinType: COIN_TYPES.SUI,
          toAmount: new BN(SUI_HOLDINGS_TARGET)
            .sub(suiHoldings!.balance)
            .toNumber(),
        });
      }
    } catch (e: any) {
      logger.error("Error rebalancing");
      logger.error(e);
    }
  }

  selectRepay(
    obligation: Obligation<string>,
    reserves: Reserve<string>[],
  ): Borrow {
    const coinTypeToBorrowWeight: { [key: string]: number } = {};
    for (const reserve of reserves) {
      const borrowWeight = new BigNumber(
        (reserve.config.element!.borrowWeightBps / BigInt(10000)).toString(),
      );
      coinTypeToBorrowWeight[reserve.coinType.name] = borrowWeight.toNumber();
    }
    const borrowedCoinTypes = obligation.borrows.sort((x, y) =>
      simulate
        .decimalToBigNumber(y.marketValue)
        .multipliedBy(coinTypeToBorrowWeight[y.coinType.name])
        .minus(
          simulate
            .decimalToBigNumber(x.marketValue)
            .multipliedBy(coinTypeToBorrowWeight[x.coinType.name]),
        )
        .toNumber(),
    );
    return borrowedCoinTypes[0];
  }

  selectRepayAssetAndAmount(
    obligation: Obligation<string>,
    reserves: Reserve<string>[],
  ) {
    const repay = this.selectRepay(obligation, reserves);
    if (simulate.decimalToBigNumber(repay.marketValue).lte(new BigNumber(1))) {
      return {
        repayCoinType: "0x" + repay.coinType.name,
        repayAmount: Math.ceil(
          simulate.decimalToBigNumber(repay.borrowedAmount).toNumber(),
        ),
      };
    }

    // Can close 20% of the value of their obligation
    // But only up to all of this borrowed position
    const maxRepayValue = BigNumber.minimum(
      simulate
        .decimalToBigNumber(obligation.weightedBorrowedValueUsd)
        .multipliedBy(new BigNumber(LIQUIDATION_CLOSE_FACTOR)),
      simulate.decimalToBigNumber(repay.marketValue),
    );
    const maxRepayPercent = maxRepayValue.dividedBy(
      simulate.decimalToBigNumber(repay.marketValue),
    );
    const repayAmount = maxRepayPercent.multipliedBy(
      simulate.decimalToBigNumber(repay.borrowedAmount),
    );
    return {
      repayCoinType: "0x" + repay.coinType.name,
      repayAmount: Math.ceil(repayAmount.toNumber()),
    };
  }

  selectWithdrawAsset(obligation: Obligation<string>) {
    const depositedCoinTypes = obligation.deposits.sort((x, y) =>
      simulate
        .decimalToBigNumber(y.marketValue)
        .minus(simulate.decimalToBigNumber(x.marketValue))
        .toNumber(),
    );
    return "0x" + depositedCoinTypes[0].coinType.name;
  }

  async getLendingMarket() {
    return await getLendingMarket(this.suiClient, this.config.lendingMarketId);
  }

  async swapAndConfirm(params: {
    fromCoinType: string;
    toCoinType: string;
    fromAmount?: number;
    toAmount?: number;
  }) {
    const txb = new Transaction();
    const result = await this.swapper.swap({
      fromCoinType: params.fromCoinType,
      toCoinType: params.toCoinType,
      fromAmount: params.fromAmount,
      toAmount: params.toAmount,
      maxSlippage: 0.1,
      txb: txb,
    });
    if (!result) {
      return;
    }
    result.txb.transferObjects(
      [result?.fromCoin, result?.toCoin],
      this.config.keypair.toSuiAddress(),
    );
    const txResult = await this.suiClient.signAndExecuteTransaction({
      transaction: result.txb,
      signer: this.config.keypair,
    });
    return await this.suiClient.waitForTransaction({
      digest: txResult.digest,
      timeout: 60,
      pollInterval: 1,
    });
  }
}

function shouldAttemptLiquidations(obligation: Obligation<string>): boolean {
  if (obligation.deposits.length === 0 && obligation.borrows.length > 0) {
    return false;
  }
  const borrow = new BigNumber(
    obligation.weightedBorrowedValueUsd.value.toString(),
  );
  const threshold = new BigNumber(
    obligation.unhealthyBorrowValueUsd.value.toString(),
  );
  return borrow.gt(threshold);
}
