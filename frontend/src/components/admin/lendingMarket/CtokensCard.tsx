import RedeemCTokensDialog from "@/components/admin/lendingMarket/RedeemCTokensDialog";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CtokensCard() {
  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">CTokens</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <RedeemCTokensDialog />
      </CardContent>
    </Card>
  );
}
