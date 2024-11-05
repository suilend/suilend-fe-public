import { normalizeStructTag } from "@mysten/sui/utils";
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
) =>
  reserves.findIndex((r) => r.coinType === aCoinType) -
  reserves.findIndex((r) => r.coinType === bCoinType);

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

export const isCTokenCoinType = (coinType: string) =>
  coinType.includes("::reserve::CToken<") && coinType.endsWith(">");

export const extractCTokenCoinType = (coinType: string) => {
  if (!isCTokenCoinType(coinType)) throw new Error("Not a CToken ");

  return normalizeStructTag(
    coinType.split("::reserve::CToken")[1].split(",")[1].slice(0, -1),
  );
};
