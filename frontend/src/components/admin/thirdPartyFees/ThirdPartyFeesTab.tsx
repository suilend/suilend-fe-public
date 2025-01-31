import CetusCard from "@/components/admin/thirdPartyFees/CetusCard";
import RootletsCard from "@/components/admin/thirdPartyFees/RootletsCard";
import SuilendCapsulesCard from "@/components/admin/thirdPartyFees/SuilendCapsulesCard";

export default function ThirdPartyFeesTab() {
  return (
    <div className="flex w-full flex-col gap-2">
      <SuilendCapsulesCard />
      <RootletsCard />
      <CetusCard />
    </div>
  );
}
