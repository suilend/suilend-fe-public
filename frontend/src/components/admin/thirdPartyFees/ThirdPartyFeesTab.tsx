import CetusCard from "@/components/admin/thirdPartyFees/CetusCard";
import RootletsCard from "@/components/admin/thirdPartyFees/RootletsCard";
import SuilendCapsulesS2Card from "@/components/admin/thirdPartyFees/SuilendCapsulesS2Card";

export default function ThirdPartyFeesTab() {
  return (
    <div className="flex w-full flex-col gap-2">
      <SuilendCapsulesS2Card />
      <RootletsCard />
      <CetusCard />
    </div>
  );
}
