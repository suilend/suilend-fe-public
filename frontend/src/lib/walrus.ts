import BigNumber from "bignumber.js";

export const WALRUS_PACKAGE_ID =
  "0xfa65cb2d62f4d39e60346fb7d501c12538ca2bbc646eaa37ece2aec5f897814e";
export const WALRUS_STAKING_OBJECT_ID =
  "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904";
export const WALRUS_INNER_STAKING_OBJECT_ID =
  "0x16f1f9fcdf5a746da423d1ad055d88f88b24a9272ca8afb4c0dcf074ae6c730a";

export const SUILEND_WALRUS_NODE_ID =
  "0xe5cc25058895aeb7024ff044c17f4939f34f5c4df36744af1aae34e28a0510b5";

export const STAKED_WAL_TYPE =
  "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77::staked_wal::StakedWal";

export enum StakedWalState {
  STAKED = "staked",
  WITHDRAWING = "withdrawing",
}
export type StakedWalObject = {
  id: string;
  nodeId: string;
  activationEpoch: number;
  withdrawEpoch: number | undefined;
  amount: BigNumber;
  state: StakedWalState;
};
