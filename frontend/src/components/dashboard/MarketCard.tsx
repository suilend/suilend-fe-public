import { formatUsd } from "@suilend/sui-fe";

import Card from "@/components/dashboard/Card";
import MarketTable from "@/components/dashboard/market-table/MarketTable";
import MarketDetailsPopover from "@/components/dashboard/MarketDetailsPopover";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function MarketCard() {
  const { appData } = useLoadedAppContext();

  return (
    <Card
      className="bg-transparent max-md:-mx-4 max-md:w-auto max-md:rounded-none max-md:border-x-0"
      headerProps={{
        title: appData.lendingMarket.name,
        startContent: <MarketDetailsPopover />,
        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-col gap-4 md:p-0">
        <div className="flex flex-row justify-between gap-4 md:px-4">
          <div className="flex flex-col items-start gap-1">
            <TLabelSans className="text-left">Deposits</TLabelSans>
            <TBody>{formatUsd(appData.lendingMarket.depositedAmountUsd)}</TBody>
          </div>
          <div className="flex flex-col items-center gap-1">
            <TLabelSans className="text-center">Borrows</TLabelSans>
            <TBody>{formatUsd(appData.lendingMarket.borrowedAmountUsd)}</TBody>
          </div>
          <div className="flex flex-col items-end gap-1">
            <TLabelSans className="text-right">TVL</TLabelSans>
            <TBody>{formatUsd(appData.lendingMarket.tvlUsd)}</TBody>
          </div>
        </div>

        <MarketTable />
      </CardContent>
    </Card>
  );
}
