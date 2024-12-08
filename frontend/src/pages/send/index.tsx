import Head from "next/head";

import BigNumber from "bignumber.js";

import { useWalletContext } from "@suilend/frontend-sui-next";

import AllocationCard from "@/components/send/AllocationCard";
import ClaimSection from "@/components/send/ClaimSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import TokenomicsSection from "@/components/send/TokenomicsSection";
import { Separator } from "@/components/ui/separator";
import {
  SendContextProvider,
  useLoadedSendContext,
} from "@/contexts/SendContext";
import { formatInteger } from "@/lib/format";
import {
  Allocation,
  AllocationId,
  AllocationType,
  AssetType,
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
  TGE_TIMESTAMP_MS,
} from "@/lib/send";

import earlyUsersJson from "./lending/early-users.json";
import doubleUpCitizenJson from "./nft/doubleup-citizen.json";
import eggJson from "./nft/egg.json";
import kumoJson from "./nft/kumo.json";
import primeMachinJson from "./nft/prime-machin.json";
import rootletsJson from "./nft/rootlets.json";
import bluefinLeaguesBlackJson from "./trading/bluefin-leagues-black.json";
import bluefinLeaguesGoldJson from "./trading/bluefin-leagues-gold.json";
import bluefinLeaguesPlatinumJson from "./trading/bluefin-leagues-platinum.json";
import bluefinLeaguesSapphireJson from "./trading/bluefin-leagues-sapphire.json";

function Page() {
  const { address } = useWalletContext();

  const { totalAllocatedPoints, userAllocations } = useLoadedSendContext();

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
        userAllocations !== undefined
          ? userAllocations.earlyUsers.isInSnapshot
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
        userAllocations !== undefined
          ? userAllocations.sendPoints.owned
              .div(1000)
              .times(sendPoints.totalAllocationBreakdownMap.thousand.percent)
          : undefined,
      userClaimedMsend:
        userAllocations !== undefined
          ? userAllocations.sendPoints.claimedMsend
          : undefined,
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
        userAllocations !== undefined
          ? new BigNumber(
              userAllocations.suilendCapsules.ownedMap[
                SuilendCapsuleRarity.COMMON
              ].times(
                suilendCapsules.totalAllocationBreakdownMap[
                  SuilendCapsuleRarity.COMMON
                ].percent,
              ),
            )
              .plus(
                userAllocations.suilendCapsules.ownedMap[
                  SuilendCapsuleRarity.UNCOMMON
                ].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.UNCOMMON
                  ].percent,
                ),
              )
              .plus(
                userAllocations.suilendCapsules.ownedMap[
                  SuilendCapsuleRarity.RARE
                ].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.RARE
                  ].percent,
                ),
              )
          : undefined,
      userClaimedMsend:
        userAllocations !== undefined
          ? userAllocations.suilendCapsules.claimedMsend
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
        userAllocations !== undefined
          ? userAllocations.save.bridgedMsend
          : undefined,
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
        userAllocations !== undefined
          ? userAllocations.rootlets.owned.times(
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
        userAllocations !== undefined
          ? userAllocations.bluefinLeagues.isInSnapshot
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
        userAllocations !== undefined
          ? userAllocations.primeMachin.owned.times(
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
        userAllocations !== undefined
          ? userAllocations.egg.owned.times(
              egg.totalAllocationBreakdownMap.one.percent,
            )
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
        userAllocations !== undefined
          ? userAllocations.doubleUpCitizen.owned.times(
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
        userAllocations !== undefined
          ? userAllocations.kumo.owned.times(
              kumo.totalAllocationBreakdownMap.one.percent,
            )
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
        userAllocations !== undefined
          ? userAllocations.fud.isInSnapshot
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
        userAllocations !== undefined
          ? userAllocations.aaa.isInSnapshot
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
        userAllocations !== undefined
          ? userAllocations.octo.isInSnapshot
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
        userAllocations !== undefined
          ? userAllocations.tism.isInSnapshot
            ? tism.totalAllocationBreakdownMap.wallet.percent
            : new BigNumber(0)
          : undefined,
      userClaimedMsend: undefined,
      userBridgedMsend: undefined,
    },
  ];

  return (
    <>
      <Head>
        <title>Suilend | SEND</title>
      </Head>

      <div className="relative flex w-full flex-col items-center">
        <SendHeader />

        <div className="relative z-[2] flex w-full flex-col items-center">
          <div className="flex w-full flex-col items-center gap-12 pb-16 pt-36 md:gap-16 md:pb-20 md:pt-12">
            <HeroSection allocations={allocations} />

            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
              {allocations.map((allocation) => (
                <AllocationCard
                  key={allocation.title}
                  allocation={allocation}
                />
              ))}
            </div>
          </div>

          {address && Date.now() >= TGE_TIMESTAMP_MS && (
            <>
              <Separator />
              <ClaimSection
                allocations={allocations}
                suilendCapsulesTotalAllocationBreakdownMap={
                  suilendCapsules.totalAllocationBreakdownMap
                }
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

export default function Send() {
  return (
    <SendContextProvider>
      <Page />
    </SendContextProvider>
  );
}
