import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";

import { WAD } from "../lib/constants";
import {
  ApiReserveAssetDataEvent,
  DownsampledApiReserveAssetDataEvent,
} from "../lib/types";

import { ParsedReserve } from "./reserve";

export type ParsedReserveAssetDataEvent = ReturnType<
  typeof parseReserveAssetDataEvent
>;

export const parseReserveAssetDataEvent = (
  event: ApiReserveAssetDataEvent,
  reserve: ParsedReserve,
) => {
  const availableAmount = new BigNumber(event.availableAmount)
    .div(WAD)
    .div(10 ** reserve.mintDecimals);
  const depositedAmount = new BigNumber(event.supplyAmount)
    .div(WAD)
    .div(10 ** reserve.mintDecimals);
  const borrowedAmount = new BigNumber(event.borrowedAmount)
    .div(WAD)
    .div(10 ** reserve.mintDecimals);

  const availableAmountUsd = new BigNumber(
    event.availableAmountUsdEstimate,
  ).div(WAD);
  const depositedAmountUsd = new BigNumber(event.supplyAmountUsdEstimate).div(
    WAD,
  );
  const borrowedAmountUsd = new BigNumber(event.borrowedAmountUsdEstimate).div(
    WAD,
  );

  const borrowAprPercent = new BigNumber(event.borrowApr).div(WAD).times(100);
  const depositAprPercent = new BigNumber(event.supplyApr).div(WAD).times(100);

  const ctokenSupply = new BigNumber(event.ctokenSupply).div(
    10 ** reserve.mintDecimals,
  );
  const cumulativeBorrowRate = new BigNumber(event.cumulativeBorrowRate).div(
    WAD,
  );

  const price = new BigNumber(event.price).div(WAD);
  const smoothedPrice = new BigNumber(event.smoothedPrice).div(WAD);
  const minPrice = BigNumber.min(price, smoothedPrice);
  const maxPrice = BigNumber.max(price, smoothedPrice);

  // Custom
  const utilizationPercent = depositedAmount.eq(0)
    ? new BigNumber(0)
    : borrowedAmount.div(depositedAmount).times(100);

  return {
    id: event.id,
    lendingMarketId: event.lendingMarketId,
    coinType: normalizeStructTag(event.coinType),
    reserveId: event.reserveId,
    availableAmount,
    depositedAmount,
    borrowedAmount,
    availableAmountUsd,
    depositedAmountUsd,
    borrowedAmountUsd,
    borrowAprPercent,
    depositAprPercent,
    ctokenSupply,
    cumulativeBorrowRate,
    price,
    smoothedPrice,
    minPrice,
    maxPrice,
    priceLastUpdateTimestampS: event.priceLastUpdateTimestampS,
    timestampS: event.timestamp,
    digest: event.digest,
    eventIndex: event.eventIndex,
    sender: event.sender,

    utilizationPercent,
    original: event,
  };
};

export type ParsedDownsampledApiReserveAssetDataEvent = ReturnType<
  typeof parseDownsampledApiReserveAssetDataEvent
>;

export const parseDownsampledApiReserveAssetDataEvent = (
  event: DownsampledApiReserveAssetDataEvent,
  reserve: ParsedReserve,
) => {
  return {
    ...parseReserveAssetDataEvent(event, reserve),
    sampleTimestampS: event.sampletimestamp,
  };
};
