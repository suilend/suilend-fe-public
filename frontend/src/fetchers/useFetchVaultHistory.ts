import useSWR from "swr";

import { API_URL } from "@suilend/sui-fe/lib/constants";

export type FeeType =
  | "DepositFee"
  | "WithdrawalFee"
  | "PerformanceFee"
  | "ManagementFee";

export type VaultCreatedEvent = {
  type: "VaultCreatedEvent";
  vault_id: string;
  management_fee_bps: string; // u64
  performance_fee_bps: string; // u64
  deposit_fee_bps: string; // u64
  withdrawal_fee_bps: string; // u64
};

export type VaultDepositEvent = {
  type: "VaultDepositEvent";
  vault_id: string;
  user: string; // address
  deposit_amount: string; // u64
  shares_minted: string; // u64
  timestamp_ms: string; // u64
};

export type VaultWithdrawEvent = {
  type: "VaultWithdrawEvent";
  vault_id: string;
  user: string; // address
  amount: string; // u64
  shares_burned: string; // u64
  timestamp_ms: string; // u64
};

export type ManagerAllocateEvent = {
  type: "ManagerAllocateEvent";
  vault_id: string;
  user: string; // address
  deposit_amount: string; // u64
  timestamp_ms: string; // u64
};

export type ManagerDivestEvent = {
  type: "ManagerDivestEvent";
  vault_id: string;
  user: string; // address
  amount: string; // u64
  timestamp_ms: string; // u64
};

export type FeesAccruedEvent = {
  type: "FeesAccruedEvent";
  vault_id: string;
  fee_type: FeeType;
  fee_shares: string; // u64
  timestamp_ms: string; // u64
};

export type VaultEvent =
  | VaultCreatedEvent
  | VaultDepositEvent
  | VaultWithdrawEvent
  | ManagerAllocateEvent
  | ManagerDivestEvent
  | FeesAccruedEvent;

export default function useFetchVaultHistory(
  vaultId?: string,
  address?: string,
) {
  const fetcher = async (): Promise<Record<string, VaultEvent[]>> => {
    const url = `${API_URL}/vaults/history?${new URLSearchParams({
      vaultId: vaultId ?? "",
      address: address ?? "",
    })}`;
    const res = await fetch(url);
    const json = (await res.json()) as VaultEvent[];
    // Group the events by vault_id before returning.
    const groupedByVaultId: Record<string, VaultEvent[]> = {};
    for (const event of json) {
      const id = (event as { vault_id: string }).vault_id;
      if (!id) continue;
      if (!groupedByVaultId[id]) {
        groupedByVaultId[id] = [];
      }
      groupedByVaultId[id].push(event);
    }
    return groupedByVaultId;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    Record<string, VaultEvent[]>
  >(vaultId ? ["vaultHistory", vaultId, address ?? ""] : null, fetcher);

  return { data, isLoading, isValidating, error, mutate };
}
