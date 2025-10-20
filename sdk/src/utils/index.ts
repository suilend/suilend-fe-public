import BigNumber from "bignumber.js";

import { ParsedReserve } from "../parsers/reserve";

export * from "./events";
export * from "./obligation";
export * from "./simulate";

export const toHexString = (bytes: number[]) =>
  Array.from(bytes, function (byte) {
    return ("0" + (byte & 0xff).toString(16)).slice(-2);
  }).join("");

export const reserveSort = (
  reserves: ParsedReserve[],
  aCoinType: string,
  bCoinType: string,
) => {
  const aReserveIndex = reserves.findIndex((r) => r.coinType === aCoinType);
  const bReserveIndex = reserves.findIndex((r) => r.coinType === bCoinType);

  if (aReserveIndex > -1 && bReserveIndex > -1)
    return aReserveIndex - bReserveIndex;
  else if (aReserveIndex === -1 && bReserveIndex === -1) return 0;
  else return aReserveIndex > -1 ? -1 : 1;
};

export const linearlyInterpolate = (
  array: any[],
  xKey: string,
  yKey: string,
  _xValue: number | BigNumber,
) => {
  let i = 1;
  while (i < array.length) {
    const leftXValue = new BigNumber(array[i - 1][xKey]);
    const leftYValue = new BigNumber(array[i - 1][yKey]);

    const xValue = new BigNumber(_xValue);

    const rightXValue = new BigNumber(array[i][xKey]);
    const rightYValue = new BigNumber(array[i][yKey]);

    if (xValue.gte(leftXValue) && xValue.lte(rightXValue)) {
      const weight = new BigNumber(xValue.minus(leftXValue)).div(
        rightXValue.minus(leftXValue),
      );

      return leftYValue.plus(weight.times(rightYValue.minus(leftYValue)));
    }
    i = i + 1;
  }

  // Should never reach here
  return new BigNumber(0);
};

/**
 * Bisection method to find the optimal value that satisfies a condition
 * @param left - Left boundary of the search range
 * @param right - Right boundary of the search range
 * @param condition - Function that takes a value and returns true if the condition is satisfied
 * @param maxIterations - Maximum number of iterations (default: 50)
 * @param tolerance - Convergence tolerance (default: 0.000001)
 * @returns The optimal value that satisfies the condition
 */
export const bisectionMethod = (
  left: BigNumber,
  right: BigNumber,
  condition: (value: BigNumber) => boolean,
  maxIterations: number = 50,
  tolerance: BigNumber = new BigNumber(0.000001),
): BigNumber => {
  let currentLeft = left;
  let currentRight = right;
  let bestValue = new BigNumber(0);

  for (let i = 0; i < maxIterations; i++) {
    const mid = currentLeft.plus(currentRight).div(2);

    if (mid.eq(currentLeft) && mid.eq(currentRight)) {
      break;
    }

    if (condition(mid)) {
      bestValue = mid;
      currentRight = mid;
    } else {
      currentLeft = mid;
    }

    // Check if we've converged
    if (currentRight.minus(currentLeft).lte(tolerance)) {
      break;
    }
  }

  return bestValue;
};
