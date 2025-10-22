import { LENDING_MARKET_ID } from "@suilend/sdk";
import { NORMALIZED_SUI_COINTYPE, getToken } from "@suilend/sui-fe";

import CetusCard from "@/components/admin/thirdPartyFees/CetusCard";
import RootletsCard from "@/components/admin/thirdPartyFees/RootletsCard";
import SuilendCapsulesCard from "@/components/admin/thirdPartyFees/SuilendCapsulesCard";
import BulkSwapCard from "@/components/swap/BulkSwapCard";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ThirdPartyFeesTab() {
  const { allAppData } = useLoadedAppContext();
  const appDataMainMarket = allAppData.allLendingMarketData[LENDING_MARKET_ID];

  return (
    <div className="flex w-full flex-col gap-2">
      <SuilendCapsulesCard />
      <RootletsCard />
      <CetusCard />
      <BulkSwapCard
        tokenOut={getToken(
          NORMALIZED_SUI_COINTYPE,
          appDataMainMarket.coinMetadataMap[NORMALIZED_SUI_COINTYPE],
        )}
      />
    </div>
  );
}
