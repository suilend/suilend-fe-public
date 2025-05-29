import { initMainnetSDK } from "@cetusprotocol/cetus-sui-clmm-sdk";
import { KioskClient, KioskData, KioskOwnerCap } from "@mysten/kiosk";
import { SuiObjectResponse } from "@mysten/sui/client";
import {
  Transaction,
  TransactionResult,
  coinWithBalance,
} from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID, SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { Duration } from "date-fns";

import { SuilendClient } from "@suilend/sdk";
import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_mSEND_12M_COINTYPE,
  NORMALIZED_mSEND_3M_COINTYPE,
  NORMALIZED_mSEND_6M_COINTYPE,
  Rpc,
  isSendPointsS1,
} from "@suilend/sui-fe";

import { UserData } from "@/contexts/UserContext";
import {
  CETUS_CONTRACT_PACKAGE_ID,
  CETUS_GLOBAL_CONFIG_OBJECT_ID,
  CETUS_POOL_OBJECT_ID,
  getCetusClosestSqrtPriceFromPrice,
  getCetusCurrentSuiPrice,
} from "@/lib/cetus";

export const SEND_TOTAL_SUPPLY = 100_000_000;

export const TGE_TIMESTAMP_MS = 1733979600000;
export const mSEND_REDEMPTION_END_TIMESTAMP_MS =
  TGE_TIMESTAMP_MS + 365 * 24 * 60 * 60 * 1000; // 1 year after TGE

// Contracts
const BURN_CONTRACT_PACKAGE_ID =
  "0xf4e0686b311e9b9d6da7e61fc42dae4254828f5ee3ded8ab5480ecd27e46ff08";
const mTOKEN_CONTRACT_PACKAGE_ID =
  "0xbf51eb45d2b4faf7f9cda88433760dc65c6ac98bded0b0d30aeb696c74251ad3";

// Managers
const POINTS_MANAGER_OBJECT_ID =
  "0x1236a2059bd24b46067cd6818469802b56a05920c9029c7b16c16a47efab2260";
const CAPSULE_MANAGER_OBJECT_ID =
  "0x5307419ec2f76bb70a948d71adf22ffde99a102961a3aa61361cc233f6d31e6e";

export const mSEND_COINTYPE_MANAGER_MAP = {
  [NORMALIZED_mSEND_3M_COINTYPE]:
    "0xef40b6d070de0c55dcb12775e4c438b1d83e0b5f445e95875f46eb2742a5549c",
  [NORMALIZED_mSEND_6M_COINTYPE]:
    "0xe060231ad4a84d503d643d4ff3dbe374ed4fdd7073a999a238458a0969b83fb6",
  [NORMALIZED_mSEND_12M_COINTYPE]:
    "0x3e6911fb0eaa7a534dd004784e62e75ae7b2db2c570d0075d0b1889c5966b0b9",
};

// Events
export const BURN_SEND_POINTS_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::points::BurnEvent`;
export const BURN_SUILEND_CAPSULES_EVENT_TYPE = `${BURN_CONTRACT_PACKAGE_ID}::capsule::BurnEvent`;
export const REDEEM_SEND_EVENT_TYPE = `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::RedeemMTokensEvent`;

export const WORMHOLE_TRANSFER_REDEEMED_EVENT_TYPE =
  "0x26efee2b51c911237888e5dc6702868abca3c7ac12c53f76ef8eba0697695e3d::complete_transfer::TransferRedeemed";

// NFTs
export const SUILEND_CAPSULE_TYPE =
  "0x008a7e85138643db888096f2db04766d549ca496583e41c3a683c6e1539a64ac::suilend_capsule::SuilendCapsule";

export const ROOTLETS_TYPE =
  "0x8f74a7d632191e29956df3843404f22d27bd84d92cca1b1abde621d033098769::rootlet::Rootlet";

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
  airdropSent: boolean;
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

// Redeem mSEND
export const redeemSendPointsMsend = (
  suilendClient: SuilendClient,
  userData: UserData,
  address: string,
  transaction: Transaction,
) => {
  // Claim SEND Points rewards
  const sendPointsCoins = [];

  for (const obligation of userData.obligations ?? []) {
    const obligationOwnerCap = userData.obligationOwnerCaps?.find(
      (o) => o.obligationId === obligation.id,
    );
    if (!obligationOwnerCap) continue;

    const sendPointsRewards = Object.values(userData.rewardMap).flatMap(
      (rewards) =>
        [...rewards.deposit, ...rewards.borrow].filter(
          (r) =>
            isSendPointsS1(r.stats.rewardCoinType) &&
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
    typeArguments: [NORMALIZED_mSEND_3M_COINTYPE],
    arguments: [
      transaction.object(POINTS_MANAGER_OBJECT_ID),
      transaction.object(mergedSendPointsCoin),
    ],
  });

  // Transfer mSEND to user
  transaction.transferObjects([mSendCoin], transaction.pure.address(address));
};

export const redeemSuilendCapsulesMsend = (
  objs: SuiObjectResponse[],
  address: string,
  transaction: Transaction,
) => {
  // Burn Suilend Capsules for mSEND
  const maxCount = 250;
  const mSendCoins = [];

  for (const obj of objs) {
    if (mSendCoins.length >= maxCount) break;

    const mSendCoin = transaction.moveCall({
      target: `${BURN_CONTRACT_PACKAGE_ID}::capsule::burn_capsule`,
      typeArguments: [NORMALIZED_mSEND_3M_COINTYPE],
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
  rootletsOwnedMsendObjectsMap: Record<string, SuiObjectResponse[]>,
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

      for (const obj of rootletsOwnedMsendObjectsMap[kioskItem.objectId]) {
        if ((obj.data?.content as any).fields.balance === "0") continue;

        // Take mSEND coin out of Rootlets NFT
        const mSendCoin = transaction.moveCall({
          target:
            "0xbe7741c72669f1552d0912a4bc5cdadb5856bcb970350613df9b4362e4855dc5::rootlet::receive_obj",
          arguments: [item, transaction.object(obj.data?.objectId as string)],
          typeArguments: [`0x2::coin::Coin<${NORMALIZED_mSEND_3M_COINTYPE}>`],
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

// Claim SEND
const borrowFlashLoan = (args: {
  minSendPrice: number; // based on slippage
  burnAmount: bigint; // without decimal part
  suiPenaltyAmount: bigint;
  mTokenManager: string;
  mSendCoinType: string;
  transaction: Transaction;
}): [any, any, any] => {
  const {
    minSendPrice,
    burnAmount,
    suiPenaltyAmount,
    mTokenManager,
    mSendCoinType,
    transaction,
  } = args;

  // const suiPenaltyAmount = transaction.moveCall({
  //   target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::get_penalty_amount`,
  //   typeArguments: [
  //     mSendCoinType,
  //     NORMALIZED_SEND_COINTYPE,
  //     NORMALIZED_SUI_COINTYPE,
  //   ],
  //   arguments: [
  //     transaction.object(mTokenManager),
  //     transaction.pure.u64(burnAmount),
  //     transaction.object(SUI_CLOCK_OBJECT_ID),
  //   ],
  // });

  const minSqrtPrice = getCetusClosestSqrtPriceFromPrice(
    minSendPrice,
    6, // SEND_DECIMALS
    SUI_DECIMALS,
    220, // TICK_SPACING
  );
  const [emptySendBalance, borrowedSuiBalance, receipt] = transaction.moveCall({
    target: `${CETUS_CONTRACT_PACKAGE_ID}::pool::flash_swap`,
    typeArguments: [NORMALIZED_SEND_COINTYPE, NORMALIZED_SUI_COINTYPE],
    arguments: [
      transaction.object(CETUS_GLOBAL_CONFIG_OBJECT_ID),
      transaction.object(CETUS_POOL_OBJECT_ID),
      transaction.pure.bool(true), // a2b, i.e. Get SUI, pay SEND later
      transaction.pure.bool(false), // by_amount_in, false because we want to specify how much SUI we get which is equivalent to penalty amount
      transaction.pure.u64(suiPenaltyAmount),
      transaction.pure.u128(minSqrtPrice),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  const penaltyCoin: TransactionResult = transaction.moveCall({
    target: `0x2::coin::from_balance`,
    typeArguments: [NORMALIZED_SUI_COINTYPE],
    arguments: [borrowedSuiBalance],
  });

  return [emptySendBalance, penaltyCoin, receipt];
};

const repayFlashLoan = (args: {
  emptySendBalance: any; // Empty balance object that we get from the flash loan
  receipt: any;
  sendCoin: any; // Send coin object we get from the claiming mSEND
  suiPenaltyCoin: any;
  address: string;
  transaction: Transaction;
}): any => {
  const {
    emptySendBalance,
    receipt,
    sendCoin,
    suiPenaltyCoin,
    address,
    transaction,
  } = args;

  const sendPayAmount = transaction.moveCall({
    target: `${CETUS_CONTRACT_PACKAGE_ID}::pool::swap_pay_amount`,
    typeArguments: [NORMALIZED_SEND_COINTYPE, NORMALIZED_SUI_COINTYPE],
    arguments: [transaction.object(receipt)],
  });

  const sendCoinToPay = transaction.splitCoins(sendCoin, [sendPayAmount]);

  const sendBalToMerge = transaction.moveCall({
    target: `0x2::coin::into_balance`,
    typeArguments: [NORMALIZED_SEND_COINTYPE],
    arguments: [sendCoinToPay],
  });

  transaction.moveCall({
    target: `0x2::balance::join`,
    typeArguments: [NORMALIZED_SEND_COINTYPE],
    arguments: [emptySendBalance, sendBalToMerge],
  });

  const emptySuiBalance = transaction.moveCall({
    target: `0x2::balance::zero`,
    typeArguments: [NORMALIZED_SUI_COINTYPE],
    arguments: [],
  });

  transaction.moveCall({
    target: `${CETUS_CONTRACT_PACKAGE_ID}::pool::repay_flash_swap`,
    typeArguments: [NORMALIZED_SEND_COINTYPE, NORMALIZED_SUI_COINTYPE],
    arguments: [
      transaction.object(CETUS_GLOBAL_CONFIG_OBJECT_ID),
      transaction.object(CETUS_POOL_OBJECT_ID),
      transaction.object(emptySendBalance),
      transaction.object(emptySuiBalance),
      receipt,
    ],
  });

  transaction.transferObjects([suiPenaltyCoin], address);

  return sendCoin;
};

export const claimSend = async (
  rpc: Rpc,
  suilendClient: SuilendClient,
  address: string,
  mSendCoinType: string,
  claimAmount: string,
  claimPenaltyAmountSui: BigNumber,
  isFlashLoan: boolean,
  flashLoanSlippagePercent: number,
  isDepositing: boolean,
  transaction: Transaction,
  obligationOwnerCapId: string,
) => {
  const value = new BigNumber(claimAmount)
    .times(10 ** 6)
    .integerValue(BigNumber.ROUND_DOWN)
    .toString();

  const mSendCoin = coinWithBalance({
    type: mSendCoinType,
    balance: BigInt(value),
    useGasCoin: false,
  })(transaction);

  let suiPenaltyCoin = isFlashLoan
    ? undefined // Set below
    : claimPenaltyAmountSui.gt(0)
      ? coinWithBalance({
          type: NORMALIZED_SUI_COINTYPE,
          balance: BigInt(
            claimPenaltyAmountSui
              .times(10 ** SUI_DECIMALS)
              .integerValue(BigNumber.ROUND_UP)
              .toString(),
          ),
          useGasCoin: true,
        })(transaction)
      : transaction.splitCoins(transaction.gas, [0]);

  const flashLoanArgs: Record<string, any> = {};
  if (isFlashLoan) {
    const cetusSdk = initMainnetSDK(rpc.url);

    const sendPrice = await getCetusCurrentSuiPrice(cetusSdk);
    const minSendPrice = sendPrice
      .mul(1 - flashLoanSlippagePercent / 100)
      .toNumber();

    const [emptySendBalance, borrowedSuiCoin, receipt] = borrowFlashLoan({
      minSendPrice,
      burnAmount: BigInt(value),
      suiPenaltyAmount: BigInt(
        claimPenaltyAmountSui
          .times(10 ** SUI_DECIMALS)
          .integerValue(BigNumber.ROUND_UP)
          .toString(),
      ),
      mTokenManager: mSEND_COINTYPE_MANAGER_MAP[mSendCoinType],
      mSendCoinType,
      transaction,
    });

    suiPenaltyCoin = borrowedSuiCoin;
    flashLoanArgs.emptySendBalance = emptySendBalance;
    flashLoanArgs.receipt = receipt;
  }

  // Claim SEND
  const sendCoin = transaction.moveCall({
    target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::redeem_mtokens`,
    typeArguments: [
      mSendCoinType,
      NORMALIZED_SEND_COINTYPE,
      NORMALIZED_SUI_COINTYPE,
    ],
    arguments: [
      transaction.object(mSEND_COINTYPE_MANAGER_MAP[mSendCoinType]),
      transaction.object(mSendCoin),
      transaction.object(suiPenaltyCoin!),
      transaction.object(SUI_CLOCK_OBJECT_ID),
    ],
  });

  let finalSendCoin = sendCoin;
  if (isFlashLoan) {
    finalSendCoin = repayFlashLoan({
      emptySendBalance: flashLoanArgs.emptySendBalance,
      receipt: flashLoanArgs.receipt,
      sendCoin,
      suiPenaltyCoin,
      address,
      transaction,
    });
  } else transaction.transferObjects([suiPenaltyCoin!], address);

  if (isDepositing) {
    // Deposit SEND
    suilendClient.deposit(
      finalSendCoin,
      NORMALIZED_SEND_COINTYPE,
      obligationOwnerCapId,
      transaction,
    );
  } else {
    // Transfer SEND to user
    transaction.transferObjects(
      [finalSendCoin],
      transaction.pure.address(address),
    );
  }
};

export const mintMTokens = ({
  transaction,
  treasuryCap,
  mTokenType,
  vestingType,
  penaltyType,
  vestingCoin,
  amount,
  tokenDecimals,
  startPenaltyNumerator,
  endPenaltyNumerator,
  penaltyDenominator,
  startTimeS,
  endTimeS,
}: {
  transaction: Transaction;
  treasuryCap: string;
  mTokenType: string;
  vestingType: string;
  penaltyType: string;
  vestingCoin: string;
  amount: number;
  tokenDecimals: number;
  startPenaltyNumerator: number;
  endPenaltyNumerator: number;
  penaltyDenominator: number;
  startTimeS: number;
  endTimeS: number;
}) => {
  // Calculate splitAmount based on amount and tokenDecimals
  const splitAmount = BigInt(
    new BigNumber(amount)
      .times(10 ** tokenDecimals)
      .integerValue()
      .toString(),
  );

  // Split tokens from the coin
  const [splitCoin] = transaction.splitCoins(transaction.object(vestingCoin), [
    transaction.pure.u64(splitAmount),
  ]);

  // Returns (AdminCap<MToken, Vesting, Penalty>, VestingManager<MToken, Vesting, Penalty>, Coin<MToken>)
  return transaction.moveCall({
    target: `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::mint_mtokens`,
    typeArguments: [mTokenType, vestingType, penaltyType],
    arguments: [
      transaction.object(treasuryCap),
      splitCoin,
      transaction.pure.u64(startPenaltyNumerator),
      transaction.pure.u64(endPenaltyNumerator),
      transaction.pure.u64(penaltyDenominator),
      transaction.pure.u64(startTimeS),
      transaction.pure.u64(endTimeS),
    ],
  });
};

// Utils
export const formatCountdownDuration = (duration: Duration) =>
  (duration.years || duration.months
    ? [
        duration.years ? `${duration.years}y` : null,
        `${duration.months ?? 0}mo`,
        `${duration.days ?? 0}d`,
        `${duration.hours ?? 0}h`,
      ].filter(Boolean)
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
