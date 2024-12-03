import Head from "next/head";
import { useCallback, useEffect, useMemo } from "react";

import { KioskClient, KioskData, Network } from "@mysten/kiosk";
import { SuiClient } from "@mysten/sui/client";
import BigNumber from "bignumber.js";
import useSWR from "swr";

import { isSendPoints } from "@suilend/frontend-sui";
import {
  useSettingsContext,
  useWalletContext,
} from "@suilend/frontend-sui-next";

import AllocationCardsSection from "@/components/send/AllocationCardsSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import TokenomicsSection from "@/components/send/TokenomicsSection";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatInteger } from "@/lib/format";
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
  userMsendClaimed?: BigNumber;
};

enum SuilendCapsuleRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
}

export const TGE_TIMESTAMP_MS = 1733979600000;

export const SUILEND_CAPSULE_TYPE =
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

export const getOwnedObjectsOfType = async (
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

export default function Send() {
  const { suiClient } = useSettingsContext();
  const { address } = useWalletContext();
  const { data, getBalance } = useLoadedAppContext();

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
    setTimeout(mutateOwnedKiosks);
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
  const totalSendPoints = useMemo(() => {
    if (!address) return undefined;

    return getPointsStats(data.rewardMap, data.obligations).totalPoints.total;
  }, [address, data.rewardMap, data.obligations]);

  // User - Suilend Capsules
  const ownedSuilendCapsulesMapFetcher = useCallback(async () => {
    if (!address) return undefined;

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

    return {
      [SuilendCapsuleRarity.COMMON]: new BigNumber(commonCapsuleObjs.length),
      [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
        uncommonCapsuleObjs.length,
      ),
      [SuilendCapsuleRarity.RARE]: new BigNumber(rareCapsuleObjs.length),
    };
  }, [address, suiClient]);

  const {
    data: ownedSuilendCapsulesMap,
    mutate: mutateOwnedSuilendCapsulesMap,
  } = useSWR<Record<SuilendCapsuleRarity, BigNumber> | undefined>(
    `ownedSuilendCapsulesMap-${address}`,
    ownedSuilendCapsulesMapFetcher,
    {
      onSuccess: (data) => {
        console.log("Refreshed owned Suilend Capsules", data);
      },
      onError: (err) => {
        console.error("Failed to refresh owned Suilend Capsules", err);
      },
    },
  );
  useEffect(() => {
    setTimeout(mutateOwnedSuilendCapsulesMap);
  }, [mutateOwnedSuilendCapsulesMap, address, suiClient]);

  // User - Save
  const mSendWith12MonthMaturityBalance = useMemo(() => {
    if (!address) return undefined;

    return undefined; // getBalance(NORMALIZED_SUI_COINTYPE); // TODO
  }, [address]);

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
    setTimeout(mutateOwnedDoubleUpCitizen);
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

  // Allocations
  const earlyUsers = {
    snapshotTaken: true,
    eligibleWallets: formatInteger(earlyUsersJson.length),
    totalAllocationPercent: new BigNumber(2),
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
    snapshotTaken: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(15),
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
    snapshotTaken: false,
    eligibleWallets: "TBC",
    // Object.keys(bluefinSendTradersJson).length > 0
    //   ? Object.keys(bluefinSendTradersJson).length
    //   : 400, // TODO (update once we have an initial snapshot)
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
    snapshotTaken: false,
    eligibleWallets: formatInteger(
      Object.keys(primeMachinJson).length > 0
        ? Object.keys(primeMachinJson).length
        : 918,
    ),
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {},
  };

  const fud = {
    snapshotTaken: false,
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
    snapshotTaken: false,
    eligibleWallets: 5000, // Top 5,000 AAA holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
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
    totalAllocationBreakdown: {
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
        earlyUsers.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        isInEarlyUsersSnapshot !== undefined
          ? isInEarlyUsersSnapshot
            ? earlyUsers.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
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
        sendPoints.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        totalSendPoints !== undefined
          ? totalSendPoints
              .div(1000)
              .times(sendPoints.totalAllocationBreakdown.thousand.percent)
          : undefined,
      userMsendClaimed: undefined,
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
      userMsendClaimed: undefined,
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
        title: "View on Save",
        href: "https://save.finance/save",
      },
      snapshotTaken: save.snapshotTaken,
      eligibleWallets: save.eligibleWallets,
      totalAllocationPercent: save.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(save.totalAllocationBreakdown),

      userAllocationPercent: undefined,
      userMsendClaimed: undefined, //mSendWith12MonthMaturityBalance,
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
        rootlets.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        ownedRootlets !== undefined
          ? ownedRootlets.times(rootlets.totalAllocationBreakdown.one.percent)
          : undefined,
      userMsendClaimed: undefined,
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
        bluefinLeagues.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        isInBluefinLeaguesSnapshot !== undefined
          ? isInBluefinLeaguesSnapshot
            ? bluefinLeagues.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
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
      userMsendClaimed: undefined,
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
        primeMachin.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        ownedPrimeMachin !== undefined
          ? ownedPrimeMachin.times(
              primeMachin.totalAllocationBreakdown.one.percent,
            )
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdown),

      userAllocationPercent:
        ownedEgg !== undefined
          ? ownedEgg.times(egg.totalAllocationBreakdown.one.percent)
          : undefined,
      userMsendClaimed: undefined,
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
        doubleUpCitizen.totalAllocationBreakdown,
      ),

      userAllocationPercent:
        ownedDoubleUpCitizen !== undefined
          ? ownedDoubleUpCitizen.times(
              doubleUpCitizen.totalAllocationBreakdown.one.percent,
            )
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdown),

      userAllocationPercent:
        ownedKumo !== undefined
          ? ownedKumo.times(kumo.totalAllocationBreakdown.one.percent)
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(anima.totalAllocationBreakdown),

      userAllocationPercent: undefined,
      // isInAnimaSnapshot !== undefined
      //   ? isInAnimaSnapshot
      //     ? anima.totalAllocationBreakdown!.percent
      //     : new BigNumber(0)
      //   : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(fud.totalAllocationBreakdown),

      userAllocationPercent:
        isInFudSnapshot !== undefined
          ? isInFudSnapshot
            ? fud.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(aaa.totalAllocationBreakdown),

      userAllocationPercent:
        isInAaaSnapshot !== undefined
          ? isInAaaSnapshot
            ? aaa.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(octo.totalAllocationBreakdown),

      userAllocationPercent:
        isInOctoSnapshot !== undefined
          ? isInOctoSnapshot
            ? octo.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
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
      totalAllocationBreakdown: Object.values(tism.totalAllocationBreakdown),

      userAllocationPercent:
        isInTismSnapshot !== undefined
          ? isInTismSnapshot
            ? tism.totalAllocationBreakdown.wallet.percent
            : new BigNumber(0)
          : undefined,
      userMsendClaimed: undefined,
    },
  ];

  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="relative flex w-full flex-col items-center">
        <SendHeader />

        <div className="relative z-[2] flex w-full flex-col items-center gap-16 pt-36 md:gap-24 md:pt-12">
          <div className="flex w-full flex-col items-center gap-12 md:gap-16">
            <HeroSection
              allocations={allocations}
              isLoading={
                ownedSuilendCapsulesMap === undefined ||
                ownedRootlets === undefined ||
                ownedPrimeMachin === undefined ||
                ownedEgg === undefined ||
                ownedDoubleUpCitizen === undefined ||
                ownedKumo === undefined
              }
            />
            <AllocationCardsSection allocations={allocations} />
          </div>

          <TokenomicsSection />
        </div>
      </div>
    </>
  );
}
