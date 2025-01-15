import { CoinStruct, SuiClient } from "@mysten/sui/client";
import {
  Transaction,
  TransactionObjectInput,
  TransactionResult,
} from "@mysten/sui/transactions";
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_SYSTEM_STATE_OBJECT_ID,
  fromBase64,
  normalizeStructTag,
  toHex,
} from "@mysten/sui/utils";
import {
  SuiPriceServiceConnection,
  SuiPythClient,
} from "@pythnetwork/pyth-sui-js";

import { PriceInfoObject } from "./_generated/_dependencies/source/0x8d97f1cd6ac663735be08d1d2b6d02a159e711586461306ce60a2b7a6a565a9e/price-info/structs";
import { phantom } from "./_generated/_framework/reified";
import { PKG_V10, setPublishedAt } from "./_generated/suilend";
import { PACKAGE_ID, PUBLISHED_AT } from "./_generated/suilend";
import {
  addPoolReward,
  addReserve,
  borrowRequest,
  cancelPoolReward,
  changeReservePriceFeed,
  claimFees,
  claimRewards,
  claimRewardsAndDeposit,
  closePoolReward,
  depositCtokensIntoObligation,
  depositLiquidityAndMintCtokens,
  fulfillLiquidityRequest,
  liquidate,
  migrate,
  newObligationOwnerCap,
  redeemCtokensAndWithdrawLiquidity,
  redeemCtokensAndWithdrawLiquidityRequest,
  refreshReservePrice,
  repay,
  setFeeReceivers,
  unstakeSuiFromStaker,
  updateRateLimiterConfig,
  updateReserveConfig,
  withdrawCtokens,
} from "./_generated/suilend/lending-market/functions";
import {
  FeeReceivers,
  LendingMarket,
  ObligationOwnerCap,
} from "./_generated/suilend/lending-market/structs";
import { createLendingMarket } from "./_generated/suilend/lending-market-registry/functions";
import { Obligation } from "./_generated/suilend/obligation/structs";
import {
  NewConfigArgs as CreateRateLimiterConfigArgs,
  newConfig as createRateLimiterConfig,
} from "./_generated/suilend/rate-limiter/functions";
import {
  CreateReserveConfigArgs,
  createReserveConfig,
} from "./_generated/suilend/reserve-config/functions";
import { Side } from "./types";
import { extractCTokenCoinType } from "./utils";

const SUI_COINTYPE = "0x2::sui::SUI";
const NORMALIZED_SUI_COINTYPE = normalizeStructTag(SUI_COINTYPE);
const isSui = (coinType: string) =>
  normalizeStructTag(coinType) === NORMALIZED_SUI_COINTYPE;

const WORMHOLE_STATE_ID =
  "0xaeab97f96cf9877fee2883315d459552b2b921edc16d7ceac6eab944dd88919c";
const PYTH_STATE_ID =
  "0x1f9310238ee9298fb703c3419030b35b22bb1cc37113e3bb5007c99aec79e5b8";

const SUILEND_UPGRADE_CAP_ID = process.env.NEXT_PUBLIC_USE_BETA_MARKET
  ? "0x05da14368a42a351e106806c09727968ae26be77a6741a018239ef0f99d5185e"
  : "0x3d4ef1859c3ee9fc72858f588b56a09da5466e64f8cc4e90a7b3b909fba8a7ae";
export const LENDING_MARKET_ID = process.env.NEXT_PUBLIC_USE_BETA_MARKET
  ? "0x12e46de3eafaf0308a2dd64f1158782ed19e6621835bf883a1dd6b3061115667"
  : "0x84030d26d85eaa7035084a057f2f11f701b7e2e4eda87551becbc7c97505ece1";
export const LENDING_MARKET_TYPE = process.env.NEXT_PUBLIC_USE_BETA_MARKET
  ? "0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI"
  : "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::suilend::MAIN_POOL";

async function getLatestPackageId(client: SuiClient, upgradeCapId: string) {
  const object = await client.getObject({
    id: upgradeCapId,
    options: {
      showContent: true,
    },
  });

  return (object.data?.content as any).fields.package;
}

export type ClaimRewardsReward = {
  reserveArrayIndex: bigint;
  rewardIndex: bigint;
  rewardCoinType: string;
  side: Side;
};

export class SuilendClient {
  lendingMarket: LendingMarket<string>;
  client: SuiClient;
  pythClient: SuiPythClient;
  pythConnection: SuiPriceServiceConnection;

  constructor(lendingMarket: LendingMarket<string>, client: SuiClient) {
    this.lendingMarket = lendingMarket;
    this.client = client;
    this.pythClient = new SuiPythClient(
      client,
      PYTH_STATE_ID,
      WORMHOLE_STATE_ID,
    );
    this.pythConnection = new SuiPriceServiceConnection(
      "https://hermes.pyth.network",
    );
  }

  static async initialize(
    lendingMarketId: string,
    lendingMarketType: string,
    client: SuiClient,
  ) {
    const lendingMarket = await LendingMarket.fetch(
      client,
      phantom(lendingMarketType),
      lendingMarketId,
    );

    const latestPackageId = await getLatestPackageId(
      client,
      SUILEND_UPGRADE_CAP_ID,
    );
    console.log("latestPackageId", latestPackageId);
    setPublishedAt(latestPackageId);

    return new SuilendClient(lendingMarket, client);
  }

  static async getFeeReceivers(client: SuiClient, lendingMarketId: string) {
    const feeReceiver = await client.getDynamicFieldObject({
      parentId: lendingMarketId,
      name: {
        type: `${PKG_V10}::lending_market::FeeReceiversKey`,
        value: {
          dummy_field: false,
        },
      },
    });

    const data = (feeReceiver.data?.content as any).fields.value.fields;
    const feeReceivers = FeeReceivers.fromFields(data);

    return feeReceivers;
  }

  static createNewLendingMarket(
    registryId: string,
    lendingMarketType: string,
    transaction: Transaction,
  ) {
    const [ownerCap, lendingMarket] = createLendingMarket(
      transaction,
      lendingMarketType,
      transaction.object(registryId),
    );
    transaction.moveCall({
      target: `0x2::transfer::public_share_object`,
      typeArguments: [`${LendingMarket.$typeName}<${lendingMarketType}>}`],
      arguments: [lendingMarket],
    });

    return ownerCap;
  }

  static async getObligationOwnerCaps(
    ownerId: string,
    lendingMarketTypeArgs: string[],
    client: SuiClient,
  ) {
    const allObjs = [];
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const objs = await client.getOwnedObjects({
        owner: ownerId,
        cursor,
        filter: {
          StructType: `${PACKAGE_ID}::lending_market::ObligationOwnerCap<${lendingMarketTypeArgs[0]}>`,
        },
      });

      allObjs.push(...objs.data);
      cursor = objs.nextCursor;
      hasNextPage = objs.hasNextPage;
    }

    if (allObjs.length > 0) {
      const obligationOwnerCapObjs = await Promise.all(
        allObjs.map((objData) =>
          client.getObject({
            id: objData.data?.objectId as string,
            options: { showBcs: true },
          }),
        ),
      );

      const obligationOwnerCaps: ObligationOwnerCap<string>[] = [];
      obligationOwnerCapObjs.forEach((obj) => {
        if (obj.data?.bcs?.dataType !== "moveObject")
          throw new Error("Error: invalid data type");

        obligationOwnerCaps.push(
          ObligationOwnerCap.fromBcs(
            phantom(lendingMarketTypeArgs[0]),
            fromBase64(obj.data?.bcs?.bcsBytes),
          ),
        );
      });

      return obligationOwnerCaps;
    } else {
      return [];
    }
  }

  static async getObligation(
    obligationId: string,
    lendingMarketTypeArgs: string[],
    client: SuiClient,
  ) {
    const obligationData = await client.getObject({
      id: obligationId,
      options: { showBcs: true },
    });

    if (obligationData.data?.bcs?.dataType !== "moveObject") {
      throw new Error("Error: invalid data type");
    }

    const obligation = Obligation.fromBcs(
      phantom(lendingMarketTypeArgs[0]),
      fromBase64(obligationData.data.bcs.bcsBytes),
    );

    return obligation;
  }

  async getObligation(obligationId: string) {
    return SuilendClient.getObligation(
      obligationId,
      this.lendingMarket.$typeArgs,
      this.client,
    );
  }

  static async getLendingMarketOwnerCapId(
    ownerId: string,
    lendingMarketTypeArgs: string[],
    client: SuiClient,
  ) {
    const objs = await client.getOwnedObjects({
      owner: ownerId,
      filter: {
        StructType: `${PACKAGE_ID}::lending_market::LendingMarketOwnerCap<${lendingMarketTypeArgs[0]}>`,
      },
    });

    if (objs.data.length > 0) return objs.data[0].data?.objectId as string;
    else return null;
  }

  async getLendingMarketOwnerCapId(ownerId: string) {
    return SuilendClient.getLendingMarketOwnerCapId(
      ownerId,
      this.lendingMarket.$typeArgs,
      this.client,
    );
  }

  async createReserve(
    lendingMarketOwnerCapId: string,
    transaction: Transaction,
    pythPriceId: string,
    coinType: string,
    createReserveConfigArgs: CreateReserveConfigArgs,
  ) {
    const [config] = createReserveConfig(transaction, createReserveConfigArgs);

    // Assumes the pyth price feed exists
    const priceUpdateData = await this.pythConnection.getPriceFeedsUpdateData([
      pythPriceId,
    ]);

    const priceInfoObjectIds = await this.pythClient.updatePriceFeeds(
      transaction,
      priceUpdateData,
      [pythPriceId],
    );

    const coin_metadata = await this.client.getCoinMetadata({
      coinType: coinType,
    });
    if (coin_metadata === null) {
      throw new Error("Error: coin metadata not found");
    }

    return addReserve(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        priceInfo: transaction.object(priceInfoObjectIds[0]),
        config: transaction.object(config),
        coinMetadata: transaction.object(coin_metadata.id as string),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      },
    );
  }

  async addReward(
    ownerId: string,
    lendingMarketOwnerCapId: string,
    reserveArrayIndex: bigint,
    isDepositReward: boolean,
    rewardCoinType: string,
    rewardValue: string,
    startTimeMs: bigint,
    endTimeMs: bigint,
    transaction: Transaction,
    mergeCoins: boolean = true,
  ) {
    const coins = (
      await this.client.getCoins({
        owner: ownerId,
        coinType: rewardCoinType,
      })
    ).data;

    if (coins.length > 1 && !isSui(rewardCoinType) && mergeCoins) {
      transaction.mergeCoins(
        transaction.object(coins[0].coinObjectId),
        coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
      );
    }

    const [rewardCoin] = transaction.splitCoins(
      isSui(rewardCoinType)
        ? transaction.gas
        : transaction.object(coins[0].coinObjectId),
      [rewardValue],
    );

    return addPoolReward(
      transaction,
      [this.lendingMarket.$typeArgs[0], rewardCoinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(reserveArrayIndex),
        isDepositReward: transaction.pure.bool(isDepositReward),
        rewards: transaction.object(rewardCoin),
        startTimeMs: transaction.pure.u64(startTimeMs),
        endTimeMs: transaction.pure.u64(endTimeMs),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      },
    );
  }

  cancelReward(
    lendingMarketOwnerCapId: string,
    reserveArrayIndex: bigint,
    isDepositReward: boolean,
    rewardIndex: bigint,
    rewardCoinType: string,
    transaction: Transaction,
  ) {
    return cancelPoolReward(
      transaction,
      [this.lendingMarket.$typeArgs[0], rewardCoinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(reserveArrayIndex),
        isDepositReward: transaction.pure.bool(isDepositReward),
        rewardIndex: transaction.pure.u64(rewardIndex),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      },
    );
  }

  closeReward(
    lendingMarketOwnerCapId: string,
    reserveArrayIndex: bigint,
    isDepositReward: boolean,
    rewardIndex: bigint,
    rewardCoinType: string,
    transaction: Transaction,
  ) {
    return closePoolReward(
      transaction,
      [this.lendingMarket.$typeArgs[0], rewardCoinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(reserveArrayIndex),
        isDepositReward: transaction.pure.bool(isDepositReward),
        rewardIndex: transaction.pure.u64(rewardIndex),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      },
    );
  }

  claimReward(
    obligationOwnerCapId: string,
    reserveArrayIndex: bigint,
    rewardIndex: bigint,
    rewardType: string,
    side: Side,
    transaction: Transaction,
  ) {
    return claimRewards(
      transaction,
      [this.lendingMarket.$typeArgs[0], rewardType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        cap: transaction.object(obligationOwnerCapId),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        reserveId: transaction.pure.u64(reserveArrayIndex),
        rewardIndex: transaction.pure.u64(rewardIndex),
        isDepositReward: transaction.pure.bool(side === Side.DEPOSIT),
      },
    );
  }

  claimRewardAndDeposit(
    obligationId: string,
    rewardReserveArrayIndex: bigint,
    rewardIndex: bigint,
    rewardType: string,
    side: Side,
    depositReserveArrayIndex: bigint,
    transaction: Transaction,
  ) {
    return claimRewardsAndDeposit(
      transaction,
      [this.lendingMarket.$typeArgs[0], rewardType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        obligationId: transaction.pure.id(obligationId),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        rewardReserveId: transaction.pure.u64(rewardReserveArrayIndex),
        rewardIndex: transaction.pure.u64(rewardIndex),
        isDepositReward: transaction.pure.bool(side === Side.DEPOSIT),
        depositReserveId: transaction.pure.u64(depositReserveArrayIndex),
      },
    );
  }

  claimRewards(
    ownerId: string,
    obligationOwnerCapId: string,
    rewards: ClaimRewardsReward[],
    transaction: Transaction,
    isDepositing: boolean,
  ) {
    const mergeCoinsMap: Record<string, any[]> = {};
    for (const reward of rewards) {
      const [claimedCoin] = this.claimReward(
        obligationOwnerCapId,
        reward.reserveArrayIndex,
        reward.rewardIndex,
        reward.rewardCoinType,
        reward.side,
        transaction,
      );

      if (mergeCoinsMap[reward.rewardCoinType] === undefined)
        mergeCoinsMap[reward.rewardCoinType] = [];
      mergeCoinsMap[reward.rewardCoinType].push(claimedCoin);
    }

    for (const [rewardCoinType, coins] of Object.entries(mergeCoinsMap)) {
      const mergeCoin = coins[0];
      if (coins.length > 1) {
        transaction.mergeCoins(mergeCoin, coins.slice(1));
      }

      const depositReserveArrayIndex =
        this.findReserveArrayIndex(rewardCoinType);

      if (!isDepositing || Number(depositReserveArrayIndex) === -1) {
        transaction.transferObjects(
          [mergeCoin],
          transaction.pure.address(ownerId),
        );
      } else {
        this.deposit(
          mergeCoin,
          rewardCoinType,
          obligationOwnerCapId,
          transaction,
        );
      }
    }
  }

  claimRewardsAndSendToUser(
    ownerId: string,
    obligationOwnerCapId: string,
    rewards: ClaimRewardsReward[],
    transaction: Transaction,
  ) {
    this.claimRewards(
      ownerId,
      obligationOwnerCapId,
      rewards,
      transaction,
      false,
    );
  }

  claimRewardsAndDeposit(
    ownerId: string,
    obligationOwnerCapId: string,
    rewards: ClaimRewardsReward[],
    transaction: Transaction,
  ) {
    this.claimRewards(
      ownerId,
      obligationOwnerCapId,
      rewards,
      transaction,
      true,
    );
  }

  findReserveArrayIndex(coinType: string): bigint {
    const arrayIndex = this.lendingMarket.reserves.findIndex(
      (r) =>
        normalizeStructTag(r.coinType.name) === normalizeStructTag(coinType),
    );

    return BigInt(arrayIndex);
  }

  updateReserveConfig(
    lendingMarketOwnerCapId: string,
    transaction: Transaction,
    coinType: string,
    createReserveConfigArgs: CreateReserveConfigArgs,
  ) {
    const [config] = createReserveConfig(transaction, createReserveConfigArgs);

    return updateReserveConfig(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        config: transaction.object(config),
      },
    );
  }

  newObligationOwnerCap(
    transaction: Transaction,
    lendingMarketOwnerCapId: string,
    destinationAddress: string,
    obligationId: string,
  ) {
    const [obligationOwnerCap] = newObligationOwnerCap(
      transaction,
      this.lendingMarket.$typeArgs[0],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        obligationId: transaction.pure.id(obligationId),
      },
    );

    transaction.transferObjects(
      [obligationOwnerCap],
      transaction.pure.address(destinationAddress),
    );
  }

  updateRateLimiterConfig(
    lendingMarketOwnerCapId: string,
    transaction: Transaction,
    newRateLimiterConfigArgs: CreateRateLimiterConfigArgs,
  ) {
    const [config] = createRateLimiterConfig(
      transaction,
      newRateLimiterConfigArgs,
    );

    return updateRateLimiterConfig(
      transaction,
      this.lendingMarket.$typeArgs[0],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        config: transaction.object(config),
      },
    );
  }

  async changeReservePriceFeed(
    lendingMarketOwnerCapId: string,
    coinType: string,
    pythPriceId: string,
    transaction: Transaction,
  ) {
    const priceUpdateData = await this.pythConnection.getPriceFeedsUpdateData([
      pythPriceId,
    ]);
    const priceInfoObjectIds = await this.pythClient.updatePriceFeeds(
      transaction,
      priceUpdateData,
      [pythPriceId],
    );

    return changeReservePriceFeed(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        priceInfoObj: transaction.object(priceInfoObjectIds[0]),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      },
    );
  }

  createObligation(transaction: Transaction) {
    return transaction.moveCall({
      target: `${PUBLISHED_AT}::lending_market::create_obligation`,
      arguments: [transaction.object(this.lendingMarket.id)],
      typeArguments: this.lendingMarket.$typeArgs,
    });
  }

  async refreshAll(
    transaction: Transaction,
    obligation: Obligation<string>,
    extraReserveArrayIndex?: bigint,
  ) {
    const reserveArrayIndexToPriceId = new Map<bigint, string>();
    obligation.deposits.forEach((deposit) => {
      const reserve =
        this.lendingMarket.reserves[Number(deposit.reserveArrayIndex)];
      reserveArrayIndexToPriceId.set(
        deposit.reserveArrayIndex,
        toHex(new Uint8Array(reserve.priceIdentifier.bytes)),
      );
    });

    obligation.borrows.forEach((borrow) => {
      const reserve =
        this.lendingMarket.reserves[Number(borrow.reserveArrayIndex)];
      reserveArrayIndexToPriceId.set(
        borrow.reserveArrayIndex,
        toHex(new Uint8Array(reserve.priceIdentifier.bytes)),
      );
    });

    if (
      extraReserveArrayIndex != undefined &&
      extraReserveArrayIndex >= 0 &&
      extraReserveArrayIndex < this.lendingMarket.reserves.length
    ) {
      const reserve =
        this.lendingMarket.reserves[Number(extraReserveArrayIndex)];
      reserveArrayIndexToPriceId.set(
        extraReserveArrayIndex,
        toHex(new Uint8Array(reserve.priceIdentifier.bytes)),
      );
    }

    const tuples = Array.from(reserveArrayIndexToPriceId.entries()).sort();
    const reserveArrayIndexes = tuples.map((tuple) => tuple[0]);
    const priceIdentifiers = tuples.map((tuple) => tuple[1]);

    const priceInfoObjectIds = [];
    for (let i = 0; i < priceIdentifiers.length; i++) {
      const priceInfoObjectId = await this.pythClient.getPriceFeedObjectId(
        priceIdentifiers[i],
      );
      priceInfoObjectIds.push(priceInfoObjectId!);
    }

    const stalePriceIdentifiers = [];

    for (let i = 0; i < priceInfoObjectIds.length; i++) {
      const priceInfoObject = await PriceInfoObject.fetch(
        this.client,
        priceInfoObjectIds[i],
      );

      const publishTime = priceInfoObject.priceInfo.priceFeed.price.timestamp;
      const stalenessSeconds = Date.now() / 1000 - Number(publishTime);

      if (stalenessSeconds > 20) {
        const reserve =
          this.lendingMarket.reserves[Number(reserveArrayIndexes[i])];

        stalePriceIdentifiers.push(priceIdentifiers[i]);
      }
    }

    if (stalePriceIdentifiers.length > 0) {
      const stalePriceUpdateData =
        await this.pythConnection.getPriceFeedsUpdateData(
          stalePriceIdentifiers,
        );
      await this.pythClient.updatePriceFeeds(
        transaction,
        stalePriceUpdateData,
        stalePriceIdentifiers,
      );
    }

    for (let i = 0; i < reserveArrayIndexes.length; i++) {
      this.refreshReservePrices(
        transaction,
        priceInfoObjectIds[i],
        reserveArrayIndexes[i],
      );
    }
  }

  async refreshReservePrices(
    transaction: Transaction,
    priceInfoObjectId: string,
    reserveArrayIndex: bigint,
  ) {
    if (priceInfoObjectId == null) {
      return;
    }

    refreshReservePrice(transaction, this.lendingMarket.$typeArgs[0], {
      lendingMarket: transaction.object(this.lendingMarket.id),
      reserveArrayIndex: transaction.pure.u64(reserveArrayIndex),
      clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      priceInfo: transaction.object(priceInfoObjectId),
    });
  }

  deposit(
    sendCoin: TransactionObjectInput,
    coinType: string,
    obligationOwnerCap: TransactionObjectInput,
    transaction: Transaction,
  ) {
    const [ctokens] = depositLiquidityAndMintCtokens(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        deposit: sendCoin,
      },
    );

    depositCtokensIntoObligation(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        obligationOwnerCap,
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        deposit: ctokens,
      },
    );
  }

  async depositIntoObligation(
    ownerId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
    obligationOwnerCapId: string | TransactionResult,
  ) {
    const coins = (
      await this.client.getCoins({
        owner: ownerId,
        coinType,
      })
    ).data;

    const mergeCoin = coins[0];
    if (coins.length > 1 && !isSui(coinType)) {
      transaction.mergeCoins(
        transaction.object(mergeCoin.coinObjectId),
        coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
      );
    }

    const [sendCoin] = transaction.splitCoins(
      isSui(coinType)
        ? transaction.gas
        : transaction.object(mergeCoin.coinObjectId),
      [value],
    );

    this.deposit(sendCoin, coinType, obligationOwnerCapId, transaction);
  }

  async depositLiquidityAndGetCTokens(
    ownerId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const coins = (
      await this.client.getCoins({
        owner: ownerId,
        coinType,
      })
    ).data;

    const mergeCoin = coins[0];
    if (coins.length > 1 && !isSui(coinType)) {
      transaction.mergeCoins(
        transaction.object(mergeCoin.coinObjectId),
        coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
      );
    }

    const [sendCoin] = transaction.splitCoins(
      isSui(coinType)
        ? transaction.gas
        : transaction.object(mergeCoin.coinObjectId),
      [value],
    );

    const [ctokens] = depositLiquidityAndMintCtokens(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        deposit: sendCoin,
      },
    );

    transaction.transferObjects([ctokens], transaction.pure.address(ownerId));
  }

  async withdraw(
    obligationOwnerCapId: string,
    obligationId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const obligation = await this.getObligation(obligationId);
    if (!obligation) throw new Error("Error: no obligation");

    await this.refreshAll(transaction, obligation);
    const [ctokens] = withdrawCtokens(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        obligationOwnerCap: obligationOwnerCapId,
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        amount: BigInt(value),
      },
    );

    const [exemption] = transaction.moveCall({
      target: `0x1::option::none`,
      typeArguments: [
        `${PACKAGE_ID}::lending_market::RateLimiterExemption<${this.lendingMarket.$typeArgs[0]}, ${coinType}>`,
      ],
      arguments: [],
    });

    return this.redeem(ctokens, coinType, exemption, transaction);
  }

  redeem(
    ctokens: TransactionObjectInput,
    coinType: string,
    exemption: TransactionObjectInput,
    transaction: Transaction,
  ) {
    const [liquidityRequest] = redeemCtokensAndWithdrawLiquidityRequest(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        ctokens,
        rateLimiterExemption: exemption,
      },
    );

    if (isSui(coinType)) {
      unstakeSuiFromStaker(transaction, this.lendingMarket.$typeArgs[0], {
        lendingMarket: transaction.object(this.lendingMarket.id),
        suiReserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        liquidityRequest,
        systemState: transaction.object(SUI_SYSTEM_STATE_OBJECT_ID),
      });
    }

    return fulfillLiquidityRequest(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        liquidityRequest,
      },
    );
  }

  async withdrawAndSendToUser(
    ownerId: string,
    obligationOwnerCapId: string,
    obligationId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const [withdrawCoin] = await this.withdraw(
      obligationOwnerCapId,
      obligationId,
      coinType,
      value,
      transaction,
    );

    transaction.transferObjects(
      [withdrawCoin],
      transaction.pure.address(ownerId),
    );
  }

  async borrow(
    obligationOwnerCapId: string,
    obligationId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const obligation = await this.getObligation(obligationId);
    if (!obligation) throw new Error("Error: no obligation");

    await this.refreshAll(
      transaction,
      obligation,
      this.findReserveArrayIndex(coinType),
    );
    const [liquidityRequest] = borrowRequest(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        obligationOwnerCap: obligationOwnerCapId,
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        amount: BigInt(value),
      },
    );

    if (isSui(coinType)) {
      unstakeSuiFromStaker(transaction, this.lendingMarket.$typeArgs[0], {
        lendingMarket: transaction.object(this.lendingMarket.id),
        suiReserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        liquidityRequest,
        systemState: transaction.object(SUI_SYSTEM_STATE_OBJECT_ID),
      });
    }

    return fulfillLiquidityRequest(
      transaction,
      [this.lendingMarket.$typeArgs[0], coinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        reserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(coinType),
        ),
        liquidityRequest,
      },
    );
  }

  async borrowAndSendToUser(
    ownerId: string,
    obligationOwnerCapId: string,
    obligationId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const [borrowCoin] = await this.borrow(
      obligationOwnerCapId,
      obligationId,
      coinType,
      value,
      transaction,
    );

    transaction.transferObjects(
      [borrowCoin],
      transaction.pure.address(ownerId),
    );
  }

  repay(
    obligationId: string,
    coinType: string,
    coin: TransactionObjectInput,
    transaction: Transaction,
  ) {
    return repay(transaction, [this.lendingMarket.$typeArgs[0], coinType], {
      lendingMarket: transaction.object(this.lendingMarket.id),
      reserveArrayIndex: transaction.pure.u64(
        this.findReserveArrayIndex(coinType),
      ),
      obligationId: transaction.pure.id(obligationId),
      clock: transaction.object(SUI_CLOCK_OBJECT_ID),
      maxRepayCoins: coin,
    });
  }

  async repayIntoObligation(
    ownerId: string,
    obligationId: string,
    coinType: string,
    value: string,
    transaction: Transaction,
  ) {
    const coins = (
      await this.client.getCoins({
        owner: ownerId,
        coinType,
      })
    ).data;

    const mergeCoin = coins[0];
    if (coins.length > 1 && !isSui(coinType)) {
      transaction.mergeCoins(
        transaction.object(mergeCoin.coinObjectId),
        coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
      );
    }

    const [sendCoin] = transaction.splitCoins(
      isSui(coinType)
        ? transaction.gas
        : transaction.object(mergeCoin.coinObjectId),
      [value],
    );

    const result = this.repay(obligationId, coinType, sendCoin, transaction);
    transaction.transferObjects([sendCoin], transaction.pure.address(ownerId));
    return result;
  }

  async liquidateAndRedeem(
    transaction: Transaction,
    obligation: Obligation<string>,
    repayCoinType: string,
    withdrawCoinType: string,
    repayCoinId: TransactionObjectInput,
  ) {
    const [ctokens, exemption] = await this.liquidate(
      transaction,
      obligation,
      repayCoinType,
      withdrawCoinType,
      repayCoinId,
    );

    const [optionalExemption] = transaction.moveCall({
      target: `0x1::option::some`,
      typeArguments: [
        `${PUBLISHED_AT}::lending_market::RateLimiterExemption<${this.lendingMarket.$typeArgs[0]}, ${withdrawCoinType}>`,
      ],
      arguments: [exemption],
    });

    return this.redeem(
      ctokens,
      withdrawCoinType,
      optionalExemption,
      transaction,
    );
  }

  async liquidate(
    transaction: Transaction,
    obligation: Obligation<string>,
    repayCoinType: string,
    withdrawCoinType: string,
    repayCoinId: TransactionObjectInput,
  ) {
    await this.refreshAll(transaction, obligation);
    return liquidate(
      transaction,
      [this.lendingMarket.$typeArgs[0], repayCoinType, withdrawCoinType],
      {
        lendingMarket: transaction.object(this.lendingMarket.id),
        obligationId: obligation.id,
        repayReserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(repayCoinType),
        ),
        withdrawReserveArrayIndex: transaction.pure.u64(
          this.findReserveArrayIndex(withdrawCoinType),
        ),
        clock: transaction.object(SUI_CLOCK_OBJECT_ID),
        repayCoins: repayCoinId,
      },
    );
  }

  migrate(transaction: Transaction, lendingMarketOwnerCapId: string) {
    return migrate(transaction, this.lendingMarket.$typeArgs[0], {
      lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
      lendingMarket: transaction.object(this.lendingMarket.id),
    });
  }

  claimFees(transaction: Transaction, coinType: string) {
    return claimFees(transaction, [this.lendingMarket.$typeArgs[0], coinType], {
      lendingMarket: transaction.object(this.lendingMarket.id),
      reserveArrayIndex: transaction.pure.u64(
        this.findReserveArrayIndex(coinType),
      ),
    });
  }

  setFeeReceiversAndWeights(
    transaction: Transaction,
    lendingMarketOwnerCapId: string,
    receivers: string[],
    weights: bigint[],
  ) {
    return setFeeReceivers(transaction, this.lendingMarket.$typeArgs[0], {
      lendingMarketOwnerCap: transaction.object(lendingMarketOwnerCapId),
      lendingMarket: transaction.object(this.lendingMarket.id),
      receivers,
      weights,
    });
  }

  async redeemCtokensAndWithdrawLiquidity(
    ownerId: string,
    ctokenCoinTypes: string[],
    transaction: Transaction,
  ) {
    const mergeCoinsMap: Record<string, CoinStruct[]> = {};
    for (const ctokenCoinType of ctokenCoinTypes) {
      const coins = (
        await this.client.getCoins({
          owner: ownerId,
          coinType: ctokenCoinType,
        })
      ).data;
      if (coins.length === 0) continue;

      if (mergeCoinsMap[ctokenCoinType] === undefined)
        mergeCoinsMap[ctokenCoinType] = [];
      mergeCoinsMap[ctokenCoinType].push(...coins);
    }

    for (const [ctokenCoinType, mergeCoins] of Object.entries(mergeCoinsMap)) {
      const mergeCoin = mergeCoins[0];
      if (mergeCoins.length > 1) {
        transaction.mergeCoins(
          transaction.object(mergeCoin.coinObjectId),
          mergeCoins.map((mc) => transaction.object(mc.coinObjectId)).slice(1),
        );
      }

      const coinType = extractCTokenCoinType(ctokenCoinType);
      const [exemption] = transaction.moveCall({
        target: `0x1::option::none`,
        typeArguments: [
          `${PACKAGE_ID}::lending_market::RateLimiterExemption<${this.lendingMarket.$typeArgs[0]}, ${coinType}>`,
        ],
        arguments: [],
      });

      const [redeemCoin] = this.redeem(
        transaction.object(mergeCoin.coinObjectId),
        coinType,
        exemption,
        transaction,
      );

      transaction.transferObjects(
        [redeemCoin],
        transaction.pure.address(ownerId),
      );
    }
  }
}
