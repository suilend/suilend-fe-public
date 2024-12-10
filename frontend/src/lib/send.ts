import { KioskClient, KioskData, KioskOwnerCap } from "@mysten/kiosk";
import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID, normalizeStructTag } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { Duration } from "date-fns";

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_BETA_SEND_POINTS_COINTYPE,
  NORMALIZED_BETA_mSEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
} from "@suilend/frontend-sui";
import { SuilendClient } from "@suilend/sdk";

import { AppData } from "@/contexts/AppContext";
import { getOwnedObjectsOfType } from "@/lib/transactions";

export const SEND_TOTAL_SUPPLY = 100_000_000;

export const TGE_TIMESTAMP_MS = 1730419200000; // TODO: Change to 1733979600000
export const mSEND_REDEMPTION_END_TIMESTAMP_MS =
  TGE_TIMESTAMP_MS + 365 * 24 * 60 * 60 * 1000; // 1 year after TGE

// Contracts
const BURN_CONTRACT_PACKAGE_ID =
  "0x2cab7e7606f801f1bdf08b9e168bf29faec39f377ec9a618e4eeb2d3a52e3b83"; // TODO
const mTOKEN_CONTRACT_PACKAGE_ID =
  "0xd0d8ed2a83da2f0f171de7d60b0b128637d51e6dbfbec232447a764cdc6af627"; // TODO

// Managers
const POINTS_MANAGER_OBJECT_ID =
  "0xab8000923b7f708aed446d66145487ea902d9e61f17e6157662973d971c16e6e"; // TODO
const CAPSULE_MANAGER_OBJECT_ID =
  "0x57903dd513e0962e71622295e133cbeed4be985862b74ce2bff040889b305064"; // TODO
export const mSEND_MANAGER_OBJECT_ID =
  "0x776471131804197216d32d2805e38a46dd40fe2a7b1a76adde4a1787f878c2d7"; // TODO

export const mSEND_COINTYPE_MANAGER_MAP = {
  [NORMALIZED_BETA_mSEND_COINTYPE]: mSEND_MANAGER_OBJECT_ID, // TODO
};

// Events
export const BURN_SEND_POINTS_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::points::BurnEvent`;
export const BURN_SUILEND_CAPSULES_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::capsule::BurnEvent`;
export const REDEEM_SEND_EVENT_TYPE = `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::RedeemMTokensEvent`;

export const WORMHOLE_TRANSFER_REDEEMED_EVENT_TYPE =
  "0x26efee2b51c911237888e5dc6702868abca3c7ac12c53f76ef8eba0697695e3d::complete_transfer::TransferRedeemed";

// NFTs
export const BETA_SUILEND_CAPSULE_TYPE =
  "0xe225a46bfe059ab96f3264d3aee63c6c4997eccad2b4630350e0957a52badd54::suilend_capsule::SuilendCapsule";
export const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

export const ROOTLETS_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

export const PRIME_MACHIN_TYPE =
  "0x034c162f6b594cb5a1805264dd01ca5d80ce3eca6522e6ee37fd9ebfb9d3ddca::factory::PrimeMachin";
export const EGG_TYPE =
  "0x484932c474bf09f002b82e4a57206a6658a0ca6dbdb15896808dcd1929c77820::egg::AfEgg";
export const DOUBLEUP_CITIZEN_TYPE =
  "0x862810efecf0296db2e9df3e075a7af8034ba374e73ff1098e88cc4bb7c15437::doubleup_citizens::DoubleUpCitizen";
export const KUMO_TYPE =
  "0x57191e5e5c41166b90a4b7811ad3ec7963708aa537a8438c1761a5d33e2155fd::kumo::Kumo";

// Types
export type MsendObject = {
  penaltyStartTimeS: BigNumber;
  penaltyEndTimeS: BigNumber;

  startPenaltySui: BigNumber;
  endPenaltySui: BigNumber;
  currentPenaltySui: BigNumber;
};

export enum SuilendCapsuleRarity {
  COMMON = "common",
  UNCOMMON = "uncommon",
  RARE = "rare",
}

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

  userEligibleSend?: BigNumber;
  userRedeemedMsend?: BigNumber;
  userBridgedMsend?: BigNumber;
};

export const redeemSendPointsMsend = async (
  suilendClient: SuilendClient,
  data: AppData,
  address: string,
  transaction: Transaction,
) => {
  // Claim SEND Points rewards
  const sendPointsCoins = [];

  for (const obligation of data.obligations ?? []) {
    const obligationOwnerCap = data.obligationOwnerCaps?.find(
      (o) => o.obligationId === obligation.id,
    );
    if (!obligationOwnerCap) continue;

    const sendPointsRewards = Object.values(data.rewardMap).flatMap((rewards) =>
      [...rewards.deposit, ...rewards.borrow].filter(
        (r) =>
          normalizeStructTag(r.stats.rewardCoinType) ===
            NORMALIZED_BETA_SEND_POINTS_COINTYPE && // TODO
          !!r.obligationClaims[obligation.id] &&
          r.obligationClaims[obligation.id].claimableAmount.gt(0),
      ),
    );

    for (const sendPointsReward of sendPointsRewards) {
      const [sendPointsCoin] = suilendClient.claimReward(
        obligationOwnerCap.id,
        sendPointsReward.obligationClaims[obligation.id].reserveArrayIndex,
        BigInt(sendPointsReward.stats.rewardIndex),
        sendPointsReward.stats.rewardCoinType,
        sendPointsReward.stats.side,
        transaction,
      );
      sendPointsCoins.push(sendPointsCoin);
    }
  }

  // Merge SEND Points coins
  if (sendPointsCoins.length === 0) return;

  const mergedSendPointsCoin = sendPointsCoins[0];
  if (sendPointsCoins.length > 1) {
    transaction.mergeCoins(mergedSendPointsCoin, sendPointsCoins.slice(1));
  }

  // Burn SEND Points for mSEND
  const mSendCoin = transaction.moveCall({
    target: `${BURN_CONTRACT_PACKAGE_ID}::points::burn_points`,
    typeArguments: [NORMALIZED_BETA_mSEND_COINTYPE], // TODO
    arguments: [
      transaction.object(POINTS_MANAGER_OBJECT_ID),
      transaction.object(mergedSendPointsCoin),
    ],
  });

  // Transfer mSEND to user
  transaction.transferObjects([mSendCoin], transaction.pure.address(address));
};

export const redeemSuilendCapsulesMsend = async (
  suiClient: SuiClient,
  address: string,
  transaction: Transaction,
) => {
  // Get Suilend Capsules owned by user
  const objs = await getOwnedObjectsOfType(
    suiClient,
    address,
    BETA_SUILEND_CAPSULE_TYPE, // TODO
  );

  // Burn Suilend Capsules for mSEND
  const mSendCoins = [];

  for (const obj of objs) {
    const mSendCoin = transaction.moveCall({
      target: `${BURN_CONTRACT_PACKAGE_ID}::capsule::burn_capsule`,
      typeArguments: [NORMALIZED_BETA_mSEND_COINTYPE], // TODO
      arguments: [
        transaction.object(CAPSULE_MANAGER_OBJECT_ID),
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
  suiClient: SuiClient,
  kioskClient: KioskClient,
  ownedKiosksWithKioskOwnerCaps: {
    kiosk: KioskData;
    kioskOwnerCap: KioskOwnerCap;
  }[],
  address: string,
  transaction: Transaction,
) => {
  const personalKioskRulePackageId = kioskClient.getRulePackageId(
    "personalKioskRulePackageId",
  );

  const mSendCoins = [];

  for (const {
    kiosk,
    kioskOwnerCap: personalKioskOwnerCap,
  } of ownedKiosksWithKioskOwnerCaps) {
    const kioskItems = kiosk.items.filter(
      (item) => item.type === ROOTLETS_TYPE && !item.listing,
    );

    for (const kioskItem of kioskItems) {
      // Get mSEND coins owned by the Rootlets NFT
      const objs = await getOwnedObjectsOfType(
        suiClient,
        kioskItem.objectId,
        `0x2::coin::Coin<${NORMALIZED_BETA_mSEND_COINTYPE}>`, // TODO
      );
      const ownedMsendRaw = objs.reduce(
        (acc, obj) =>
          acc.plus(new BigNumber((obj.data?.content as any).fields.balance)),
        new BigNumber(0),
      );
      if (ownedMsendRaw.eq(0)) continue;

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

      for (const obj of objs) {
        if ((obj.data?.content as any).fields.balance === "0") continue;

        // Take mSEND coin out of Rootlets NFT
        const mSendCoin = transaction.moveCall({
          target:
            "0xbe7741c72669f1552d0912a4bc5cdadb5856bcb970350613df9b4362e4855dc5::rootlet::receive_obj",
          arguments: [item, transaction.object(obj.data?.objectId as string)],
          typeArguments: [`0x2::coin::Coin<${NORMALIZED_BETA_mSEND_COINTYPE}>`], // TODO
        });
        mSendCoins.push(mSendCoin);
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
    }
  }

  // Merge mSEND coins
  if (mSendCoins.length === 0) return;

  const mergedMsendCoin = mSendCoins[0];
  if (mSendCoins.length > 1) {
    transaction.mergeCoins(mergedMsendCoin, mSendCoins.slice(1));
  }

  // Transfer mSEND to user
  transaction.transferObjects(
    [mergedMsendCoin],
    transaction.pure.address(address),
  );
};

export const claimSend = async (
  suiClient: SuiClient,
  address: string,
  mSendCoinType: string,
  transaction: Transaction,
) => {
  // Get mSEND coins
  const mSendCoins = (
    await suiClient.getCoins({
      owner: address,
      coinType: mSendCoinType,
    })
  ).data;

  // Merge mSEND coins
  if (mSendCoins.length === 0) return;

  const mergedMsendCoin = mSendCoins[0];
  if (mSendCoins.length > 1) {
    transaction.mergeCoins(
      transaction.object(mergedMsendCoin.coinObjectId),
      mSendCoins.map((c) => transaction.object(c.coinObjectId)).slice(1),
    );
  }

  // Claim SEND
  const sendCoin = transaction.moveCall({
    target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::redeem_mtokens`,
    typeArguments: [
      mSendCoinType,
      NORMALIZED_BETA_SEND_COINTYPE, // TODO
      NORMALIZED_SUI_COINTYPE,
    ],
    arguments: [
      transaction.object(mSEND_COINTYPE_MANAGER_MAP[mSendCoinType]),
      transaction.object(mergedMsendCoin.coinObjectId),
      transaction.object(transaction.gas),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  // Transfer SEND to user
  transaction.transferObjects([sendCoin], transaction.pure.address(address));
};

export const formatDuration = (duration: Duration) =>
  (duration.months
    ? [
        `${duration.months}m`,
        `${duration.days ?? 0}d`,
        `${duration.hours ?? 0}h`,
      ]
    : duration.days
      ? [
          `${duration.days}d`,
          `${duration.hours ?? 0}h`,
          `${duration.minutes ?? 0}m`,
        ]
      : [
          `${duration.hours}h`,
          `${duration.minutes ?? 0}m`,
          `${duration.seconds ?? 0}s`,
        ]
  ).join(" ");
