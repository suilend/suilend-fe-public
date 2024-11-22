import Head from "next/head";

import BigNumber from "bignumber.js";

import { useWalletContext } from "@suilend/frontend-sui";

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
  NFT = "nft",
  TOKEN = "token",
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
    // Undefined for Early Users
    title: string;
    href: string;
  };
  snapshotTaken?: boolean; // Undefined for Suilend Capsules, SEND Points, and SAVE
  eligibleWallets?: string; // Undefined for Suilend Capsules, SEND Points, SAVE, and Rootlets
  totalAllocationPercent: BigNumber;
  allocationPercent?: BigNumber; // Undefined for SAVE
};

export default function Send() {
  const { address } = useWalletContext();
  const { data } = useLoadedAppContext();

  const pointsStats = getPointsStats(data.rewardMap, data.obligations);

  const TOTAL_DISTRIBUTED_POINTS = 2_352_796_979.793415052; // TODO

  // User
  const isEarlyUser = address ? true : undefined; // TODO
  const totalPoints = address ? pointsStats.totalPoints.total : undefined;
  const numberOfCommonCapsulesHeld = address ? 2 : undefined; // TODO
  const numberOfUncommonCapsulesHeld = address ? 1 : undefined; // TODO
  const numberOfRareCapsulesHeld = address ? 1 : undefined; // TODO
  const numberOfRootletsHeld = address ? 9 : undefined; // TODO

  const isBluefinLeaderboardTop1000User = true; // TODO

  const isPrimeMachinHolder = true; // TODO
  const isEggHolder = true; // TODO
  const isDoubleUpCitizenHolder = true; // TODO
  const isKumoHolder = true; // TODO

  const isFudTop10000Holder = true; // TODO
  const isOctoTop300Holder = true; // TODO
  const isAaaTop1000Holder = true; // TODO
  const isTismTop300Holder = true; // TODO

  // Allocations
  const earlyUsers = {
    eligibleWallets: 6778, // Number of Early Suilend (before Points programme started on 8 May 2024)
    totalAllocationPercent: 1,
    allocationPerWalletPercent: 1 / 6778, // Flat
  };
  const sendPoints = {
    totalAllocationPercent: 19,
    allocationPerPointPercent: 19 / TOTAL_DISTRIBUTED_POINTS, // Linear
  };
  const capsules = {
    totalAllocationPercent: 0.3,
    allocationPerCommonCapsulePercent: 0.1 / 500, // Linear
    allocationPerUncommonCapsulePercent: 0.1 / 100, // Linear
    allocationPerRareCapsulePercent: 0.1 / 50, // Linear
  };
  const save = {
    totalAllocationPercent: 15,
    allocationPerSlndPercent: 0.15 / SEND_TOTAL_SUPPLY, // Linear
  };
  const rootlets = {
    totalAllocationPercent: 1.111,
    allocationPerRootletPercent: 1.111 / 3333, // Linear
  };

  const bluefinLeaderboard = {
    snapshotTaken: false,
    eligibleWallets: 1000, // Top 1,000 users
    totalAllocationPercent: 0.05,
    allocationPerWalletPercent: 0.05 / 1000, // Flat
  };

  const primeMachin = {
    snapshotTaken: false,
    eligibleWallets: 100, // Number of Prime Machin holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 100, // Flat
  };
  const egg = {
    snapshotTaken: false,
    eligibleWallets: 2000, // Number of Egg holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 2000, // Flat
  };
  const doubleUpCitizen = {
    snapshotTaken: false,
    eligibleWallets: 3000, // Number of DoubleUp Citizen holders
    totalAllocationPercent: 0.05,
    allocationPerWalletPercent: 0.05 / 3000, // Flat
  };
  const kumo = {
    snapshotTaken: false,
    eligibleWallets: 500, // Number of Kumo holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 500, // Flat
  };
  const anima = {
    snapshotTaken: false,
    eligibleWallets: 1, // TODO
    totalAllocationPercent: 0.05,
    allocationPerWalletPercent: 0.05 / 1, // TODO
  };

  const fud = {
    snapshotTaken: false,
    eligibleWallets: 10000, // Top 10,000 FUD holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 10000, // Flat
  };
  const octo = {
    snapshotTaken: false,
    eligibleWallets: 300, // Top 300 OCTO holders
    totalAllocationPercent: 0.017,
    allocationPerWalletPercent: 0.017 / 300, // Flat
  };
  const aaa = {
    snapshotTaken: false,
    eligibleWallets: 1000, // Top 1,000 AAA holders
    totalAllocationPercent: 0.1,
    allocationPerWalletPercent: 0.1 / 1000, // Flat
  };
  const tism = {
    snapshotTaken: false,
    eligibleWallets: 300, // Top 300 TISM holders
    totalAllocationPercent: 0.01,
    allocationPerWalletPercent: 0.01 / 300, // Flat
  };

  const allocations: Allocation[] = [
    {
      id: AllocationId.EARLY_USERS,
      src: "/assets/send/early-users.png",
      title: "Early Users",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      snapshotTaken: true,
      eligibleWallets: formatInteger(earlyUsers.eligibleWallets),
      totalAllocationPercent: new BigNumber(earlyUsers.totalAllocationPercent),
      allocationPercent:
        isEarlyUser !== undefined
          ? new BigNumber(earlyUsers.allocationPerWalletPercent)
          : undefined,
    },
    {
      id: AllocationId.SEND_POINTS,
      src: "/assets/send/send-points.png",
      title: "SEND Points",
      description: "TEMP", // TODO
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: {
        title: "Earn points",
        href: "/dashboard",
      },
      totalAllocationPercent: new BigNumber(sendPoints.totalAllocationPercent),
      allocationPercent:
        totalPoints !== undefined
          ? totalPoints.times(sendPoints.allocationPerPointPercent)
          : undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: "",
      title: "Suilend Capsules",
      description: "TEMP", // TODO
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/suilend-capsule?bottomTab=trades&tab=items",
      },
      totalAllocationPercent: new BigNumber(capsules.totalAllocationPercent),
      allocationPercent:
        numberOfCommonCapsulesHeld !== undefined &&
        numberOfUncommonCapsulesHeld !== undefined &&
        numberOfRareCapsulesHeld !== undefined
          ? new BigNumber(
              numberOfCommonCapsulesHeld *
                capsules.allocationPerCommonCapsulePercent +
                numberOfUncommonCapsulesHeld *
                  capsules.allocationPerUncommonCapsulePercent +
                numberOfRareCapsulesHeld *
                  capsules.allocationPerRareCapsulePercent,
            )
          : undefined,
    },
    {
      id: AllocationId.SAVE,
      src: "/assets/send/save.png",
      title: "SAVE",
      description: "TEMP", // TODO
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TOKEN,
      cta: {
        title: "View allocation",
        href: "https://save.finance/save",
      },
      totalAllocationPercent: new BigNumber(save.totalAllocationPercent),
    },
    {
      id: AllocationId.ROOTLETS,
      src: "",
      title: "Rootlets",
      description: "TEMP", // TODO
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/rootlets?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      totalAllocationPercent: new BigNumber(rootlets.totalAllocationPercent),
      allocationPercent:
        numberOfRootletsHeld !== undefined
          ? new BigNumber(
              numberOfRootletsHeld * rootlets.allocationPerRootletPercent,
            )
          : undefined,
    },

    {
      id: AllocationId.BLUEFIN_LEADERBOARD,
      src: "/assets/send/bluefin.png",
      title: "Bluefin Leaderboard",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      assetType: AssetType.POINTS,
      cta: {
        title: "View leaderboard",
        href: "", // TODO
      },
      snapshotTaken: bluefinLeaderboard.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(bluefinLeaderboard.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(
        bluefinLeaderboard.totalAllocationPercent,
      ),
      allocationPercent: bluefinLeaderboard.snapshotTaken
        ? new BigNumber(
            isBluefinLeaderboardTop1000User
              ? bluefinLeaderboard.allocationPerWalletPercent
              : 0,
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/prime-machin?bottomTab=trades&tab=items",
      },
      snapshotTaken: primeMachin.snapshotTaken,
      eligibleWallets: formatInteger(primeMachin.eligibleWallets),
      totalAllocationPercent: new BigNumber(primeMachin.totalAllocationPercent),
      allocationPercent: primeMachin.snapshotTaken
        ? new BigNumber(
            isPrimeMachinHolder ? primeMachin.allocationPerWalletPercent : 0,
          )
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/egg?bottomTab=trades&tab=items",
      },
      snapshotTaken: egg.snapshotTaken,
      eligibleWallets: formatInteger(egg.eligibleWallets),
      totalAllocationPercent: new BigNumber(egg.totalAllocationPercent),
      allocationPercent: egg.snapshotTaken
        ? new BigNumber(isEggHolder ? egg.allocationPerWalletPercent : 0)
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/doubleup-citizen?bottomTab=trades&tab=items",
      },
      snapshotTaken: doubleUpCitizen.snapshotTaken,
      eligibleWallets: formatInteger(doubleUpCitizen.eligibleWallets),
      totalAllocationPercent: new BigNumber(
        doubleUpCitizen.totalAllocationPercent,
      ),
      allocationPercent: doubleUpCitizen.snapshotTaken
        ? new BigNumber(
            isDoubleUpCitizenHolder
              ? doubleUpCitizen.allocationPerWalletPercent
              : 0,
          )
        : undefined,
    },
    {
      id: AllocationId.KUMO,
      src: "/assets/send/kumo.png",
      title: "Kumo",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/kumo?bottomTab=trades&tab=items",
      },
      snapshotTaken: kumo.snapshotTaken,
      eligibleWallets: formatInteger(kumo.eligibleWallets),
      totalAllocationPercent: new BigNumber(kumo.totalAllocationPercent),
      allocationPercent: kumo.snapshotTaken
        ? new BigNumber(isKumoHolder ? kumo.allocationPerWalletPercent : 0)
        : undefined,
    },
    {
      id: AllocationId.ANIMA,
      src: "/assets/send/anima.png",
      title: "Anima",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Mint NFT",
        href: "", // TODO
      },
      snapshotTaken: anima.snapshotTaken,
      eligibleWallets: "", // TODO
      totalAllocationPercent: new BigNumber(anima.totalAllocationPercent),
      allocationPercent: anima.snapshotTaken ? new BigNumber(0) : undefined, // TODO
    },

    {
      id: AllocationId.FUD,
      src: "/assets/send/fud.png",
      title: "FUD",
      description: "FUD is the OG culture coin on Sui.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get FUD",
        href: "/swap/SUI-FUD",
      },
      snapshotTaken: fud.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(fud.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(fud.totalAllocationPercent),
      allocationPercent: fud.snapshotTaken
        ? new BigNumber(
            isFudTop10000Holder ? fud.allocationPerWalletPercent : 0,
          )
        : undefined,
    },
    {
      id: AllocationId.OCTO,
      src: "/assets/send/octo.png",
      title: "OCTO",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get OCTO",
        href: `/swap/SUI-${NORMALIZED_OCTO_COINTYPE}`,
      },
      snapshotTaken: octo.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(octo.totalAllocationPercent),
      allocationPercent: octo.snapshotTaken
        ? new BigNumber(
            isOctoTop300Holder ? octo.allocationPerWalletPercent : 0,
          )
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
        title: "Get AAA",
        href: "/swap/SUI-AAA",
      },
      snapshotTaken: aaa.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(aaa.totalAllocationPercent),
      allocationPercent: aaa.snapshotTaken
        ? new BigNumber(isAaaTop1000Holder ? aaa.allocationPerWalletPercent : 0)
        : undefined,
    },
    {
      id: AllocationId.TISM,
      src: "/assets/send/tism.png",
      title: "TISM",
      description: "TEMP", // TODO
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Get TISM",
        href: `/swap/SUI-${NORMALIZED_TISM_COINTYPE}`,
      },
      snapshotTaken: tism.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: new BigNumber(tism.totalAllocationPercent),
      allocationPercent: tism.snapshotTaken
        ? new BigNumber(
            isTismTop300Holder ? tism.allocationPerWalletPercent : 0,
          )
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
