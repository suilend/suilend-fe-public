import BigNumber from "bignumber.js";

export const WALRUS_PACKAGE_ID =
  "0xfdc88f7d7cf30afab2f82e8380d11ee8f70efb90e863d1de8616fae1bb09ea77";
export const WALRUS_STAKING_OBJECT_ID =
  "0x10b9d30c28448939ce6c4d6c6e0ffce4a7f8a4ada8248bdad09ef8b70e4a3904";
export const WALRUS_INNER_STAKING_OBJECT_ID =
  "0x5849e7cdbdaad46b6c68a5462ed1fc58c302862785769b450c882679bc452999";

export const SUILEND_WALRUS_NODE_ID =
  "0xe5cc25058895aeb7024ff044c17f4939f34f5c4df36744af1aae34e28a0510b5";

export const STAKED_WAL_TYPE = `${WALRUS_PACKAGE_ID}::staked_wal::StakedWal`;

export enum StakedWalState {
  STAKED = "staked",
  WITHDRAWING = "withdrawing",
}
export type StakedWalObject = {
  id: string;
  nodeId: string;
  activationEpoch: number;
  amount: BigNumber;
  state: StakedWalState;
};
