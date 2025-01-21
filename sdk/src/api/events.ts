import { DownsampledApiReserveAssetDataEvent } from "../lib/types";

/**
 * Note: This SDK function is experimental and may change or require authentication in the future.
 */
export const fetchDownsampledApiReserveAssetDataEvents = async (
  reserveId: string,
  days: number,
  sampleIntervalS: number,
) => {
  const url = `https://api.suilend.fi/events/downsampled-reserve-asset-data?reserveId=${reserveId}&days=${days}&sampleIntervalS=${sampleIntervalS}`;
  const res = await fetch(url);
  const json = await res.json();

  return json as DownsampledApiReserveAssetDataEvent[];
};
