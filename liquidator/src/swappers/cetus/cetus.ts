import CetusClmmSDK, {
  SdkOptions,
  TransactionUtil,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions";

import { SwapArgs, Swapper } from "../interface";

import { MAINNET_POOL_INFO_URL } from "./configs";

export type CetusConstructorArgs = {
  keypair: Ed25519Keypair | Secp256k1Keypair;
  poolInfoURL?: string;
  sdkOptions: SdkOptions;
  rpcURL: string;
};

type LPCoin = {
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  balance: string;
  logo_url: string;
  coingecko_id: string;
  project_url: string;
  labels: any[];
};

type LPInfo = {
  symbol: string;
  name: string;
  decimals: number;
  fee: string;
  tick_spacing: string;
  pool_type: string;
  address: string;
  coin_a_address: string;
  coin_b_address: string;
  is_closed: boolean;
  coin_a: LPCoin;
  coin_b: LPCoin;
};

export class CetusSwapper implements Swapper {
  keypair: Ed25519Keypair | Secp256k1Keypair;
  poolInfoURL: string;
  lpList: LPInfo[];
  sdk: CetusClmmSDK;
  suiClient: SuiClient;

  constructor(args: CetusConstructorArgs) {
    this.keypair = args.keypair;
    this.poolInfoURL = args.poolInfoURL || MAINNET_POOL_INFO_URL;
    this.lpList = [];
    this.sdk = new CetusClmmSDK(args.sdkOptions);
    this.suiClient = new SuiClient({ url: args.rpcURL });
  }

  async init() {
    await this.refreshPoolInfo();
    this.sdk.senderAddress = this.keypair.toSuiAddress();
  }

  async refreshPoolInfo() {
    const coinMap = new Map();
    const poolMap = new Map();
    const resp: any = await fetch(this.poolInfoURL, { method: "GET" });
    const poolsInfo = (await resp.json()) as {
      code: number;
      msg: string;
      data: { lp_list: LPInfo[] };
    };
    if (poolsInfo.code !== 200) {
      return false;
    }
    const newLPList: LPInfo[] = [];
    for (const pool of poolsInfo.data.lp_list) {
      if (pool.is_closed) {
        continue;
      }
      newLPList.push(pool);
      const coin_a = pool.coin_a.address;
      const coin_b = pool.coin_b.address;

      coinMap.set(coin_a, {
        address: pool.coin_a.address,
        decimals: pool.coin_a.decimals,
      });
      coinMap.set(coin_b, {
        address: pool.coin_b.address,
        decimals: pool.coin_b.decimals,
      });

      const pair = `${coin_a}-${coin_b}`;
      const pathProvider = poolMap.get(pair);
      if (pathProvider) {
        pathProvider.addressMap.set(Number(pool.fee) * 100, pool.address);
      } else {
        poolMap.set(pair, {
          base: coin_a,
          quote: coin_b,
          addressMap: new Map([[Number(pool.fee) * 100, pool.address]]),
        });
      }
    }
    this.lpList = newLPList;
    this.sdk.Router.loadGraph(
      {
        coins: Array.from(coinMap.values()),
      },
      {
        paths: Array.from(poolMap.values()),
      },
    );
  }

  async swap(args: SwapArgs): Promise<{
    fromCoin: TransactionObjectArgument;
    toCoin: TransactionObjectArgument;
    txb: Transaction;
  } | null> {
    if (
      (args.fromAmount && args.toAmount) ||
      (!args.fromAmount && !args.toAmount)
    ) {
      throw new Error("Must specify exactly one of fromAmount or toAmount");
    }
    const byAmountIn = Boolean(args.fromAmount);
    const routerResult = await this.sdk.RouterV2.getBestRouter(
      args.fromCoinType,
      args.toCoinType,
      (args.fromAmount || args.toAmount)!,
      byAmountIn,
      args.maxSlippage,
      "",
      "",
      undefined,
      true,
      false,
      [],
    );
    if (!routerResult.result?.isExceed) {
      const allCoinAssets = await this.sdk.getOwnerCoinAssets(
        this.keypair.toSuiAddress(),
      );
      const txb = new Transaction();
      const amountLimit = routerResult.result.byAmountIn
        ? Math.round(routerResult.result.outputAmount * (1 - args.maxSlippage))
        : Math.round(routerResult.result.inputAmount * (1 + args.maxSlippage));
      const result = await TransactionUtil.buildAggregatorSwapReturnCoins(
        this.sdk,
        routerResult.result,
        TransactionUtil.buildCoinForAmount(
          txb as any,
          allCoinAssets,
          byAmountIn ? BigInt(args.fromAmount!) : BigInt(amountLimit),
          args.fromCoinType,
          false,
          true,
        ),
        TransactionUtil.buildCoinForAmount(
          txb as any,
          [],
          BigInt(0),
          args.toCoinType,
          false,
        ),
        "",
        args.maxSlippage,
        txb as any,
      );
      return {
        fromCoin: result.fromCoin as any as TransactionObjectArgument,
        toCoin: result.toCoin as any as TransactionObjectArgument,
        txb: result.tx as any as Transaction,
      };
    }
    return null;
  }
}
