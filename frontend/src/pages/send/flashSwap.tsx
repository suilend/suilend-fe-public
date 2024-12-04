import { TickMath } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { Transaction } from "@mysten/sui/transactions";
import Decimal from "decimal.js";

const CETUS_PKG = "TODO";
const MTOKEN_PKG = "TODO";
const SEND_TYPE = "TODO";
const SUI_TYPE = "TODO";
const CETUS_GLOBAL_CONFIG = "TODO";
const CLOCK = "TODO";
const DECIMALS_SEND = 1; // TODO
const DECIMALS_SUI = 1; // TODO
const TICK_SPACING = 200; // TODO

export async function flashLoan(
  pool: string,
  amount: number,
  minPrice: number, // based on slippage
  mSendCoinToBurn: string,
  mTokenManager: string,
  transaction: Transaction,
) {
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
      transaction.object(pool),
      transaction.pure.bool(true), // a2b, i.e. Get SUI, pay SEND later
      transaction.pure.bool(false), // by_amount_in, false because we want to specify how much SUI we get which is equivalent to penalty amount
      transaction.pure.u64(amount),
      transaction.pure.u128(minSqrtPrice),
      transaction.object(CLOCK),
    ],
  });

  const [penaltyCoin] = transaction.moveCall({
    target: `0x2::coin::from_balance`,
    typeArguments: [SEND_TYPE],
    arguments: [suiBal],
  });

  const [send] = transaction.moveCall({
    target: `${MTOKEN_PKG}::mtoken::redeem_mtokens`,
    typeArguments: [SEND_TYPE],
    arguments: [
      transaction.object(mTokenManager),
      transaction.object(mSendCoinToBurn),
      penaltyCoin,
      transaction.object(CLOCK),
    ],
  });

  const sendBalToMerge = transaction.moveCall({
    target: `0x2::coin::into_balance`,
    typeArguments: [SEND_TYPE],
    arguments: [send],
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
      transaction.object(pool),
      transaction.object(sendBal),
      transaction.object(emptySuiBalance),
      receipt,
    ],
  });
}

function getClosestTickFromPrice(
  price: number,
  decimalsA: number,
  decimalsB: number,
  tickSpacing: number,
): number {
  const priceDecimal = new Decimal(price);
  const tick = TickMath.priceToTickIndex(priceDecimal, decimalsA, decimalsB);

  return closestLowerDivisibleByTickSpacing(tick, tickSpacing);
}

function getClosestSqrtPriceFromPrice(
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
