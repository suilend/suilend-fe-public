import LiquidateDialog from "@/components/admin/liquidate/LiquidateDialog";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface LiquidateTabProps {
  obligationId?: string;
}

export default function LiquidateTab({ obligationId }: LiquidateTabProps) {
  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Liquidate</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <LiquidateDialog initialObligationId={obligationId} />
      </CardContent>
    </Card>
  );
}
