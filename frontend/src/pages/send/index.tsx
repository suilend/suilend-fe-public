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

import earlyUsersJson from "./early-users.json";

export const SEND_TOTAL_SUPPLY = 100_000_000;

enum AllocationId {
  EARLY_USERS = "earlyUsers",
  SEND_POINTS = "sendPoints",
  SUILEND_CAPSULES = "suilendCapsules",
  SAVE = "save",
  ROOTLETS = "rootlets",

  BLUEFIN_LEAGUES = "bluefinLeagues",
  BLUEFIN_PERP_TRADERS = "bluefinPerpTraders", // TODO

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
    // Undefined for Early Users
    title: string;
    href: string;
  };
  snapshotTaken?: boolean; // Undefined for Suilend Capsules, SEND Points, and SAVE
  eligibleWallets?: string; // Undefined for Suilend Capsules, SEND Points, SAVE, and Rootlets
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

  // User
  const isEarlyUser = address ? true : undefined; // TODO (check if in snapshot)
  const totalPoints = address
    ? getPointsStats(data.rewardMap, data.obligations).totalPoints.total
    : undefined;

  // User - Suilend Capsules & Rootlets
  const [ownedSuilendCapsulesMap, setOwnedSuilendCapsulesMap] = useState<
    Record<SuilendCapsuleRarity, BigNumber> | undefined
  >(undefined);
  const [ownedRootletsCount, setOwnedRootletsCount] = useState<
    BigNumber | undefined
  >(undefined);

  const getOwnedSuilendCapsulesRootlets = useCallback(async () => {
    const allObjs = [];
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
      const objs = await suiClient.getOwnedObjects({
        owner: address!,
        cursor,
        filter: {
          MatchAny: [
            { StructType: SUILEND_CAPSULE_TYPE },
            // { StructType: ROOTLETS_TYPE },
          ],
        },
        options: { showContent: true },
      });

      allObjs.push(...objs.data);
      cursor = objs.nextCursor;
      hasNextPage = objs.hasNextPage;
    }

    const capsulesObjs = allObjs.filter(
      (obj) => (obj.data?.content as any).type === SUILEND_CAPSULE_TYPE,
    );
    const commonCapsuleObjs = capsulesObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.COMMON,
    );
    const uncommonCapsuleObjs = capsulesObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity ===
        SuilendCapsuleRarity.UNCOMMON,
    );
    const rareCapsuleObjs = capsulesObjs.filter(
      (obj) =>
        (obj.data?.content as any).fields.rarity === SuilendCapsuleRarity.RARE,
    );

    // const rootletsObjs = allObjs.filter(
    //   (obj) => (obj.data?.content as any).type === ROOTLETS_TYPE,
    // );

    setOwnedSuilendCapsulesMap({
      [SuilendCapsuleRarity.COMMON]: new BigNumber(commonCapsuleObjs.length),
      [SuilendCapsuleRarity.UNCOMMON]: new BigNumber(
        uncommonCapsuleObjs.length,
      ),
      [SuilendCapsuleRarity.RARE]: new BigNumber(rareCapsuleObjs.length),
    });
  }, [suiClient, address]);

  useEffect(() => {
    if (!address) {
      setOwnedSuilendCapsulesMap(undefined);
      setOwnedRootletsCount(undefined);
    } else getOwnedSuilendCapsulesRootlets();
  }, [address, getOwnedSuilendCapsulesRootlets]);

  // User - Bluefin Leagues
  const bluefinLeaguesLeague = address ? BluefinLeagues.GOLD : undefined; // TODO

  // User - NFTs
  const isPrimeMachinHolder = true; // TODO (check if in snapshot)
  const isEggHolder = true; // TODO (check if in snapshot)
  const isDoubleUpCitizenHolder = true; // TODO (check if in snapshot)
  const isKumoHolder = true; // TODO (check if in snapshot)

  // User - Tokens
  const isFudTop10000Holder = true; // TODO (check if in snapshot)
  const isOctoTop300Holder = true; // TODO (check if in snapshot)
  const isAaaTop1000Holder = true; // TODO (check if in snapshot)
  const isTismTop300Holder = true; // TODO (check if in snapshot)

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
  const capsules = {
    totalAllocationPercent: new BigNumber(0.3),
    totalAllocationBreakdown: {
      [SuilendCapsuleRarity.COMMON]: {
        title: "Per Common",
        percent: new BigNumber(0.1).div(1240 - 807), // TODO, Linear
      },
      [SuilendCapsuleRarity.UNCOMMON]: {
        title: "Per Uncommon",
        percent: new BigNumber(0.1).div(309 - 196), // TODO, Linear
      },
      [SuilendCapsuleRarity.RARE]: {
        title: "Per Rare",
        percent: new BigNumber(0.1).div(101 - 76), // TODO, Linear
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
    eligibleWallets: 6205,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      [BluefinLeagues.GOLD]: {
        title: "Gold",
        percent: new BigNumber(0.015).div(5956),
      },
      [BluefinLeagues.PLATINUM]: {
        title: "Platinum",
        percent: new BigNumber(0.01).div(187),
      },
      [BluefinLeagues.BLACK]: {
        title: "Black",
        percent: new BigNumber(0.01).div(25),
      },
      [BluefinLeagues.SAPPHIRE]: {
        title: "Sapphire",
        percent: new BigNumber(0.015).div(37),
      },
    },
  };

  const primeMachin = {
    snapshotTaken: false,
    eligibleWallets: 3193, // TODO, Number of Prime Machin holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(3193), // Flat
      },
    },
  };
  const egg = {
    snapshotTaken: false,
    eligibleWallets: 8434, // TODO, Number of Egg holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(8434), // Flat
      },
    },
  };
  const doubleUpCitizen = {
    snapshotTaken: false,
    eligibleWallets: 781, // TODO, Number of DoubleUp Citizen holders
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.05).div(781), // Flat
      },
    },
  };
  const kumo = {
    snapshotTaken: false,
    eligibleWallets: 1923, // TODO, Number of Kumo holders
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.1).div(1923), // Flat
      },
    },
  };
  const anima = {
    snapshotTaken: false,
    eligibleWallets: 100, // TODO
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdown: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(0.05).div(100), // Flat
      },
    },
  };

  const fud = {
    snapshotTaken: false,
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
    snapshotTaken: false,
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
    snapshotTaken: false,
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
    snapshotTaken: false,
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
      snapshotTaken: true,
      eligibleWallets: formatInteger(earlyUsers.eligibleWallets),
      totalAllocationPercent: earlyUsers.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        earlyUsers.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        isEarlyUser !== undefined
          ? earlyUsers.totalAllocationBreakdown.wallet.percent
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
        title: "Earn points",
        href: "/dashboard",
      },
      totalAllocationPercent: sendPoints.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        sendPoints.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        totalPoints !== undefined
          ? totalPoints
              .div(1000)
              .times(sendPoints.totalAllocationBreakdown.thousandPoints.percent)
          : undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: "",
      title: "Suilend Capsules",
      description:
        "A token of appreciation awarded for outstanding community contributions to Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/suilend-capsule?bottomTab=trades&tab=items",
      },
      totalAllocationPercent: capsules.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        capsules.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        ownedSuilendCapsulesMap !== undefined
          ? new BigNumber(
              ownedSuilendCapsulesMap[SuilendCapsuleRarity.COMMON].times(
                capsules.totalAllocationBreakdown[SuilendCapsuleRarity.COMMON]
                  .percent,
              ),
            )
              .plus(
                ownedSuilendCapsulesMap[SuilendCapsuleRarity.UNCOMMON].times(
                  capsules.totalAllocationBreakdown[
                    SuilendCapsuleRarity.UNCOMMON
                  ].percent,
                ),
              )
              .plus(
                ownedSuilendCapsulesMap[SuilendCapsuleRarity.RARE].times(
                  capsules.totalAllocationBreakdown[SuilendCapsuleRarity.RARE]
                    .percent,
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
      src: "",
      title: "Rootlets",
      description:
        "Rootlets are the companion NFT community to Suilend. It's the most premium art collection on Sui, but the art is good tho.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/rootlets?bottomTab=trades&tab=items",
      },
      snapshotTaken: false,
      totalAllocationPercent: rootlets.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        rootlets.totalAllocationBreakdown,
      ),
      userAllocationPercent:
        ownedRootletsCount !== undefined
          ? ownedRootletsCount.times(
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
      totalAllocationPercent: primeMachin.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        primeMachin.totalAllocationBreakdown,
      ),
      userAllocationPercent: primeMachin.snapshotTaken
        ? isPrimeMachinHolder
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/egg?bottomTab=trades&tab=items",
      },
      snapshotTaken: egg.snapshotTaken,
      eligibleWallets: formatInteger(egg.eligibleWallets),
      totalAllocationPercent: egg.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdown),
      userAllocationPercent: egg.snapshotTaken
        ? isEggHolder
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/doubleup-citizen?bottomTab=trades&tab=items",
      },
      snapshotTaken: doubleUpCitizen.snapshotTaken,
      eligibleWallets: formatInteger(doubleUpCitizen.eligibleWallets),
      totalAllocationPercent: doubleUpCitizen.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        doubleUpCitizen.totalAllocationBreakdown,
      ),
      userAllocationPercent: doubleUpCitizen.snapshotTaken
        ? isDoubleUpCitizenHolder
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
        title: "Buy NFT",
        href: "https://www.tradeport.xyz/sui/collection/kumo?bottomTab=trades&tab=items",
      },
      snapshotTaken: kumo.snapshotTaken,
      eligibleWallets: formatInteger(kumo.eligibleWallets),
      totalAllocationPercent: kumo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdown),
      userAllocationPercent: kumo.snapshotTaken
        ? isKumoHolder
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
        title: "Mint NFT",
        href: "https://anima.nexus/drop/genesis",
      },
      snapshotTaken: anima.snapshotTaken,
      eligibleWallets: "", // TODO
      totalAllocationPercent: anima.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(anima.totalAllocationBreakdown),
      userAllocationPercent: anima.snapshotTaken ? new BigNumber(0) : undefined, // TODO
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
      totalAllocationPercent: fud.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(fud.totalAllocationBreakdown),
      userAllocationPercent: fud.snapshotTaken
        ? isFudTop10000Holder
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
        title: "Get OCTO",
        href: `/swap/SUI-${NORMALIZED_OCTO_COINTYPE}`,
      },
      snapshotTaken: octo.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: octo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(octo.totalAllocationBreakdown),
      userAllocationPercent: octo.snapshotTaken
        ? isOctoTop300Holder
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
        title: "Get AAA",
        href: "/swap/SUI-AAA",
      },
      snapshotTaken: aaa.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: aaa.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(aaa.totalAllocationBreakdown),
      userAllocationPercent: aaa.snapshotTaken
        ? isAaaTop1000Holder
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
        title: "Get TISM",
        href: `/swap/SUI-${NORMALIZED_TISM_COINTYPE}`,
      },
      snapshotTaken: tism.snapshotTaken,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: tism.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(tism.totalAllocationBreakdown),
      userAllocationPercent: tism.snapshotTaken
        ? isTismTop300Holder
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
