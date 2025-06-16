import Head from "next/head";
import { useRouter } from "next/router";

import { formatId } from "@suilend/sui-fe";
import { shallowPushQuery, useSettingsContext } from "@suilend/sui-fe-next";

import AddLendingMarketDialog from "@/components/admin/AddLendingMarketDialog";
import {
  AdminContextProvider,
  useAdminContext,
} from "@/components/admin/AdminContext";
import LendingMarketTab from "@/components/admin/lendingMarket/LendingMarketTab";
import LiquidateTab from "@/components/admin/liquidate/LiquidateTab";
import ObligationsTab from "@/components/admin/obligations/ObligationsTab";
import ReservesTab from "@/components/admin/reserves/ReservesTab";
import ThirdPartyFeesTab from "@/components/admin/thirdPartyFees/ThirdPartyFeesTab";
import OpenOnExplorerButton from "@/components/shared/OpenOnExplorerButton";
import StandardSelect from "@/components/shared/StandardSelect";
import Tabs from "@/components/shared/Tabs";
import { useLoadedAppContext } from "@/contexts/AppContext";

enum QueryParams {
  TAB = "tab",
  OBLIGATION_ID = "obligationId",
}

function Page() {
  const router = useRouter();
  const queryParams = {
    [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
    [QueryParams.OBLIGATION_ID]: router.query[QueryParams.OBLIGATION_ID] as
      | string
      | undefined,
  };

  const { explorer } = useSettingsContext();
  const { allAppData } = useLoadedAppContext();

  const { appData, setSelectedLendingMarketId } = useAdminContext();

  // Tabs
  enum Tab {
    RESERVES = "reserves",
    LENDING_MARKET = "lendingMarket",
    THIRD_PARTY_FEES = "thirdPartyFees",
    LIQUIDATE = "liquidate",
    OBLIGATIONS = "obligations",
  }

  const tabs = [
    [
      { id: Tab.RESERVES, title: "Reserves" },
      { id: Tab.LENDING_MARKET, title: "Lending market" },
    ],
    [
      { id: Tab.LIQUIDATE, title: "Liquidate" },
      { id: Tab.OBLIGATIONS, title: "Obligations" },
    ],
    [{ id: Tab.THIRD_PARTY_FEES, title: "3rd party fees" }],
  ];

  // Auto-switch to liquidate tab if obligation_id is provided
  const selectedTab = queryParams[QueryParams.OBLIGATION_ID]
    ? Tab.LIQUIDATE
    : queryParams[QueryParams.TAB] &&
        Object.values(Tab).includes(queryParams[QueryParams.TAB])
      ? queryParams[QueryParams.TAB]
      : Object.values(Tab)[0];
  const onSelectedTabChange = (tab: Tab) => {
    // Clear obligationId when navigating away from liquidate tab
    const newQuery: Record<string, string | string[] | undefined> = {
      ...router.query,
      [QueryParams.TAB]: tab,
    };
    if (tab !== Tab.LIQUIDATE) {
      delete newQuery[QueryParams.OBLIGATION_ID];
    }
    shallowPushQuery(router, newQuery);
  };

  return (
    <>
      <Head>
        <title>Suilend | Admin</title>
      </Head>

      <div className="flex w-full flex-col items-center">
        <div className="flex w-full max-w-[800px] flex-col gap-4">
          {/* Lending market */}
          <div className="flex w-full flex-row items-center gap-2">
            <AddLendingMarketDialog />

            <div className="flex-1">
              <StandardSelect
                items={Object.values(allAppData.allLendingMarketData).map(
                  (_appData) => ({
                    id: _appData.lendingMarket.id,
                    name: `${_appData.lendingMarket.name} (${formatId(_appData.lendingMarket.id)})`,
                  }),
                )}
                value={appData.lendingMarket.id}
                onChange={setSelectedLendingMarketId}
              />
            </div>

            <OpenOnExplorerButton
              url={explorer.buildObjectUrl(appData.lendingMarket.id)}
            />
          </div>

          {/* Tabs */}
          <div className="flex flex-col gap-px">
            {tabs.map((tabsRow, index) => (
              <Tabs
                key={index}
                listClassName="mb-0"
                tabs={tabsRow}
                selectedTab={selectedTab}
                onTabChange={(tab) => onSelectedTabChange(tab as Tab)}
              />
            ))}
          </div>

          {selectedTab === Tab.RESERVES && <ReservesTab />}
          {selectedTab === Tab.LENDING_MARKET && <LendingMarketTab />}
          {selectedTab === Tab.LIQUIDATE && (
            <LiquidateTab
              obligationId={queryParams[QueryParams.OBLIGATION_ID]}
            />
          )}
          {selectedTab === Tab.OBLIGATIONS && <ObligationsTab />}
          {selectedTab === Tab.THIRD_PARTY_FEES && <ThirdPartyFeesTab />}
        </div>
      </div>
    </>
  );
}

export default function Admin() {
  return (
    <AdminContextProvider>
      <Page />
    </AdminContextProvider>
  );
}
