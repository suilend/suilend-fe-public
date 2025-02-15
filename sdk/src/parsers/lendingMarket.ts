import { CoinMetadata } from "@mysten/sui/client";
import BigNumber from "bignumber.js";

import { LendingMarket } from "../_generated/suilend/lending-market/structs";
import { Reserve } from "../_generated/suilend/reserve/structs";
import { LENDING_MARKETS } from "../client";

import { parseRateLimiter } from "./rateLimiter";
import { parseReserve } from "./reserve";

export type ParsedLendingMarket = ReturnType<typeof parseLendingMarket>;

export const parseLendingMarket = (
  lendingMarket: LendingMarket<string>,
  reserves: Reserve<string>[],
  coinMetadataMap: Record<string, CoinMetadata>,
  nowS: number,
) => {
  const id = lendingMarket.id;
  const type = lendingMarket.$typeArgs[0];
  const version = lendingMarket.version;

  const parsedReserves = reserves.map((reserve) =>
    parseReserve(reserve, coinMetadataMap),
  );

  const obligations = lendingMarket.obligations;

  const parsedRateLimiter = parseRateLimiter(lendingMarket.rateLimiter, nowS);

  const feeReceiver = lendingMarket.feeReceiver;
  const badDebtUsd = new BigNumber(lendingMarket.badDebtUsd.value.toString());
  const badDebtLimitUsd = new BigNumber(
    lendingMarket.badDebtLimitUsd.value.toString(),
  );

  // Custom
  let depositedAmountUsd = new BigNumber(0);
  let borrowedAmountUsd = new BigNumber(0);
  let tvlUsd = new BigNumber(0);

  parsedReserves.forEach((parsedReserve) => {
    depositedAmountUsd = depositedAmountUsd.plus(
      parsedReserve.depositedAmountUsd,
    );
    borrowedAmountUsd = borrowedAmountUsd.plus(parsedReserve.borrowedAmountUsd);
    tvlUsd = tvlUsd.plus(parsedReserve.availableAmountUsd);
  });

  const LENDING_MARKET = LENDING_MARKETS.find((lm) => lm.id === id);
  if (!LENDING_MARKET)
    console.error(
      `Missing LENDING_MARKETS definition for lending market with id: ${id}`,
    );

  const name = LENDING_MARKET?.name ?? "Unknown";
  const ownerCapId = LENDING_MARKET?.ownerCapId ?? "Unknown";

  return {
    id,
    type,
    version,
    reserves: parsedReserves,
    obligations,
    rateLimiter: parsedRateLimiter,
    feeReceiver,
    badDebtUsd,
    badDebtLimitUsd,

    depositedAmountUsd,
    borrowedAmountUsd,
    tvlUsd,

    name,
    ownerCapId,

    /**
     * @deprecated since version 1.0.3. Use `depositedAmountUsd` instead.
     */
    totalSupplyUsd: depositedAmountUsd,
    /**
     * @deprecated since version 1.0.3. Use `borrowedAmountUsd` instead.
     */
    totalBorrowUsd: borrowedAmountUsd,
  };
};
