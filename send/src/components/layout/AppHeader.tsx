import Link from "next/link";

import HeaderBase from "@/components/layout/HeaderBase";
import Logo from "@/components/layout/Logo";
import NavigationLinks from "@/components/layout/NavigationLinks";

export default function AppHeader() {
  return (
    <HeaderBase>
      {/* Start */}
      <div className="flex shrink-0 flex-row items-center gap-12">
        <Link href="https://suilend.com">
          <Logo />
        </Link>

        {/* Links */}
        <div className="flex flex-row items-center gap-8 max-lg:hidden">
          <NavigationLinks />
        </div>
      </div>
    </HeaderBase>
  );
}
