import ObligationsDialog from "@/components/admin/obligations/ObligationsDialog";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ObligationsTab() {
  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Obligations</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <ObligationsDialog />
      </CardContent>
    </Card>
  );
}
