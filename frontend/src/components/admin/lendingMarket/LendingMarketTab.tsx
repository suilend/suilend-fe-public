import CtokensCard from "@/components/admin/lendingMarket/CtokensCard";
import FeeReceiversCard from "@/components/admin/lendingMarket/FeeReceiversCard";
import MigrateCard from "@/components/admin/lendingMarket/MigrateCard";
import ObligationCard from "@/components/admin/lendingMarket/ObligationCard";
import RateLimiterCard from "@/components/admin/lendingMarket/RateLimiterCard";

export default function LendingMarketTab() {
  return (
    <div className="flex w-full flex-col gap-2">
      <MigrateCard />
      <CtokensCard />
      <FeeReceiversCard />
      <RateLimiterCard />
      <ObligationCard />
    </div>
  );
}
