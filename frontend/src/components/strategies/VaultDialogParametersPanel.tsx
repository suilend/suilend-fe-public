import { useRouter } from "next/router";
import { PropsWithChildren, useCallback, useMemo } from "react";

import { capitalize } from "lodash";

import { shallowPushQuery } from "@suilend/sui-fe-next";

import Button from "@/components/shared/Button";
import { TBodySans, TLabelSans } from "@/components/shared/Typography";
import { useVaultContext } from "@/contexts/VaultContext";
import { ParsedVault } from "@/fetchers/parseVault";
import { cn } from "@/lib/utils";

import AllocationBar from "./AllocationBar";

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
          <TBodySans>Historical data</TBodySans>
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
        <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
          <TLabelSans>
            {currentHistory.length} event
            {currentHistory.length !== 1 ? "s" : ""} found
          </TLabelSans>
        </div>
      )}
    </>
  );
}

function AllocationTabContent({ vault }: TabContentProps) {
  const { vaultHistory } = useVaultContext();

  const currentHistory = useMemo(
    () => vaultHistory[vault.id] ?? [],
    [vault.id, vaultHistory],
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
        <div className="flex w-full flex-col gap-2 rounded-sm border p-4">
          <TLabelSans>
            {currentHistory.length} event
            {currentHistory.length !== 1 ? "s" : ""} found
          </TLabelSans>
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
