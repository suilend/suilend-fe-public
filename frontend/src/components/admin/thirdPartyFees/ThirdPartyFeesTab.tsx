import CetusCard from "@/components/admin/thirdPartyFees/CetusCard";
import RootletsCard from "@/components/admin/thirdPartyFees/RootletsCard";

export default function ThirdPartyFeesTab() {
  return (
    <div className="flex w-full flex-col gap-2">
      <RootletsCard />
      <CetusCard />
    </div>
  );
}
