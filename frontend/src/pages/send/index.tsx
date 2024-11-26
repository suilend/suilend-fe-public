import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

import { KioskClient, KioskData, Network } from "@mysten/kiosk";
import BigNumber from "bignumber.js";

import {
  isSendPoints,
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui";

import AllocationCardsSection from "@/components/send/AllocationCardsSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
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
  title: string;
  description: string;
  allocationType: AllocationType;
  assetType?: AssetType;
  cta?: {
    // Undefined for Early Users, Bluefin Leagues
    title: string;
    href: string;
  };
  snapshotTaken?: boolean; // Undefined for SEND Points, Suilend Capsules, and SAVE
  eligibleWallets?: string; // Undefined for SEND Points, Suilend Capsules, and SAVE
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

enum BluefinLeagues {
  GOLD = "gold",
  PLATINUM = "platinum",
  BLACK = "black",
  SAPPHIRE = "sapphire",
}

const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

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

export default function Send() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { data } = useLoadedAppContext();

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

  // Setup - owned objects
  const getOwnedObjectsOfType = useCallback(
    async (type: string) => {
      if (!address) return [];

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
    },
    [suiClient, address],
  );

  // Setup - owned kiosks
  const kioskClient = useMemo(
    () => new KioskClient({ client: suiClient, network: Network.MAINNET }),
    [suiClient],
  );

  const [ownedKiosks, setOwnedKiosks] = useState<KioskData[] | undefined>(
    undefined,
  );

  const getOwnedKiosks = useCallback(async () => {
    if (!address) {
      setOwnedKiosks(undefined);
      return;
    }

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

    setOwnedKiosks(allKiosks);
  }, [address, kioskClient]);

  useEffect(() => {
    getOwnedKiosks();
  }, [getOwnedKiosks]);

  const getOwnedKioskItemsOfType = useCallback(
    (type: string) => {
      if (ownedKiosks === undefined) return undefined;

      const count = ownedKiosks.reduce(
        (acc, kiosk) =>
          acc.plus(kiosk.items.filter((item) => item.type === type).length),
        new BigNumber(0),
      );

      return count.gt(0) ? count : undefined;
    },
    [ownedKiosks],
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
    if (!address) {
      setOwnedSuilendCapsulesMap(undefined);
      return;
    }

    const objs = await getOwnedObjectsOfType(SUILEND_CAPSULE_TYPE);

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

    setOwnedSuilendCapsulesMap({
      [SuilendCapsuleRarity.COMMON]: new BigNumber(commonCapsuleObjs.length),
      [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
        uncommonCapsuleObjs.length,
      ),
      [SuilendCapsuleRarity.RARE]: new BigNumber(rareCapsuleObjs.length),
    });
  }, [address, getOwnedObjectsOfType]);

  useEffect(() => {
    getOwnedSuilendCapsules();
  }, [getOwnedSuilendCapsules]);

  // User - Save

  // User - Rootlets
  const ownedRootlets = useMemo(() => {
    if (!address) return undefined;

    if (Object.keys(rootletsJson).length > 0)
      return new BigNumber(
        (rootletsJson as Record<string, number>)[address] ?? 0,
      );
    return getOwnedKioskItemsOfType(ROOTLETS_TYPE);
  }, [address, getOwnedKioskItemsOfType]);

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
  const ownedNfts = useMemo(() => {
    if (!address) return undefined;

    const result: Record<
      | AllocationId.PRIME_MACHIN
      | AllocationId.EGG
      | AllocationId.DOUBLEUP_CITIZEN
      | AllocationId.KUMO,
      BigNumber | undefined
    > = {
      [AllocationId.PRIME_MACHIN]: undefined,
      [AllocationId.EGG]: undefined,
      [AllocationId.DOUBLEUP_CITIZEN]: undefined,
      [AllocationId.KUMO]: undefined,
    };

    result[AllocationId.PRIME_MACHIN] =
      Object.keys(primeMachinJson).length > 0
        ? new BigNumber(
            (primeMachinJson as Record<string, number>)[address] ?? 0,
          )
        : getOwnedKioskItemsOfType(PRIME_MACHIN_TYPE);
    result[AllocationId.EGG] =
      Object.keys(primeMachinJson).length > 0
        ? new BigNumber(
            (primeMachinJson as Record<string, number>)[address] ?? 0,
          )
        : getOwnedKioskItemsOfType(EGG_TYPE);
    result[AllocationId.DOUBLEUP_CITIZEN] =
      Object.keys(primeMachinJson).length > 0
        ? new BigNumber(
            (primeMachinJson as Record<string, number>)[address] ?? 0,
          )
        : getOwnedKioskItemsOfType(DOUBLEUP_CITIZEN_TYPE);
    result[AllocationId.KUMO] =
      Object.keys(primeMachinJson).length > 0
        ? new BigNumber(
            (primeMachinJson as Record<string, number>)[address] ?? 0,
          )
        : getOwnedKioskItemsOfType(KUMO_TYPE);

    return result;
  }, [address, getOwnedKioskItemsOfType]);

  // User - Anima
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
  const earlyUsers = {
    snapshotTaken: true,
    eligibleWallets: earlyUsersJson.length,
    totalAllocationPercent: new BigNumber(1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(1).div(earlyUsersJson.length), // Flat
      },
    },
  };
  const sendPoints = {
    totalAllocationPercent: new BigNumber(19),
    totalAllocationBreakdown: {
      thousand: {
        title: "Per 1K Points",
        percent: new BigNumber(19).div(totalAllocatedPoints.div(1000)), // Linear
      },
    },
  };
  const suilendCapsules = {
    totalAllocationPercent: new BigNumber(0.3),
    totalAllocationBreakdown: {
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
    totalAllocationPercent: new BigNumber(15),
    totalAllocationBreakdown: {
      one: {
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
        : 948,
    totalAllocationPercent: new BigNumber(1.111),
    totalAllocationBreakdown: {
      one: {
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
    snapshotTaken: Object.keys(bluefinSendTradersJson).length > 0,
    eligibleWallets:
      Object.keys(bluefinSendTradersJson).length > 0
        ? Object.keys(bluefinSendTradersJson).length
        : 400, // TODO (update once we have an initial snapshot)
    totalAllocationPercent: new BigNumber(0.125),
    totalAllocationBreakdown: {},
    // totalAllocationBreakdown: {
    //   thousandUsdVolume: {
    //     title: "Per $1K Volume",
    //     percent: new BigNumber(0.125).div(
    //       bluefinSendTradersTotalVolumeUsd.div(1000),
    //     ), // Linear
    //   },
    // },
  };

  const primeMachin = {
    snapshotTaken: Object.keys(primeMachinJson).length > 0,
    eligibleWallets:
      Object.keys(primeMachinJson).length > 0
        ? Object.keys(primeMachinJson).length
        : 918,
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      one: {
        title: "Per Prime Machin",
        percent: new BigNumber(0.1).div(3333), // Linear
      },
    },
  };
  const egg = {
    snapshotTaken: Object.keys(eggJson).length > 0,
    eligibleWallets:
      Object.keys(eggJson).length > 0 ? Object.keys(eggJson).length : 2109,
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      one: {
        title: "Per Egg",
        percent: new BigNumber(0.1).div(9546), // Linear
      },
    },
  };
  const doubleUpCitizen = {
    snapshotTaken: Object.keys(doubleUpCitizenJson).length > 0,
    eligibleWallets:
      Object.keys(doubleUpCitizenJson).length > 0
        ? Object.keys(doubleUpCitizenJson).length
        : 713,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      one: {
        title: "Per DoubleUp Citizen",
        percent: new BigNumber(0.05).div(2878), // Linear
      },
    },
  };
  const kumo = {
    snapshotTaken: Object.keys(kumoJson).length > 0,
    eligibleWallets:
      Object.keys(kumoJson).length > 0 ? Object.keys(kumoJson).length : 479,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      one: {
        title: "Per Kumo",
        percent: new BigNumber(0.05).div(2222), // Linear
      },
    },
  };

  const anima = {
    snapshotTaken: animaJson.length > 0,
    eligibleWallets: animaJson.length > 0 ? animaJson.length : undefined,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {},
  };

  const fud = {
    snapshotTaken: fudJson.length > 0,
    eligibleWallets: 5000, // Top 5,000 FUD holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(5000), // Flat
      },
    },
  };
  const aaa = {
    snapshotTaken: aaaJson.length > 0,
    eligibleWallets: 5000, // Top 5,000 AAA holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(5000), // Flat
      },
    },
  };
  const tism = {
    snapshotTaken: tismJson.length > 0,
    eligibleWallets: 1000, // Top 1,000 TISM holders
    totalAllocationPercent: new BigNumber(0.01),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.01).div(1000), // Flat
      },
    },
  };
  const octo = {
    snapshotTaken: octoJson.length > 0,
    eligibleWallets: 1000, // Top 1,000 OCTO holders
    totalAllocationPercent: new BigNumber(0.01),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.01).div(1000), // Flat
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
              .times(sendPoints.totalAllocationBreakdown.thousand.percent)
          : undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: "/assets/send/suilend-capsules.gif",
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
      src: "/assets/send/rootlets.gif",
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
        ownedRootlets !== undefined
          ? ownedRootlets.times(rootlets.totalAllocationBreakdown.one.percent)
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
            ? bluefinLeagues.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
    },
    {
      id: AllocationId.BLUEFIN_SEND_TRADERS,
      src: "/assets/send/bluefin-leagues.png", // TODO (update once we have an image)
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
      eligibleWallets: "TBC", //formatInteger(bluefinSendTraders.eligibleWallets),
      totalAllocationPercent: bluefinSendTraders.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinSendTraders.totalAllocationBreakdown,
      ),
      userAllocationPercent: undefined,
      // bluefinSendTradersVolumeUsd !== undefined
      //   ? (bluefinSendTradersVolumeUsd as BigNumber)
      //       .div(1000)
      //       .times(
      //         bluefinSendTraders.totalAllocationBreakdown.thousandUsdVolume
      //           .percent,
      //       )
      //   : undefined,
    },

    {
      id: AllocationId.PRIME_MACHIN,
      src: "/assets/send/prime-machin.png",
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
      eligibleWallets: formatInteger(primeMachin.eligibleWallets),
      totalAllocationPercent: primeMachin.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        primeMachin.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        ownedNfts?.[AllocationId.PRIME_MACHIN] !== undefined
          ? ownedNfts[AllocationId.PRIME_MACHIN].times(
              primeMachin.totalAllocationBreakdown.one.percent,
            )
          : undefined,
    },
    {
      id: AllocationId.EGG,
      src: "/assets/send/egg.png",
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
      eligibleWallets: formatInteger(egg.eligibleWallets),
      totalAllocationPercent: egg.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdown),
      userAllocationPercent:
        ownedNfts?.[AllocationId.EGG] !== undefined
          ? ownedNfts[AllocationId.EGG].times(
              egg.totalAllocationBreakdown.one.percent,
            )
          : undefined,
    },
    {
      id: AllocationId.DOUBLEUP_CITIZEN,
      src: "/assets/send/doubleup-citizen.png",
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
      eligibleWallets: formatInteger(doubleUpCitizen.eligibleWallets),
      totalAllocationPercent: doubleUpCitizen.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        doubleUpCitizen.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        ownedNfts?.[AllocationId.DOUBLEUP_CITIZEN] !== undefined
          ? ownedNfts[AllocationId.DOUBLEUP_CITIZEN].times(
              doubleUpCitizen.totalAllocationBreakdown.one.percent,
            )
          : undefined,
    },
    {
      id: AllocationId.KUMO,
      src: "/assets/send/kumo.png",
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
      eligibleWallets: formatInteger(kumo.eligibleWallets),
      totalAllocationPercent: kumo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdown),
      userAllocationPercent:
        ownedNfts?.[AllocationId.KUMO] !== undefined
          ? ownedNfts[AllocationId.KUMO].times(
              kumo.totalAllocationBreakdown.one.percent,
            )
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
      userAllocationPercent: undefined,
      // isInAnimaSnapshot !== undefined
      //   ? isInAnimaSnapshot
      //     ? anima.totalAllocationBreakdown!.percent
      //     : new BigNumber(0)
      //   : undefined,
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

      <div className="relative flex w-full flex-col items-center">
        <SendHeader />

        <div className="relative z-[2] flex w-full flex-col items-center gap-12 pt-36 md:gap-16 md:pt-32">
          <HeroSection
            allocations={allocations}
            isLoading={
              ownedKiosks === undefined || ownedSuilendCapsulesMap === undefined
            }
          />
          <AllocationCardsSection allocations={allocations} />
        </div>
      </div>
    </>
  );
}
