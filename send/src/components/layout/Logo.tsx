import SuilendLogo from "@/components/layout/SuilendLogo";
import SteammLogo from "@/components/layout/SteammLogo";
import { TBodySans } from "@/components/shared/Typography";

export default function Logo() {
  return (
    <div className="flex flex-row items-center gap-2">
      <SuilendLogo size={24} />
      <TBodySans className="text-lg">Suilend</TBodySans>
    </div>
  );
}

export function SteammLogotype() {
  return (
    <div className="flex flex-row items-center gap-2">
      <SteammLogo size={24} />
      <TBodySans className="text-md">STEAMM</TBodySans>
    </div>
  );
}