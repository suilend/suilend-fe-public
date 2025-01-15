import FeeReceiversCard from "@/components/admin/lendingMarket/FeeReceiversCard";
import MigrateCard from "@/components/admin/lendingMarket/MigrateCard";

export default function LendingMarketTab() {
  return (
    <div className="flex w-full flex-col gap-2">
      <MigrateCard />
      <FeeReceiversCard />
    </div>
  );
}
