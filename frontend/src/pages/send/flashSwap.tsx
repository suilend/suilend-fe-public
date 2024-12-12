import CetusClmmSDK, {
  PoolModule,
  SdkOptions,
  TickMath,
  initMainnetSDK,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID } from "@mysten/sui/utils";
import BN from "bn.js";
import Decimal from "decimal.js";

const DECIMALS_SEND = 6;
const DECIMALS_SUI = 9;
const SEND_TYPE =
  "0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND";
const SUI_TYPE = "0x2::sui::SUI";
const CETUS_PKG =
  "0x6f5e582ede61fe5395b50c4a449ec11479a54d7ff8e0158247adfda60d98970b";
const CETUS_GLOBAL_CONFIG =
  "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";
const CETUS_POOL =
  "0xfd444d112caeb75011316785548093781b3b9032ceccb5f4817103bc5f1b9f55";
const MTOKEN_PKG =
  "0x61e3f8d11911a21500c69afb08de505ae9edd0fc0b74551d45a7412fe1196bda";

const MSEND_SERIES_1 =
  "0xda097d57ae887fbd002fb5847dd0ab47ae7e1b183fd36832a51182c52257e1bc::msend_series_1::MSEND_SERIES_1";
const MSEND_SERIES_2 =
  "0x0831a17664901e5102063c8b40f181bce4d92e0d56b5e20a374560a08d0295ed::msend_series_2::MSEND_SERIES_2";
const MSEND_SERIES_3 =
  "0x7607d60723bc41caac04d02e38001ed18d4ba65acce6d8abd9aa3eb25d9a0f6b::msend_series_3::MSEND_SERIES_3";
export const TICK_SPACING = 220;

export async function flashLoan(args: {
  minPrice: number; // based on slippage
  msendCoin: string;
  burnAmount: number; // without decimal part
  mTokenManager: string;
  msendTokenType: string;
  transaction: Transaction;
}) {
  const {
    minPrice,
    msendCoin,
    burnAmount,
    mTokenManager,
    msendTokenType,
    transaction,
  } = args;

  const suiPenaltyAmount = transaction.moveCall({
    target: `${MTOKEN_PKG}::mtoken::get_penalty_amount`,
    typeArguments: [msendTokenType, SEND_TYPE, SUI_TYPE],
    arguments: [
      transaction.object(mTokenManager),
      transaction.pure.u64(burnAmount),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const minSqrtPrice = getClosestSqrtPriceFromPrice(
    minPrice,
    DECIMALS_SEND,
    DECIMALS_SUI,
    TICK_SPACING,
  );
  const [sendBal, suiBal, receipt] = transaction.moveCall({
    target: `${CETUS_PKG}::pool::flash_swap`,
    typeArguments: [SEND_TYPE, SUI_TYPE],
    arguments: [
      transaction.object(CETUS_GLOBAL_CONFIG),
      transaction.object(CETUS_POOL),
      transaction.pure.bool(true), // a2b, i.e. Get SUI, pay SEND later
      transaction.pure.bool(false), // by_amount_in, false because we want to specify how much SUI we get which is equivalent to penalty amount
      suiPenaltyAmount,
      transaction.pure.u128(minSqrtPrice),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const [penaltyCoin] = transaction.moveCall({
    target: `0x2::coin::from_balance`,
    typeArguments: [SUI_TYPE],
    arguments: [suiBal],
  });

  const send = transaction.moveCall({
    target: `${MTOKEN_PKG}::mtoken::redeem_mtokens`,
    typeArguments: [msendTokenType, SEND_TYPE, SUI_TYPE],
    arguments: [
      transaction.object(mTokenManager),
      transaction.object(msendCoin),
      penaltyCoin,
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const sendPayAmount = transaction.moveCall({
    target: `${CETUS_PKG}::pool::swap_pay_amount`,
    typeArguments: [SEND_TYPE, SUI_TYPE],
    arguments: [transaction.object(receipt)],
  });

  const sendCoinToPay = transaction.splitCoins(send, [sendPayAmount]);

  const sendBalToMerge = transaction.moveCall({
    target: `0x2::coin::into_balance`,
    typeArguments: [SEND_TYPE],
    arguments: [sendCoinToPay],
  });

  transaction.moveCall({
    target: `0x2::balance::join`,
    typeArguments: [SEND_TYPE],
    arguments: [sendBal, sendBalToMerge],
  });

  const emptySuiBalance = transaction.moveCall({
    target: `0x2::balance::zero`,
    typeArguments: [SUI_TYPE],
    arguments: [],
  });

  transaction.moveCall({
    target: `${CETUS_PKG}::pool::repay_flash_swap`,
    typeArguments: [SEND_TYPE, SUI_TYPE],
    arguments: [
      transaction.object(CETUS_GLOBAL_CONFIG),
      transaction.object(CETUS_POOL),
      transaction.object(sendBal),
      transaction.object(emptySuiBalance),
      receipt,
    ],
  });
}

export function getClosestTickFromPrice(
  price: number,
  decimalsA: number,
  decimalsB: number,
  tickSpacing: number,
): number {
  const priceDecimal = new Decimal(price);
  const tick = TickMath.priceToTickIndex(priceDecimal, decimalsA, decimalsB);

  return closestLowerDivisibleByTickSpacing(tick, tickSpacing);
}

export function computeMinPrice(
  currentPrice: Decimal,
  slippageNum: number,
): number {
  const slippage = new Decimal(slippageNum);
  if (slippage.lessThan(0) || slippage.greaterThan(1)) {
    throw new Error("Slippage must be between 0 and 1 (inclusive).");
  }

  return currentPrice.mul(Decimal.sub(1, slippage)).toNumber();
}

// initMainnetSDK() to create cetusSDK
export async function getCurrentPrice(
  cetusSDK: CetusClmmSDK,
): Promise<Decimal> {
  const sqrtPrice = await getCurrentSqrtPrice(cetusSDK);

  return TickMath.sqrtPriceX64ToPrice(
    new BN(sqrtPrice),
    DECIMALS_SEND,
    DECIMALS_SUI,
  );
}

export async function getCurrentSqrtPrice(
  cetusSDK: CetusClmmSDK,
): Promise<number> {
  const poolModule = new PoolModule(cetusSDK);
  const pool = await poolModule.getPool(CETUS_POOL, true);
  return pool.current_sqrt_price;
}

export function getClosestSqrtPriceFromPrice(
  price: number,
  decimalsA: number,
  decimalsB: number,
  tickSpacing: number,
): bigint {
  const closestTick = getClosestTickFromPrice(
    price,
    decimalsA,
    decimalsB,
    tickSpacing,
  );

  const closestSqrtPriceBN = TickMath.tickIndexToSqrtPriceX64(closestTick);
  const closestSqrtPrice = BigInt(closestSqrtPriceBN.toString());
  return closestSqrtPrice;
}

function closestLowerDivisibleByTickSpacing(
  num: number,
  tickSpacing: number,
): number {
  const divisor = tickSpacing;
  const remainder = num % divisor;

  if (remainder === 0) {
    return num;
  }

  if (num > 0) {
    return num - remainder;
  } else {
    return num - remainder - divisor;
  }
}
