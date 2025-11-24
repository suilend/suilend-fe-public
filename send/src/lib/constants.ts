import { normalizeStructTag } from "@mysten/sui/utils";

export const TWITTER = "@suilendprotocol";

export const TITLE = "SEND Dashboard | Sui's DeFi Suite";
export const DESCRIPTION = "SEND Dashboard - Sui's DeFi Suite";

export const TOAST_DURATION = 4 * 1000;

export const FIRST_DEPOSIT_DIALOG_START_DATE = new Date("2024-07-02T13:15:00Z");

export const ASSETS_URL = "https://d29k09wtkr1a3e.cloudfront.net";

export const MAX_BALANCE_SUI_SUBTRACTED_AMOUNT = 0.05;

export const ADMIN_ADDRESS =
  process.env.NEXT_PUBLIC_SUILEND_USE_BETA_MARKET === "true"
    ? "0xa902504c338e17f44dfee1bd1c3cad1ff03326579b9cdcfe2762fc12c46fc033" // beta owner
    : "0xb1ffbc2e1915f44b8f271a703becc1bf8aa79bc22431a58900a102892b783c25";

export const SUI_COINTYPE = "0x2::sui::SUI";
export const SEND_COINTYPE =
  "0xb45fcfcc2cc07ce0702cc2d229621e046c906ef14d9b25e8e4d25f6e8763fef7::send::SEND";
export const SEND_SUPPLY = 100_000_000;

export const NORMALIZED_SUI_COINTYPE = normalizeStructTag(SUI_COINTYPE);

export const isSui = (coinType: string) =>
  normalizeStructTag(coinType) === NORMALIZED_SUI_COINTYPE;
