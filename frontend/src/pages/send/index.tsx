import Head from "next/head";
import { useState } from "react";

import BigNumber from "bignumber.js";

import { useWalletContext } from "@suilend/frontend-sui-next";

import AllocationCard from "@/components/send/AllocationCard";
import BlurbSection from "@/components/send/BlurbSection";
import ClaimSection from "@/components/send/ClaimSection";
import HeroSection from "@/components/send/HeroSection";
import SendHeader from "@/components/send/SendHeader";
import TokenomicsSection from "@/components/send/TokenomicsSection";
import Button from "@/components/shared/Button";
import { Separator } from "@/components/ui/separator";
import {
  SendContextProvider,
  useLoadedSendContext,
} from "@/contexts/SendContext";
import { ASSETS_URL } from "@/lib/constants";
import { formatInteger } from "@/lib/format";
import {
  Allocation,
  AllocationId,
  AllocationType,
  AssetType,
  BluefinLeague,
  SEND_TOTAL_SUPPLY,
  SuilendCapsuleRarity,
  TGE_TIMESTAMP_MS,
} from "@/lib/send";
import { cn } from "@/lib/utils";

function Page() {
  const { address } = useWalletContext();

  const { userAllocations } = useLoadedSendContext();

  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // Allocations
  const earlyUsers = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(3899),
    totalAllocationPercent: new BigNumber(2),
    totalAllocationBreakdownMap: {
      wallet: {
        title: "Per wallet",
        percent: new BigNumber(512).div(SEND_TOTAL_SUPPLY).times(100), // Flat
      },
    },
  };
  const sendPoints = {
    snapshotTaken: false,
    airdropSent: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(18),
    totalAllocationBreakdownMap: {
      thousand: {
        title: "Per 1K SEND Points",
        percent: new BigNumber((18000 / 2764929) * 1000)
          .div(SEND_TOTAL_SUPPLY)
          .times(100), //Linear
      },
    },
  };
  const suilendCapsules = {
    snapshotTaken: false,
    airdropSent: false,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(0.3),
    totalAllocationBreakdownMap: {
      [SuilendCapsuleRarity.COMMON]: {
        title: "Per Common",
        percent: new BigNumber(142).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
      [SuilendCapsuleRarity.UNCOMMON]: {
        title: "Per Uncommon",
        percent: new BigNumber(500).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
      [SuilendCapsuleRarity.RARE]: {
        title: "Per Rare",
        percent: new BigNumber(2000).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const save = {
    snapshotTaken: false,
    airdropSent: false,
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
    airdropSent: true,
    eligibleWallets: undefined,
    totalAllocationPercent: new BigNumber(1.111),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Rootlets NFT",
        percent: new BigNumber(333.333333).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };

  const bluefinLeagues = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(5956 + 187 + 25 + 37),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      [BluefinLeague.GOLD]: {
        title: "Gold",
        percent: new BigNumber(3).div(SEND_TOTAL_SUPPLY).times(100), // Flat
      },
      [BluefinLeague.PLATINUM]: {
        title: "Platinum",
        percent: new BigNumber(60).div(SEND_TOTAL_SUPPLY).times(100), // Flat
      },
      [BluefinLeague.BLACK]: {
        title: "Black",
        percent: new BigNumber(244.5).div(SEND_TOTAL_SUPPLY).times(100), // Flat
      },
      [BluefinLeague.SAPPHIRE]: {
        title: "Sapphire",
        percent: new BigNumber(400).div(SEND_TOTAL_SUPPLY).times(100), // Flat
      },
    },
  };
  const bluefinSendTraders = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(3820), // Unique(Makers, Takers)
    totalAllocationPercent: new BigNumber(0.0625 + 0.0625),
    totalAllocationBreakdownMap: {
      thousandUsdMakerVolume: {
        title: "Per $1K Maker Volume",
        percent: new BigNumber(0.0625).div(1165111.27).times(1000), // Linear
      },
      thousandUsdTakerVolume: {
        title: "Per $1K Taker Volume",
        percent: new BigNumber(0.0625).div(1474402.92).times(1000), // Linear
      },
    },
  };

  const primeMachin = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(930),
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Prime Machin",
        percent: new BigNumber(30).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const egg = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(2105),
    totalAllocationPercent: new BigNumber(0.1),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Egg",
        percent: new BigNumber(10.4).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const doubleUpCitizen = {
    snapshotTaken: true,
    airdropSent: true,
    eligibleWallets: formatInteger(684),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per DoubleUp Citizen",
        percent: new BigNumber(17.3).div(SEND_TOTAL_SUPPLY).times(100), // Linear
      },
    },
  };
  const kumo = {
    snapshotTaken: true,
    airdropSent: false,
    eligibleWallets: formatInteger(508),
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {
      one: {
        title: "Per Kumo",
        percent: new BigNumber(0.05).div(1251), // Linear
      },
    },
  };

  const anima = {
    snapshotTaken: false,
    airdropSent: false,
    eligibleWallets: undefined, //animaJson.length > 0 ? animaJson.length : undefined,
    totalAllocationPercent: new BigNumber(0.05),
    totalAllocationBreakdownMap: {},
  };

  const fud = {
    snapshotTaken: true,
    airdropSent: true,
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
    snapshotTaken: true,
    airdropSent: true,
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
    snapshotTaken: true,
    airdropSent: true,
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
    snapshotTaken: true,
    airdropSent: true,
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
      src: `${ASSETS_URL}/send/lending/early-users.png`,
      hoverSrc: `${ASSETS_URL}/send/lending/early-users-hover.mp4`,
      title: "Early Users",
      description:
        "Early users are those who used Suilend prior to the launch of SEND points.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.LENDING,
      cta: undefined,
      snapshotTaken: earlyUsers.snapshotTaken,
      airdropSent: earlyUsers.airdropSent,
      eligibleWallets: earlyUsers.eligibleWallets,
      totalAllocationPercent: earlyUsers.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        earlyUsers.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.earlyUsers.isInSnapshot
            ? earlyUsers.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SEND_POINTS,
      src: `${ASSETS_URL}/send/points/send-points.png`,
      hoverSrc: `${ASSETS_URL}/send/points/send-points-hover.mp4`,
      title: "SEND Points S1",
      description:
        "SEND Points (Season 1) were distributed as rewards for depositing/borrowing activity on Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: undefined,
      snapshotTaken: sendPoints.snapshotTaken,
      airdropSent: sendPoints.airdropSent,
      eligibleWallets: sendPoints.eligibleWallets,
      totalAllocationPercent: sendPoints.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        sendPoints.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.sendPoints.owned
              .div(1000)
              .times(
                sendPoints.totalAllocationBreakdownMap.thousand.percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.sendPoints.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SUILEND_CAPSULES,
      src: `${ASSETS_URL}/send/nft/suilend-capsules.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/suilend-capsules-hover.mp4`,
      title: "Suilend Capsules",
      description:
        "A token of appreciation awarded for outstanding community contributions to Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: undefined,
      snapshotTaken: suilendCapsules.snapshotTaken,
      airdropSent: suilendCapsules.airdropSent,
      eligibleWallets: suilendCapsules.eligibleWallets,
      totalAllocationPercent: suilendCapsules.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        suilendCapsules.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? new BigNumber(
              userAllocations.suilendCapsules.ownedMap[
                SuilendCapsuleRarity.COMMON
              ].times(
                suilendCapsules.totalAllocationBreakdownMap[
                  SuilendCapsuleRarity.COMMON
                ].percent
                  .times(SEND_TOTAL_SUPPLY)
                  .div(100),
              ),
            )
              .plus(
                userAllocations.suilendCapsules.ownedMap[
                  SuilendCapsuleRarity.UNCOMMON
                ].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.UNCOMMON
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
              .plus(
                userAllocations.suilendCapsules.ownedMap[
                  SuilendCapsuleRarity.RARE
                ].times(
                  suilendCapsules.totalAllocationBreakdownMap[
                    SuilendCapsuleRarity.RARE
                  ].percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
              )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.suilendCapsules.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.SAVE,
      src: `${ASSETS_URL}/send/token/save.png`,
      hoverSrc: `${ASSETS_URL}/send/token/save-hover.mp4`,
      title: "SAVE",
      description:
        "Suilend thrives thanks to the unwavering support of SLND holders. We honor our roots on Solana with this token of appreciation.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Convert SLND",
        href: "https://save.finance/save",
      },
      snapshotTaken: save.snapshotTaken,
      airdropSent: save.airdropSent,
      eligibleWallets: save.eligibleWallets,
      totalAllocationPercent: save.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(save.totalAllocationBreakdownMap),

      userEligibleSend: undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend:
        userAllocations !== undefined
          ? userAllocations.save.bridgedMsend
          : undefined,
    },
    {
      id: AllocationId.ROOTLETS,
      src: `${ASSETS_URL}/send/nft/rootlets.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/rootlets-hover.mp4`,
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
      airdropSent: rootlets.airdropSent,
      eligibleWallets: rootlets.eligibleWallets,
      totalAllocationPercent: rootlets.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        rootlets.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? (Date.now() >= TGE_TIMESTAMP_MS
              ? userAllocations.rootlets.msendOwning
              : userAllocations.rootlets.owned
            ).times(
              rootlets.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend:
        userAllocations !== undefined
          ? userAllocations.rootlets.redeemedMsend
          : undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.BLUEFIN_LEAGUES,
      src: `${ASSETS_URL}/send/trading/bluefin-leagues.png`,
      hoverSrc: `${ASSETS_URL}/send/trading/bluefin-leagues-hover.mp4`,
      title: "Bluefin Leagues",
      description:
        "Bluefin Leagues offer a structured recognition system to reward users for their engagement and trading activities on the Bluefin platform.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TRADING,
      snapshotTaken: bluefinLeagues.snapshotTaken,
      airdropSent: bluefinLeagues.airdropSent,
      eligibleWallets: bluefinLeagues.eligibleWallets,
      totalAllocationPercent: bluefinLeagues.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinLeagues.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.bluefinLeagues.isInSnapshot
            ? bluefinLeagues.totalAllocationBreakdownMap[
                userAllocations.bluefinLeagues.isInSnapshot as BluefinLeague
              ].percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.BLUEFIN_SEND_TRADERS,
      src: `${ASSETS_URL}/send/trading/bluefin-send-traders.png`,
      hoverSrc: `${ASSETS_URL}/send/trading/bluefin-send-traders-hover.mp4`,
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
      airdropSent: bluefinSendTraders.airdropSent,
      eligibleWallets: bluefinSendTraders.eligibleWallets,
      totalAllocationPercent: bluefinSendTraders.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        bluefinSendTraders.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? new BigNumber(
              userAllocations.bluefinSendTraders.makerVolumeUsd
                .div(1000)
                .times(
                  bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdMakerVolume.percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
            ).plus(
              userAllocations.bluefinSendTraders.takerVolumeUsd
                .div(1000)
                .times(
                  bluefinSendTraders.totalAllocationBreakdownMap.thousandUsdTakerVolume.percent
                    .times(SEND_TOTAL_SUPPLY)
                    .div(100),
                ),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.PRIME_MACHIN,
      src: `${ASSETS_URL}/send/nft/prime-machin.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/prime-machin-hover.mp4`,
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
      airdropSent: primeMachin.airdropSent,
      eligibleWallets: primeMachin.eligibleWallets,
      totalAllocationPercent: primeMachin.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        primeMachin.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.primeMachin.owned.times(
              primeMachin.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.EGG,
      src: `${ASSETS_URL}/send/nft/egg.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/egg-hover.mp4`,
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
      airdropSent: egg.airdropSent,
      eligibleWallets: egg.eligibleWallets,
      totalAllocationPercent: egg.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(egg.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.egg.owned.times(
              egg.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.DOUBLEUP_CITIZEN,
      src: `${ASSETS_URL}/send/nft/doubleup-citizen.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/doubleup-citizen-hover.mp4`,
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
      airdropSent: doubleUpCitizen.airdropSent,
      eligibleWallets: doubleUpCitizen.eligibleWallets,
      totalAllocationPercent: doubleUpCitizen.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        doubleUpCitizen.totalAllocationBreakdownMap,
      ),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.doubleUpCitizen.owned.times(
              doubleUpCitizen.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.KUMO,
      src: `${ASSETS_URL}/send/nft/kumo.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/kumo-hover.mp4`,
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
      airdropSent: kumo.airdropSent,
      eligibleWallets: kumo.eligibleWallets,
      totalAllocationPercent: kumo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(kumo.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.kumo.owned.times(
              kumo.totalAllocationBreakdownMap.one.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100),
            )
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.ANIMA,
      src: `${ASSETS_URL}/send/nft/anima.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/anima-hover.mp4`,
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
      airdropSent: anima.airdropSent,
      eligibleWallets: anima.eligibleWallets,
      totalAllocationPercent: anima.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(
        anima.totalAllocationBreakdownMap,
      ),

      userEligibleSend: undefined,
      // isInAnimaSnapshot !== undefined
      //   ? isInAnimaSnapshot
      //     ? anima.totalAllocationBreakdownMap!.percent.times(SEND_TOTAL_SUPPLY).div(100)
      //     : new BigNumber(0)
      //   : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },

    {
      id: AllocationId.FUD,
      src: `${ASSETS_URL}/send/token/fud.png`,
      hoverSrc: `${ASSETS_URL}/send/token/fud-hover.mp4`,
      title: "FUD",
      description: "FUD is the OG culture coin on Sui.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-FUD",
      },
      snapshotTaken: fud.snapshotTaken,
      airdropSent: fud.airdropSent,
      eligibleWallets: `Top ${formatInteger(fud.eligibleWallets)}`,
      totalAllocationPercent: fud.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(fud.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.fud.isInSnapshot
            ? fud.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.AAA,
      src: `${ASSETS_URL}/send/token/aaa.png`,
      hoverSrc: `${ASSETS_URL}/send/token/aaa-hover.mp4`,
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
      airdropSent: aaa.airdropSent,
      eligibleWallets: `Top ${formatInteger(aaa.eligibleWallets)}`,
      totalAllocationPercent: aaa.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(aaa.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.aaa.isInSnapshot
            ? aaa.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.OCTO,
      src: `${ASSETS_URL}/send/token/octo.png`,
      hoverSrc: `${ASSETS_URL}/send/token/octo-hover.mp4`,
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
      airdropSent: octo.airdropSent,
      eligibleWallets: `Top ${formatInteger(octo.eligibleWallets)}`,
      totalAllocationPercent: octo.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(octo.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.octo.isInSnapshot
            ? octo.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
      userBridgedMsend: undefined,
    },
    {
      id: AllocationId.TISM,
      src: `${ASSETS_URL}/send/token/tism.png`,
      hoverSrc: `${ASSETS_URL}/send/token/tism-hover.mp4`,
      title: "TISM",
      description: "got tism?",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TOKEN,
      cta: {
        title: "Buy",
        href: "/swap/SUI-TISM",
      },
      snapshotTaken: tism.snapshotTaken,
      airdropSent: tism.airdropSent,
      eligibleWallets: `Top ${formatInteger(tism.eligibleWallets)}`,
      totalAllocationPercent: tism.totalAllocationPercent,
      totalAllocationBreakdown: Object.values(tism.totalAllocationBreakdownMap),

      userEligibleSend:
        userAllocations !== undefined
          ? userAllocations.tism.isInSnapshot
            ? tism.totalAllocationBreakdownMap.wallet.percent
                .times(SEND_TOTAL_SUPPLY)
                .div(100)
            : new BigNumber(0)
          : undefined,
      userRedeemedMsend: undefined,
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
            <HeroSection allocations={allocations} />

            <div
              className={cn(
                "relative w-full",
                isCollapsed && "h-[400px] overflow-hidden md:h-[600px]",
              )}
            >
              <div
                className={cn(
                  "relative z-[1] h-full w-full",
                  isCollapsed && "pointer-events-none",
                )}
                style={
                  isCollapsed
                    ? {
                        maskImage:
                          "linear-gradient(to bottom, black 0%, transparent 100%)",
                      }
                    : undefined
                }
              >
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
                  {allocations.map((allocation) => (
                    <AllocationCard
                      key={allocation.title}
                      allocation={allocation}
                    />
                  ))}
                </div>
              </div>

              {isCollapsed && (
                <Button
                  className="absolute bottom-0 left-1/2 z-[2] -translate-x-1/2 border-secondary"
                  labelClassName="text-[16px] uppercase text-primary-foreground"
                  variant="secondaryOutline"
                  size="lg"
                  onClick={() => setIsCollapsed(false)}
                >
                  Show full list
                </Button>
              )}
            </div>
          </div>

          <Separator />
          <BlurbSection />

          {address && Date.now() >= TGE_TIMESTAMP_MS && (
            <>
              <Separator />
              <ClaimSection
                allocations={allocations}
                totalAllocationBreakdownMaps={{
                  suilendCapsules: suilendCapsules.totalAllocationBreakdownMap,
                }}
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
