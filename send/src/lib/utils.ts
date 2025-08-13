import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toTitleCase(str: string) {
  return str.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatNumber(num: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(num);
}

export function toCompactNumber(num: number) {
  const abs = Math.abs(num);
  if (abs < 1_000) {
    // Do not compact small values
    return formatNumber(num);
  }
  if (abs < 1_000_000) {
    const value = num / 1_000;
    return `${formatNumber(value)}K`;
  }
  if (abs < 1_000_000_000) {
    const value = num / 1_000_000;
    return `${formatNumber(value)}M`;
  }
  // Fall back to Intl for very large numbers (B, T, etc.)
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(num);
}

export function toCompactCurrency(num: number) {
  const abs = Math.abs(num);
  if (abs < 1_000) {
    // Do not compact small currency values
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(num);
  }
  if (abs < 1_000_000) {
    const value = num / 1_000;
    return `$${formatNumber(value)}K`;
  }
  if (abs < 1_000_000_000) {
    const value = num / 1_000_000;
    return `$${formatNumber(value)}M`;
  }
  // Fall back to Intl for very large numbers
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
    style: "currency",
    currency: "USD",
  }).format(num);
}
