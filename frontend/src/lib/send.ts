import { initMainnetSDK } from "@cetusprotocol/cetus-sui-clmm-sdk";
import {
  Transaction,
  TransactionResult,
  coinWithBalance,
} from "@mysten/sui/transactions";
import { SUI_CLOCK_OBJECT_ID, SUI_DECIMALS } from "@mysten/sui/utils";
import BigNumber from "bignumber.js";
import { Duration } from "date-fns";

import {
  SuilendClient,
  createObligationIfNoneExists,
  sendObligationToUser,
} from "@suilend/sdk";
import { ObligationOwnerCap } from "@suilend/sdk/_generated/suilend/lending-market/structs";
import {
  NORMALIZED_SEND_COINTYPE,
  NORMALIZED_SUI_COINTYPE,
  NORMALIZED_mSEND_SERIES_1_COINTYPE,
  NORMALIZED_mSEND_SERIES_2_COINTYPE,
  NORMALIZED_mSEND_SERIES_3_COINTYPE,
  NORMALIZED_mSEND_SERIES_4_COINTYPE,
  NORMALIZED_mSEND_SERIES_5_COINTYPE,
  Rpc,
} from "@suilend/sui-fe";

import {
  CETUS_CONTRACT_PACKAGE_ID,
  CETUS_GLOBAL_CONFIG_OBJECT_ID,
  CETUS_POOL_OBJECT_ID,
  getCetusClosestSqrtPriceFromPrice,
  getCetusCurrentSuiPrice,
} from "@/lib/cetus";

export const SEND_TOTAL_SUPPLY = 100_000_000;

export const TGE_TIMESTAMP_MS = 1733979600000;
export const S1_mSEND_REDEMPTION_END_TIMESTAMP_MS =
  TGE_TIMESTAMP_MS + 365 * 24 * 60 * 60 * 1000; // 1 year after TGE

export const mSEND_COINTYPE_MANAGER_MAP = {
  [NORMALIZED_mSEND_SERIES_1_COINTYPE]:
    "0xef40b6d070de0c55dcb12775e4c438b1d83e0b5f445e95875f46eb2742a5549c",
  [NORMALIZED_mSEND_SERIES_2_COINTYPE]:
    "0xe060231ad4a84d503d643d4ff3dbe374ed4fdd7073a999a238458a0969b83fb6",
  [NORMALIZED_mSEND_SERIES_3_COINTYPE]:
    "0x3e6911fb0eaa7a534dd004784e62e75ae7b2db2c570d0075d0b1889c5966b0b9",
  [NORMALIZED_mSEND_SERIES_4_COINTYPE]:
    "0xf5527cbdf38e98d86ac65be8b38c0e02e4db2fadbad87463c87b01345fb6889f",
  [NORMALIZED_mSEND_SERIES_5_COINTYPE]:
    "0x696d588e2babf3df8c335e9d5d99ec2d164c6f7ff67e40b8da8f9f17076f7bc7",
};

// IDs
// IDs - Contracts
export const mTOKEN_CONTRACT_PACKAGE_ID =
  "0xbf51eb45d2b4faf7f9cda88433760dc65c6ac98bded0b0d30aeb696c74251ad3";

// Events
export const CLAIM_SEND_EVENT_TYPE = `${mTOKEN_CONTRACT_PACKAGE_ID}::mtoken::RedeemMTokensEvent`;

export const WORMHOLE_TRANSFER_REDEEMED_EVENT_TYPE =
  "0x26efee2b51c911237888e5dc6702868abca3c7ac12c53f76ef8eba0697695e3d::complete_transfer::TransferRedeemed";

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
  obligationOwnerCap?: ObligationOwnerCap<string>,
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
    const { obligationOwnerCapId, didCreate } = createObligationIfNoneExists(
      suilendClient,
      transaction,
      obligationOwnerCap,
    );
    suilendClient.deposit(
      finalSendCoin,
      NORMALIZED_SEND_COINTYPE,
      obligationOwnerCapId,
      transaction,
    );
    if (didCreate)
      sendObligationToUser(obligationOwnerCapId, address, transaction);
  } else {
    // Transfer SEND to user
    transaction.transferObjects(
      [finalSendCoin],
      transaction.pure.address(address),
    );
  }
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
