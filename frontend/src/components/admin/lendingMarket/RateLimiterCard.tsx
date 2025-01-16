import RateLimiterConfigDialog from "@/components/admin/lendingMarket/RateLimiterConfigDialog";
import RateLimiterPropertiesDialog from "@/components/admin/lendingMarket/RateLimiterPropertiesDialog";
import { TTitle } from "@/components/shared/Typography";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function RateLimiterCard() {
  return (
    <Card>
      <CardHeader>
        <TTitle className="uppercase">Rate limiter</TTitle>
      </CardHeader>
      <CardContent className="flex flex-row flex-wrap gap-2">
        <RateLimiterConfigDialog />
        <RateLimiterPropertiesDialog />
      </CardContent>
    </Card>
  );
}
