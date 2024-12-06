import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID, normalizeStructTag } from "@mysten/sui/utils";

import {
  NORMALIZED_BETA_SEND_COINTYPE,
  NORMALIZED_BETA_SEND_POINTS_COINTYPE,
  NORMALIZED_BETA_mSEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
} from "@suilend/frontend-sui";
import { SuilendClient } from "@suilend/sdk";

import { AppData } from "@/contexts/AppContext";
import { getOwnedObjectsOfType } from "@/lib/transactions";

export const TGE_TIMESTAMP_MS = 1730419200000; // TODO: Change to 1733979600000

export const BURN_CONTRACT_PACKAGE_ID =
  "0x3615c20d2375363f642d99cec657e69799b118d580f115760c731f0568900770"; // TODO
export const mTOKEN_CONTRACT_PACKAGE_ID =
  "0xd0d8ed2a83da2f0f171de7d60b0b128637d51e6dbfbec232447a764cdc6af627"; // TODO

export const POINTS_MANAGER_OBJECT_ID =
  "0xb1a0dc06cdab0e714d73cb426e03d8daf3c148d66a6b80520827d70b801f742c"; // TODO
export const CAPSULE_MANAGER_OBJECT_ID =
  "0x0f820695ba668c81d319874f20798020c46626eae22aa3f11dd4ff065f50dc87"; // TODO
export const mSEND_MANAGER_OBJECT_ID =
  "0x776471131804197216d32d2805e38a46dd40fe2a7b1a76adde4a1787f878c2d7"; // TODO

export const BURN_SEND_POINTS_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::points::BurnEvent`;
export const BURN_SUILEND_CAPSULES_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::capsule::BurnEvent`;
export const REDEEM_SEND_EVENT_TYPE = `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::RedeemMTokensEvent`;

export const BETA_SUILEND_CAPSULE_TYPE =
  "0xe225a46bfe059ab96f3264d3aee63c6c4997eccad2b4630350e0957a52badd54::suilend_capsule::SuilendCapsule";
export const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

export const burnSendPoints = async (
  suilendClient: SuilendClient,
  data: AppData,
  address: string,
  transaction: Transaction,
) => {
  // Claim SEND Points rewards
  const claimedSendPointsCoins = [];
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
      const [claimedSendPointsCoin] = suilendClient.claimReward(
        obligationOwnerCap.id,
        sendPointsReward.obligationClaims[obligation.id].reserveArrayIndex,
        BigInt(sendPointsReward.stats.rewardIndex),
        sendPointsReward.stats.rewardCoinType,
        sendPointsReward.stats.side,
        transaction,
      );
      claimedSendPointsCoins.push(claimedSendPointsCoin);
    }
  }

  const mergedSendPointsCoin = claimedSendPointsCoins[0];
  if (claimedSendPointsCoins.length > 1) {
    transaction.mergeCoins(
      mergedSendPointsCoin,
      claimedSendPointsCoins.slice(1),
    );
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

export const burnSuilendCapsules = async (
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

export const redeemMsendForSend = async (
  suiClient: SuiClient,
  address: string,
  transaction: Transaction,
) => {
  // Get mSEND coins
  const mSendCoins = (
    await suiClient.getCoins({
      owner: address,
      coinType: NORMALIZED_BETA_mSEND_COINTYPE, // TODO
    })
  ).data;

  const mergedMsendCoin = mSendCoins[0];
  if (mSendCoins.length > 1) {
    transaction.mergeCoins(
      transaction.object(mergedMsendCoin.coinObjectId),
      mSendCoins.map((c) => transaction.object(c.coinObjectId)).slice(1),
    );
  }

  // Redeem mSEND
  const sendCoin = transaction.moveCall({
    target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::redeem_mtokens`,
    typeArguments: [
      NORMALIZED_BETA_mSEND_COINTYPE, // TODO
      NORMALIZED_BETA_SEND_COINTYPE, // TODO
      NORMALIZED_SUI_COINTYPE,
    ],
    arguments: [
      transaction.object(mSEND_MANAGER_OBJECT_ID),
      transaction.object(mergedMsendCoin.coinObjectId),
      transaction.object(transaction.gas),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  // Transfer SEND to user
  transaction.transferObjects([sendCoin], transaction.pure.address(address));
};
