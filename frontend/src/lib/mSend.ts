import { KioskData, KioskOwnerCap } from "@mysten/kiosk";
import { KioskClient } from "@mysten/kiosk";
import { SuiClient, SuiObjectResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import BigNumber from "bignumber.js";

import { SuilendClient } from "@suilend/sdk";
import {
  NORMALIZED_SEND_POINTS_S1_COINTYPE,
  NORMALIZED_SEND_POINTS_S2_COINTYPE,
  NORMALIZED_STEAMM_POINTS_COINTYPE,
  NORMALIZED_mSEND_SERIES_1_COINTYPE,
  NORMALIZED_mSEND_SERIES_5_COINTYPE,
  formatInteger,
  getAllCoins,
  isSendPointsS1,
  isSendPointsS2,
  isSteammPoints,
} from "@suilend/sui-fe";

import { UserData } from "@/contexts/UserContext";
import { ASSETS_URL } from "@/lib/constants";
import { SEND_TOTAL_SUPPLY } from "@/lib/send";

// IDs
// IDs - Contracts
const BURN_CONTRACT_S1_PACKAGE_ID =
  "0xf4e0686b311e9b9d6da7e61fc42dae4254828f5ee3ded8ab5480ecd27e46ff08";
const BURN_CONTRACT_S2_PACKAGE_ID =
  "0x1e1ccd013b8cceda2dadf4b8784750dae395f823c25130f752573d4c8a52aeac";
const BURN_CONTRACT_S2_FIXED_PACKAGE_ID =
  "0xfbf0679696c15de2011d5e41dac15fa66100e6b766c49e9d7b20f035e4964837";

// IDs - Managers
const SEND_POINTS_S1_MANAGER_OBJECT_ID =
  "0x1236a2059bd24b46067cd6818469802b56a05920c9029c7b16c16a47efab2260";
const SUILEND_CAPSULES_S1_MANAGER_OBJECT_ID =
  "0x5307419ec2f76bb70a948d71adf22ffde99a102961a3aa61361cc233f6d31e6e";

const SEND_POINTS_S2_MANAGER_OBJECT_ID =
  "0x1e333110f2275937fe9ce8145a54c9c390523d59fc181957624d306b63f139cb";
const STEAMM_POINTS_MANAGER_OBJECT_ID =
  "0x656672cf97be802f84015e406a2888e40123335615a41014f8d0d0ea7423bc83";
const SUILEND_CAPSULES_S2_MANAGER_OBJECT_ID =
  "0x0328bceae9222fb8e34363b68991f3d332e2867c3c6bf90a4dc725259365a92f";

// IDs - NFTs
export const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";
export const ROOTLETS_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

// Events
export const BURN_SEND_POINTS_S1_EVENT_TYPE = `${BURN_CONTRACT_S1_PACKAGE_ID}::points::BurnEvent`;
export const BURN_SUILEND_CAPSULES_S1_EVENT_TYPE = `${BURN_CONTRACT_S1_PACKAGE_ID}::capsule::BurnEvent`;

export const BURN_SEND_POINTS_S2_EVENT_TYPE = `${BURN_CONTRACT_S2_PACKAGE_ID}::points_2::BurnEvent`;
export const BURN_STEAMM_POINTS_EVENT_TYPE = `${BURN_CONTRACT_S2_PACKAGE_ID}::steamm_points::BurnEvent`;
export const BURN_SUILEND_CAPSULES_S2_EVENT_TYPE = `${BURN_CONTRACT_S2_PACKAGE_ID}::capsule_2::BurnEvent`;

// Types
export type MsendObject = {
  penaltyStartTimeS: BigNumber;
  penaltyEndTimeS: BigNumber;

  startPenaltySui: BigNumber;
  endPenaltySui: BigNumber;
  currentPenaltySui: BigNumber;
};

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
export const ASSET_TYPE_NAME_MAP: Record<AssetType, string> = {
  [AssetType.LENDING]: "Lending",
  [AssetType.NFT]: "NFT",
  [AssetType.TOKEN]: "Token",
  [AssetType.TRADING]: "Trading",
  [AssetType.POINTS]: "Points",
};

export enum AllocationIdS1 {
  EARLY_USERS = "earlyUsers",
  SEND_POINTS_S1 = "sendPointsS1",
  SUILEND_CAPSULES_S1 = "suilendCapsulesS1",
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

export enum AllocationIdS2 {
  SEND_POINTS_S2 = "sendPointsS2",
  STEAMM_POINTS = "steammPoints",
  SUILEND_CAPSULES_S2 = "suilendCapsulesS2",
}

export type Allocation = {
  id: AllocationIdS1 | AllocationIdS2;
  src: string;
  hoverSrc: string;
  redeemSrc?: string;
  redeemSrcMap?: Record<string, string>;
  title: string;
  description: string;
  allocationType: AllocationType;
  assetType: AssetType;
  cta: { title: string; href: string } | undefined;

  snapshotTaken: boolean;
  airdropSent: boolean;
  eligibleWallets: string | undefined;
  totalAllocationPercent: BigNumber;
  totalAllocationBreakdownMap: Record<
    string,
    { title: string; percent: BigNumber }
  >;
};
export type AllocationWithUserAllocation = Allocation & {
  owned?: BigNumber;
  ownedMap?: Record<string, BigNumber>; // Suilend Capsules only
  userEligibleSend?: BigNumber;
  userEligibleSendMap?: Record<string, BigNumber>; // Rootlets only
  userRedeemedMsend?: BigNumber;
  userBridgedMsend?: BigNumber;
};

export enum SuilendCapsuleS1Rarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
}

export enum SuilendCapsuleS2Rarity {
  COMMON = "common_s2",
  UNCOMMON = "uncommon_s2",
  RARE = "rare_s2",
}

export enum BluefinLeague {
  GOLD = "gold",
  PLATINUM = "platinum",
  BLACK = "black",
  SAPPHIRE = "sapphire",
}

// Allocations
export const allocations: {
  s1: Record<AllocationIdS1, Allocation>;
  s2: Record<AllocationIdS2, Allocation>;
} = {
  s1: {
    [AllocationIdS1.EARLY_USERS]: {
      id: AllocationIdS1.EARLY_USERS,
      src: `${ASSETS_URL}/send/lending/early-users.png`,
      hoverSrc: `${ASSETS_URL}/send/lending/early-users-hover.mp4`,
      title: "Early Users",
      description:
        "Early users are those who used Suilend prior to the launch of SEND Points.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.LENDING,
      cta: undefined,

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
    },
    [AllocationIdS1.SEND_POINTS_S1]: {
      id: AllocationIdS1.SEND_POINTS_S1,
      src: `${ASSETS_URL}/send/points/send-points-s1.png`,
      hoverSrc: `${ASSETS_URL}/send/points/send-points-s1-hover.mp4`,
      redeemSrc: `${ASSETS_URL}/send/redeem/send-points/s1.png`,
      title: "SEND Points S1",
      description:
        "SEND Points (Season 1) were distributed as rewards for depositing/borrowing activity on Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: undefined,

      snapshotTaken: false,
      airdropSent: false,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(18),
      totalAllocationBreakdownMap: {
        thousand: {
          title: "Per 1K SEND Points S1",
          percent: new BigNumber((18000 / 2764929) * 1000)
            .div(SEND_TOTAL_SUPPLY)
            .times(100), // Linear
        },
      },
    },
    [AllocationIdS1.SUILEND_CAPSULES_S1]: {
      id: AllocationIdS1.SUILEND_CAPSULES_S1,
      src: `${ASSETS_URL}/send/nft/suilend-capsules-s1.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/suilend-capsules-s1-hover.mp4`,
      redeemSrcMap: {
        [SuilendCapsuleS1Rarity.COMMON]: `${ASSETS_URL}/send/redeem/suilend-capsules/common-s1.png`,
        [SuilendCapsuleS1Rarity.UNCOMMON]: `${ASSETS_URL}/send/redeem/suilend-capsules/uncommon-s1.png`,
        [SuilendCapsuleS1Rarity.RARE]: `${ASSETS_URL}/send/redeem/suilend-capsules/rare-s1.png`,
      },
      title: "Suilend Capsules S1",
      description:
        "A token of appreciation awarded for outstanding community contributions to Suilend.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: undefined,

      snapshotTaken: false,
      airdropSent: false,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(0.3),
      totalAllocationBreakdownMap: {
        [SuilendCapsuleS1Rarity.COMMON]: {
          title: "Per Common",
          percent: new BigNumber(142).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
        [SuilendCapsuleS1Rarity.UNCOMMON]: {
          title: "Per Uncommon",
          percent: new BigNumber(500).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
        [SuilendCapsuleS1Rarity.RARE]: {
          title: "Per Rare",
          percent: new BigNumber(2000).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
      },
    },
    [AllocationIdS1.SAVE]: {
      id: AllocationIdS1.SAVE,
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
    },
    [AllocationIdS1.ROOTLETS]: {
      id: AllocationIdS1.ROOTLETS,
      src: `${ASSETS_URL}/send/nft/rootlets.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/rootlets-hover.mp4`,
      redeemSrc: `${ASSETS_URL}/send/redeem/rootlets.png`,
      title: "Rootlets",
      description:
        "Rootlets are the companion NFT community to Suilend. It's the most premium art collection on Sui, but the art is good tho.",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: {
        title: "Buy",
        href: "https://www.tradeport.xyz/sui/collection/rootlets?bottomTab=trades&tab=items",
      },

      snapshotTaken: false,
      airdropSent: true,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(1.111),
      totalAllocationBreakdownMap: {
        one: {
          title: "Per Rootlet",
          percent: new BigNumber(333.333333).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
      },
    },

    [AllocationIdS1.BLUEFIN_LEAGUES]: {
      id: AllocationIdS1.BLUEFIN_LEAGUES,
      src: `${ASSETS_URL}/send/trading/bluefin-leagues.png`,
      hoverSrc: `${ASSETS_URL}/send/trading/bluefin-leagues-hover.mp4`,
      title: "Bluefin Leagues",
      description:
        "Bluefin Leagues offer a structured recognition system to reward users for their engagement and trading activities on the Bluefin platform.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.TRADING,
      cta: undefined,

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
    },
    [AllocationIdS1.BLUEFIN_SEND_TRADERS]: {
      id: AllocationIdS1.BLUEFIN_SEND_TRADERS,
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
    },

    [AllocationIdS1.PRIME_MACHIN]: {
      id: AllocationIdS1.PRIME_MACHIN,
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
    },
    [AllocationIdS1.EGG]: {
      id: AllocationIdS1.EGG,
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
    },
    [AllocationIdS1.DOUBLEUP_CITIZEN]: {
      id: AllocationIdS1.DOUBLEUP_CITIZEN,
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
    },
    [AllocationIdS1.KUMO]: {
      id: AllocationIdS1.KUMO,
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

      snapshotTaken: true,
      airdropSent: true,
      eligibleWallets: formatInteger(998),
      totalAllocationPercent: new BigNumber(0.05),
      totalAllocationBreakdownMap: {
        one: {
          title: "Per Kumo",
          percent: new BigNumber(26).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
      },
    },

    [AllocationIdS1.ANIMA]: {
      id: AllocationIdS1.ANIMA,
      src: `${ASSETS_URL}/send/nft/anima.png`,
      hoverSrc: `${ASSETS_URL}/send/nft/anima-hover.mp4`,
      title: "Anima",
      description:
        "Anima's game-ready Genesis Avatars: the first-ever dNFT collection on Sui.",
      allocationType: AllocationType.FLAT,
      assetType: AssetType.NFT,
      cta: {
        title: "Mint",
        href: "https://anima.nexus/drop/genesis",
      },

      snapshotTaken: true,
      airdropSent: false,
      eligibleWallets: undefined, //animaJson.length > 0 ? animaJson.length : undefined,
      totalAllocationPercent: new BigNumber(0.05),
      totalAllocationBreakdownMap: {},
    },

    [AllocationIdS1.FUD]: {
      id: AllocationIdS1.FUD,
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

      snapshotTaken: true,
      airdropSent: true,
      eligibleWallets: formatInteger(5000), // Top 5,000 FUD holders
      totalAllocationPercent: new BigNumber(0.1),
      totalAllocationBreakdownMap: {
        wallet: {
          title: "Per wallet",
          percent: new BigNumber(0.1).div(5000), // Flat
        },
      },
    },
    [AllocationIdS1.AAA]: {
      id: AllocationIdS1.AAA,
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

      snapshotTaken: true,
      airdropSent: true,
      eligibleWallets: formatInteger(5000), // Top 5,000 AAA holders
      totalAllocationPercent: new BigNumber(0.1),
      totalAllocationBreakdownMap: {
        wallet: {
          title: "Per wallet",
          percent: new BigNumber(0.1).div(5000), // Flat
        },
      },
    },
    [AllocationIdS1.OCTO]: {
      id: AllocationIdS1.OCTO,
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

      snapshotTaken: true,
      airdropSent: true,
      eligibleWallets: formatInteger(1000), // Top 1,000 OCTO holders
      totalAllocationPercent: new BigNumber(0.01),
      totalAllocationBreakdownMap: {
        wallet: {
          title: "Per wallet",
          percent: new BigNumber(0.01).div(1000), // Flat
        },
      },
    },
    [AllocationIdS1.TISM]: {
      id: AllocationIdS1.TISM,
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

      snapshotTaken: true,
      airdropSent: true,
      eligibleWallets: formatInteger(1000), // Top 1,000 TISM holders
      totalAllocationPercent: new BigNumber(0.01),
      totalAllocationBreakdownMap: {
        wallet: {
          title: "Per wallet",
          percent: new BigNumber(0.01).div(1000), // Flat
        },
      },
    },
  },
  s2: {
    [AllocationIdS2.SEND_POINTS_S2]: {
      id: AllocationIdS2.SEND_POINTS_S2,
      src: "",
      hoverSrc: "",
      redeemSrc: `${ASSETS_URL}/send/redeem/send-points/s2.png`,
      title: "SEND Points S2",
      description: "",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: undefined,

      snapshotTaken: false,
      airdropSent: false,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(1.8),
      totalAllocationBreakdownMap: {
        thousand: {
          title: "Per 1K SEND Points S2",
          percent: new BigNumber(
            new BigNumber("1800000000000").div("3852665923134769").times(1000),
          )
            .div(SEND_TOTAL_SUPPLY)
            .times(100), // Linear
        },
      },
    },
    [AllocationIdS2.STEAMM_POINTS]: {
      id: AllocationIdS2.STEAMM_POINTS,
      src: "",
      hoverSrc: "",
      redeemSrc: `${ASSETS_URL}/send/redeem/steamm-points.png`,
      title: "STEAMM Points",
      description: "",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.POINTS,
      cta: undefined,

      snapshotTaken: false,
      airdropSent: false,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(0.2),
      totalAllocationBreakdownMap: {
        thousand: {
          title: "Per 1K STEAMM Points",
          percent: new BigNumber(
            new BigNumber("200000000000").div("7364578219946").times(1000),
          )
            .div(SEND_TOTAL_SUPPLY)
            .times(100), // Linear
        },
      },
    },
    [AllocationIdS2.SUILEND_CAPSULES_S2]: {
      id: AllocationIdS2.SUILEND_CAPSULES_S2,
      src: "",
      hoverSrc: "",
      redeemSrcMap: {
        [SuilendCapsuleS2Rarity.COMMON]: `${ASSETS_URL}/send/redeem/suilend-capsules/common-s2.png`,
        [SuilendCapsuleS2Rarity.UNCOMMON]: `${ASSETS_URL}/send/redeem/suilend-capsules/uncommon-s2.png`,
        [SuilendCapsuleS2Rarity.RARE]: `${ASSETS_URL}/send/redeem/suilend-capsules/rare-s2.png`,
      },
      title: "Suilend Capsules S2",
      description: "",
      allocationType: AllocationType.LINEAR,
      assetType: AssetType.NFT,
      cta: undefined,

      snapshotTaken: false,
      airdropSent: false,
      eligibleWallets: undefined,
      totalAllocationPercent: new BigNumber(0.05),
      totalAllocationBreakdownMap: {
        [SuilendCapsuleS2Rarity.COMMON]: {
          title: "Per Common",
          percent: new BigNumber(100).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
        [SuilendCapsuleS2Rarity.UNCOMMON]: {
          title: "Per Uncommon",
          percent: new BigNumber(250).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
        [SuilendCapsuleS2Rarity.RARE]: {
          title: "Per Rare",
          percent: new BigNumber(1000).div(SEND_TOTAL_SUPPLY).times(100), // Linear
        },
      },
    },
  },
};

// Redeem
export const redeemPointsMsend = async (
  type: "SEND_POINTS_S1" | "SEND_POINTS_S2" | "STEAMM_POINTS",
  suiClient: SuiClient,
  suilendClient: SuilendClient,
  getBalance: (coinType: string) => BigNumber,
  userData: UserData,
  address: string,
  transaction: Transaction,
) => {
  const pointsCoinType = {
    SEND_POINTS_S1: NORMALIZED_SEND_POINTS_S1_COINTYPE,
    SEND_POINTS_S2: NORMALIZED_SEND_POINTS_S2_COINTYPE,
    STEAMM_POINTS: NORMALIZED_STEAMM_POINTS_COINTYPE,
  }[type];

  // Claim points rewards
  const pointsCoins = [];

  for (const obligation of userData.obligations ?? []) {
    const obligationOwnerCap = userData.obligationOwnerCaps?.find(
      (o) => o.obligationId === obligation.id,
    );
    if (!obligationOwnerCap) continue;

    const pointsRewards = Object.values(userData.rewardMap).flatMap((rewards) =>
      [...rewards.deposit, ...rewards.borrow].filter(
        (r) =>
          (type === "SEND_POINTS_S1"
            ? isSendPointsS1(r.stats.rewardCoinType)
            : type === "SEND_POINTS_S2"
              ? isSendPointsS2(r.stats.rewardCoinType)
              : isSteammPoints(r.stats.rewardCoinType)) &&
          !!r.obligationClaims[obligation.id] &&
          r.obligationClaims[obligation.id].claimableAmount.gt(0),
      ),
    );

    for (const pointsReward of pointsRewards) {
      const [pointsCoin] = suilendClient.claimReward(
        obligationOwnerCap.id,
        pointsReward.obligationClaims[obligation.id].reserveArrayIndex,
        BigInt(pointsReward.stats.rewardIndex),
        pointsReward.stats.rewardCoinType,
        pointsReward.stats.side,
        transaction,
      );
      pointsCoins.push(pointsCoin);
    }
  }

  // Add balance coins
  const balance = getBalance(pointsCoinType);
  if (balance.gt(0)) {
    const allCoinsPoints = await getAllCoins(
      suiClient,
      address,
      pointsCoinType,
    );

    pointsCoins.push(...allCoinsPoints.map((c) => c.coinObjectId));
  }

  // Merge points coins
  if (pointsCoins.length === 0) return;

  const mergedPointsCoin = pointsCoins[0];
  if (pointsCoins.length > 1) {
    transaction.mergeCoins(mergedPointsCoin, pointsCoins.slice(1));
  }

  // Burn points for mSEND
  const mSendCoin =
    type === "SEND_POINTS_S1"
      ? transaction.moveCall({
          target: `${BURN_CONTRACT_S1_PACKAGE_ID}::points::burn_points`,
          typeArguments: [NORMALIZED_mSEND_SERIES_1_COINTYPE],
          arguments: [
            transaction.object(SEND_POINTS_S1_MANAGER_OBJECT_ID),
            transaction.object(mergedPointsCoin),
          ],
        })
      : type === "SEND_POINTS_S2"
        ? transaction.moveCall({
            target: `${BURN_CONTRACT_S2_FIXED_PACKAGE_ID}::points_2::burn_points`,
            typeArguments: [NORMALIZED_mSEND_SERIES_5_COINTYPE],
            arguments: [
              transaction.object(SEND_POINTS_S2_MANAGER_OBJECT_ID),
              transaction.object(mergedPointsCoin),
            ],
          })
        : transaction.moveCall({
            target: `${BURN_CONTRACT_S2_FIXED_PACKAGE_ID}::steamm_points::burn_points`,
            typeArguments: [NORMALIZED_mSEND_SERIES_5_COINTYPE],
            arguments: [
              transaction.object(STEAMM_POINTS_MANAGER_OBJECT_ID),
              transaction.object(mergedPointsCoin),
            ],
          });

  // Transfer mSEND to user
  transaction.transferObjects([mSendCoin], transaction.pure.address(address));
};

export const redeemSuilendCapsulesMsend = (
  season: 1 | 2,
  objs: SuiObjectResponse[],
  address: string,
  transaction: Transaction,
) => {
  // Burn Suilend Capsules for mSEND
  const maxCount = 250;
  const mSendCoins = [];

  for (const obj of objs) {
    if (mSendCoins.length >= maxCount) break;

    const mSendCoin =
      season === 1
        ? transaction.moveCall({
            target: `${BURN_CONTRACT_S1_PACKAGE_ID}::capsule::burn_capsule`,
            typeArguments: [NORMALIZED_mSEND_SERIES_1_COINTYPE],
            arguments: [
              transaction.object(SUILEND_CAPSULES_S1_MANAGER_OBJECT_ID),
              transaction.object(obj.data?.objectId as string),
            ],
          })
        : transaction.moveCall({
            target: `${BURN_CONTRACT_S2_FIXED_PACKAGE_ID}::capsule_2::burn_capsule`,
            typeArguments: [NORMALIZED_mSEND_SERIES_5_COINTYPE],
            arguments: [
              transaction.object(SUILEND_CAPSULES_S2_MANAGER_OBJECT_ID),
              transaction.object(obj.data?.objectId as string),
            ],
          });
    mSendCoins.push(mSendCoin);
  }

  // Merge mSEND coins
  if (mSendCoins.length === 0) return;

  const mergedMsendCoin = mSendCoins[0];
  if (mSendCoins.length > 1) {
    transaction.mergeCoins(
      transaction.object(mergedMsendCoin),
      mSendCoins.map((c) => transaction.object(c)).slice(1),
    );
  }

  // Transfer mSEND to user
  transaction.transferObjects(
    [mergedMsendCoin],
    transaction.pure.address(address),
  );
};

export const redeemRootletsMsend = async (
  rootletsOwnedMsendObjectsMap: Record<
    string,
    { objs: SuiObjectResponse[]; ownedMsendMap: Record<string, BigNumber> }
  >,
  kioskClient: KioskClient,
  ownedKiosks: {
    kiosk: KioskData;
    kioskOwnerCap: KioskOwnerCap;
  }[],
  address: string,
  transaction: Transaction,
) => {
  const personalKioskRulePackageId = kioskClient.getRulePackageId(
    "personalKioskRulePackageId",
  );

  let count = 0;
  const maxCount = 25;
  for (const { kiosk, kioskOwnerCap: personalKioskOwnerCap } of ownedKiosks) {
    if (count >= maxCount) break;

    const kioskItems = kiosk.items.filter(
      (item) => item.type === ROOTLETS_TYPE && !item.listing,
    );

    for (const kioskItem of kioskItems) {
      if (count >= maxCount) break;
      if (
        (rootletsOwnedMsendObjectsMap[kioskItem.objectId]?.objs || []).every(
          (obj) => (obj.data?.content as any).fields.balance === "0",
        )
      )
        continue; // Skip Rootlets with no mSEND (either no objects, or all objects have 0 balance)

      // Borrow item from personal kiosk
      const [kioskOwnerCap, borrow] = transaction.moveCall({
        target: `${personalKioskRulePackageId}::personal_kiosk::borrow_val`,
        arguments: [transaction.object(personalKioskOwnerCap.objectId)],
      });

      // Borrow item from kiosk
      const [item, promise] = transaction.moveCall({
        target: "0x2::kiosk::borrow_val",
        arguments: [
          transaction.object(kioskItem.kioskId),
          kioskOwnerCap,
          transaction.pure.id(kioskItem.objectId),
        ],
        typeArguments: [ROOTLETS_TYPE],
      });

      for (const obj of rootletsOwnedMsendObjectsMap[kioskItem.objectId].objs) {
        if ((obj.data?.content as any).fields.balance === "0") continue;

        // Take mSEND coin out of NFT
        const mSendCoin = transaction.moveCall({
          target:
            "0xbe7741c72669f1552d0912a4bc5cdadb5856bcb970350613df9b4362e4855dc5::rootlet::receive_obj",
          arguments: [item, transaction.object(obj.data?.objectId as string)],
          typeArguments: [(obj.data?.content as any).type],
        });

        // Transfer mSEND to user
        transaction.transferObjects(
          [mSendCoin],
          transaction.pure.address(address),
        );
      }

      // Return item to kiosk
      transaction.moveCall({
        target: "0x2::kiosk::return_val",
        arguments: [transaction.object(kioskItem.kioskId), item, promise],
        typeArguments: [ROOTLETS_TYPE],
      });

      // Return item to personal kiosk
      transaction.moveCall({
        target: `${personalKioskRulePackageId}::personal_kiosk::return_val`,
        arguments: [
          transaction.object(
            transaction.object(personalKioskOwnerCap.objectId),
          ),
          kioskOwnerCap,
          borrow,
        ],
      });

      count++;
    }
  }
};
