import Head from "next/head";
import { useCallback, useEffect, useMemo } from "react";

import { KioskClient, KioskData, Network } from "@mysten/kiosk";
import {
  SuiClient,
  SuiTransactionBlockResponse,
  TransactionFilter,
} from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { toast } from "sonner";
import useSWR from "swr";

import {
  NORMALIZED_SEND_POINTS_COINTYPE,
  getBalanceChange,
  isSendPoints,
} from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";
import useCoinMetadataMap from "@suilend/frontend-sui-next/hooks/useCoinMetadataMap";

import AllocationCard from "@/components/send/AllocationCard";
import ClaimSection from "@/components/send/ClaimSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import TokenomicsSection from "@/components/send/TokenomicsSection";
import TextLink from "@/components/shared/TextLink";
import { Separator } from "@/components/ui/separator";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { TX_TOAST_DURATION } from "@/lib/constants";
import { formatInteger, formatToken } from "@/lib/format";
import { getPointsStats } from "@/lib/points";

import earlyUsersJson from "./lending/early-users.json";
import animaJson from "./nft/anima.json";
import doubleUpCitizenJson from "./nft/doubleup-citizen.json";
import eggJson from "./nft/egg.json";
import kumoJson from "./nft/kumo.json";
import primeMachinJson from "./nft/prime-machin.json";
import rootletsJson from "./nft/rootlets.json";
import aaaJson from "./token/aaa.json";
import fudJson from "./token/fud.json";
import octoJson from "./token/octo.json";
import tismJson from "./token/tism.json";
import bluefinLeaguesBlackJson from "./trading/bluefin-leagues-black.json";
import bluefinLeaguesGoldJson from "./trading/bluefin-leagues-gold.json";
import bluefinLeaguesPlatinumJson from "./trading/bluefin-leagues-platinum.json";
import bluefinLeaguesSapphireJson from "./trading/bluefin-leagues-sapphire.json";
import bluefinSendTradersJson from "./trading/bluefin-send-traders.json";

export const SEND_TOTAL_SUPPLY = 100_000_000;

export enum AllocationId {
  EARLY_USERS = "earlyUsers",
  SEND_POINTS = "sendPoints",
  SUILEND_CAPSULES = "suilendCapsules",
  SAVE = "save",
  ROOTLETS = "rootlets",

  BLUEFIN_LEAGUES = "bluefinLeagues",
  BLUEFIN_SEND_TRADERS = "bluefinSendTraders",

  PRIME_MACHIN = "primeMachin",
  EGG = "egg",
  DOUBLEUP_CITIZEN = "doubleUpCitizen",
  KUMO = "kumo",

  ANIMA = "anima",

  FUD = "fud",
  AAA = "aaa",
  OCTO = "octo",
  TISM = "tism",
}

export enum AllocationType {
  FLAT = "Flat",
  LINEAR = "Linear",
}

export enum AssetType {
  LENDING = "lending",
  NFT = "nft",
  TOKEN = "token",
  TRADING = "trading",
  POINTS = "points",
}

export type Allocation = {
  id: AllocationId;
  src: string;
  hoverSrc?: string;
  title: string;
  description: string;
  allocationType: AllocationType;
  assetType?: AssetType;
  cta?: {
    title: string;
    href: string;
  };
  snapshotTaken: boolean;
  eligibleWallets?: string;
  totalAllocationPercent: BigNumber;
  totalAllocationBreakdown: {
    title: string;
    percent: BigNumber;
  }[];

  userAllocationPercent?: BigNumber;
  userClaimedMsend?: BigNumber;
  userBridgedMsend?: BigNumber;
};

export enum SuilendCapsuleRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
}

// ---- START TEMP ----
export const TGE_TIMESTAMP_MS = 1733979600000;

const BURN_CONTRACT_PACKAGE_ID =
  "0x3615c20d2375363f642d99cec657e69799b118d580f115760c731f0568900770"; // TODO
const mTOKEN_CONTRACT_PACKAGE_ID =
  "0xd0d8ed2a83da2f0f171de7d60b0b128637d51e6dbfbec232447a764cdc6af627"; // TODO

const POINTS_MANAGER_OBJECT_ID =
  "0xb1a0dc06cdab0e714d73cb426e03d8daf3c148d66a6b80520827d70b801f742c"; // TODO
const CAPSULE_MANAGER_OBJECT_ID =
  "0x0f820695ba668c81d319874f20798020c46626eae22aa3f11dd4ff065f50dc87"; // TODO
const mSEND_MANAGER_OBJECT_ID =
  "0x776471131804197216d32d2805e38a46dd40fe2a7b1a76adde4a1787f878c2d7"; // TODO

// const NORMALIZED_SEND_POINTS_COINTYPE = normalizeStructTag(
//   "0x2a094736a1d4e08e71069a65eb5ef9fb6da2f5f0d76679947f8f4499b13af8d0::suilend_point::SUILEND_POINT",
// ); // TODO: Change back to NORMALIZED_SEND_POINTS_COINTYPE from @suilend/frontend-sui

export const NORMALIZED_mSEND_3_MONTHS_COINTYPE = normalizeStructTag(
  "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
); // TODO
export const NORMALIZED_mSEND_6_MONTHS_COINTYPE = normalizeStructTag(
  "0x2053d08c1e2bd02791056171aab0fd12bd7cd7efad2ab8f6b9c8902f14df2ff2::ausd::AUSD",
); // TODO
export const NORMALIZED_mSEND_12_MONTHS_COINTYPE = normalizeStructTag(
  "0xe0644f3e46b2d9f319a2cc3491155c75d1b6132ba9b3601c6e7e102e17296645::goof::GOOF",
); // TODO

const BURN_SEND_POINTS_EVENT_TYPE =
  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::BorrowEvent"; // TODO
const BURN_SUILEND_CAPSULES_EVENT_TYPE =
  "0xf95b06141ed4a174f239417323bde3f209b972f5930d8521ea38a52aff3a6ddf::lending_market::BorrowEvent"; // TODO

const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

// ---- END TEMP ----

const ROOTLETS_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

const PRIME_MACHIN_TYPE =
  "0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca::factory::PrimeMachin";
const EGG_TYPE =
  "0x484932c474bf09f002b82e4a57206a6658a0ca6dbdb15896808dcd1929c77820::egg::AfEgg";
const DOUBLEUP_CITIZEN_TYPE =
  "0x862810efecf0296db2e9df3e075a7af8034ba374e73ff1098e88cc4bb7c15437::doubleup_citizens::DoubleUpCitizen";
const KUMO_TYPE =
  "0x57191e5e5c41166b90a4b7811ad3ec7963708aa537a8438c1761a5d33e2155fd::kumo::Kumo";

const getOwnedObjectsOfType = async (
  suiClient: SuiClient,
  address: string,
  type: string,
) => {
  const allObjs = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const objs = await suiClient.getOwnedObjects({
      owner: address,
      cursor,
      filter: {
        StructType: type,
      },
      options: { showContent: true },
    });

    allObjs.push(...objs.data);
    cursor = objs.nextCursor;
    hasNextPage = objs.hasNextPage;
  }

  return allObjs;
};

const queryTransactionBlocks = async (
  suiClient: SuiClient,
  filter: TransactionFilter,
  minTimestampMs: number,
) => {
  const allTransactionBlocks: SuiTransactionBlockResponse[] = [];
  let cursor = null;
  let hasNextPage = true;
  while (hasNextPage) {
    const transactionBlocks = await suiClient.queryTransactionBlocks({
      cursor,
      order: "descending",
      filter,
      options: {
        showBalanceChanges: true,
        showEvents: true,
      },
    });

    const transactionBlocksInRange = transactionBlocks.data.filter(
      (transactionBlock) =>
        transactionBlock.timestampMs &&
        +transactionBlock.timestampMs >= minTimestampMs,
    );

    allTransactionBlocks.push(...transactionBlocksInRange);
    cursor = transactionBlocks.nextCursor;
    hasNextPage = transactionBlocks.hasNextPage;

    const lastTransactionBlock = transactionBlocks.data.at(-1);
    if (
      lastTransactionBlock &&
      lastTransactionBlock.timestampMs &&
      +lastTransactionBlock.timestampMs < minTimestampMs
    )
      break;
  }

  return allTransactionBlocks;
};

export default function Send() {
  const { explorer, suiClient } = useSettingsContext();
  const { address, signExecuteAndWaitForTransaction } = useWalletContext();
  const { data } = useLoadedAppContext();

  const mSendCoinTypes = useMemo(
    () => [
      NORMALIZED_mSEND_3_MONTHS_COINTYPE,
      NORMALIZED_mSEND_6_MONTHS_COINTYPE,
      NORMALIZED_mSEND_12_MONTHS_COINTYPE,
    ],
    [],
  );
  const mSendCoinMetadataMap = useCoinMetadataMap(mSendCoinTypes);

  // Setup - total allocated SEND Points
  const totalAllocatedPoints = useMemo(() => {
    let result = new BigNumber(0);
    for (const reserve of data.lendingMarket.reserves) {
      for (const pr of [
        ...reserve.depositsPoolRewardManager.poolRewards,
        ...reserve.borrowsPoolRewardManager.poolRewards,
      ]) {
        if (isSendPoints(pr.coinType))
          result = result.plus(pr.allocatedRewards);
      }
    }

    return result;
  }, [data.lendingMarket.reserves]);

  // Setup - Bluefin SEND Traders total volume
  const bluefinSendTradersTotalVolumeUsd = useMemo(
    () =>
      Object.values(bluefinSendTradersJson as number[]).reduce(
        (acc, volumeUsd) => acc.plus(volumeUsd),
        new BigNumber(0),
      ),
    [],
  );

  // Setup - owned kiosks
  const kioskClient = useMemo(
    () => new KioskClient({ client: suiClient, network: Network.MAINNET }),
    [suiClient],
  );

  const ownedKiosksFetcher = useCallback(async () => {
    if (!address) return undefined;

    const allKioskIds = [];
    let cursor = undefined;
    let hasNextPage = true;
    while (hasNextPage) {
      const kiosks = await kioskClient.getOwnedKiosks({
        address: address,
        pagination: {
          cursor,
        },
      });

      allKioskIds.push(...kiosks.kioskIds);
      cursor = kiosks.nextCursor ?? undefined;
      hasNextPage = kiosks.hasNextPage;
    }

    const allKiosks = await Promise.all(
      allKioskIds.map((kioskId) => kioskClient.getKiosk({ id: kioskId })),
    );

    return allKiosks;
  }, [address, kioskClient]);

  const { data: ownedKiosks, mutate: mutateOwnedKiosks } = useSWR<
    KioskData[] | undefined
  >(`ownedKiosks-${address}`, ownedKiosksFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed owned kiosks", data);
    },
    onError: (err) => {
      console.error("Failed to refresh owned kiosks", err);
    },
  });
  useEffect(() => {
    setTimeout(mutateOwnedKiosks, 100);
  }, [mutateOwnedKiosks, address, kioskClient]);

  const getOwnedKioskItemsOfType = useCallback(
    (type: string) => {
      if (ownedKiosks === undefined) return undefined;

      const count = ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(kiosk.items.filter((item) => item.type === type).length),
        new BigNumber(0),
      );

      return count;
    },
    [ownedKiosks],
  );

  // User - Early Users
  const isInEarlyUsersSnapshot = useMemo(() => {
    if (!address) return undefined;

    return earlyUsersJson.includes(address);
  }, [address]);

  // User - SEND Points
  const userSendPointsFetcher = useCallback(async () => {
    if (!address) return undefined;

    const coinMetadata =
      mSendCoinMetadataMap?.[NORMALIZED_mSEND_3_MONTHS_COINTYPE];
    if (!coinMetadata) return undefined;

    // Owned
    const ownedSendPoints = getPointsStats(data.rewardMap, data.obligations)
      .totalPoints.total;

    // Claimed
    // const userTransactions = await queryTransactionBlocks(
    //   suiClient,
    //   { FromAddress: address },
    //   TGE_TIMESTAMP_MS,
    // );

    // const claimedMsend = userTransactions
    //   .reduce((acc, transaction) => {
    //     const transactionClaimedMsend = (transaction.events ?? [])
    //       .filter((event) => event.type === BURN_SEND_POINTS_EVENT_TYPE)
    //       .reduce(
    //         (acc2, event) =>
    //           acc2.plus((event.parsedJson as any).liquidity_amount),
    //         new BigNumber(0),
    //       );

    //     return acc.plus(transactionClaimedMsend);
    //   }, new BigNumber(0))
    //   .div(10 ** coinMetadata.decimals);

    return { owned: ownedSendPoints, claimedMsend: new BigNumber(0) };
  }, [
    address,
    mSendCoinMetadataMap,
    data.rewardMap,
    data.obligations,
    // suiClient,
  ]);

  const { data: userSendPoints, mutate: mutateUserSendPoints } = useSWR<
    { owned: BigNumber; claimedMsend: BigNumber } | undefined
  >(`userSendPoints-${address}`, userSendPointsFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed user SEND Points", data);
    },
    onError: (err) => {
      console.error("Failed to user SEND Points", err);
    },
  });
  useEffect(() => {
    setTimeout(mutateUserSendPoints, 100);
  }, [
    mutateUserSendPoints,
    address,
    mSendCoinMetadataMap,
    data.rewardMap,
    data.obligations,
    // suiClient,
  ]);

  // User - Suilend Capsules
  const userSuilendCapsulesFetcher = useCallback(async () => {
    if (!address) return undefined;

    const coinMetadata =
      mSendCoinMetadataMap?.[NORMALIZED_mSEND_3_MONTHS_COINTYPE];
    if (!coinMetadata) return undefined;

    // Owned
    const objs = await getOwnedObjectsOfType(
      suiClient,
      address,
      SUILEND_CAPSULE_TYPE,
    );

    const commonCapsuleObjs = objs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.COMMON,
    );
    const uncommonCapsuleObjs = objs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.UNCOMMON,
    );
    const rareCapsuleObjs = objs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity === SuilendCapsuleRarity.RARE,
    );

    const ownedSuilendCapsulesMap = {
      [SuilendCapsuleRarity.COMMON]: new BigNumber(commonCapsuleObjs.length),
      [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
        uncommonCapsuleObjs.length,
      ),
      [SuilendCapsuleRarity.RARE]: new BigNumber(rareCapsuleObjs.length),
    };

    // Claimed
    // const userTransactions = await queryTransactionBlocks(
    //   suiClient,
    //   { FromAddress: address },
    //   TGE_TIMESTAMP_MS,
    // );

    // const claimedMsend = userTransactions
    //   .reduce((acc, transaction) => {
    //     const transactionClaimedMsend = (transaction.events ?? [])
    //       .filter((event) => event.type === BURN_SUILEND_CAPSULES_EVENT_TYPE)
    //       .reduce(
    //         (acc2, event) =>
    //           acc2.plus((event.parsedJson as any).liquidity_amount),
    //         new BigNumber(0),
    //       );

    //     return acc.plus(transactionClaimedMsend);
    //   }, new BigNumber(0))
    //   .div(10 ** coinMetadata.decimals);

    return {
      ownedMap: ownedSuilendCapsulesMap,
      claimedMsend: new BigNumber(0),
    };
  }, [address, mSendCoinMetadataMap, suiClient]);

  const { data: userSuilendCapsules, mutate: mutateUserSuilendCapsules } =
    useSWR<
      | {
          ownedMap: Record<SuilendCapsuleRarity, BigNumber>;
          claimedMsend: BigNumber;
        }
      | undefined
    >(`userSuilendCapsules-${address}`, userSuilendCapsulesFetcher, {
      onSuccess: (data) => {
        console.log("Refreshed user Suilend Capsules", data);
      },
      onError: (err) => {
        console.error("Failed to refresh user Suilend Capsules", err);
      },
    });
  useEffect(() => {
    setTimeout(mutateUserSuilendCapsules, 100);
  }, [mutateUserSuilendCapsules, address, mSendCoinMetadataMap, suiClient]);

  // User - Save
  const userSaveFetcher = useCallback(async () => {
    if (!address) return undefined;

    const coinMetadata =
      mSendCoinMetadataMap?.[NORMALIZED_mSEND_12_MONTHS_COINTYPE];
    if (!coinMetadata) return undefined;

    // Bridged
    const userTransactions = await queryTransactionBlocks(
      suiClient,
      { FromAddress: address },
      TGE_TIMESTAMP_MS,
    );

    const bridgedMsend = userTransactions
      .reduce((acc, transaction) => {
        const hasWormholeEvent = !!(transaction.events ?? []).find(
          (event) =>
            event.type ===
            "0x26efee2b51c911237888e5dc6702868abca3c7ac12c53f76ef8eba0697695e3d::complete_transfer::TransferRedeemed",
        );
        if (!hasWormholeEvent) return acc;

        const transactionBridgedMsend = (transaction.balanceChanges ?? [])
          .filter(
            (balanceChange) =>
              normalizeStructTag(balanceChange.coinType) ===
              NORMALIZED_mSEND_12_MONTHS_COINTYPE,
          )
          .reduce(
            (acc2, balanceChange) => acc2.plus(balanceChange.amount),
            new BigNumber(0),
          );

        return acc.plus(transactionBridgedMsend);
      }, new BigNumber(0))
      .div(10 ** coinMetadata.decimals);

    return { bridgedMsend };
  }, [address, mSendCoinMetadataMap, suiClient]);

  const { data: userSave, mutate: mutateUserSave } = useSWR<
    { bridgedMsend: BigNumber } | undefined
  >(`userSave-${address}`, userSaveFetcher, {
    onSuccess: (data) => {
      console.log("Refreshed user Save", data);
    },
    onError: (err) => {
      console.error("Failed to refresh user Save", err);
    },
  });
  useEffect(() => {
    setTimeout(mutateUserSave, 100);
  }, [mutateUserSave, address, mSendCoinMetadataMap, suiClient]);

  // User - Rootlets
  const ownedRootlets: BigNumber | undefined = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(rootletsJson).length > 0)
      return new BigNumber(
        (rootletsJson as Record<string, number>)[address] ?? 0,
      );
    return getOwnedKioskItemsOfType(ROOTLETS_TYPE);
  }, [address, getOwnedKioskItemsOfType]);

  // User - Bluefin Leagues
  const isInBluefinLeaguesSnapshot = useMemo(() => {
    if (!address) return undefined;

    return (
      bluefinLeaguesGoldJson.includes(address) ||
      bluefinLeaguesPlatinumJson.includes(address) ||
      bluefinLeaguesBlackJson.includes(address) ||
      bluefinLeaguesSapphireJson.includes(address)
    );
  }, [address]);

  // User - Bluefin SEND Traders
  const bluefinSendTradersVolumeUsd = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(bluefinSendTradersJson).length > 0)
      return new BigNumber(
        (bluefinSendTradersJson as Record<string, number>)[address] ?? 0,
      );
    return undefined;
  }, [address]);

  // User - Prime Machin
  const ownedPrimeMachin: BigNumber | undefined = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(primeMachinJson).length > 0)
      return new BigNumber(
        (primeMachinJson as Record<string, number>)[address] ?? 0,
      );
    return getOwnedKioskItemsOfType(PRIME_MACHIN_TYPE);
  }, [address, getOwnedKioskItemsOfType]);

  // User - Egg
  const ownedEgg: BigNumber | undefined = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(eggJson).length > 0)
      return new BigNumber((eggJson as Record<string, number>)[address] ?? 0);
    return getOwnedKioskItemsOfType(EGG_TYPE);
  }, [address, getOwnedKioskItemsOfType]);

  // User - DoubleUp Citizen
  const ownedDoubleUpCitizenFetcher = useCallback(async () => {
    if (!address) return undefined;

    if (Object.keys(doubleUpCitizenJson).length > 0)
      return new BigNumber(
        (doubleUpCitizenJson as Record<string, number>)[address] ?? 0,
      );

    const ownedKioskItemsOfType = getOwnedKioskItemsOfType(
      DOUBLEUP_CITIZEN_TYPE,
    );
    const objs = await getOwnedObjectsOfType(
      suiClient,
      address,
      DOUBLEUP_CITIZEN_TYPE,
    );

    if (ownedKioskItemsOfType === undefined) return undefined;

    return ownedKioskItemsOfType.plus(objs.length);
  }, [address, getOwnedKioskItemsOfType, suiClient]);

  const { data: ownedDoubleUpCitizen, mutate: mutateOwnedDoubleUpCitizen } =
    useSWR<BigNumber | undefined>(
      `ownedDoubleUpCitizen-${address}`,
      ownedDoubleUpCitizenFetcher,
      {
        onSuccess: (data) => {
          console.log("Refreshed owned DoubleUp Citizen", data);
        },
        onError: (err) => {
          console.error("Failed to refresh owned DoubleUp Citizen", err);
        },
      },
    );
  useEffect(() => {
    setTimeout(mutateOwnedDoubleUpCitizen, 100);
  }, [
    mutateOwnedDoubleUpCitizen,
    address,
    getOwnedKioskItemsOfType,
    suiClient,
  ]);

  // User - Kumo
  const ownedKumo: BigNumber | undefined = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(kumoJson).length > 0)
      return new BigNumber((kumoJson as Record<string, number>)[address] ?? 0);
    return getOwnedKioskItemsOfType(KUMO_TYPE);
  }, [address, getOwnedKioskItemsOfType]);

  // User - Anima
  const isInAnimaSnapshot = useMemo(() => {
    if (!address) return undefined;

    if (animaJson.length > 0) return (animaJson as string[]).includes(address);
    return undefined;
  }, [address]);

  // User - FUD
  const isInFudSnapshot = useMemo(() => {
    if (!address) return undefined;

    return fudJson.includes(address);
  }, [address]);

  // User - AAA
  const isInAaaSnapshot = useMemo(() => {
    if (!address) return undefined;

    return aaaJson.includes(address);
  }, [address]);

  // User - OCTO
  const isInOctoSnapshot = useMemo(() => {
    if (!address) return undefined;

    return octoJson.includes(address);
  }, [address]);

  // User - TISM
  const isInTismSnapshot = useMemo(() => {
    if (!address) return undefined;

    return tismJson.includes(address);
  }, [address]);

  const isLoading =
    userSendPoints === undefined ||
    userSuilendCapsules === undefined ||
    userSave === undefined ||
    ownedRootlets === undefined ||
    ownedPrimeMachin === undefined ||
    ownedEgg === undefined ||
    ownedDoubleUpCitizen === undefined ||
    ownedKumo === undefined;

  // Allocations
  const earlyUsers = {
    snapshotTaken: true,
    eligibleWallets: formatInteger(earlyUsersJson.length),
    totalAllocationPercent: new BigNumber(2),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(2).div(earlyUsersJson.length), // Flat
      },
    },
  };
  const sendPoints = {
    snapshotTaken: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(18),
    totalAllocationBreakdownMap: {
      thousand: {
        title: "Per 1K Points",
        percent: new BigNumber(18).div(totalAllocatedPoints.div(1000)), // Linear
      },
    },
  };
  const suilendCapsules = {
    snapshotTaken: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(0.3),
    totalAllocationBreakdownMap: {
      [SuilendCapsuleRarity.COMMON]: {
        title: "Per Common",
        percent: new BigNumber(0.1).div(700), // Linear
      },
      [SuilendCapsuleRarity.UNCOMMON]: {
        title: "Per Uncommon",
        percent: new BigNumber(0.1).div(200), // Linear
      },
      [SuilendCapsuleRarity.RARE]: {
        title: "Per Rare",
        percent: new BigNumber(0.1).div(50), // Linear
      },
    },
  };
  const save = {
    snapshotTaken: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(15),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per SLND",
        percent: new BigNumber(0.15).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const rootlets = {
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(rootletsJson).length > 0
        ? Object.keys(rootletsJson).length
        : 948,
    ),
    totalAllocationPercent: new BigNumber(1.111),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Rootlet",
        percent: new BigNumber(1.111).div(3333), // Linear
      },
    },
  };

  const bluefinLeagues = {
    snapshotTaken: true,
    eligibleWallets: formatInteger(
      bluefinLeaguesGoldJson.length +
        bluefinLeaguesPlatinumJson.length +
        bluefinLeaguesBlackJson.length +
        bluefinLeaguesSapphireJson.length,
    ),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.05).div(
          bluefinLeaguesGoldJson.length +
            bluefinLeaguesPlatinumJson.length +
            bluefinLeaguesBlackJson.length +
            bluefinLeaguesSapphireJson.length,
        ), // Flat
      },
    },
  };
  const bluefinSendTraders = {
    snapshotTaken: false,
    eligibleWallets: "TBC",
    // Object.keys(bluefinSendTradersJson).length > 0
    //   ? Object.keys(bluefinSendTradersJson).length
    //   : 400, // TODO (update once we have an initial snapshot)
    totalAllocationPercent: new BigNumber(0.125),
    totalAllocationBreakdownMap: {},
    // totalAllocationBreakdownMap: {
    //   thousandUsdVolume: {
    //     title: "Per $1K Volume",
    //     percent: new BigNumber(0.125).div(
    //       bluefinSendTradersTotalVolumeUsd.div(1000),
    //     ), // Linear
    //   },
    // },
  };

  const primeMachin = {
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(primeMachinJson).length > 0
        ? Object.keys(primeMachinJson).length
        : 918,
    ),
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Prime Machin",
        percent: new BigNumber(0.1).div(3333), // Linear
      },
    },
  };
  const egg = {
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(eggJson).length > 0 ? Object.keys(eggJson).length : 2109,
    ),
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Egg",
        percent: new BigNumber(0.1).div(9546), // Linear
      },
    },
  };
  const doubleUpCitizen = {
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(doubleUpCitizenJson).length > 0
        ? Object.keys(doubleUpCitizenJson).length
        : 713,
    ),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per DoubleUp Citizen",
        percent: new BigNumber(0.05).div(2878), // Linear
      },
    },
  };
  const kumo = {
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(kumoJson).length > 0 ? Object.keys(kumoJson).length : 479,
    ),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Kumo",
        percent: new BigNumber(0.05).div(2222), // Linear
      },
    },
  };

  const anima = {
    snapshotTaken: false,
    eligibleWallets: undefined, //animaJson.length > 0 ? animaJson.length : undefined,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {},
  };

  const fud = {
    snapshotTaken: false,
    eligibleWallets: 5000, // Top 5,000 FUD holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(5000), // Flat
      },
    },
  };
  const aaa = {
    snapshotTaken: false,
    eligibleWallets: 5000, // Top 5,000 AAA holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(5000), // Flat
      },
    },
  };
  const octo = {
    snapshotTaken: false,
    eligibleWallets: 1000, // Top 1,000 OCTO holders
    totalAllocationPercent: new BigNumber(0.01),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.01).div(1000), // Flat
      },
    },
  };
  const tism = {
    snapshotTaken: false,
    eligibleWallets: 1000, // Top 1,000 TISM holders
    totalAllocationPercent: new BigNumber(0.01),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.01).div(1000), // Flat
      },
    },
  };

  const allocations: Allocation[] = [
    {
      id: AllocationId.EARLY_USERS,
      src: "/assets/send/lending/early-users.png",
      hoverSrc: "/assets/send/lending/early-users-hover.mp4",
      title: "Early Users",
      description:
        "Early users are those who used Suilend prior to the launch of SEND points.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.LENDING,
      cta: undefined,
      snapshotTaken: earlyUsers.snapshotTaken,
      eligibleWallets: earlyUsers.eligibleWallets,
      totalAllocationPercent: earlyUsers.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        earlyUsers.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        isInEarlyUsersSnapshot !== undefined
          ? isInEarlyUsersSnapshot
            ? earlyUsers.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SEND_POINTS,
      src: "/assets/send/points/send-points.png",
      hoverSrc: "/assets/send/points/send-points-hover.mp4",
      title: "SEND Points",
      description:
        "SEND Points were distributed as rewards for depositing/borrowing activity on Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: {
        title: "Earn",
        href: "/dashboard",
      },
      snapshotTaken: sendPoints.snapshotTaken,
      eligibleWallets: sendPoints.eligibleWallets,
      totalAllocationPercent: sendPoints.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        sendPoints.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        userSendPoints !== undefined
          ? userSendPoints.owned
              .div(1000)
              .times(sendPoints.totalAllocationBreakdownMap.thousand.percent)
          : undefined,
      userClaimedMsend:
        userSendPoints !== undefined ? userSendPoints.claimedMsend : undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: "/assets/send/nft/suilend-capsules.png",
      hoverSrc: "/assets/send/nft/suilend-capsules-hover.mp4",
      title: "Suilend Capsules",
      description:
        "A token of appreciation awarded for outstanding community contributions to Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: undefined,
      snapshotTaken: suilendCapsules.snapshotTaken,
      eligibleWallets: suilendCapsules.eligibleWallets,
      totalAllocationPercent: suilendCapsules.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        suilendCapsules.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        userSuilendCapsules !== undefined
          ? new BigNumber(
              userSuilendCapsules.ownedMap[SuilendCapsuleRarity.COMMON].times(
                suilendCapsules.totalAllocationBreakdownMap[
                  SuilendCapsuleRarity.COMMON
                ].percent,
              ),
            )
              .plus(
                userSuilendCapsules.ownedMap[
                  SuilendCapsuleRarity.UNCOMMON
                ].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.UNCOMMON
                  ].percent,
                ),
              )
              .plus(
                userSuilendCapsules.ownedMap[SuilendCapsuleRarity.RARE].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.RARE
                  ].percent,
                ),
              )
          : undefined,
      userClaimedMsend:
        userSuilendCapsules !== undefined
          ? userSuilendCapsules.claimedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SAVE,
      src: "/assets/send/token/save.png",
      hoverSrc: "/assets/send/token/save-hover.mp4",
      title: "SAVE",
      description:
        "Suilend thrives thanks to the unwavering support of SLND holders. We honor our roots on Solana with this token of appreciation.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Redeem on Save",
        href: "https://save.finance/save",
      },
      snapshotTaken: save.snapshotTaken,
      eligibleWallets: save.eligibleWallets,
      totalAllocationPercent: save.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(save.totalAllocationBreakdownMap),

      userAllocationPercent: undefined,
      userClaimedMsend: undefined,
      userBridgedMsend:
        userSave !== undefined ? userSave.bridgedMsend : undefined,
    },
    {
      id: AllocationId.ROOTLETS,
      src: "/assets/send/nft/rootlets.png",
      hoverSrc: "/assets/send/nft/rootlets-hover.mp4",
      title: "Rootlets",
      description:
        "Rootlets are the companion NFT community to Suilend. It's the most premium art collection on Sui, but the art is good tho.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/rootlets?bottomTab=trades&tab=items",
      },
      snapshotTaken: rootlets.snapshotTaken,
      eligibleWallets: rootlets.eligibleWallets,
      totalAllocationPercent: rootlets.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        rootlets.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        ownedRootlets !== undefined
          ? ownedRootlets.times(
              rootlets.totalAllocationBreakdownMap.one.percent,
            )
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.BLUEFIN_LEAGUES,
      src: "/assets/send/trading/bluefin-leagues.png",
      hoverSrc: "/assets/send/trading/bluefin-leagues-hover.mp4",
      title: "Bluefin Leagues",
      description:
        "Bluefin Leagues offer a structured recognition system to reward users for their engagement and trading activities on the Bluefin platform.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TRADING,
      snapshotTaken: bluefinLeagues.snapshotTaken,
      eligibleWallets: bluefinLeagues.eligibleWallets,
      totalAllocationPercent: bluefinLeagues.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinLeagues.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        isInBluefinLeaguesSnapshot !== undefined
          ? isInBluefinLeaguesSnapshot
            ? bluefinLeagues.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.BLUEFIN_SEND_TRADERS,
      src: "/assets/send/trading/bluefin-send-traders.png",
      hoverSrc: "/assets/send/trading/bluefin-send-traders-hover.mp4",
      title: "Bluefin SEND Traders",
      description:
        "For users who traded the SEND pre-launch market on Bluefin.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TRADING,
      cta: {
        title: "Trade",
        href: "https://trade.bluefin.io/SEND-PERP",
      },
      snapshotTaken: bluefinSendTraders.snapshotTaken,
      eligibleWallets: bluefinSendTraders.eligibleWallets,
      totalAllocationPercent: bluefinSendTraders.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinSendTraders.totalAllocationBreakdownMap,
      ),

      userAllocationPercent: undefined,
      // bluefinSendTradersVolumeUsd !== undefined
      //   ? (bluefinSendTradersVolumeUsd as BigNumber)
      //       .div(1000)
      //       .times(
      //         bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdVolume
      //           .percent,
      //       )
      //   : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.PRIME_MACHIN,
      src: "/assets/send/nft/prime-machin.png",
      hoverSrc: "/assets/send/nft/prime-machin-hover.mp4",
      title: "Prime Machin",
      description:
        "Prime Machin is a collection of 3,333 robots featuring dynamic coloring, storytelling and a focus on art.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/prime-machin?bottomTab=trades&tab=items",
      },
      snapshotTaken: primeMachin.snapshotTaken,
      eligibleWallets: primeMachin.eligibleWallets,
      totalAllocationPercent: primeMachin.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        primeMachin.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        ownedPrimeMachin !== undefined
          ? ownedPrimeMachin.times(
              primeMachin.totalAllocationBreakdownMap.one.percent,
            )
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.EGG,
      src: "/assets/send/nft/egg.png",
      hoverSrc: "/assets/send/nft/egg-hover.mp4",
      title: "Egg",
      description:
        "Aftermath is building the next-gen on-chain trading platform. Swap, Trade, Stake, & MEV Infra. They also have eggs!",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/egg?bottomTab=trades&tab=items",
      },
      snapshotTaken: egg.snapshotTaken,
      eligibleWallets: egg.eligibleWallets,
      totalAllocationPercent: egg.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdownMap),

      userAllocationPercent:
        ownedEgg !== undefined
          ? ownedEgg.times(egg.totalAllocationBreakdownMap.one.percent)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.DOUBLEUP_CITIZEN,
      src: "/assets/send/nft/doubleup-citizen.png",
      hoverSrc: "/assets/send/nft/doubleup-citizen-hover.mp4",
      title: "DoubleUp Citizen",
      description:
        "Citizens are the avatars through which you can immerse yourself into the flourishing World of DoubleUp.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/doubleup-citizen?bottomTab=trades&tab=items",
      },
      snapshotTaken: doubleUpCitizen.snapshotTaken,
      eligibleWallets: doubleUpCitizen.eligibleWallets,
      totalAllocationPercent: doubleUpCitizen.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        doubleUpCitizen.totalAllocationBreakdownMap,
      ),

      userAllocationPercent:
        ownedDoubleUpCitizen !== undefined
          ? ownedDoubleUpCitizen.times(
              doubleUpCitizen.totalAllocationBreakdownMap.one.percent,
            )
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.KUMO,
      src: "/assets/send/nft/kumo.png",
      hoverSrc: "/assets/send/nft/kumo-hover.mp4",
      title: "Kumo",
      description:
        "Kumo, Lucky Kat's clumsy cloud-cat mascot, debuts with 2,222 customizable dNFTs! Holders enjoy $KOBAN airdrops & in-game perks across the Lucky Kat gaming ecosystem.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/kumo?bottomTab=trades&tab=items",
      },
      snapshotTaken: kumo.snapshotTaken,
      eligibleWallets: kumo.eligibleWallets,
      totalAllocationPercent: kumo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdownMap),

      userAllocationPercent:
        ownedKumo !== undefined
          ? ownedKumo.times(kumo.totalAllocationBreakdownMap.one.percent)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.ANIMA,
      src: "/assets/send/nft/anima.png",
      hoverSrc: "/assets/send/nft/anima-hover.mp4",
      title: "Anima",
      description:
        "Anima's game-ready Genesis Avatars: the first-ever dNFT collection on Sui. Anima X Rootlets snapshot, December 31st.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Mint",
        href: "https://anima.nexus/drop/genesis",
      },
      snapshotTaken: anima.snapshotTaken,
      eligibleWallets: anima.eligibleWallets,
      totalAllocationPercent: anima.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        anima.totalAllocationBreakdownMap,
      ),

      userAllocationPercent: undefined,
      // isInAnimaSnapshot !== undefined
      //   ? isInAnimaSnapshot
      //     ? anima.totalAllocationBreakdownMap!.percent
      //     : new BigNumber(0)
      //   : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.FUD,
      src: "/assets/send/token/fud.png",
      hoverSrc: "/assets/send/token/fud-hover.mp4",
      title: "FUD",
      description: "FUD is the OG culture coin on Sui.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-FUD",
      },
      snapshotTaken: fud.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(fud.eligibleWallets)}`,
      totalAllocationPercent: fud.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(fud.totalAllocationBreakdownMap),

      userAllocationPercent:
        isInFudSnapshot !== undefined
          ? isInFudSnapshot
            ? fud.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.AAA,
      src: "/assets/send/token/aaa.png",
      hoverSrc: "/assets/send/token/aaa-hover.mp4",
      title: "AAA",
      description:
        "AAA Cat is Sui's fastest-growing, top cat meme coin. Built by the community for the community. Can't Stop, Won't Stop!",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-AAA",
      },
      snapshotTaken: aaa.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: aaa.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(aaa.totalAllocationBreakdownMap),

      userAllocationPercent:
        isInAaaSnapshot !== undefined
          ? isInAaaSnapshot
            ? aaa.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.OCTO,
      src: "/assets/send/token/octo.png",
      hoverSrc: "/assets/send/token/octo-hover.mp4",
      title: "OCTO",
      description:
        "$OCTO brings fun and community together while crafting a unique Lofi-inspired IP for all to enjoy!",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-OCTO",
      },
      snapshotTaken: octo.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: octo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(octo.totalAllocationBreakdownMap),

      userAllocationPercent:
        isInOctoSnapshot !== undefined
          ? isInOctoSnapshot
            ? octo.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.TISM,
      src: "/assets/send/token/tism.png",
      hoverSrc: "/assets/send/token/tism-hover.mp4",
      title: "TISM",
      description: "got tism?",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-TISM",
      },
      snapshotTaken: tism.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: tism.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(tism.totalAllocationBreakdownMap),

      userAllocationPercent:
        isInTismSnapshot !== undefined
          ? isInTismSnapshot
            ? tism.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
  ];

  // Burn SEND Points and Suilend Capsules
  const burnSendPoints = async (transaction: Transaction) => {
    if (!address) return;

    // TODO: Claim SEND Points from obligations

    // Merge SEND Points coins
    const coins = (
      await suiClient.getCoins({
        owner: address,
        coinType: NORMALIZED_SEND_POINTS_COINTYPE,
      })
    ).data;
    if (coins.length === 0) throw new Error("No SEND Points in wallet");

    const mergeCoin = coins[0];
    if (coins.length > 1) {
      transaction.mergeCoins(
        transaction.object(mergeCoin.coinObjectId),
        coins.map((c) => transaction.object(c.coinObjectId)).slice(1),
      );
    }

    // Burn SEND Points
    const mSend = transaction.moveCall({
      target: `${BURN_CONTRACT_PACKAGE_ID}::points::burn_points`,
      typeArguments: [NORMALIZED_mSEND_3_MONTHS_COINTYPE],
      arguments: [
        transaction.object(POINTS_MANAGER_OBJECT_ID),
        transaction.object(mergeCoin.coinObjectId),
      ],
    });

    // Transfer mSEND to user
    transaction.transferObjects([mSend], transaction.pure.address(address));
  };

  const burnSuilendCapsules = async (transaction: Transaction) => {
    if (!address) return;

    // Get Suilend Capsules owned by user
    const objs = await getOwnedObjectsOfType(
      suiClient,
      address,
      SUILEND_CAPSULE_TYPE,
    );

    // Burn Suilend Capsules
    const mSendCoins = [];

    for (const obj of objs) {
      const mSendCoin = transaction.moveCall({
        target: `${BURN_CONTRACT_PACKAGE_ID}::capsule::burn_capsule`,
        typeArguments: [NORMALIZED_mSEND_3_MONTHS_COINTYPE],
        arguments: [
          transaction.object(CAPSULE_MANAGER_OBJECT_ID),
          transaction.object(obj.data?.objectId as string),
        ],
      });

      mSendCoins.push(mSendCoin);
    }

    // Merge mSEND coins
    const mergeCoin = mSendCoins[0];
    if (mSendCoins.length > 1) {
      transaction.mergeCoins(
        transaction.object(mergeCoin),
        mSendCoins.map((c) => transaction.object(c)).slice(1),
      );
    }

    // Transfer mSEND to user
    transaction.transferObjects([mergeCoin], transaction.pure.address(address));
  };

  const burnSendPointsSuilendCapsules = async () => {
    if (!address) return;
    if (userSendPoints === undefined || userSuilendCapsules === undefined)
      return;

    const coinMetadata =
      mSendCoinMetadataMap?.[NORMALIZED_mSEND_3_MONTHS_COINTYPE];
    if (!coinMetadata) return undefined;

    const transaction = new Transaction();
    try {
      const ownedSendPoints = userSendPoints.owned;
      const ownedSuilendCapsules = Object.values(
        userSuilendCapsules.ownedMap,
      ).reduce((acc, val) => acc.plus(val), new BigNumber(0));

      if (ownedSendPoints.gt(0)) await burnSendPoints(transaction);
      if (ownedSuilendCapsules.gt(0)) await burnSuilendCapsules(transaction);

      const res = await signExecuteAndWaitForTransaction(transaction);
      const txUrl = explorer.buildTxUrl(res.digest);

      const balanceChange = getBalanceChange(res, address, {
        coinType: NORMALIZED_mSEND_3_MONTHS_COINTYPE,
        ...coinMetadata,
      });

      toast.success(
        [
          "Converted",
          [
            ownedSendPoints.gt(0)
              ? `${formatToken(ownedSendPoints, { exact: false })} SEND Points`
              : undefined,
            ownedSuilendCapsules.gt(0)
              ? `${formatToken(ownedSuilendCapsules, { exact: false })} Suilend Capsules`
              : undefined,
          ]
            .filter(Boolean)
            .join(" and "),
          "to",
          balanceChange !== undefined
            ? `${formatToken(balanceChange, { exact: false })} mSEND`
            : "mSEND",
        ].join(" "),
        {
          action: (
            <TextLink className="block" href={txUrl}>
              View tx on {explorer.name}
            </TextLink>
          ),
          duration: TX_TOAST_DURATION,
        },
      );
    } catch (err) {
      toast.error(
        "Failed to convert SEND Points and/or Suilend Capsules to mSEND",
        { description: (err as Error)?.message || "An unknown error occurred" },
      );
    } finally {
      await mutateUserSendPoints();
      await mutateUserSuilendCapsules();
    }
  };

  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="relative flex w-full flex-col items-center">
        <SendHeader />

        <div className="relative z-[2] flex w-full flex-col items-center">
          <div className="flex w-full flex-col items-center gap-12 pb-16 pt-36 md:gap-16 md:pb-20 md:pt-12">
            <HeroSection allocations={allocations} isLoading={isLoading} />

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {allocations.map((allocation) => (
                <AllocationCard
                  key={allocation.title}
                  allocation={allocation}
                />
              ))}
            </div>
          </div>

          {Date.now() >= TGE_TIMESTAMP_MS && (
            <>
              <Separator />
              <ClaimSection
                allocations={allocations}
                isLoading={isLoading}
                ownedSendPoints={userSendPoints?.owned}
                ownedSuilendCapsulesMap={userSuilendCapsules?.ownedMap}
                suilendCapsulesTotalAllocationBreakdownMap={
                  suilendCapsules.totalAllocationBreakdownMap
                }
                burnSendPointsSuilendCapsules={burnSendPointsSuilendCapsules}
              />
            </>
          )}

          <Separator />
          <TokenomicsSection />
        </div>
      </div>
    </>
  );
}
