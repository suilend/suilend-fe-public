import Link from "next/link";

import HeaderBase from "@/components/layout/HeaderBase";
import Logo, { SteammLogotype } from "@/components/layout/Logo";

export default function AppHeader() {
  return (
    <HeaderBase>
      {/* Start */}
      <div className="flex shrink-0 flex-row items-center gap-12">
        <Link href="https://suilend.com">
          <Logo />
        </Link>
        <Link href="https://steamm.fi">
          <SteammLogotype />
        </Link>
      </div>
    </HeaderBase>
  );
}
