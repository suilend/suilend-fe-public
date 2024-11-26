import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

import BigNumber from "bignumber.js";

import {
  isSendPoints,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui";

import AllocationCardsSection from "@/components/send/AllocationCardsSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import ImpersonationModeBanner from "@/components/shared/ImpersonationModeBanner";
import { useLoadedAppContext } from "@/contexts/AppContext";
import {
  NORMALIZED_OCTO_COINTYPE,
  NORMALIZED_TISM_COINTYPE,
} from "@/lib/coinType";
import { formatInteger } from "@/lib/format";
import { getPointsStats } from "@/lib/points";

import aaaJson from "./aaa.json";
import animaJson from "./anima.json";
import bluefinLeaguesBlackJson from "./bluefin-leagues-black.json";
import bluefinLeaguesGoldJson from "./bluefin-leagues-gold.json";
import bluefinLeaguesPlatinumJson from "./bluefin-leagues-platinum.json";
import bluefinLeaguesSapphireJson from "./bluefin-leagues-sapphire.json";
import bluefinSendTradersJson from "./bluefin-send-traders.json";
import doubleUpCitizenJson from "./doubleup-citizen.json";
import earlyUsersJson from "./early-users.json";
import eggJson from "./egg.json";
import fudJson from "./fud.json";
import kumoJson from "./kumo.json";
import octoJson from "./octo.json";
import primeMachinJson from "./prime-machin.json";
import rootletsJson from "./rootlets.json";
import tismJson from "./tism.json";

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
  OCTO = "octo",
  AAA = "aaa",
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
  title: string;
  description: string;
  allocationType: AllocationType;
  assetType?: AssetType;
  cta?: {
    // Undefined for Early Users, Bluefin Leagues
    title: string;
    href: string;
  };
  snapshotTaken?: boolean; // Undefined for Suilend Capsules, SEND Points, and SAVE
  eligibleWallets?: string; // Undefined for Suilend Capsules, SEND Points, and SAVE
  totalAllocationPercent: BigNumber;
  totalAllocationBreakdown: {
    title: string;
    percent: BigNumber;
  }[];
  userAllocationPercent?: BigNumber; // Undefined for SAVE
};

enum SuilendCapsuleRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
}

const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

enum BluefinLeagues {
  GOLD = "gold",
  PLATINUM = "platinum",
  BLACK = "black",
  SAPPHIRE = "sapphire",
}

export default function Send() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { data } = useLoadedAppContext();

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

  const bluefinSendTradersTotalVolumeUsd = useMemo(
    () =>
      Object.values(bluefinSendTradersJson as number[]).reduce(
        (acc, volumeUsd) => acc.plus(volumeUsd),
        new BigNumber(0),
      ),
    [],
  );

  // User - Early Users
  const isEarlyUser = address ? earlyUsersJson.includes(address) : undefined;

  // User - SEND Points
  const totalSendPoints = address
    ? getPointsStats(data.rewardMap, data.obligations).totalPoints.total
    : undefined;

  // User - Suilend Capsules
  const [ownedSuilendCapsulesMap, setOwnedSuilendCapsulesMap] = useState<
    Record<SuilendCapsuleRarity, BigNumber> | undefined
  >(undefined);

  const getOwnedSuilendCapsules = useCallback(async () => {
    const allObjs = [];
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const objs = await suiClient.getOwnedObjects({
        owner: address!,
        cursor,
        filter: {
          StructType: SUILEND_CAPSULE_TYPE,
        },
        options: { showContent: true },
      });

      allObjs.push(...objs.data);
      cursor = objs.nextCursor;
      hasNextPage = objs.hasNextPage;
    }

    const commonCapsuleObjs = allObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.COMMON,
    );
    const uncommonCapsuleObjs = allObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.UNCOMMON,
    );
    const rareCapsuleObjs = allObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity === SuilendCapsuleRarity.RARE,
    );

    setOwnedSuilendCapsulesMap({
      [SuilendCapsuleRarity.COMMON]: new BigNumber(commonCapsuleObjs.length),
      [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
        uncommonCapsuleObjs.length,
      ),
      [SuilendCapsuleRarity.RARE]: new BigNumber(rareCapsuleObjs.length),
    });
  }, [suiClient, address]);

  useEffect(() => {
    if (!address) setOwnedSuilendCapsulesMap(undefined);
    else getOwnedSuilendCapsules();
  }, [address, getOwnedSuilendCapsules]);

  // User - Save

  // User - Rootlets
  const rootletsSnapshotOwnedCount =
    address && Object.keys(rootletsJson).length > 0
      ? new BigNumber((rootletsJson as Record<string, number>)[address] ?? 0)
      : undefined;

  // User - Bluefin Leagues
  const bluefinLeaguesLeague = useMemo(() => {
    if (!address) return undefined;

    if (bluefinLeaguesGoldJson.includes(address)) return BluefinLeagues.GOLD;
    if (bluefinLeaguesPlatinumJson.includes(address))
      return BluefinLeagues.PLATINUM;
    if (bluefinLeaguesBlackJson.includes(address)) return BluefinLeagues.BLACK;
    if (bluefinLeaguesSapphireJson.includes(address))
      return BluefinLeagues.SAPPHIRE;
    return null;
  }, [address]);

  // User - Bluefin SEND Traders
  const bluefinSendTradersVolumeUsd =
    address && Object.keys(bluefinSendTradersJson).length > 0
      ? new BigNumber(
          (bluefinSendTradersJson as Record<string, number>)[address] ?? 0,
        )
      : undefined;

  // User - NFTs
  const isInPrimeMachinSnapshot =
    address && primeMachinJson.length > 0
      ? (primeMachinJson as string[]).includes(address)
      : undefined;
  const isInEggSnapshot =
    address && eggJson.length > 0
      ? (eggJson as string[]).includes(address)
      : undefined;
  const isInDoubleUpCitizenSnapshot =
    address && doubleUpCitizenJson.length > 0
      ? (doubleUpCitizenJson as string[]).includes(address)
      : undefined;
  const isInKumoSnapshot =
    address && kumoJson.length > 0
      ? (kumoJson as string[]).includes(address)
      : undefined;
  const isInAnimaSnapshot =
    address && animaJson.length > 0
      ? (animaJson as string[]).includes(address)
      : undefined;

  // User - Tokens
  const isInFudSnapshot =
    address && fudJson.length > 0
      ? (fudJson as string[]).includes(address)
      : undefined;
  const isInOctoSnapshot =
    address && octoJson.length > 0
      ? (octoJson as string[]).includes(address)
      : undefined;
  const isInAaaSnapshot =
    address && aaaJson.length > 0
      ? (aaaJson as string[]).includes(address)
      : undefined;
  const isInTismSnapshot =
    address && tismJson.length > 0
      ? (tismJson as string[]).includes(address)
      : undefined;

  // Allocations
  const earlyUsersTotalAllocationPercent = new BigNumber(
    earlyUsersJson.length * 500,
  )
    .div(2 * SEND_TOTAL_SUPPLY)
    .times(100);
  const sendPointsTotalAllocationPercent = new BigNumber(20).minus(
    earlyUsersTotalAllocationPercent,
  );

  const earlyUsers = {
    snapshotTaken: true,
    eligibleWallets: earlyUsersJson.length,
    totalAllocationPercent: earlyUsersTotalAllocationPercent,
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: earlyUsersTotalAllocationPercent.div(earlyUsersJson.length), // Flat
      },
    },
  };
  const sendPoints = {
    totalAllocationPercent: sendPointsTotalAllocationPercent,
    totalAllocationBreakdown: {
      thousandPoints: {
        title: "Per 1K Points",
        percent: sendPointsTotalAllocationPercent.div(
          totalAllocatedPoints.div(1000),
        ), // Linear
      },
    },
  };
  const suilendCapsules = {
    totalAllocationPercent: new BigNumber(0.3),
    totalAllocationBreakdown: {
      [SuilendCapsuleRarity.COMMON]: {
        title: "Per Common",
        percent: new BigNumber(0.1).div(1240 - 807), // TODO (update once fully distributed), Linear
      },
      [SuilendCapsuleRarity.UNCOMMON]: {
        title: "Per Uncommon",
        percent: new BigNumber(0.1).div(309 - 196), // TODO (update once fully distributed), Linear
      },
      [SuilendCapsuleRarity.RARE]: {
        title: "Per Rare",
        percent: new BigNumber(0.1).div(101 - 76), // TODO (update once fully distributed), Linear
      },
    },
  };
  const save = {
    totalAllocationPercent: new BigNumber(15),
    totalAllocationBreakdown: {
      slnd: {
        title: "Per SLND",
        percent: new BigNumber(0.15).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const rootlets = {
    snapshotTaken: Object.keys(rootletsJson).length > 0,
    eligibleWallets:
      Object.keys(rootletsJson).length > 0
        ? Object.keys(rootletsJson).length
        : 2980,
    totalAllocationPercent: new BigNumber(1.111),
    totalAllocationBreakdown: {
      rootlet: {
        title: "Per Rootlet",
        percent: new BigNumber(1.111).div(3333), // Linear
      },
    },
  };

  const bluefinLeagues = {
    snapshotTaken: true,
    eligibleWallets:
      bluefinLeaguesGoldJson.length +
      bluefinLeaguesPlatinumJson.length +
      bluefinLeaguesBlackJson.length +
      bluefinLeaguesSapphireJson.length,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      [BluefinLeagues.GOLD]: {
        title: "Gold",
        percent: new BigNumber(0.015).div(bluefinLeaguesGoldJson.length), // Flat
      },
      [BluefinLeagues.PLATINUM]: {
        title: "Platinum",
        percent: new BigNumber(0.01).div(bluefinLeaguesPlatinumJson.length), // Flat
      },
      [BluefinLeagues.BLACK]: {
        title: "Black",
        percent: new BigNumber(0.01).div(bluefinLeaguesBlackJson.length), // Flat
      },
      [BluefinLeagues.SAPPHIRE]: {
        title: "Sapphire",
        percent: new BigNumber(0.015).div(bluefinLeaguesSapphireJson.length), // Flat
      },
    },
  };
  const bluefinSendTraders = {
    snapshotTaken: Object.keys(bluefinSendTradersJson).length > 0,
    eligibleWallets:
      Object.keys(bluefinSendTradersJson).length > 0
        ? Object.keys(bluefinSendTradersJson).length
        : 400, // TODO (update once we have an initial snapshot)
    totalAllocationPercent: new BigNumber(0.125),
    totalAllocationBreakdown: {
      thousandUsdVolume: {
        title: "Per $1K Volume",
        percent: new BigNumber(0.125).div(
          bluefinSendTradersTotalVolumeUsd.div(1000),
        ), // Linear
      },
    },
  };

  const primeMachin = {
    snapshotTaken: primeMachinJson.length > 0,
    eligibleWallets: primeMachinJson.length > 0 ? primeMachinJson.length : 3193,
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(
          primeMachinJson.length > 0 ? primeMachinJson.length : 3193,
        ), // Flat
      },
    },
  };
  const egg = {
    snapshotTaken: eggJson.length > 0,
    eligibleWallets: eggJson.length > 0 ? eggJson.length : 8434,
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(
          eggJson.length > 0 ? eggJson.length : 8434,
        ), // Flat
      },
    },
  };
  const doubleUpCitizen = {
    snapshotTaken: doubleUpCitizenJson.length > 0,
    eligibleWallets:
      doubleUpCitizenJson.length > 0 ? doubleUpCitizenJson.length : 781,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.05).div(
          doubleUpCitizenJson.length > 0 ? doubleUpCitizenJson.length : 781,
        ), // Flat
      },
    },
  };
  const kumo = {
    snapshotTaken: kumoJson.length > 0,
    eligibleWallets: kumoJson.length > 0 ? kumoJson.length : 1923,
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(
          kumoJson.length > 0 ? kumoJson.length : 1923,
        ), // Flat
      },
    },
  };
  const anima = {
    snapshotTaken: animaJson.length > 0,
    eligibleWallets: animaJson.length > 0 ? animaJson.length : undefined,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown:
      animaJson.length > 0
        ? {
            wallet: {
              title: "Per wallet",
              percent: new BigNumber(0.05).div(animaJson.length), // Flat
            },
          }
        : {},
  };

  const fud = {
    snapshotTaken: fudJson.length > 0,
    eligibleWallets: 10000, // Top 10,000 FUD holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(10000), // Flat
      },
    },
  };
  const octo = {
    snapshotTaken: octoJson.length > 0,
    eligibleWallets: 300, // Top 300 OCTO holders
    totalAllocationPercent: new BigNumber(0.017),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.017).div(300), // Flat
      },
    },
  };
  const aaa = {
    snapshotTaken: aaaJson.length > 0,
    eligibleWallets: 1000, // Top 1,000 AAA holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(1000), // Flat
      },
    },
  };
  const tism = {
    snapshotTaken: tismJson.length > 0,
    eligibleWallets: 300, // Top 300 TISM holders
    totalAllocationPercent: new BigNumber(0.01),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.01).div(300), // Flat
      },
    },
  };

  const allocations: Allocation[] = [
    {
      id: AllocationId.EARLY_USERS,
      src: "/assets/send/early-users.png",
      title: "Early Users",
      description:
        "Early users are those who used Suilend prior to the launch of SEND points.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.LENDING,
      snapshotTaken: earlyUsers.snapshotTaken,
      eligibleWallets: formatInteger(earlyUsers.eligibleWallets),
      totalAllocationPercent: earlyUsers.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        earlyUsers.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        isEarlyUser !== undefined
          ? isEarlyUser
            ? earlyUsers.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.SEND_POINTS,
      src: "/assets/send/send-points.png",
      title: "SEND Points",
      description:
        "SEND Points were distributed as rewards for depositing/borrowing activity on Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: {
        title: "Earn",
        href: "/dashboard",
      },
      totalAllocationPercent: sendPoints.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        sendPoints.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        totalSendPoints !== undefined
          ? totalSendPoints
              .div(1000)
              .times(sendPoints.totalAllocationBreakdown.thousandPoints.percent)
          : undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: "", // TODO (update once we have an image)
      title: "Suilend Capsules",
      description:
        "A token of appreciation awarded for outstanding community contributions to Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/suilend-capsule?bottomTab=trades&tab=items",
      },
      totalAllocationPercent: suilendCapsules.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        suilendCapsules.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        ownedSuilendCapsulesMap !== undefined
          ? new BigNumber(
              ownedSuilendCapsulesMap[SuilendCapsuleRarity.COMMON].times(
                suilendCapsules.totalAllocationBreakdown[
                  SuilendCapsuleRarity.COMMON
                ].percent,
              ),
            )
              .plus(
                ownedSuilendCapsulesMap[SuilendCapsuleRarity.UNCOMMON].times(
                  suilendCapsules.totalAllocationBreakdown[
                    SuilendCapsuleRarity.UNCOMMON
                  ].percent,
                ),
              )
              .plus(
                ownedSuilendCapsulesMap[SuilendCapsuleRarity.RARE].times(
                  suilendCapsules.totalAllocationBreakdown[
                    SuilendCapsuleRarity.RARE
                  ].percent,
                ),
              )
          : undefined,
    },
    {
      id: AllocationId.SAVE,
      src: "/assets/send/save.png",
      title: "SAVE",
      description: "A token gesture to our roots on Solana with SLND holders.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TOKEN,
      cta: {
        title: "View allocation",
        href: "https://save.finance/save",
      },
      totalAllocationPercent: save.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(save.totalAllocationBreakdown),
    },
    {
      id: AllocationId.ROOTLETS,
      src: "", // TODO (update once we have an image)
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
      eligibleWallets: formatInteger(rootlets.eligibleWallets),
      totalAllocationPercent: rootlets.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        rootlets.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        rootletsSnapshotOwnedCount !== undefined
          ? (rootletsSnapshotOwnedCount as BigNumber).times(
              rootlets.totalAllocationBreakdown.rootlet.percent,
            )
          : undefined,
    },

    {
      id: AllocationId.BLUEFIN_LEAGUES,
      src: "/assets/send/bluefin-leagues.png",
      title: "Bluefin Leagues",
      description:
        "Bluefin Leagues offer a structured recognition system to reward users for their engagement and trading activities on the Bluefin platform.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TRADING,
      snapshotTaken: bluefinLeagues.snapshotTaken,
      eligibleWallets: formatInteger(bluefinLeagues.eligibleWallets),
      totalAllocationPercent: bluefinLeagues.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinLeagues.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        bluefinLeaguesLeague !== undefined
          ? bluefinLeaguesLeague !== null
            ? bluefinLeagues.totalAllocationBreakdown[bluefinLeaguesLeague]
                .percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.BLUEFIN_SEND_TRADERS,
      src: "", // TODO (update once we have an image)
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
      eligibleWallets: formatInteger(bluefinSendTraders.eligibleWallets),
      totalAllocationPercent: bluefinSendTraders.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinSendTraders.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        bluefinSendTradersVolumeUsd !== undefined
          ? (bluefinSendTradersVolumeUsd as BigNumber)
              .div(1000)
              .times(
                bluefinSendTraders.totalAllocationBreakdown.thousandUsdVolume
                  .percent,
              )
          : undefined,
    },

    {
      id: AllocationId.PRIME_MACHIN,
      src: "/assets/send/prime-machin.png",
      title: "Prime Machin",
      description:
        "Prime Machin is a collection of 3,333 robots featuring dynamic coloring, storytelling and a focus on art.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/prime-machin?bottomTab=trades&tab=items",
      },
      snapshotTaken: primeMachin.snapshotTaken,
      eligibleWallets: formatInteger(primeMachin.eligibleWallets),
      totalAllocationPercent: primeMachin.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        primeMachin.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        isInPrimeMachinSnapshot !== undefined
          ? isInPrimeMachinSnapshot
            ? primeMachin.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.EGG,
      src: "/assets/send/egg.png",
      title: "Egg",
      description:
        "Aftermath is building the next-gen on-chain trading platform. Swap, Trade, Stake, & MEV Infra. They also have eggs!",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/egg?bottomTab=trades&tab=items",
      },
      snapshotTaken: egg.snapshotTaken,
      eligibleWallets: formatInteger(egg.eligibleWallets),
      totalAllocationPercent: egg.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdown),
      userAllocationPercent:
        isInEggSnapshot !== undefined
          ? isInEggSnapshot
            ? egg.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.DOUBLEUP_CITIZEN,
      src: "/assets/send/doubleup-citizen.png",
      title: "DoubleUp Citizen",
      description:
        "Citizens are the avatars through which you can immerse yourself into the flourishing World of DoubleUp.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/doubleup-citizen?bottomTab=trades&tab=items",
      },
      snapshotTaken: doubleUpCitizen.snapshotTaken,
      eligibleWallets: formatInteger(doubleUpCitizen.eligibleWallets),
      totalAllocationPercent: doubleUpCitizen.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        doubleUpCitizen.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        isInDoubleUpCitizenSnapshot !== undefined
          ? isInDoubleUpCitizenSnapshot
            ? doubleUpCitizen.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.KUMO,
      src: "/assets/send/kumo.png",
      title: "Kumo",
      description:
        "Kumo, Lucky Kat's clumsy cloud-cat mascot, debuts with 2,222 customizable dNFTs! Holders enjoy $KOBAN airdrops & in-game perks across the Lucky Kat gaming ecosystem.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/kumo?bottomTab=trades&tab=items",
      },
      snapshotTaken: kumo.snapshotTaken,
      eligibleWallets: formatInteger(kumo.eligibleWallets),
      totalAllocationPercent: kumo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdown),
      userAllocationPercent:
        isInKumoSnapshot !== undefined
          ? isInKumoSnapshot
            ? kumo.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.ANIMA,
      src: "/assets/send/anima.png",
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
      eligibleWallets:
        anima.eligibleWallets !== undefined
          ? formatInteger(anima.eligibleWallets)
          : undefined,
      totalAllocationPercent: anima.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(anima.totalAllocationBreakdown),
      userAllocationPercent:
        isInAnimaSnapshot !== undefined
          ? isInAnimaSnapshot
            ? anima.totalAllocationBreakdown.wallet!.percent
            : new BigNumber(0)
          : undefined,
    },

    {
      id: AllocationId.FUD,
      src: "/assets/send/fud.png",
      title: "FUD",
      description: "FUD is the OG culture coin on Sui.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get",
        href: "/swap/SUI-FUD",
      },
      snapshotTaken: fud.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(fud.eligibleWallets)}`,
      totalAllocationPercent: fud.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(fud.totalAllocationBreakdown),
      userAllocationPercent:
        isInFudSnapshot !== undefined
          ? isInFudSnapshot
            ? fud.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.OCTO,
      src: "/assets/send/octo.png",
      title: "OCTO",
      description:
        "$OCTO brings fun and community together while crafting a unique Lofi-inspired IP for all to enjoy!",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get",
        href: `/swap/SUI-${NORMALIZED_OCTO_COINTYPE}`,
      },
      snapshotTaken: octo.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: octo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(octo.totalAllocationBreakdown),
      userAllocationPercent:
        isInOctoSnapshot !== undefined
          ? isInOctoSnapshot
            ? octo.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.AAA,
      src: "/assets/send/aaa.png",
      title: "AAA",
      description:
        "AAA Cat is Sui's fastest-growing, top cat meme coin. Built by the community for the community. Can't Stop, Won't Stop!",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get",
        href: "/swap/SUI-AAA",
      },
      snapshotTaken: aaa.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: aaa.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(aaa.totalAllocationBreakdown),
      userAllocationPercent:
        isInAaaSnapshot !== undefined
          ? isInAaaSnapshot
            ? aaa.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.TISM,
      src: "/assets/send/tism.png",
      title: "TISM",
      description: "got tism?",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get",
        href: `/swap/SUI-${NORMALIZED_TISM_COINTYPE}`,
      },
      snapshotTaken: tism.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: tism.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(tism.totalAllocationBreakdown),
      userAllocationPercent:
        isInTismSnapshot !== undefined
          ? isInTismSnapshot
            ? tism.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
  ];

  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="flex w-full flex-col items-center gap-16">
        <div className="flex w-full flex-col items-center gap-6">
          <SendHeader />
          <ImpersonationModeBanner />
        </div>

        <HeroSection allocations={allocations} />
        <AllocationCardsSection allocations={allocations} />
      </div>
    </>
  );
}
