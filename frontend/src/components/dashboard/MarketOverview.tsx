import Card from "@/components/dashboard/Card";
import MarketOverviewPopover from "@/components/dashboard/MarketOverviewPopover";
import { TBody, TLabelSans } from "@/components/shared/Typography";
import { CardContent } from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";
import { formatUsd } from "@/lib/format";

export default function MarketOverview() {
  const { data } = useLoadedAppContext();

  return (
    <Card
      className="max-md:rounded-0 max-md:-mx-4 max-md:w-auto max-md:border-x-0 max-md:bg-transparent"
      headerProps={{
        title: "Pool overview",
        startContent: <MarketOverviewPopover />,
        noSeparator: true,
      }}
    >
      <CardContent className="flex flex-row justify-between gap-4">
        <div className="flex flex-col gap-1">
          <TLabelSans>Total deposits</TLabelSans>
          <TBody>{formatUsd(data.lendingMarket.depositedAmountUsd)}</TBody>
        </div>

        <div className="flex flex-col items-center gap-1">
          <TLabelSans className="text-center">Total borrows</TLabelSans>
          <TBody>{formatUsd(data.lendingMarket.borrowedAmountUsd)}</TBody>
        </div>

        <div className="flex flex-col items-end gap-1">
          <TLabelSans className="text-right">TVL</TLabelSans>
          <TBody>{formatUsd(data.lendingMarket.tvlUsd)}</TBody>
        </div>
      </CardContent>
    </Card>
  );
}
