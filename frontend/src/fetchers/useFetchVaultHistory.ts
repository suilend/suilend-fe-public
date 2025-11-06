import useSWR from "swr";

import { API_URL } from "@suilend/sui-fe/lib/constants";

export type FeeType =
  | "DepositFee"
  | "WithdrawalFee"
  | "PerformanceFee"
  | "ManagementFee";

// Normalized event types consumed by the app
export type VaultCreatedEvent = {
  type: "VaultCreatedEvent";
  vaultId: string;
  timestamp: number; // u64
  managementFeeBps: string; // u64
  performanceFeeBps: string; // u64
  depositFeeBps: string; // u64
  withdrawalFeeBps: string; // u64
  digest: string;
};

export type VaultDepositEvent = {
  type: "VaultDepositEvent";
  vaultId: string;
  user: string; // address
  depositAmount: string; // u64
  sharesMinted: string; // u64
  timestamp: number; // u64
  digest: string;
};

export type VaultWithdrawEvent = {
  type: "VaultWithdrawEvent";
  vaultId: string;
  user: string; // address
  amount: string; // u64
  sharesBurned: string; // u64
  timestamp: number; // u64
  digest: string;
};

export type ManagerAllocateEvent = {
  type: "ManagerAllocateEvent";
  vaultId: string;
  user: string; // address
  depositAmount: string; // u64
  lendingMarketId: string;
  timestamp: number; // u64
  digest: string;
};

export type ManagerDivestEvent = {
  type: "ManagerDivestEvent";
  vaultId: string;
  user: string; // address
  amount: string; // u64
  lendingMarketId: string;
  timestamp: number; // u64
  digest: string;
};

export type FeesAccruedEvent = {
  type: "FeesAccruedEvent";
  vaultId: string;
  feeType: FeeType;
  feeShares: string; // u64
  timestamp: number; // u64
  digest: string;
};

export type VaultEvent =
  | VaultCreatedEvent
  | VaultDepositEvent
  | VaultWithdrawEvent
  | ManagerAllocateEvent
  | ManagerDivestEvent
  | FeesAccruedEvent;

// API response shapes
type UserHistoryResponse = {
  results: {
    vaultDeposit: Array<{
      id: number;
      vaultId: string;
      user: string;
      depositAmount: string;
      sharesMinted: string;
      timestamp: number;
      digest: string;
      eventIndex: number;
      sender: string;
      usdValue: string;
    }>;
    vaultWithdraw: Array<{
      id: number;
      vaultId: string;
      user: string;
      amount: string;
      sharesBurned: string;
      timestamp: number;
      digest: string;
      eventIndex: number;
      sender: string;
      usdValue: string;
    }>;
  };
  cursor: string | null;
};

type GlobalHistoryResponse = {
  results: {
    vaultsByVaultId: Record<
      string,
      {
        vaultCreated: Array<{
          id: number;
          vaultId: string;
          managementFeeBps: string;
          performanceFeeBps: string;
          depositFeeBps: string;
          withdrawalFeeBps: string;
          timestamp: number;
          digest: string;
          eventIndex: number;
          sender: string;
        }>;
        managerAllocate: Array<{
          id: number;
          vaultId: string;
          lendingMarketId: string;
          reserveIndex: string;
          obligationIndex: string;
          user: string;
          depositAmount: string;
          timestamp: number;
          digest: string;
          eventIndex: number;
          sender: string;
        }>;
        managerDivest: Array<{
          id: number;
          vaultId: string;
          lendingMarketId: string;
          reserveIndex: string;
          obligationIndex: string;
          user: string;
          amount: string;
          timestamp: number;
          digest: string;
          eventIndex: number;
          sender: string;
        }>;
        feesAccrued: Array<{
          id: number;
          vaultId: string;
          feeType: FeeType;
          feeShares: string;
          timestamp: number;
          digest: string;
          eventIndex: number;
          sender: string;
        }>;
      }
    >;
  };
  cursor: string | null;
};

// Fetch all-vault history and normalize to VaultEvent[], grouped by vaultId
export default function useFetchVaultHistory() {
  const fetcher = async (): Promise<Record<string, VaultEvent[]>> => {
    const url = `${API_URL}/vaults/history`;
    const res = await fetch(url);
    const json = (await res.json()) as GlobalHistoryResponse;
    const groupedByVaultId: Record<string, VaultEvent[]> = {};
    const byId = json?.results?.vaultsByVaultId || {};
    for (const [vaultId, groups] of Object.entries(byId)) {
      const arr: VaultEvent[] = [];
      for (const e of groups.vaultCreated || []) {
        arr.push({
          type: "VaultCreatedEvent",
          vaultId: vaultId,
          timestamp: e.timestamp * 1000,
          managementFeeBps: e.managementFeeBps,
          performanceFeeBps: e.performanceFeeBps,
          depositFeeBps: e.depositFeeBps,
          withdrawalFeeBps: e.withdrawalFeeBps,
          digest: e.digest,
        });
      }
      for (const e of groups.managerAllocate || []) {
        arr.push({
          type: "ManagerAllocateEvent",
          vaultId: vaultId,
          user: e.user,
          depositAmount: e.depositAmount,
          lendingMarketId: e.lendingMarketId,
          timestamp: e.timestamp * 1000,
          digest: e.digest,
        });
      }
      for (const e of groups.managerDivest || []) {
        arr.push({
          type: "ManagerDivestEvent",
          vaultId: vaultId,
          user: e.user,
          amount: e.amount,
          timestamp: e.timestamp * 1000,
          lendingMarketId: e.lendingMarketId,
          digest: e.digest,
        });
      }
      for (const e of groups.feesAccrued || []) {
        arr.push({
          type: "FeesAccruedEvent",
          vaultId: vaultId,
          feeType: e.feeType,
          feeShares: e.feeShares,
          timestamp: e.timestamp * 1000,
          digest: e.digest,
        });
      }
      groupedByVaultId[vaultId] = arr;
    }
    return groupedByVaultId;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    Record<string, VaultEvent[]>
  >("vaultHistory", fetcher);

  return { data, isLoading, isValidating, error, mutate };
}

// Fetch user-specific history and normalize to VaultEvent[], grouped by vaultId
export function useFetchUserVaultHistory(address?: string) {
  const fetcher = async (): Promise<Record<string, VaultEvent[]>> => {
    if (!address) return {};
    const url = `${API_URL}/vaults/history?wallet=${address}`;
    const res = await fetch(url);
    const json = (await res.json()) as UserHistoryResponse;
    const groupedByVaultId: Record<string, VaultEvent[]> = {};
    for (const e of json.results.vaultDeposit || []) {
      const v = e.vaultId;
      if (!groupedByVaultId[v]) groupedByVaultId[v] = [];
      groupedByVaultId[v].push({
        type: "VaultDepositEvent",
        vaultId: v,
        user: e.user,
        depositAmount: e.depositAmount,
        sharesMinted: e.sharesMinted,
        timestamp: e.timestamp * 1000,
        digest: e.digest,
      });
    }
    for (const e of json.results.vaultWithdraw || []) {
      const v = e.vaultId;
      if (!groupedByVaultId[v]) groupedByVaultId[v] = [];
      groupedByVaultId[v].push({
        type: "VaultWithdrawEvent",
        vaultId: v,
        user: e.user,
        amount: e.amount,
        sharesBurned: e.sharesBurned,
        timestamp: e.timestamp * 1000,
        digest: e.digest,
      });
    }
    return groupedByVaultId;
  };

  const { data, isLoading, isValidating, error, mutate } = useSWR<
    Record<string, VaultEvent[]>
  >(address ? ["userVaultHistory", address] : null, fetcher);
  return { data, isLoading, isValidating, error, mutate };
}
