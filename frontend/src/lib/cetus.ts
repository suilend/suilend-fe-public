import CetusClmmSDK, {
  PoolModule,
  TickMath,
} from "@cetusprotocol/cetus-sui-clmm-sdk";
import { SUI_DECIMALS } from "@mysten/sui/utils";
import BN from "bn.js";
import Decimal from "decimal.js";

export const CETUS_CONTRACT_PACKAGE_ID =
  "0xdc67d6de3f00051c505da10d8f6fbab3b3ec21ec65f0dc22a2f36c13fc102110";
export const CETUS_GLOBAL_CONFIG_OBJECT_ID =
  "0xdaa46292632c3c4d8f31f23ea0f9b36a28ff3677e9684980e4438403a67a3d8f";
export const CETUS_POOL_OBJECT_ID =
  "0xfd444d112caeb75011316785548093781b3b9032ceccb5f4817103bc5f1b9f55";

export const getCetusCurrentSuiPrice = async (
  cetusSDK: CetusClmmSDK,
): Promise<Decimal> => {
  const poolModule = new PoolModule(cetusSDK);
  const pool = await poolModule.getPool(CETUS_POOL_OBJECT_ID, true);

  return TickMath.sqrtPriceX64ToPrice(
    new BN(pool.current_sqrt_price),
    6, // SEND_DECIMALS
    SUI_DECIMALS,
  );
};

const closestLowerDivisibleByTickSpacing = (
  num: number,
  tickSpacing: number,
): number => {
  const divisor = tickSpacing;
  const remainder = num % divisor;

  if (remainder === 0) return num;
  if (num > 0) return num - remainder;
  else return num - remainder - divisor;
};

export const getCetusClosestSqrtPriceFromPrice = (
  price: number,
  decimalsA: number,
  decimalsB: number,
  tickSpacing: number,
): bigint => {
  const tick = TickMath.priceToTickIndex(
    new Decimal(price),
    decimalsA,
    decimalsB,
  );
  const closestTick = closestLowerDivisibleByTickSpacing(tick, tickSpacing);

  return BigInt(TickMath.tickIndexToSqrtPriceX64(closestTick).toString());
};
