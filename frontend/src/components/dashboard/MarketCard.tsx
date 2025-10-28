import { formatUsd } from "@suilend/sui-fe";

import Card from "@/components/dashboard/Card";
import MarketTable from "@/components/dashboard/market-table/MarketTable";
import MarketDetailsPopover from "@/components/dashboard/MarketDetailsPopover";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLendingMarketContext } from "@/contexts/LendingMarketContext";

export default function MarketCard() {
  const { appData } = useLendingMarketContext();

  return (
    <Card
      className="bg-transparent max-md:-mx-4 max-md:w-auto max-md:rounded-none max-md:border-x-0"
      id={appData.lendingMarket.id}
      headerProps={{
        titleContainerClassName: "max-md:h-max",
        title: appData.lendingMarket.name,
        startContent: <MarketDetailsPopover />,
        endContent: (
          <div
            className="flex cursor-auto flex-row gap-6"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans className="text-left">Deposits</TLabelSans>
              <TBody>
                {formatUsd(appData.lendingMarket.depositedAmountUsd)}
              </TBody>
            </div>
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans className="text-center">Borrows</TLabelSans>
              <TBody>
                {formatUsd(appData.lendingMarket.borrowedAmountUsd)}
              </TBody>
            </div>
            <div className="flex flex-col items-end gap-1 md:flex-row md:items-baseline md:gap-2">
              <TLabelSans className="text-right">TVL</TLabelSans>
              <TBody>{formatUsd(appData.lendingMarket.tvlUsd)}</TBody>
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
