import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(
  num: number,
  maximumFractionDigits = 1,
  minimumFractionDigits = 1,
) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(num);
}

export function toCompactNumber(
  num: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 1,
) {
  const abs = Math.abs(num);
  if (abs < 1_000) {
    // Do not compact small values
    return formatNumber(num);
  }
  if (abs < 1_000_000) {
    const value = num / 1_000;
    return `${formatNumber(value, maximumFractionDigits, minimumFractionDigits)}K`;
  }
  if (abs < 1_000_000_000) {
    const value = num / 1_000_000;
    return `${formatNumber(value, maximumFractionDigits, minimumFractionDigits)}M`;
  }
  // Fall back to Intl for very large numbers (B, T, etc.)
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(num);
}

export function toCompactCurrency(
  num: number,
  maximumFractionDigits = 2,
  minimumFractionDigits = 1,
) {
  const abs = Math.abs(num);
  if (abs < 1_000) {
    // Do not compact small currency values
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(num);
  }
  if (abs < 1_000_000) {
    const value = num / 1_000;
    return `$${formatNumber(value, maximumFractionDigits, minimumFractionDigits)}K`;
  }
  if (abs < 1_000_000_000) {
    const value = num / 1_000_000;
    return `$${formatNumber(value, maximumFractionDigits, minimumFractionDigits)}M`;
  }
  // Fall back to Intl for very large numbers
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
    minimumFractionDigits,
    style: "currency",
    currency: "USD",
  }).format(num);
}
