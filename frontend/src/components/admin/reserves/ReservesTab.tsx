import { useSettingsContext } from "@suilend/frontend-sui-next";

import AddReserveDialog from "@/components/admin/reserves/AddReserveDialog";
import AddRewardsDialog from "@/components/admin/reserves/AddRewardsDialog";
import ClaimFeesDialog from "@/components/admin/reserves/ClaimFeesDialog";
import ReserveConfigDialog from "@/components/admin/reserves/ReserveConfigDialog";
import ReservePropertiesDialog from "@/components/admin/reserves/ReservePropertiesDialog";
import ReserveRewardsDialog from "@/components/admin/reserves/ReserveRewardsDialog";
import { TTitle } from "@/components/shared/Typography";
import Value from "@/components/shared/Value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { useLoadedAppContext } from "@/contexts/AppContext";

export default function ReservesTab() {
  const { explorer } = useSettingsContext();
  const { data } = useLoadedAppContext();

  return (
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
  );
}
