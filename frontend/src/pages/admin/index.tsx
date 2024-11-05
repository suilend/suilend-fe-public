import Head from "next/head";
import { useRouter } from "next/router";

import { Transaction } from "@mysten/sui/transactions";
import { Package } from "lucide-react";
import { toast } from "sonner";

import { SuilendClient } from "suilend-sdk/client";

import AddReserveDialog from "@/components/admin/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/ClaimFeesDialog";
import LiquidateDialog from "@/components/admin/LiquidateDialog";
import MintObligationOwnerCapDialog from "@/components/admin/MintObligationOwnerCapDialog";
import ObligationsDialog from "@/components/admin/ObligationsDialog";
import RateLimiterConfigDialog from "@/components/admin/RateLimiterConfigDialog";
import RateLimiterPropertiesDialog from "@/components/admin/RateLimiterPropertiesDialog";
import RedeemCTokensDialog from "@/components/admin/RedeemCTokensDialog";
import RemintObligationOwnerCapDialog from "@/components/admin/RemintObligationOwnerCapDialog";
import ReserveConfigDialog from "@/components/admin/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/ReserveRewardsDialog";
import Button from "@/components/shared/Button";
import Tabs from "@/components/shared/Tabs";
import { TTitle } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { AppData, useAppContext } from "@/contexts/AppContext";
import { shallowPushQuery } from "@/lib/router";

enum QueryParams {
  TAB = "tab",
}

export default function Admin() {
  const router = useRouter();
  const queryParams = {
    [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
  };

  const {
    refreshData,
    explorer,
    signExecuteAndWaitForTransaction,
    ...restAppContext
  } = useAppContext();
  const suilendClient = restAppContext.suilendClient as SuilendClient;
  const data = restAppContext.data as AppData;

  const isEditable = !!data.lendingMarketOwnerCapId;

  // Tabs
  enum Tab {
    RESERVES = "reserves",
    RATE_LIMITER = "rateLimiter",
    LENDING_MARKET = "lendingMarket",
    OBLIGATION = "obligation",
    CTOKENS = "ctokens",
    LIQUIDATE = "liquidate",
    OBLIGATIONS = "obligations",
  }

  const tabs = [
    [
      { id: Tab.RESERVES, title: "Reserves" },
      { id: Tab.RATE_LIMITER, title: "Rate limiter" },
      { id: Tab.LENDING_MARKET, title: "Lending market" },
    ],
    [
      { id: Tab.OBLIGATION, title: "Obligation" },
      { id: Tab.CTOKENS, title: "CTokens" },
    ],
    [
      { id: Tab.LIQUIDATE, title: "Liquidate" },
      { id: Tab.OBLIGATIONS, title: "Obligations" },
    ],
  ];

  const selectedTab =
    queryParams[QueryParams.TAB] &&
    Object.values(Tab).includes(queryParams[QueryParams.TAB])
      ? queryParams[QueryParams.TAB]
      : Object.values(Tab)[0];
  const onSelectedTabChange = (tab: Tab) => {
    shallowPushQuery(router, { ...router.query, [QueryParams.TAB]: tab });
  };

  // Lending market
  const onMigrate = async () => {
    if (!data.lendingMarketOwnerCapId)
      throw new Error("Error: No lending market owner cap");

    const transaction = new Transaction();

    try {
      suilendClient.migrate(transaction, data.lendingMarketOwnerCapId);

      await signExecuteAndWaitForTransaction(transaction);

      toast.success("Migrated");
    } catch (err) {
      toast.error("Failed to migrate", {
        description: (err as Error)?.message || "An unknown error occurred",
      });
    } finally {
      await refreshData();
    }
  };

  return (
    <>
      <Head>
        <title>Suilend | Admin</title>
      </Head>

      <div className="flex w-full flex-col items-center">
        <div className="flex w-full max-w-[800px] flex-col">
          <div className="mb-4 flex flex-col gap-px">
            {tabs.map((tabsRow, index) => (
              <Tabs
                key={index}
                tabs={tabsRow}
                selectedTab={selectedTab}
                onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
                listClassName="mb-0"
              />
            ))}
          </div>

          {selectedTab === Tab.RESERVES && (
            <div className="flex w-full flex-col gap-2">
              {data.lendingMarket.reserves.map((reserve) => {
                return (
                  <Card key={reserve.id}>
                    <CardHeader>
                      <TTitle>{reserve.symbol}</TTitle>
                      <CardDescription>
                        <Value
                          value={reserve.id}
                          isId
                          url={explorer.buildObjectUrl(reserve.id)}
                          isExplorerUrl
                        />
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex flex-row flex-wrap gap-2">
                      <ReserveConfigDialog reserve={reserve} />
                      <ReservePropertiesDialog reserve={reserve} />
                      <ReserveRewardsDialog reserve={reserve} />
                      <ClaimFeesDialog reserve={reserve} />
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex flex-row flex-wrap gap-2">
                <AddReserveDialog />
                <AddRewardsDialog />
                <ClaimFeesDialog />
              </div>
            </div>
          )}
          {selectedTab === Tab.RATE_LIMITER && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">Rate limiter</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <RateLimiterConfigDialog />
                <RateLimiterPropertiesDialog />
              </CardContent>
            </Card>
          )}
          {selectedTab === Tab.LENDING_MARKET && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">Lending market</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <Button
                  labelClassName="uppercase text-xs"
                  startIcon={<Package />}
                  variant="secondaryOutline"
                  onClick={onMigrate}
                  disabled={!isEditable}
                >
                  Migrate
                </Button>
              </CardContent>
            </Card>
          )}

          {selectedTab === Tab.OBLIGATION && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">Obligation</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <MintObligationOwnerCapDialog />
                <RemintObligationOwnerCapDialog />
              </CardContent>
            </Card>
          )}
          {selectedTab === Tab.CTOKENS && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">CTokens</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <RedeemCTokensDialog />
              </CardContent>
            </Card>
          )}

          {selectedTab === Tab.LIQUIDATE && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">Liquidate</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <LiquidateDialog />
              </CardContent>
            </Card>
          )}
          {selectedTab === Tab.OBLIGATIONS && (
            <Card>
              <CardHeader>
                <TTitle className="uppercase">Obligations</TTitle>
              </CardHeader>
              <CardContent className="flex flex-row flex-wrap gap-2">
                <ObligationsDialog />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
