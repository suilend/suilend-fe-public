import { formatUsd } from "@suilend/frontend-sui";

import Card from "@/components/dashboard/Card";
import MarketTable from "@/components/dashboard/market-table/MarketTable";
import MarketDetailsPopover from "@/components/dashboard/MarketDetailsPopover";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function MarketCard() {
  const { data } = useLoadedAppContext();

  return (
    <Card
      className="max-md:rounded-0 bg-transparent max-md:-mx-4 max-md:w-auto max-md:border-x-0"
      headerProps={{
        titleContainerClassName: "max-md:h-auto",
        title: "Main market",
        startContent: <MarketDetailsPopover />,
        endContent: (
          <div className="flex flex-row gap-6 md:gap-4">
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans>Deposits</TLabelSans>
              <TBody>{formatUsd(data.lendingMarket.depositedAmountUsd)}</TBody>
            </div>
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans>Borrows</TLabelSans>
              <TBody>{formatUsd(data.lendingMarket.borrowedAmountUsd)}</TBody>
            </div>
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans>TVL</TLabelSans>
              <TBody>{formatUsd(data.lendingMarket.tvlUsd)}</TBody>
            </div>
          </div>
        ),
        noSeparator: true,
      }}
    >
      <CardContent className="md:p-0">
        <MarketTable />
      </CardContent>
    </Card>
  );
}
