export enum Side {
  DEPOSIT = "deposit",
  BORROW = "borrow",
}

export enum Action {
  DEPOSIT = "deposit",
  WITHDRAW = "withdraw",
  BORROW = "borrow",
  REPAY = "repay",
}

// Events
export type ApiInterestUpdateEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  cumulativeBorrowRate: string;
  availableAmount: string;
  borrowedAmount: string;
  unclaimedSpreadFees: string;
  ctokenSupply: string;
  borrowInterestPaid: string;
  spreadFee: string;
  supplyInterestEarned: string;
  borrowInterestPaidUsdEstimate: string;
  protocolFeeUsdEstimate: string;
  supplyInterestEarnedUsdEstimate: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiReserveAssetDataEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  availableAmount: string;
  supplyAmount: string;
  borrowedAmount: string;
  availableAmountUsdEstimate: string;
  supplyAmountUsdEstimate: string;
  borrowedAmountUsdEstimate: string;
  borrowApr: string;
  supplyApr: string;
  ctokenSupply: string;
  cumulativeBorrowRate: string;
  price: string;
  smoothedPrice: string;
  priceLastUpdateTimestampS: number;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};
export type DownsampledApiReserveAssetDataEvent = ApiReserveAssetDataEvent & {
  sampletimestamp: number;
};

export type ApiMintEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  liquidityAmount: string;
  ctokenAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiRedeemEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  ctokenAmount: string;
  liquidityAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiDepositEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  obligationId: string;
  ctokenAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiWithdrawEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  obligationId: string;
  ctokenAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiBorrowEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  obligationId: string;
  liquidityAmount: string;
  originationFeeAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiRepayEvent = {
  id: number;
  lendingMarketId: string;
  coinType: string;
  reserveId: string;
  obligationId: string;
  liquidityAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiLiquidateEvent = {
  id: number;
  lendingMarketId: string;
  repayReserveId: string;
  withdrawReserveId: string;
  obligationId: string;
  // repayCoinType: string;
  // withdrawCoinType: string;
  repayAmount: string;
  withdrawAmount: string;
  protocolFeeAmount: string;
  liquidatorBonusAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiClaimRewardEvent = {
  id: number;
  lendingMarketId: string;
  reserveId: string;
  obligationId: string;
  isDepositReward: boolean;
  poolRewardId: string;
  coinType: string;
  liquidityAmount: string;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
};

export type ApiObligationDataEvent = {
  id: number;
  lendingMarketId: string;
  obligationId: string;
  depositedValueUsd: string;
  allowedBorrowValueUsd: string;
  unhealthyBorrowValueUsd: string;
  superUnhealthyBorrowValueUsd: string;
  unweightedBorrowedValueUsd: string;
  weightedBorrowedValueUsd: string;
  weightedBorrowedValueUpperBoundUsd: string;
  borrowingIsolatedAsset: boolean;
  badDebtUsd: string;
  closable: boolean;
  timestamp: number;
  digest: string;
  eventIndex: number;
  sender: string;
  /**
   * {
   *  coin_type: TypeName;
   *  reserve_array_index: u64;
   *  deposited_ctoken_amount: u64;
   *  market_value: Decimal;
   *  user_reward_manager_index: u64;
   *  attributed_borrow_value: Decimal;
   * }[]
   */
  depositsJson: string;
  /**
   * {
   *  coin_type: TypeName;
   *  reserve_array_index: u64;
   *  borrowed_amount: Decimal;
   *  cumulative_borrow_rate: Decimal;
   *  market_value: Decimal;
   *  user_reward_manager_index: u64;
   * }[]
   */
  borrowsJson: string;
};
