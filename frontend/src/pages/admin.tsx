import Head from "next/head";
import { useRouter } from "next/router";

import { shallowPushQuery } from "@suilend/frontend-sui-next";

import LendingMarketTab from "@/components/admin/lendingMarket/LendingMarketTab";
import LiquidateTab from "@/components/admin/liquidate/LiquidateTab";
import ObligationsTab from "@/components/admin/obligations/ObligationsTab";
import ReservesTab from "@/components/admin/reserves/ReservesTab";
import ThirdPartyFeesTab from "@/components/admin/thirdPartyFees/ThirdPartyFeesTab";
import Tabs from "@/components/shared/Tabs";

enum QueryParams {
  TAB = "tab",
}

export default function Admin() {
  const router = useRouter();
  const queryParams = {
    [QueryParams.TAB]: router.query[QueryParams.TAB] as Tab | undefined,
  };

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
      { id: Tab.THIRD_PARTY_FEES, title: "3rd party fees" },
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

          {selectedTab === Tab.RESERVES && <ReservesTab />}
          {selectedTab === Tab.LENDING_MARKET && <LendingMarketTab />}
          {selectedTab === Tab.THIRD_PARTY_FEES && <ThirdPartyFeesTab />}
          {selectedTab === Tab.LIQUIDATE && <LiquidateTab />}
          {selectedTab === Tab.OBLIGATIONS && <ObligationsTab />}
        </div>
      </div>
    </>
  );
}
