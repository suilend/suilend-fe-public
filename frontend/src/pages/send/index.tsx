import Head from "next/head";

import BigNumber from "bignumber.js";

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

export const SEND_TOTAL_SUPPLY = 100_000_000;
export const TOTAL_DISTRIBUTED_POINTS = 100_000_000_000;

enum AllocationId {
  EARLY_USERS = "earlyUsers",
  SEND_POINTS = "sendPoints",
  SUILEND_CAPSULES = "suilendCapsules",
  SAVE = "save",
  ROOTLETS = "rootlets",

  BLUEFIN_LEADERBOARD = "bluefinLeaderboard",

  PRIME_MACHIN = "prime-Mchin",
  EGG = "egg",
  DOUBLEUP_CITIZEN = "doubleUpCitizen",
  KUMO = "kumo",

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
  NFT = "nft",
  TOKEN = "token",
  POINTS = "points",
}

export type Allocation = {
  id: AllocationId;
  title: string;
  description: string;
  allocationType: AllocationType;
  assetType?: AssetType;
  cta?: {
    title: string;
    href: string;
  };
  snapshotTaken: boolean;
  eligibleWallets: string;
  totalAllocationPercent: BigNumber;
  allocationPercent?: BigNumber; // Only optional for SAVE
};

export default function Send() {
  const { data } = useLoadedAppContext();
  const pointsStats = getPointsStats(data.rewardMap, data.obligations);

  // User
  const isEarlyUser = true;
  const numberOfCommonCapsulesHeld = 2;
  const numberOfUncommonCapsulesHeld = 1;
  const numberOfRareCapsulesHeld = 1;
  const numberOfRootletsHeld = 9;

  const isBluefinLeaderboardTop1000User = true;

  const isPrimeMachinHolder = true;
  const isAftermathEggHolder = true;
  const isDoubleUpCitizenHolder = true;
  const isKumoHolder = true;

  const isFudTop10000Holder = true;
  const isOctoTop300Holder = true;
  const isAaaTop1000Holder = true;
  const isTismTop300Holder = true;

  // Allocations
  const earlyUsers = {
    eligibleWallets: 6778, // Number of Early Suilend (before Points programme started on 8 May 2024)
    totalAllocationPercent: 1,
    allocationPerWalletPercent: 1 / 6778, // Flat
  };
  const sendPoints = {
    eligibleWallets: 50000, // Number of Suilend users with SEND Points
    totalAllocationPercent: 19,
    allocationPerPointPercent: 19 / TOTAL_DISTRIBUTED_POINTS, // Linear
  };
  const capsules = {
    eligibleWallets: 300, // Number of Suilend Capsules holders
    totalAllocationPercent: 0.3,
    allocationPerCommonCapsulePercent: 0.1 / 500, // Linear
    allocationPerUncommonCapsulePercent: 0.1 / 100, // Linear
    allocationPerRareCapsulePercent: 0.1 / 50, // Linear
  };
  const save = {
    eligibleWallets: 1000, // Number of SLND holders
    totalAllocationPercent: 15,
    allocationPerSlndPercent: 0.15 / SEND_TOTAL_SUPPLY, // Linear
  };
  const rootlets = {
    eligibleWallets: 500, // Number of Rootlets holders
    totalAllocationPercent: 1.111,
    allocationPerRootletPercent: 1.111 / 3333, // Linear
  };

  const bluefinLeaderboard = {
    eligibleWallets: 1000, // Top 1,000 users
    totalAllocationPercent: 0.05,
    allocationPerWalletPercent: 0.05 / 1000, // Flat
  };

  const primeMachin = {
    eligibleWallets: 100, // Number of Prime Machin holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 100, // Flat
  };
  const egg = {
    eligibleWallets: 2000, // Number of Egg holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 2000, // Flat
  };
  const doubleUpCitizen = {
    eligibleWallets: 3000, // Number of DoubleUp Citizen holders
    totalAllocationPercent: 0.05,
    allocationPerWalletPercent: 0.05 / 3000, // Flat
  };
  const kumo = {
    eligibleWallets: 500, // Number of Kumo holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 500, // Flat
  };

  const fud = {
    eligibleWallets: 10000, // Top 10,000 FUD holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 10000, // Flat
  };
  const octo = {
    eligibleWallets: 300, // Top 300 OCTO holders
    totalAllocationPercent: 0.017,
    allocationPerWalletPercent: 0.017 / 300, // Flat
  };
  const aaa = {
    eligibleWallets: 1000, // Top 1,000 AAA holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 1000, // Flat
  };
  const tism = {
    eligibleWallets: 300, // Top 300 TISM holders
    totalAllocationPercent: 0.01,
    allocationPerWalletPercent: 0.01 / 300, // Flat
  };

  const allocations: Allocation[] = [
    {
      id: AllocationId.EARLY_USERS,
      title: "Early users",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      snapshotTaken: true,
      eligibleWallets: formatInteger(earlyUsers.eligibleWallets),
      totalAllocationPercent: new BigNumber(earlyUsers.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isEarlyUser ? earlyUsers.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.SEND_POINTS,
      title: "SEND Points",
      description: "TEMP",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: {
        title: "Earn points",
        href: "/dashboard",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(sendPoints.eligibleWallets),
      totalAllocationPercent: new BigNumber(sendPoints.totalAllocationPercent),
      allocationPercent: new BigNumber(
        pointsStats.totalPoints.total.times(
          sendPoints.allocationPerPointPercent,
        ),
      ),
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      title: "Suilend Capsules",
      description: "TEMP",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/suilend-capsule?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(capsules.eligibleWallets),
      totalAllocationPercent: new BigNumber(capsules.totalAllocationPercent),
      allocationPercent: new BigNumber(
        numberOfCommonCapsulesHeld *
          capsules.allocationPerCommonCapsulePercent +
          numberOfUncommonCapsulesHeld *
            capsules.allocationPerUncommonCapsulePercent +
          numberOfRareCapsulesHeld * capsules.allocationPerRareCapsulePercent,
      ),
    },
    {
      id: AllocationId.SAVE,
      title: "SAVE",
      description: "TEMP",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TOKEN,
      cta: {
        title: "View allocation",
        href: "https://save.finance/save",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(1000),
      totalAllocationPercent: new BigNumber(save.totalAllocationPercent),
    },
    {
      id: AllocationId.ROOTLETS,
      title: "Rootlets",
      description: "TEMP",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/rootlets?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(rootlets.eligibleWallets),
      totalAllocationPercent: new BigNumber(rootlets.totalAllocationPercent),
      allocationPercent: new BigNumber(
        numberOfRootletsHeld * rootlets.allocationPerRootletPercent,
      ),
    },

    {
      id: AllocationId.BLUEFIN_LEADERBOARD,
      title: "Bluefin Leaderboard",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.POINTS,
      cta: {
        title: "View leaderboard",
        href: "",
      },
      snapshotTaken: false,
      eligibleWallets: `Top ${formatInteger(bluefinLeaderboard.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(
        bluefinLeaderboard.totalAllocationPercent,
      ),
      allocationPercent: new BigNumber(
        isBluefinLeaderboardTop1000User
          ? bluefinLeaderboard.allocationPerWalletPercent
          : 0,
      ),
    },

    {
      id: AllocationId.PRIME_MACHIN,
      title: "Prime Machin",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/prime-machin?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(primeMachin.eligibleWallets),
      totalAllocationPercent: new BigNumber(primeMachin.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isPrimeMachinHolder ? primeMachin.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.EGG,
      title: "Egg",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/egg?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(egg.eligibleWallets),
      totalAllocationPercent: new BigNumber(egg.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isAftermathEggHolder ? egg.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.DOUBLEUP_CITIZEN,
      title: "DoubleUp Citizen",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/doubleup-citizen?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(doubleUpCitizen.eligibleWallets),
      totalAllocationPercent: new BigNumber(
        doubleUpCitizen.totalAllocationPercent,
      ),
      allocationPercent: new BigNumber(
        isDoubleUpCitizenHolder
          ? doubleUpCitizen.allocationPerWalletPercent
          : 0,
      ),
    },
    {
      id: AllocationId.KUMO,
      title: "Kumo",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/kumo?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      eligibleWallets: formatInteger(kumo.eligibleWallets),
      totalAllocationPercent: new BigNumber(kumo.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isKumoHolder ? kumo.allocationPerWalletPercent : 0,
      ),
    },

    {
      id: AllocationId.FUD,
      title: "FUD",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get FUD",
        href: "/swap/SUI-FUD",
      },
      snapshotTaken: false,
      eligibleWallets: `Top ${formatInteger(fud.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(fud.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isFudTop10000Holder ? fud.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.OCTO,
      title: "OCTO",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get OCTO",
        href: `/swap/SUI-${NORMALIZED_OCTO_COINTYPE}`,
      },
      snapshotTaken: false,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(octo.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isOctoTop300Holder ? octo.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.AAA,
      title: "AAA",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get AAA",
        href: "/swap/SUI-AAA",
      },
      snapshotTaken: false,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(aaa.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isAaaTop1000Holder ? aaa.allocationPerWalletPercent : 0,
      ),
    },
    {
      id: AllocationId.TISM,
      title: "TISM",
      description: "TEMP",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get TISM",
        href: `/swap/SUI-${NORMALIZED_TISM_COINTYPE}`,
      },
      snapshotTaken: false,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(tism.totalAllocationPercent),
      allocationPercent: new BigNumber(
        isTismTop300Holder ? tism.allocationPerWalletPercent : 0,
      ),
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
