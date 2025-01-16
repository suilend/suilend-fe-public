import MintObligationOwnerCapDialog from "@/components/admin/lendingMarket/MintObligationOwnerCapDialog";
import RemintObligationOwnerCapDialog from "@/components/admin/lendingMarket/RemintObligationOwnerCapDialog";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ObligationCard() {
  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Obligation</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <MintObligationOwnerCapDialog />
        <RemintObligationOwnerCapDialog />
      </CardContent>
    </Card>
  );
}
