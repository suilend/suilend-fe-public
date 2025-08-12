import ChartSection from "@/components/dashboard/ChartSection";
import Logo from "@/components/dashboard/Logo";
import MetricsSection from "@/components/dashboard/MetricsSection";
import PriceDisplay from "@/components/dashboard/PriceDisplay";
import SocialIcons from "@/components/dashboard/SocialIcons";
import TransactionsSection from "@/components/dashboard/TransactionsSection";

export default function Dashboard() {
  return (
    <div className="max-w-[620px] w-full mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between lg:justify-start">
        <div className="flex items-center gap-2">
          <Logo />
          <PriceDisplay />
        </div>
        <SocialIcons />
      </div>

      {/* Metrics */}
      <MetricsSection />

      {/* Chart */}
      <ChartSection />

      {/* Transactions */}
      <TransactionsSection />
    </div>
  );
}
