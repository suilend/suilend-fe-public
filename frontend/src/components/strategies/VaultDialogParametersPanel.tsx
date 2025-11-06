import { useRouter } from "next/router";
import { PropsWithChildren, useCallback, useMemo } from "react";

import BigNumber from "bignumber.js";
import { capitalize } from "lodash";
import { ExternalLink } from "lucide-react";

import { LENDING_MARKET_ID } from "@suilend/sdk";
import { formatToken, formatUsd } from "@suilend/sui-fe";
import { shallowPushQuery } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useAppContext } from "@/contexts/AppContext";
import { VAULT_METADATA, useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";
import { LENDING_MARKET_METADATA_MAP } from "@/fetchers/useFetchAppData";
import { cn } from "@/lib/utils";

import AllocationBar from "./AllocationBar";
import AllocationPie from "./AllocationPie";
import VaultChart from "./VaultChart";

enum QueryParams {
  TAB = "parametersPanelTab",
}

enum Tab {
  DETAILS = "details",
  ALLOCATION = "allocation",
  HISTORY = "history",
}

interface TabContentProps {
  vault: ParsedVault;
}

const EVENT_TYPE_MAP: Record<string, string> = {
  VaultDepositEvent: "Deposit",
  VaultWithdrawEvent: "Withdraw",
  VaultCreatedEvent: "Vault created",
  ManagerAllocateEvent: "Allocate to",
  ManagerDivestEvent: "Divest from",
};

function DetailsTabContent({ vault }: TabContentProps) {
  return (
    <>
      <div className="flex w-full flex-col gap-4 rounded-sm border p-4">
        <div className="flex flex-col gap-2">
          <TBodySans>Vault overview</TBodySans>
          <TLabelSans>{vault.metadata?.description}</TLabelSans>
        </div>
        <div className="flex flex-col gap-2">
          <TBodySans>Vault allocation</TBodySans>
          <AllocationBar vault={vault} />
        </div>
        <div className="flex flex-col gap-2">
          <VaultChart vaultId={vault.id} />
        </div>
      </div>
    </>
  );
}

function HistoryTabContent({ vault }: TabContentProps) {
  const { userVaultHistory } = useVaultContext();

  const currentHistory = useMemo(
    () => userVaultHistory[vault.id] ?? [],
    [vault.id, userVaultHistory],
  );

  return (
    <>
      {currentHistory.length === 0 ? (
        <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
          <TLabelSans className="text-muted-foreground">
            No history available
          </TLabelSans>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2">
          {currentHistory.map((e, idx) => {
            const type = e.type;
            const ts = e.timestamp ? new Date(Number(e.timestamp)) : undefined;
            const tsText = ts ? ts.toLocaleString() : "";
            let tokenAmount = new BigNumber(0);
            if (type === "VaultDepositEvent") {
              tokenAmount = new BigNumber(e.depositAmount || 0);
            } else if (type === "VaultWithdrawEvent") {
              tokenAmount = new BigNumber(e.amount || 0);
            }

            const decimals = vault.baseCoinMetadata?.decimals ?? 0;
            const tokenHuman = tokenAmount.div(new BigNumber(10).pow(decimals));

            return (
              <div
                key={idx}
                className="flex w-full flex-col gap-2 rounded-sm border p-4"
              >
                <div className="flex w-full items-center justify-between">
                  <TBodySans>{EVENT_TYPE_MAP[type]}</TBodySans>
                  <ExternalLink
                    href={`https://suiscan.xyz/transaction/${e.digest}`}
                    target="_blank"
                    className="h-3 w-3 cursor-pointer text-muted-foreground"
                  />
                </div>
                <div className="flex w-full items-center justify-between">
                  <TLabelSans className="text-muted-foreground">
                    {tsText}
                  </TLabelSans>
                  {type !== "VaultCreatedEvent" && (
                    <div className="flex items-baseline gap-2">
                      {tokenHuman && (
                        <TLabelSans>
                          {formatToken(tokenHuman, { exact: false })}
                          {vault.baseCoinMetadata?.symbol
                            ? ` ${vault.baseCoinMetadata.symbol}`
                            : ""}
                        </TLabelSans>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function AllocationTabContent({ vault }: TabContentProps) {
  const { vaultHistory } = useVaultContext();
  const { allAppData } = useAppContext();

  const currentHistory = useMemo(
    () => vaultHistory[vault.id] ?? [],
    [vault.id, vaultHistory],
  );

  const filtered = useMemo(
    () =>
      currentHistory.filter(
        (e) =>
          e.type === "VaultCreatedEvent" ||
          e.type === "ManagerAllocateEvent" ||
          e.type === "ManagerDivestEvent",
      ),
    [currentHistory],
  );

  return (
    <>
      {filtered.length === 0 ? (
        <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
          <TLabelSans className="text-muted-foreground">
            No history available
          </TLabelSans>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <div className="rounded-sm border p-4">
            <AllocationPie vault={vault} title="Allocation" />
          </div>
          {filtered.map((e, idx) => {
            const ts = e.timestamp ? new Date(Number(e.timestamp)) : undefined;
            const tsText = ts ? ts.toLocaleString() : "";
            const type = e.type;

            let marketName = "Vault";
            let amountToken: BigNumber | undefined;
            let amountUsd: BigNumber | undefined;
            if (
              type === "ManagerAllocateEvent" ||
              type === "ManagerDivestEvent"
            ) {
              const amtStr =
                (e as any).amount ||
                (e as any).deposit_amount ||
                (e as any).depositAmount;
              const amt = amtStr ? new BigNumber(amtStr) : undefined;
              marketName =
                LENDING_MARKET_METADATA_MAP[e.lendingMarketId]?.name ?? "Vault";
              if (amt) {
                const decimals = vault.baseCoinMetadata?.decimals ?? 0;
                const tokenHuman = amt.div(new BigNumber(10).pow(decimals));
                amountToken = tokenHuman;
                const price =
                  allAppData?.allLendingMarketData[LENDING_MARKET_ID]
                    ?.reserveMap[vault.baseCoinType]?.price;
                if (price) amountUsd = tokenHuman.times(price);
              }
            }

            return (
              <div
                key={idx}
                className="flex w-full flex-col gap-2 rounded-sm border p-4"
              >
                <div className="flex w-full items-center justify-between">
                  <TBodySans>
                    {EVENT_TYPE_MAP[type]} {marketName}
                  </TBodySans>
                  <ExternalLink
                    href={`https://suiscan.xyz/transaction/${e.digest}`}
                    target="_blank"
                    className="h-3 w-3 cursor-pointer text-muted-foreground"
                  />
                </div>
                <div className="flex w-full items-center justify-between">
                  <TLabelSans className="text-muted-foreground">
                    {tsText}
                  </TLabelSans>
                  {type !== "VaultCreatedEvent" && (
                    <div className="flex items-baseline gap-2">
                      {amountToken && (
                        <TLabelSans>
                          {formatToken(amountToken, { exact: false })}
                          {vault.baseCoinMetadata?.symbol
                            ? ` ${vault.baseCoinMetadata.symbol}`
                            : ""}
                        </TLabelSans>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

interface TabButtonProps extends PropsWithChildren {
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ isActive, onClick, children }: TabButtonProps) {
  return (
    <Button
      className={cn(
        "h-7 flex-1 py-0 uppercase",
        isActive && "border border-secondary disabled:opacity-100",
      )}
      labelClassName="text-xs"
      variant={isActive ? "secondary" : "secondaryOutline"}
      onClick={onClick}
      disabled={isActive}
    >
      {children}
    </Button>
  );
}

interface VaultDialogParametersPanelProps {
  vault: ParsedVault;
}

export default function VaultDialogParametersPanel({
  vault,
}: VaultDialogParametersPanelProps) {
  const router = useRouter();
  const queryParams = useMemo(
    () => ({
      [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    }),
    [router.query],
  );

  // Tabs
  const selectedTab = useMemo(
    () =>
      queryParams[QueryParams.TAB] &&
      Object.values(Tab).includes(queryParams[QueryParams.TAB])
        ? queryParams[QueryParams.TAB]
        : Tab.DETAILS,
    [queryParams],
  );
  const onSelectedTabChange = useCallback(
    (tab: Tab) => {
      shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
    },
    [router],
  );

  const TabContent = {
    [Tab.DETAILS]: DetailsTabContent,
    [Tab.ALLOCATION]: AllocationTabContent,
    [Tab.HISTORY]: HistoryTabContent,
  }[selectedTab];

  return (
    <>
      <div className="flex flex-row gap-2">
        {Object.values(Tab).map((tab) => (
          <TabButton
            key={tab}
            isActive={selectedTab === tab}
            onClick={() => onSelectedTabChange(tab)}
          >
            {capitalize(tab)}
          </TabButton>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:-m-4 md:overflow-y-auto md:p-4">
        <TabContent vault={vault} />
      </div>
    </>
  );
}
